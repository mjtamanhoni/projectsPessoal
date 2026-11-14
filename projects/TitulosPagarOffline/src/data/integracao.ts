import { Capacitor } from '@capacitor/core';
import { query, run } from '../db/connection';
import { gerarPayloadPix } from '../pix';
import { bytesParaBase64 } from './base64';
import { obterConfig } from './config';
import { ativarLicenca, obterCodigoDispositivo, obterStatusLicenca } from './licenca';

const VERSAO_APP =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export interface Integracao {
  url: string;
  porta: number;
}

export type SolicitacaoSituacao =
  | 'nenhuma'
  | 'pendente'
  | 'entregue'
  | 'revogada';

export interface SolicitacaoLocal {
  status: SolicitacaoSituacao;
  mensagem?: string;
  valor_centavos?: number;
  comprovante_nome?: string;
  enviado_em?: string;
  verificado_em?: string;
}

export interface Comprovante {
  base64: string;
  nome: string;
  tipo: string;
}

export interface ResultadoSolicitacao {
  situacao: SolicitacaoSituacao;
  licencaAtiva: boolean;
  pix_chave: string;
  valor_centavos: number;
  has_comprovante: boolean;
  mensagem: string;
}

interface RespostaDispositivo {
  status?: string;
  token?: string;
  pix_chave?: string;
  valor_centavos?: number;
  has_comprovante?: boolean;
  mensagem?: string;
}

function texto(valor: unknown): string {
  return String(valor ?? '').trim();
}

export async function obterIntegracao(): Promise<Integracao> {
  const rows = await query<Record<string, unknown>>(
    'SELECT url, porta FROM integracao WHERE id = 1'
  );
  const row = rows[0] ?? {};
  return {
    url: texto(row.url),
    porta: Number(row.porta ?? 3001) || 3001,
  };
}

function normalizarUrl(valor: string): string {
  const bruto = valor.trim().replace(/\/+$/, '').replace(/\/api$/i, '');
  if (!bruto) return '';
  const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `http://${bruto}`;
  let parsed: URL;
  try {
    parsed = new URL(comEsquema);
  } catch {
    throw new Error('URL inválida. Informe apenas o endereço do servidor.');
  }
  if (!parsed.hostname) throw new Error('URL inválida. Informe apenas o endereço do servidor.');
  return `${parsed.protocol}//${parsed.hostname}`;
}

export async function salvarIntegracao(dados: Integracao): Promise<Integracao> {
  const url = normalizarUrl(dados.url);
  const porta = Math.floor(Number(dados.porta));

  if (!url) throw new Error('Informe a URL de acesso ao servidor.');
  if (!Number.isFinite(porta) || porta < 1 || porta > 65535) {
    throw new Error('Informe uma porta válida.');
  }

  await run(
    `UPDATE integracao
        SET url = ?, porta = ?, atualizado_em = datetime('now')
      WHERE id = 1`,
    [url, porta]
  );

  return obterIntegracao();
}

export function montarBaseUrl(integracao: Integracao): string {
  const bruto = integracao.url.trim();
  if (!bruto) return '';
  const comEsquema = /^https?:\/\//i.test(bruto) ? bruto : `http://${bruto}`;
  try {
    const parsed = new URL(comEsquema);
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    parsed.port = String(integracao.porta || (parsed.protocol === 'https:' ? 443 : 80));
    return parsed.origin;
  } catch {
    return '';
  }
}

function gerarSegredo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesParaBase64(bytes);
}

async function obterSegredo(): Promise<string> {
  const rows = await query<Record<string, unknown>>(
    'SELECT segredo FROM solicitacao WHERE id = 1'
  );
  const atual = texto(rows[0]?.segredo);
  if (atual.length >= 32) return atual;

  const segredo = gerarSegredo();
  await run(
    "UPDATE solicitacao SET segredo = ?, atualizado_em = datetime('now') WHERE id = 1",
    [segredo]
  );
  return segredo;
}

