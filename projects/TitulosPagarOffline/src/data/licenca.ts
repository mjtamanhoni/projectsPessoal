import { query, run } from '../db/connection';
import { hojeISO } from '../format';
import {
  TokenInvalidoError,
  normalizarToken,
  verificarToken,
  type TokenPayload,
} from '../licensing/token';

export const TRIAL_LIMITE_TOTAL = 10;
export const TRIAL_LIMITE_MENSAL = 3;

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type MotivoLicencaInativa = 'expirada' | 'dispositivo' | 'invalida';
export type MotivoLimiteLicenca = 'total' | 'mensal';

export interface LicencaStatus {
  codigoDispositivo: string;
  temToken: boolean;
  licencaAtiva: boolean;
  plano: 'trial' | 'full';
  planoToken?: string;
  cliente?: string;
  cnpj?: string;
  keyId?: string;
  emitidoEm?: string;
  expiraEm?: string;
  motivoInativo?: MotivoLicencaInativa;
  erroToken?: string;
  totalTitulos: number;
  titulosNoMes: number;
  limiteTotal: number | null;
  limiteMensal: number | null;
  podeCriar: boolean;
  motivoBloqueio?: MotivoLimiteLicenca;
}

export class LimiteLicencaError extends Error {
  readonly motivo: MotivoLimiteLicenca;
  readonly limite: number;
  readonly atual: number;
  readonly totalTitulos: number;
  readonly titulosNoMes: number;

  constructor(motivo: MotivoLimiteLicenca, status: LicencaStatus) {
    const mensagem =
      motivo === 'total'
        ? `A demonstração permite no máximo ${TRIAL_LIMITE_TOTAL} títulos não cancelados. Ative a licença para cadastrar mais.`
        : `A demonstração permite ${TRIAL_LIMITE_MENSAL} novos títulos por mês. Ative a licença para cadastrar mais.`;
    super(mensagem);
    this.name = 'LimiteLicencaError';
    this.motivo = motivo;
    this.limite = motivo === 'total' ? TRIAL_LIMITE_TOTAL : TRIAL_LIMITE_MENSAL;
    this.atual = motivo === 'total' ? status.totalTitulos : status.titulosNoMes;
    this.totalTitulos = status.totalTitulos;
    this.titulosNoMes = status.titulosNoMes;
  }
}

interface LicencaRow {
  token: string;
  plano: string;
  cliente: string | null;
  cnpj: string | null;
  device: string | null;
  key_id: string | null;
  emitido_em: string | null;
  expira_em: string | null;
}

interface ContagemRow {
  total: number;
  no_mes: number;
}

let codigoEmCache: Promise<string> | null = null;

function gerarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => ALFABETO_CODIGO[byte % ALFABETO_CODIGO.length]).join('');
}

export function obterCodigoDispositivo(): Promise<string> {
  if (!codigoEmCache) {
    codigoEmCache = (async () => {
      const existente = await query<{ codigo: string }>(
        'SELECT codigo FROM dispositivo WHERE id = 1'
      );
      if (existente[0]?.codigo) return existente[0].codigo;

      const codigo = gerarCodigo();
      await run('INSERT OR IGNORE INTO dispositivo (id, codigo) VALUES (1, ?)', [codigo]);
      const confirma = await query<{ codigo: string }>(
        'SELECT codigo FROM dispositivo WHERE id = 1'
      );
      return confirma[0]?.codigo ?? codigo;
    })().catch((erro) => {
      codigoEmCache = null;
      throw erro;
    });
  }
  return codigoEmCache;
}

function texto(valor: unknown): string | undefined {
  if (valor === null || valor === undefined) return undefined;
  const s = String(valor).trim();
  return s.length > 0 ? s : undefined;
}

function dataDeEpoch(epoch?: number): string | undefined {
  if (!epoch || !Number.isFinite(epoch)) return undefined;
  return new Date(epoch * 1000).toISOString();
}

async function contarTitulos(): Promise<ContagemRow> {
  const inicioMes = `${hojeISO().slice(0, 7)}-01`;
  const rows = await query<ContagemRow>(
    `SELECT
       (SELECT COUNT(*) FROM titulo WHERE cancelado_em IS NULL) AS total,
       (SELECT COUNT(*) FROM titulo
         WHERE cancelado_em IS NULL AND date(criado_em) >= date(?)) AS no_mes`,
    [inicioMes]
  );
  return {
    total: Number(rows[0]?.total ?? 0),
    no_mes: Number(rows[0]?.no_mes ?? 0),
  };
}

