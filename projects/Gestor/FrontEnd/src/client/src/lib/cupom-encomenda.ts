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

function padEsquerda(texto: string, largura: number): string {
  if (texto.length >= largura) return texto.slice(0, largura);
  return texto + ' '.repeat(largura - texto.length);
}

function padDireita(texto: string, largura: number): string {
  if (texto.length >= largura) return texto.slice(0, largura);
  return ' '.repeat(largura - texto.length) + texto;
}

const SEP = '='.repeat(48);
const SEP_L = '-'.repeat(48);

export interface CupomEncomendaData {
  empresaNome: string;
  empresaCnpj: string;
  empresaEndereco: string;
  empresaTelefone: string;
  empresaEmail: string;
  encomenda: Encomenda;
  cliente: Cliente | null;
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
  return partes.join(' • ');
}

export function gerarTextoCupomEncomenda(data: CupomEncomendaData): string {
  const { empresaNome, empresaCnpj, empresaEndereco, empresaTelefone, empresaEmail, encomenda, cliente } = data;
  const itens = encomenda.itens ?? [];
  const qtdTotal = itens.reduce((acc, i) => acc + Number(i.quantidade), 0);
  const total = Number(encomenda.valor_total);

  const now = new Date();
  const dataHora = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  const numPedido = String(encomenda.codigo ?? encomenda.id ?? '').padStart(5, '0');

  const linhas: string[] = [];

  linhas.push(SEP);
  linhas.push(padCentral(empresaNome, 48));
  if (empresaCnpj) linhas.push(padCentral(`CNPJ: ${empresaCnpj}`, 48));
  if (empresaEndereco) linhas.push(padCentral(empresaEndereco, 48));
  if (empresaTelefone) linhas.push(padCentral(`TEL: ${empresaTelefone}`, 48));
  if (empresaEmail) linhas.push(padCentral(empresaEmail, 48));
  linhas.push(SEP);
  linhas.push(padCentral('DOCUMENTO AUXILIAR DE ENCOMENDA', 48));
  linhas.push(padCentral('(SEM VALOR FISCAL)', 48));
  linhas.push(SEP);
  linhas.push(`DATA/HORA: ${dataHora}`);
  linhas.push(`PEDIDO N: ${numPedido}`);
  if (encomenda.data_entrega) {
    const dataEntrega = new Date(`${encomenda.data_entrega.slice(0, 10)}T12:00:00`);
    linhas.push(`ENTREGA: ${dataEntrega.toLocaleDateString('pt-BR')}`);
  }
  linhas.push(SEP_L);
  linhas.push(padCentral('CLIENTE', 48));
  linhas.push(SEP_L);
  linhas.push(`NOME: ${cliente?.nome || encomenda.cliente_nome || 'CONSUMIDOR FINAL'}`);
  if (cliente?.telefone) linhas.push(`TELEFONE: ${cliente.telefone}`);
  if (encomenda.observacao) linhas.push(`OBS: ${encomenda.observacao}`);
  linhas.push(SEP);
  linhas.push(padCentral('ITENS DO PEDIDO', 48));
  linhas.push(SEP_L);
  linhas.push('QTD  DESCRICAO                  VL.TOT (R$)');
  linhas.push(SEP_L);

  for (const item of itens) {
    const nome = item.produto_nome || item.produto_venda_nome || 'ITEM';
    const qtd = Number(item.quantidade);
    const vt = Number(item.valor_total);

    linhas.push(`${String(qtd).padStart(3, ' ')}x ${padEsquerda(nome, 24)} ${formatValor(vt).padStart(9, ' ')}`);

    const desc = descricaoPersonalizacao(item);
    if (desc) {
      linhas.push(`    ${padEsquerda(desc, 43)}`);
    }
  }

  linhas.push(SEP_L);
  linhas.push(`${padEsquerda('QTDE TOTAL DE ITENS:', 37)} ${String(qtdTotal).padStart(8, ' ')}`);
  linhas.push(SEP_L);
  linhas.push(`${padEsquerda('TOTAL DO PEDIDO:', 37)} ${formatValor(total).padStart(8, ' ')}`);
  linhas.push(SEP);

  linhas.push(`FORMA DE PAGAMENTO: ${encomenda.forma_pagamento_nome || '-'}`);
  linhas.push(SEP);
  linhas.push(padCentral('Obrigado pela preferencia!', 48));
  linhas.push(SEP);

  return linhas.join('\n');
}

export function imprimirCupomEncomendaSerial(texto: string): string {
  const linhas = texto.split('\n');
  return linhas
    .map((l) => {
      if (l.startsWith('=')) return '</linha_dupla>';
      if (l.startsWith('-')) return '</linha_simples>';
      return l;
    })
    .join('\n')
    + '\n</corte_total>';
}