async function chamarDispositivo(
  acao: 'sincronizar' | 'confirmar',
  corpo: Record<string, unknown>
): Promise<RespostaDispositivo> {
  const integracao = await obterIntegracao();
  const base = montarBaseUrl(integracao);
  if (!base) throw new Error('Configure a URL do servidor em Configurações.');

  const caminhos = [
    `${base}/api/licencaTitulosPagar/dispositivos/${acao}`,
    `${base}/licencaTitulosPagar/dispositivos/${acao}`,
  ];

  let ultimoErro: Error | null = null;

  for (const url of caminhos) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const resposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: controller.signal,
      });

      const bruto = await resposta.text();
      let dados: Record<string, unknown> = {};
      if (bruto) {
        try {
          dados = JSON.parse(bruto) as Record<string, unknown>;
        } catch {
          dados = {};
        }
      }

      if (resposta.status === 404 || resposta.status === 405) {
        ultimoErro = new Error('Servidor não encontrado nesta URL e porta.');
        continue;
      }
      if (!resposta.ok) {
        const mensagem =
          texto(dados.erro) || texto(dados.error) || `Falha na comunicação (${resposta.status}).`;
        throw new Error(mensagem);
      }

      return {
        status: texto(dados.status),
        token: texto(dados.token),
        pix_chave: texto(dados.pix_chave),
        valor_centavos: Number(dados.valor_centavos ?? 0) || 0,
        has_comprovante: Boolean(dados.has_comprovante),
        mensagem: texto(dados.mensagem),
      };
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === 'AbortError') {
        ultimoErro = new Error('Tempo esgotado ao falar com o servidor.');
        continue;
      }
      if (erro instanceof TypeError) {
        ultimoErro = new Error('Não foi possível conectar ao servidor. Verifique a URL e a porta.');
        continue;
      }
      throw erro;
    } finally {
      window.clearTimeout(timer);
    }
  }

  throw ultimoErro ?? new Error('Não foi possível conectar ao servidor.');
}

export async function obterSolicitacaoLocal(): Promise<SolicitacaoLocal> {
  const rows = await query<Record<string, unknown>>(
    `SELECT status, mensagem, valor_centavos, comprovante_nome, enviado_em, verificado_em
       FROM solicitacao WHERE id = 1`
  );
  const row = rows[0] ?? {};
  const status = texto(row.status) as SolicitacaoSituacao;
  return {
    status: status || 'nenhuma',
    mensagem: texto(row.mensagem) || undefined,
    valor_centavos:
      row.valor_centavos === null || row.valor_centavos === undefined
        ? undefined
        : Number(row.valor_centavos),
    comprovante_nome: texto(row.comprovante_nome) || undefined,
    enviado_em: texto(row.enviado_em) || undefined,
    verificado_em: texto(row.verificado_em) || undefined,
  };
}

async function salvarSituacao(
  status: SolicitacaoSituacao,
  extras: { mensagem?: string; valor_centavos?: number; comprovante_nome?: string } = {},
  marcarEnvio = false
): Promise<void> {
  const sets = ['status = ?', "atualizado_em = datetime('now')"];
  const valores: unknown[] = [status];

  if (extras.mensagem !== undefined) {
    sets.push('mensagem = ?');
    valores.push(extras.mensagem.trim() || null);
  }
  if (extras.valor_centavos !== undefined) {
    sets.push('valor_centavos = ?');
    valores.push(Math.round(extras.valor_centavos));
  }
  if (extras.comprovante_nome !== undefined) {
    sets.push('comprovante_nome = ?');
    valores.push(extras.comprovante_nome.trim() || null);
  }
  if (marcarEnvio) {
    sets.push("enviado_em = datetime('now')");
  }

  await run(`UPDATE solicitacao SET ${sets.join(', ')} WHERE id = 1`, valores);
}

function corpoBase(codigo: string, segredo: string) {
  return { codigo, device: codigo, segredo };
}

async function processarResposta(
  resposta: RespostaDispositivo,
  extras: { mensagem?: string; valor_centavos?: number; comprovante_nome?: string } = {}
): Promise<ResultadoSolicitacao> {
  const codigo = await obterCodigoDispositivo();
  const segredo = await obterSegredo();
  const dados = {
    pix_chave: resposta.pix_chave ?? '',
    valor_centavos: resposta.valor_centavos ?? 0,
    has_comprovante: Boolean(resposta.has_comprovante),
    mensagem: resposta.mensagem ?? '',
  };

  if (resposta.status === 'liberada' && resposta.token) {
    await ativarLicenca(resposta.token);
    await chamarDispositivo('confirmar', corpoBase(codigo, segredo)).catch(() => undefined);
    await salvarSituacao('entregue', extras);
    const status = await obterStatusLicenca();
    return { ...dados, situacao: 'entregue', licencaAtiva: status.plano === 'full' };
  }

  if (resposta.status === 'revogada') {
    await salvarSituacao('revogada', extras);
    return { ...dados, situacao: 'revogada', licencaAtiva: false };
  }

  await salvarSituacao('pendente', extras, Boolean(extras.comprovante_nome));
  return { ...dados, situacao: 'pendente', licencaAtiva: false };
}