function montarStatus(
  codigo: string,
  contagem: ContagemRow,
  licenca: LicencaRow | null,
  extras: Partial<LicencaStatus> = {}
): LicencaStatus {
  const plano = extras.plano ?? 'trial';
  const ilimitado = plano === 'full';
  const limiteTotal = ilimitado ? null : TRIAL_LIMITE_TOTAL;
  const limiteMensal = ilimitado ? null : TRIAL_LIMITE_MENSAL;
  const podeCriar =
    ilimitado ||
    (contagem.total < TRIAL_LIMITE_TOTAL && contagem.no_mes < TRIAL_LIMITE_MENSAL);
  const motivoBloqueio: MotivoLimiteLicenca | undefined = podeCriar
    ? undefined
    : contagem.total >= TRIAL_LIMITE_TOTAL
      ? 'total'
      : 'mensal';

  return {
    codigoDispositivo: codigo,
    temToken: Boolean(licenca),
    licencaAtiva: false,
    plano,
    planoToken: licenca?.plano ?? undefined,
    cliente: texto(licenca?.cliente),
    cnpj: texto(licenca?.cnpj),
    keyId: texto(licenca?.key_id),
    emitidoEm: texto(licenca?.emitido_em),
    expiraEm: texto(licenca?.expira_em),
    totalTitulos: contagem.total,
    titulosNoMes: contagem.no_mes,
    limiteTotal,
    limiteMensal,
    podeCriar,
    motivoBloqueio,
    ...extras,
  };
}

function statusComToken(
  codigo: string,
  contagem: ContagemRow,
  licenca: LicencaRow,
  payload: TokenPayload
): LicencaStatus {
  const agora = Math.floor(Date.now() / 1000);
  const expirada = typeof payload.exp === 'number' && payload.exp <= agora;
  const deviceToken = (payload.device ?? '').trim().toUpperCase();
  const deviceOk = !deviceToken || deviceToken === codigo.toUpperCase();
  const ativa = deviceOk && !expirada;
  const plano = ativa && payload.plano === 'full' ? 'full' : 'trial';

  return montarStatus(codigo, contagem, licenca, {
    licencaAtiva: ativa,
    plano,
    planoToken: payload.plano,
    motivoInativo: !deviceOk ? 'dispositivo' : expirada ? 'expirada' : undefined,
    cliente: payload.cliente ?? licenca.cliente ?? undefined,
    cnpj: payload.cnpj ?? licenca.cnpj ?? undefined,
    keyId: payload.key_id ?? licenca.key_id ?? undefined,
    emitidoEm:
      payload.emitido_em ?? licenca.emitido_em ?? dataDeEpoch(payload.iat) ?? undefined,
    expiraEm: licenca.expira_em ?? dataDeEpoch(payload.exp),
  });
}

export async function obterStatusLicenca(): Promise<LicencaStatus> {
  const codigo = await obterCodigoDispositivo();
  const contagem = await contarTitulos();
  const rows = await query<LicencaRow>(
    `SELECT token, plano, cliente, cnpj, device, key_id, emitido_em, expira_em
       FROM licenca WHERE id = 1`
  );
  const licenca = rows[0] ?? null;
  if (!licenca) return montarStatus(codigo, contagem, null);

  try {
    const { payload } = await verificarToken(licenca.token);
    return statusComToken(codigo, contagem, licenca, payload);
  } catch (erro) {
    return montarStatus(codigo, contagem, licenca, {
      plano: 'trial',
      motivoInativo: 'invalida',
      erroToken:
        erro instanceof TokenInvalidoError
          ? erro.message
          : 'Não foi possível validar a licença salva.',
    });
  }
}

export async function ativarLicenca(tokenOriginal: string): Promise<LicencaStatus> {
  const token = normalizarToken(tokenOriginal);
  if (!token) throw new TokenInvalidoError('Informe o token de licença.');

  const { payload } = await verificarToken(token);
  const codigo = await obterCodigoDispositivo();
  const deviceToken = (payload.device ?? '').trim().toUpperCase();
  if (deviceToken && deviceToken !== codigo.toUpperCase()) {
    throw new TokenInvalidoError(
      `Este token foi gerado para outro aparelho (${deviceToken}).`
    );
  }

  const agora = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp <= agora) {
    throw new TokenInvalidoError('Este token de licença está vencido.');
  }

  const emitidoEm = payload.emitido_em ?? dataDeEpoch(payload.iat) ?? null;
  const expiraEm = dataDeEpoch(payload.exp) ?? null;

  await run(
    `INSERT OR REPLACE INTO licenca
       (id, token, plano, cliente, cnpj, device, key_id, emitido_em, expira_em, atualizado_em)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      token,
      payload.plano,
      payload.cliente?.trim() || null,
      payload.cnpj?.trim() || null,
      payload.device?.trim() || null,
      payload.key_id?.trim() || null,
      emitidoEm,
      expiraEm,
    ]
  );

  return obterStatusLicenca();
}

export async function removerLicenca(): Promise<LicencaStatus> {
  await run('DELETE FROM licenca WHERE id = 1');
  return obterStatusLicenca();
}

export async function garantirPodeCriarTitulos(novos = 1): Promise<LicencaStatus> {
  const status = await obterStatusLicenca();
  if (status.plano === 'full') return status;

  if (status.totalTitulos + novos > TRIAL_LIMITE_TOTAL) {
    throw new LimiteLicencaError('total', status);
  }
  if (status.titulosNoMes + novos > TRIAL_LIMITE_MENSAL) {
    throw new LimiteLicencaError('mensal', status);
  }
  return status;
}
