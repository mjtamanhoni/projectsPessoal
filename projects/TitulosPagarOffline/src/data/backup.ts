import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { emTransacao, query, run } from '../db/connection';
import { formatDate } from '../format';
import { textoParaBase64 } from './base64';
import { obterConfig, salvarConfig } from './config';
import type { BackupArquivo, BackupPagamento, BackupTitulo } from './tipos';

export const APP_BACKUP_ID = 'titulos-pagar-offline';
export const BACKUP_VERSAO = 1;

function carimbo(): string {
  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(
    agora.getHours()
  )}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`;
}

export function nomeArquivoBackup(): string {
  return `titulos-backup-${carimbo()}.json`;
}

export async function gerarBackup(): Promise<BackupArquivo> {
  const config = await obterConfig();

  const titulos = await query<BackupTitulo>(
    `SELECT id, credor, descricao, numero_documento, chave_pix, parcela,
            valor_total_centavos, data_emissao, data_vencimento,
            cancelado_em, criado_em
       FROM titulo
      ORDER BY id ASC`
  );

  const pagamentos = await query<BackupPagamento>(
    `SELECT id, titulo_id, data_pagamento, valor_centavos, forma, observacao, criado_em
       FROM pagamento
      ORDER BY id ASC`
  );

  return {
    app: APP_BACKUP_ID,
    versao: BACKUP_VERSAO,
    exportado_em: new Date().toISOString(),
    config: {
      nome: config.nome,
      empresa: config.empresa,
      cnpj: config.cnpj,
      chave_pix: config.chave_pix,
    },
    titulos,
    pagamentos,
  };
}

export async function gerarBackupJson(): Promise<string> {
  return JSON.stringify(await gerarBackup(), null, 2);
}

async function salvarBackupAutomatico(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const json = await gerarBackupJson();
    await Filesystem.writeFile({
      path: 'backup-automatico.json',
      data: textoParaBase64(json),
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    /* backup de segurança é best-effort */
  }
}

export async function exportarBackup(): Promise<{ nome: string }> {
  const json = await gerarBackupJson();
  const nome = nomeArquivoBackup();

  if (Capacitor.isNativePlatform()) {
    const arquivo = await Filesystem.writeFile({
      path: nome,
      data: textoParaBase64(json),
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: 'Backup do Títulos a Pagar',
      text: 'Backup dos seus títulos e pagamentos.',
      url: arquivo.uri,
      dialogTitle: 'Salvar ou compartilhar o backup',
    });
  } else {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { nome };
}

function validarTitulo(item: BackupTitulo, indice: number): void {
  const onde = `título #${indice + 1}`;
  if (!Number.isFinite(Number(item.id)) || Number(item.id) <= 0) {
    throw new Error(`Backup inválido: ${onde} sem id.`);
  }
  if (!item.credor || !String(item.credor).trim()) {
    throw new Error(`Backup inválido: ${onde} sem credor.`);
  }
  if (!Number.isFinite(Number(item.valor_total_centavos)) || Number(item.valor_total_centavos) <= 0) {
    throw new Error(`Backup inválido: ${onde} com valor inválido.`);
  }
  if (!item.data_vencimento || !/^\d{4}-\d{2}-\d{2}/.test(String(item.data_vencimento))) {
    throw new Error(`Backup inválido: ${onde} com vencimento inválido.`);
  }
}

function validarPagamento(item: BackupPagamento, indice: number, titulos: Set<number>): void {
  const onde = `pagamento #${indice + 1}`;
  if (!Number.isFinite(Number(item.id)) || Number(item.id) <= 0) {
    throw new Error(`Backup inválido: ${onde} sem id.`);
  }
  if (!titulos.has(Number(item.titulo_id))) {
    throw new Error(`Backup inconsistente: ${onde} aponta para um título inexistente.`);
  }
  if (!Number.isFinite(Number(item.valor_centavos)) || Number(item.valor_centavos) <= 0) {
    throw new Error(`Backup inválido: ${onde} com valor inválido.`);
  }
}

export async function importarBackupTexto(
  texto: string
): Promise<{ titulos: number; pagamentos: number }> {
  let dados: BackupArquivo;
  try {
    dados = JSON.parse(texto) as BackupArquivo;
  } catch {
    throw new Error('Não foi possível ler o arquivo. Selecione um backup válido.');
  }

  if (!dados || dados.app !== APP_BACKUP_ID || !Array.isArray(dados.titulos) || !Array.isArray(dados.pagamentos)) {
    throw new Error('Este arquivo não é um backup do Títulos a Pagar.');
  }
  if (Number(dados.versao) > BACKUP_VERSAO) {
    throw new Error('Este backup foi gerado por uma versão mais nova do app. Atualize o aplicativo.');
  }

  const ids = new Set<number>();
  dados.titulos.forEach((item, indice) => {
    validarTitulo(item, indice);
    const id = Number(item.id);
    if (ids.has(id)) throw new Error(`Backup inválido: título repetido (id ${id}).`);
    ids.add(id);
  });
  dados.pagamentos.forEach((item, indice) => validarPagamento(item, indice, ids));

  await salvarBackupAutomatico();

  await emTransacao(async () => {
    await run('DELETE FROM pagamento');
    await run('DELETE FROM titulo');

    for (const item of dados.titulos) {
      await run(
        `INSERT INTO titulo
           (id, credor, descricao, numero_documento, chave_pix, parcela,
            valor_total_centavos, data_emissao, data_vencimento, cancelado_em, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(item.id),
          String(item.credor),
          item.descricao ?? null,
          item.numero_documento ?? null,
          item.chave_pix ?? null,
          Math.max(1, Number(item.parcela) || 1),
          Number(item.valor_total_centavos),
          String(item.data_emissao ?? item.data_vencimento),
          String(item.data_vencimento),
          item.cancelado_em ?? null,
          String(item.criado_em ?? new Date().toISOString()),
        ]
      );
    }

    for (const item of dados.pagamentos) {
      await run(
        `INSERT INTO pagamento
           (id, titulo_id, data_pagamento, valor_centavos, forma, observacao, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(item.id),
          Number(item.titulo_id),
          String(item.data_pagamento),
          Number(item.valor_centavos),
          String(item.forma ?? 'OUTROS'),
          item.observacao ?? null,
          String(item.criado_em ?? new Date().toISOString()),
        ]
      );
    }

    if (dados.config) {
      await salvarConfig({
        nome: dados.config.nome ?? '',
        empresa: dados.config.empresa ?? '',
        cnpj: dados.config.cnpj ?? '',
        chave_pix: dados.config.chave_pix ?? '',
      });
    }
  });

  return { titulos: dados.titulos.length, pagamentos: dados.pagamentos.length };
}

export async function lerArquivoTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ''));
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsText(arquivo);
  });
}

export function resumoBackup(dados: { titulos: number; pagamentos: number }): string {
  return `${dados.titulos} ${dados.titulos === 1 ? 'título' : 'títulos'} e ${
    dados.pagamentos
  } ${dados.pagamentos === 1 ? 'pagamento' : 'pagamentos'} restaurados.`;
}

export function mensagemDataBackup(iso: string): string {
  const data = iso.slice(0, 10);
  return formatDate(data);
}