export async function solicitarDesbloqueio(): Promise<ResultadoSolicitacao> {
  const integracao = await obterIntegracao();
  if (!integracao.url) throw new Error('Configure a URL do servidor em Configurações.');

  const config = await obterConfig();
  const codigo = await obterCodigoDispositivo();
  const segredo = await obterSegredo();

  const resposta = await chamarDispositivo('sincronizar', {
    ...corpoBase(codigo, segredo),
    cliente: config.empresa || config.nome || 'Cliente Titulos a Pagar',
    cnpj: config.cnpj,
    app_versao: VERSAO_APP,
    plataforma: Capacitor.getPlatform(),
  });

  return processarResposta(resposta);
}

export async function enviarComprovante(
  comprovante: Comprovante,
  mensagem?: string
): Promise<ResultadoSolicitacao> {
  const integracao = await obterIntegracao();
  if (!integracao.url) throw new Error('Configure a URL do servidor em Configurações.');

  const codigo = await obterCodigoDispositivo();
  const segredo = await obterSegredo();

  const base64 = comprovante.base64.trim();
  if (base64.length > 8 * 1024 * 1024) {
    throw new Error('O comprovante é muito grande. Use uma imagem menor.');
  }

  const resposta = await chamarDispositivo('sincronizar', {
    ...corpoBase(codigo, segredo),
    mensagem: mensagem?.trim() || '',
    comprovante_base64: base64,
    comprovante_nome: comprovante.nome.slice(0, 200),
    comprovante_tipo: comprovante.tipo.slice(0, 60),
  });

  return processarResposta(resposta, {
    mensagem,
    comprovante_nome: comprovante.nome,
  });
}

export async function consultarSolicitacao(): Promise<ResultadoSolicitacao> {
  const codigo = await obterCodigoDispositivo();
  const segredo = await obterSegredo();
  const resposta = await chamarDispositivo('sincronizar', corpoBase(codigo, segredo));
  const resultado = await processarResposta(resposta);

  await run(
    "UPDATE solicitacao SET verificado_em = datetime('now'), atualizado_em = datetime('now') WHERE id = 1"
  );

  return resultado;
}

export async function obterPixCobranca(
  chave: string,
  valorCentavos?: number
): Promise<string> {
  const chaveLimpa = chave.trim();
  if (!chaveLimpa) return '';
  const codigo = await obterCodigoDispositivo();
  const valor = valorCentavos && valorCentavos > 0 ? valorCentavos / 100 : undefined;
  return gerarPayloadPix({
    chave: chaveLimpa,
    nome: 'CONESOFT',
    cidade: 'BRASIL',
    valor,
    txid: `LIC${codigo}`.slice(0, 25),
  });
}

function lerComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ''));
    leitor.onerror = () => reject(new Error('Não foi possível ler o comprovante.'));
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    imagem.src = dataUrl;
  });
}

async function comprimirImagem(dataUrl: string, maxLado = 1400): Promise<string> {
  const imagem = await carregarImagem(dataUrl);
  const escala = Math.min(1, maxLado / Math.max(imagem.width, imagem.height));
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext('2d');
  if (!contexto) return dataUrl;
  contexto.drawImage(imagem, 0, 0, largura, altura);
  return canvas.toDataURL('image/jpeg', 0.72);
}

export async function prepararComprovante(arquivo: File): Promise<Comprovante> {
  if (arquivo.size > 10 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. O limite é 10 MB.');
  }

  if (arquivo.type === 'application/pdf') {
    if (arquivo.size > 5 * 1024 * 1024) {
      throw new Error('PDF muito grande. O limite é 5 MB.');
    }
    const dataUrl = await lerComoDataUrl(arquivo);
    const base64 = dataUrl.split(',')[1] ?? '';
    if (!base64) throw new Error('Não foi possível ler o PDF.');
    return { base64, nome: arquivo.name, tipo: 'application/pdf' };
  }

  if (arquivo.type.startsWith('image/')) {
    const dataUrl = await lerComoDataUrl(arquivo);
    const comprimida = await comprimirImagem(dataUrl);
    const base64 = comprimida.split(',')[1] ?? '';
    if (!base64) throw new Error('Não foi possível processar a imagem.');
    return { base64, nome: arquivo.name, tipo: 'image/jpeg' };
  }

  throw new Error('Envie uma imagem ou um PDF do comprovante.');
}

export function comprovanteParaTexto(comprovante: Comprovante): string {
  if (comprovante.tipo === 'application/pdf') return '';
  return `data:${comprovante.tipo};base64,${comprovante.base64}`;
}
