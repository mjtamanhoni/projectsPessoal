import { emTransacao, query, run } from '../db/connection';
import { formatCurrency, hojeISO } from '../format';
import {
  LimiteLicencaError,
  garantirPodeCriarTitulos,
  obterStatusLicenca,
} from './licenca';
import type {
  PagamentoEfetuado,
  PagamentoInput,
  TituloPagar,
  TituloPagarInput,
} from './tipos';

const SQL_LISTAR = `
SELECT
  t.id,
  t.credor,
  t.descricao,
  t.numero_documento,
  t.chave_pix,
  t.parcela,
  ROUND(t.valor_total_centavos / 100.0, 2) AS valor_total,
  t.data_emissao,
  t.data_vencimento,
  ROUND(COALESCE(p.total_centavos, 0) / 100.0, 2) AS total_pago,
  ROUND((t.valor_total_centavos - COALESCE(p.total_centavos, 0)) / 100.0, 2) AS saldo_devedor,
  CASE
    WHEN t.cancelado_em IS NOT NULL THEN 'CANCELADO'
    WHEN COALESCE(p.total_centavos, 0) >= t.valor_total_centavos THEN 'QUITADO'
    WHEN COALESCE(p.total_centavos, 0) > 0 THEN 'PARCIAL'
    ELSE 'PENDENTE'
  END AS status
FROM titulo t
LEFT JOIN (
  SELECT titulo_id, SUM(valor_centavos) AS total_centavos
  FROM pagamento
  GROUP BY titulo_id
) p ON p.titulo_id = t.id
ORDER BY t.data_vencimento ASC, t.id ASC
`;

function texto(valor: unknown): string | undefined {
  if (valor === null || valor === undefined) return undefined;
  const s = String(valor);
  return s.length > 0 ? s : undefined;
}

function mapearTitulo(row: Record<string, unknown>): TituloPagar {
  return {
    id: Number(row.id),
    credor: String(row.credor ?? ''),
    descricao: texto(row.descricao),
    numero_documento: texto(row.numero_documento),
    chave_pix: texto(row.chave_pix),
    parcela: Number(row.parcela ?? 1),
    valor_total: Number(row.valor_total ?? 0),
    data_emissao: texto(row.data_emissao),
    data_vencimento: String(row.data_vencimento ?? ''),
    status: String(row.status ?? 'PENDENTE'),
    total_pago: Number(row.total_pago ?? 0),
    saldo_devedor: Number(row.saldo_devedor ?? 0),
  };
}

export async function listarTitulos(): Promise<TituloPagar[]> {
  const rows = await query<Record<string, unknown>>(SQL_LISTAR);
  return rows.map(mapearTitulo);
}

async function totalPagoCentavos(tituloId: number): Promise<number> {
  const rows = await query<{ total: number | null }>(
    'SELECT COALESCE(SUM(valor_centavos), 0) AS total FROM pagamento WHERE titulo_id = ?',
    [tituloId]
  );
  return Number(rows[0]?.total ?? 0);
}

