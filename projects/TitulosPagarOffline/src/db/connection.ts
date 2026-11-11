import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';
import { bytesParaBase64 } from '../data/base64';

/**
 * Nome exclusivo deste app. Nao usar o mesmo nome do app on-line
 * para evitar qualquer colisao de conexao/arquivo no dispositivo.
 */
const DB_NAME = 'titulos_pagar_offline';

let sqlite: SQLiteConnection | null = null;
let conexao: Promise<SQLiteDBConnection> | null = null;

function nativo(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Instancia unica: o plugin guarda o registro de conexoes por instancia
 * de SQLiteConnection. Recriar a instancia faz o JS "esquecer" conexoes
 * que o lado nativo ainda mantem abertas.
 */
function cliente(): SQLiteConnection {
  if (!sqlite) {
    sqlite = new SQLiteConnection(CapacitorSQLite);
  }
  return sqlite;
}

function textoDoErro(erro: unknown): string {
  const e = erro as { message?: string };
  return String(e?.message ?? erro ?? '').toLowerCase();
}

async function abrirWeb(): Promise<void> {
  const { defineCustomElements } = await import('jeep-sqlite/loader');
  defineCustomElements(window);

  if (!document.querySelector('jeep-sqlite')) {
    const el = document.createElement('jeep-sqlite');
    el.setAttribute('auto-save', 'true');
    document.body.appendChild(el);
  }

  await customElements.whenDefined('jeep-sqlite');
}

async function garantirSegredo(s: SQLiteConnection): Promise<void> {
  const armazenado = (await s.isSecretStored()).result === true;
  if (armazenado) return;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  await s.setEncryptionSecret(bytesParaBase64(bytes));
}

async function conectar(): Promise<SQLiteDBConnection> {
  const s = cliente();

  if (!nativo()) {
    await abrirWeb();
    await s.initWebStore();
  }

  const encriptado = nativo();
  const modo = encriptado ? 'secret' : 'no-encryption';

  if (encriptado) {
    await garantirSegredo(s);
  }

  const criar = () =>
    s.createConnection(DB_NAME, encriptado, modo, SCHEMA_VERSION, false);

  const existeRegistro = async (): Promise<boolean> => {
    try {
      return (await s.isConnection(DB_NAME, false)).result === true;
    } catch {
      return false;
    }
  };

  let db: SQLiteDBConnection;

  if (await existeRegistro()) {
    db = await s.retrieveConnection(DB_NAME, false);
  } else {
    try {
      db = await criar();
    } catch (erro) {
      if (!textoDoErro(erro).includes('already exists')) throw erro;
      await s.closeConnection(DB_NAME, false).catch(() => undefined);
      db = await criar();
    }
  }

  try {
    await db.open();
  } catch (erro) {
    const m = textoDoErro(erro);
    if (!m.includes('already open') && !m.includes('already exists')) throw erro;
    await s.closeConnection(DB_NAME, false).catch(() => undefined);
    db = await criar();
    await db.open();
  }

  try {
    await db.execute('PRAGMA foreign_keys = ON;');
    await db.execute(SCHEMA_SQL);
  } catch (erro) {
    await s.closeConnection(DB_NAME, false).catch(() => undefined);
    throw erro;
  }

  return db;
}

export function getDb(): Promise<SQLiteDBConnection> {
  if (!conexao) {
    conexao = conectar().catch((erro) => {
      conexao = null;
      throw erro;
    });
  }
  return conexao;
}

export async function run(sql: string, values: unknown[] = []) {
  const db = await getDb();
  // transaction=false: nos controlamos a transacao em emTransacao().
  // O padrao do plugin (true) abre outra transacao e falha com
  // "Already in transaction" quando ja existe uma aberta.
  return db.run(sql, values as never[], false);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  const resultado = await db.query(sql, values as never[]);
  return (resultado.values ?? []) as T[];
}

let fila: Promise<unknown> = Promise.resolve();

export async function emTransacao<T>(fn: () => Promise<T>): Promise<T> {
  const executar = async (): Promise<T> => {
    const db = await getDb();

    if ((await db.isTransactionActive()).result === true) {
      await db.rollbackTransaction().catch(() => undefined);
    }

    await db.beginTransaction();
    try {
      const resultado = await fn();
      await db.commitTransaction();
      return resultado;
    } catch (erro) {
      try {
        await db.rollbackTransaction();
      } catch {
        /* ignora */
      }
      throw erro;
    }
  };

  const resultado = fila.then(executar, executar);
  fila = resultado.then(
    () => undefined,
    () => undefined
  );
  return resultado;
}
