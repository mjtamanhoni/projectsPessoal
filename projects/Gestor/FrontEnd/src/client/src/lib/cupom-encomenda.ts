import type { Encomenda, EncomendaItem, Cliente } from '@/types';

function formatValor(v: number): string {
  return 'R$ ' + v.toFixed(2).replace('.', ',');
}

function padCentral(texto: string, largura: number): string {
  const espacos = largura - texto.length;
  if (espacos <= 0) return texto.slice(0, largura);
  const esq = Math.floor(espacos / 2);
  const dir = espacos - esq;
  return ' '.repeat(esq) + texto + ' '.repeat(dir);
}

function padDir(texto: string, largura: number): string {
  if (texto.length >= largura) return texto.slice(0, largura);
  return ' '.repeat(largura - texto.length) + texto;
}

function quebrarLinha(texto: string, largura: number): string[] {
  if (texto.length <= largura) return [texto];
  const resultado: string[] = [];
  let restante = texto;
  while (restante.length > largura) {
    let corte = restante.lastIndexOf(' ', largura);
    if (corte <= 0) corte = largura;
    resultado.push(restante.slice(0, corte));
    restante = restante.slice(corte).trimStart();
  }
  if (restante) resultado.push(restante);
  return resultado;
}

function sep(char: string, colunas: number): string {
  return char.repeat(colunas);
}

export interface CupomEncomendaData {
  encomenda: Encomenda;
  cliente: Cliente | null;
  colunas?: number;
}

function descricaoPersonalizacao(item: EncomendaItem): string {
  const partes: string[] = [];
  const rems = Array.isArray(item.removidos) ? item.removidos : [];
  const nomesRem = (rems as unknown[])
    .map((r) => (typeof r === 'string' ? r : String((r as { nome?: unknown })?.nome ?? '')))
    .filter(Boolean);
  if (nomesRem.length > 0) partes.push(`Sem: ${nomesRem.join(', ')}`);
  const adds = Array.isArray(item.adicionais) ? item.adicionais : [];
  if (adds.length > 0) {
    partes.push(
      `+ ${adds
        .map((a) => `${a.nome}${Number(a.quantidade) > 1 ? ` x${Number(a.quantidade)}` : ''}`)
        .join(', ')}`,
    );
  }
  return partes.join(' ');
}

function montarLinhaItem(
  qtd: number,
  nome: string,
  valorFmt: string,
  colunas: number,
): string {
  const espacoValor = 12;
  const parteQtd = `${String(qtd).padStart(3, ' ')}x `;
  const larguraNome = colunas - parteQtd.length - espacoValor;
  const parteValor = padDir(valorFmt, espacoValor);
  if (nome.length <= larguraNome) {
    return `${parteQtd}${nome.padEnd(larguraNome)}${parteValor}`;
  }
  return `${parteQtd}${nome.slice(0, larguraNome)}${parteValor}`;
}

export function gerarTextoCupomEncomenda(data: CupomEncomendaData): string {
  const { encomenda, cliente } = data;
  const C = data.colunas || 48;
  const itens = encomenda.itens ?? [];
  const qtdTotal = itens.reduce((acc, i) => acc + Number(i.quantidade), 0);
  const total = Number(encomenda.valor_total);

  const now = new Date();
  const dataHora = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  const numPedido = String(encomenda.codigo ?? encomenda.id ?? '').padStart(5, '0');

  const s = sep('=', C);
  const sl = sep('-', C);
  const linhas: string[] = [];

  const headerPedido = `DATA/HORA: ${dataHora}` + padDir(`PEDIDO N.: ${numPedido}`, C - `DATA/HORA: ${dataHora}`.length);
  linhas.push(headerPedido);

  const nomeCliente = cliente?.nome || encomenda.cliente_nome || 'CONSUMIDOR FINAL';
  linhas.push(`NOME: ${nomeCliente}`);

  if (cliente?.endereco) {
    const partes: string[] = [cliente.endereco];
    if (cliente.nr) partes.push(`, ${cliente.nr}`);
    if (cliente.complemento) partes.push(` - ${cliente.complemento}`);
    if (cliente.bairro) partes.push(` - ${cliente.bairro}`);
    if (cliente.cidade) partes.push(` - ${cliente.cidade}`);
    if (cliente.uf) partes.push(`/${cliente.uf}`);
    const endCompleto = partes.join('');
    const linhasEnd = quebrarLinha(`ENDERECO: ${endCompleto}`, C);
    linhas.push(...linhasEnd);

    const partesContato: string[] = [];
    if (cliente.cep) partesContato.push(`CEP: ${cliente.cep}`);
    if (cliente.celular) partesContato.push(`CELULAR: ${cliente.celular}`);
    else if (cliente.telefone) partesContato.push(`TEL: ${cliente.telefone}`);
    if (partesContato.length > 0) {
      linhas.push(partesContato.join(' - '));
    }
  } else {
    if (cliente?.celular) linhas.push(`CELULAR: ${cliente.celular}`);
    else if (cliente?.telefone) linhas.push(`TEL: ${cliente.telefone}`);
  }

  if (cliente?.email) linhas.push(`E-MAIL: ${cliente.email}`);

  if (encomenda.observacao) linhas.push(`OBS: ${encomenda.observacao}`);

  linhas.push(s);
  linhas.push(padCentral('ITENS DO PEDIDO', C));
  linhas.push(`QTD  ${'PRODUTO'.padEnd(C - 5 - 12)}${'VL.TOT'.padStart(12)}`);
  linhas.push(sl);

  for (const item of itens) {
    const nome = item.produto_nome || item.produto_venda_nome || 'ITEM';
    const qtd = Number(item.quantidade);
    const vt = Number(item.valor_total);
    const valorFmt = formatValor(vt);

    linhas.push(montarLinhaItem(qtd, nome, valorFmt, C));

    const desc = descricaoPersonalizacao(item);
    if (desc) {
      const linhasDesc = quebrarLinha(`(${desc})`, C);
      for (const ld of linhasDesc) {
        linhas.push(ld);
      }
    }
  }

  linhas.push(sl);
  linhas.push(`Qtd: ${qtdTotal}` + padDir(formatValor(total), C - `Qtd: ${qtdTotal}`.length));

  return linhas.join('\n');
}

export function imprimirCupomEncomendaSerial(texto: string): string {
  const linhas = texto.split('\n');
  return linhas
    .map((l) => {
      if (/^=+$/.test(l)) return '</linha_dupla>';
      if (/^-+$/.test(l)) return '</linha_simples>';
      return l;
    })
    .join('\n')
    + '\n</corte_total>';
}