async function salvarUm(item: TituloPagarInput): Promise<void> {
  const credor = (item.credor ?? '').trim();
  const centavos = Math.round(Number(item.valor_total) * 100);
  const vencimento = (item.data_vencimento ?? '').slice(0, 10);
  const emissao = (item.data_emissao ?? hojeISO()).slice(0, 10);
  const parcela = Math.max(1, Math.floor(Number(item.parcela) || 1));

  if (!credor) throw new Error('Informe o credor.');
  if (!Number.isFinite(centavos) || centavos <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }
  if (!vencimento) throw new Error('Informe a data de vencimento.');
  if (vencimento < emissao) {
    throw new Error('O vencimento deve ser igual ou posterior à emissão.');
  }

  if (item.id) {
    const pago = await totalPagoCentavos(item.id);
    if (centavos < pago) {
      throw new Error(
        `O valor total não pode ser menor que o já pago (${formatCurrency(pago / 100)}).`
      );
    }
    await run(
      `UPDATE titulo
          SET credor = ?, descricao = ?, numero_documento = ?, chave_pix = ?,
              parcela = ?, valor_total_centavos = ?, data_emissao = ?,
              data_vencimento = ?, atualizado_em = datetime('now')
        WHERE id = ?`,
      [
        credor,
        item.descricao?.trim() || null,
        item.numero_documento?.trim() || null,
        item.chave_pix?.trim() || null,
        parcela,
        centavos,
        emissao,
        vencimento,
        item.id,
      ]
    );
    return;
  }

  await run(
    `INSERT INTO titulo
       (credor, descricao, numero_documento, chave_pix, parcela,
        valor_total_centavos, data_emissao, data_vencimento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      credor,
      item.descricao?.trim() || null,
      item.numero_documento?.trim() || null,
      item.chave_pix?.trim() || null,
      parcela,
      centavos,
      emissao,
      vencimento,
    ]
  );
}

export async function salvarTitulo(
  dados: TituloPagarInput | TituloPagarInput[]
): Promise<void> {
  const itens = Array.isArray(dados) ? dados : [dados];
  if (itens.length === 0) return;
  await emTransacao(async () => {
    const novos = itens.filter((item) => !item.id).length;
    if (novos > 0) await garantirPodeCriarTitulos(novos);
    for (const item of itens) {
      await salvarUm(item);
    }
  });
}

export async function excluirTitulo(id: number): Promise<void> {
  await emTransacao(async () => {
    await run('DELETE FROM pagamento WHERE titulo_id = ?', [id]);
    await run('DELETE FROM titulo WHERE id = ?', [id]);
  });
}

export async function cancelarTitulo(id: number): Promise<void> {
  await emTransacao(async () => {
    const rows = await query<{ cancelado_em: string | null }>(
      'SELECT cancelado_em FROM titulo WHERE id = ?',
      [id]
    );
    const titulo = rows[0];
    if (!titulo) throw new Error('Título não encontrado.');
    if (titulo.cancelado_em) throw new Error('Este título já está cancelado.');

    await run(
      `UPDATE titulo
          SET cancelado_em = datetime('now'),
              atualizado_em = datetime('now')
        WHERE id = ?`,
      [id]
    );
  });
}

export async function reativarTitulo(id: number): Promise<void> {
  await emTransacao(async () => {
    const rows = await query<{ cancelado_em: string | null }>(
      'SELECT cancelado_em FROM titulo WHERE id = ?',
      [id]
    );
    const titulo = rows[0];
    if (!titulo) throw new Error('Título não encontrado.');
    if (!titulo.cancelado_em) throw new Error('Este título não está cancelado.');

    const status = await obterStatusLicenca();
    if (status.plano !== 'full' && status.totalTitulos + 1 > (status.limiteTotal ?? 0)) {
      throw new LimiteLicencaError('total', status);
    }

    await run(
      `UPDATE titulo
          SET cancelado_em = NULL,
              atualizado_em = datetime('now')
        WHERE id = ?`,
      [id]
    );
  });
}

export async function listarPagamentos(tituloId: number): Promise<PagamentoEfetuado[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, titulo_id, data_pagamento,
            ROUND(valor_centavos / 100.0, 2) AS valor_pago,
            forma AS forma_pagamento, observacao, criado_em
       FROM pagamento
      WHERE titulo_id = ?
      ORDER BY data_pagamento DESC, id DESC`,
    [tituloId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    titulo_id: Number(row.titulo_id),
    data_pagamento: String(row.data_pagamento ?? ''),
    valor_pago: Number(row.valor_pago ?? 0),
    forma_pagamento: texto(row.forma_pagamento),
    observacao: texto(row.observacao),
    criado_em: texto(row.criado_em),
  }));
}

export async function salvarPagamento(
  dados: PagamentoInput
): Promise<{ status?: string } | null> {
  const tituloId = Number(dados.titulo_id);
  const centavos = Math.round(Number(dados.valor_pago) * 100);
  const data = (dados.data_pagamento ?? hojeISO()).slice(0, 10);

  if (!tituloId) throw new Error('Título não informado.');
  if (!Number.isFinite(centavos) || centavos <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }

  return emTransacao(async () => {
    const titulos = await query<{ valor_total_centavos: number; cancelado_em: string | null }>(
      'SELECT valor_total_centavos, cancelado_em FROM titulo WHERE id = ?',
      [tituloId]
    );
    const titulo = titulos[0];
    if (!titulo) throw new Error('Título não encontrado.');
    if (titulo.cancelado_em) throw new Error('Este título está cancelado.');

    const total = Number(titulo.valor_total_centavos);
    const pago = await totalPagoCentavos(tituloId);
    const saldo = total - pago;

    if (saldo <= 0) throw new Error('Este título já está quitado.');
    if (centavos > saldo) {
      throw new Error(`O valor não pode ser maior que o saldo de ${formatCurrency(saldo / 100)}.`);
    }

    await run(
      `INSERT INTO pagamento (titulo_id, data_pagamento, valor_centavos, forma, observacao)
       VALUES (?, ?, ?, ?, ?)`,
      [
        tituloId,
        data,
        centavos,
        dados.forma_pagamento?.trim() || 'OUTROS',
        dados.observacao?.trim() || null,
      ]
    );

    const novoPago = pago + centavos;
    const status = novoPago >= total ? 'QUITADO' : 'PARCIAL';
    return { status };
  });
}

export async function excluirPagamento(id: number): Promise<void> {
  await run('DELETE FROM pagamento WHERE id = ?', [id]);
}
