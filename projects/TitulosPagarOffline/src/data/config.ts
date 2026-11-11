import { query, run } from '../db/connection';
import type { ConfigApp } from './tipos';

const CAMPOS_EDITAVEIS = ['nome', 'empresa', 'cnpj', 'chave_pix'] as const;

type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number];

function mapear(row: Record<string, unknown>): ConfigApp {
  return {
    id: Number(row.id ?? 1),
    nome: String(row.nome ?? ''),
    empresa: String(row.empresa ?? ''),
    cnpj: String(row.cnpj ?? ''),
    chave_pix: String(row.chave_pix ?? ''),
    pin_hash: (row.pin_hash as string | null) ?? null,
    pin_salt: (row.pin_salt as string | null) ?? null,
    pin_iter: Number(row.pin_iter ?? 120000),
    pin_len: Number(row.pin_len ?? 4),
    biometria: Number(row.biometria ?? 0) === 1,
  };
}

export async function obterConfig(): Promise<ConfigApp> {
  const rows = await query<Record<string, unknown>>('SELECT * FROM app_config WHERE id = 1');
  if (rows.length === 0) {
    await run('INSERT OR IGNORE INTO app_config (id) VALUES (1)');
    const criado = await query<Record<string, unknown>>('SELECT * FROM app_config WHERE id = 1');
    return mapear(criado[0] ?? {});
  }
  return mapear(rows[0]);
}

export async function salvarConfig(
  dados: Partial<Pick<ConfigApp, CampoEditavel | 'biometria'>>
): Promise<ConfigApp> {
  const sets: string[] = [];
  const valores: unknown[] = [];

  for (const campo of CAMPOS_EDITAVEIS) {
    if (dados[campo] !== undefined) {
      sets.push(`${campo} = ?`);
      valores.push(String(dados[campo]).trim());
    }
  }

  if (dados.biometria !== undefined) {
    sets.push('biometria = ?');
    valores.push(dados.biometria ? 1 : 0);
  }

  if (sets.length > 0) {
    sets.push("atualizado_em = datetime('now')");
    await run(`UPDATE app_config SET ${sets.join(', ')} WHERE id = 1`, valores);
  }

  return obterConfig();
}

export async function limparDados(): Promise<void> {
  await run('DELETE FROM pagamento');
  await run('DELETE FROM titulo');
  await run("DELETE FROM sqlite_sequence WHERE name IN ('titulo', 'pagamento')");
}
