import type { VendaProduto, Cliente } from '../api';

export interface CupomData {
  empresaNome: string;
  empresaCnpj: string;
  empresaEndereco: string;
  empresaTelefone: string;
  venda: VendaProduto;
  cliente: Cliente | null;
  numeroCupom: number;
  formaPagamento: string;
  parcelas: { numero: number; total: number; vencimento: string; valor: number }[];
  desconto?: number;
  logoBase64?: string | null;
}

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
const CORTE = '- - - - - - - - - CORTE AQUI - - - - - - - - - - -';

export function gerarTextoCupom(data: CupomData): string {
  const { empresaNome, empresaCnpj, empresaEndereco, empresaTelefone, venda, cliente, numeroCupom, formaPagamento, parcelas, desconto } = data;
  const itens = venda.itens ?? [];
  const qtdTotal = itens.reduce((acc, i) => acc + Number(i.quantidade), 0);
  const total = venda.valor_total ?? 0;
  const subtotal = total + (desconto ?? 0);
  const dataHora = new Date().toLocaleString('pt-BR');

  const linhas: string[] = [];

  // --- VIA DO CLIENTE ---
  linhas.push(SEP);
  linhas.push(padCentral(empresaNome, 48));
  linhas.push(padCentral(`CNPJ: ${empresaCnpj}`, 48));
  if (empresaEndereco) linhas.push(padCentral(empresaEndereco, 48));
  linhas.push(padCentral(`Tel: ${empresaTelefone}`, 48));
  linhas.push(SEP);
  linhas.push(padCentral('** DOCUMENTO AUXILIAR **', 48));
  linhas.push(padCentral('(SEM VALOR FISCAL)', 48));
  linhas.push(SEP_L);
  linhas.push(padCentral('VIA DO CLIENTE', 48));
  linhas.push(SEP);
  linhas.push(`DATA/HORA: ${dataHora}   CUPOM N: ${String(numeroCupom).padStart(5, '0')}`);
  linhas.push(`CLIENTE: ${cliente?.nome || 'CONSUMIDOR FINAL'}`);
  linhas.push(SEP);
  linhas.push(`${padEsquerda('COD', 3)}  ${padEsquerda('DESCRICAO', 20)} ${padEsquerda('QTD', 3)} ${padEsquerda('UN', 2)} ${padDireita('VL.UN', 7)} ${padDireita('VL.TOT', 7)}`);
  linhas.push(SEP);
  if (itens.length > 0) {
    itens.forEach((item, idx) => {
      const codStr = String(idx + 1).padStart(3, '0');
      const desc = (item.produto_nome ?? '').padEnd(20, ' ').slice(0, 20);
      const qtd = String(Number(item.quantidade)).padStart(3, ' ');
      const un = 'UN';
      const vu = Number(item.valor_unitario).toFixed(2).replace('.', ',').padStart(7, ' ');
      const vt = Number(item.valor_total).toFixed(2).replace('.', ',').padStart(7, ' ');
      linhas.push(`${padEsquerda(codStr, 3)}  ${padEsquerda(desc, 20)} ${qtd} ${un} ${vu} ${vt}`);
    });
  } else {
    const codStr = String(venda.codigo ?? venda.id ?? '').padStart(3, '0');
    const desc = 'ITEM'.padEnd(20, ' ').slice(0, 20);
    const qtd = String(qtdTotal).padStart(3, ' ');
    const un = 'UN';
    const vu = (0).toFixed(2).replace('.', ',').padStart(7, ' ');
    const vt = total.toFixed(2).replace('.', ',').padStart(7, ' ');
    linhas.push(`${padEsquerda(codStr, 3)}  ${padEsquerda(desc, 20)} ${qtd} ${un} ${vu} ${vt}`);
  }
  linhas.push(SEP);
  linhas.push(`${padEsquerda('QUANTIDADE TOTAL DE ITENS:', 37)} ${String(qtdTotal).padStart(10, ' ')}`);
  linhas.push(`${padEsquerda('SUBTOTAL:', 37)} ${formatValor(subtotal).padStart(10, ' ')}`);
  if (desconto && desconto > 0) {
    linhas.push(`${padEsquerda('DESCONTO:', 37)} ${formatValor(desconto).padStart(10, ' ')}`);
  }
  linhas.push(SEP_L);
  linhas.push(`${padEsquerda('TOTAL A PAGAR:', 37)} ${formatValor(total).padStart(10, ' ')}`);
  linhas.push(SEP);
  linhas.push(`FORMA DE PAGAMENTO: ${formaPagamento}`);
  linhas.push(SEP);
  if (parcelas.length > 0) {
    linhas.push(padCentral('DADOS DO PARCELAMENTO', 48));
    linhas.push(SEP_L);
    linhas.push('PARCELA    VENCIMENTO                 VALOR (R$)');
    parcelas.forEach((p) => {
      const label = `${String(p.numero).padStart(2, '0')}/${String(p.total).padStart(2, '0')}`;
      linhas.push(`${padEsquerda(label, 12)} ${padEsquerda(p.vencimento, 28)} ${formatValor(p.valor).padStart(10, ' ')}`);
    });
    linhas.push(SEP);
  }
  linhas.push(padCentral('Obrigado pela preferencia!', 48));
  linhas.push(padCentral('Este documento nao substitui a', 48));
  linhas.push(padCentral('Nota Fiscal Eletronica.', 48));
  if (!venda.recebido) {
    linhas.push(SEP);
    linhas.push('');
    linhas.push(padCentral(CORTE, 48));
    linhas.push('');

    // --- VIA DO CREDIARIO (somente venda nao paga) ---
    linhas.push(SEP);
    linhas.push(padCentral(empresaNome, 48));
    linhas.push(SEP);
    linhas.push(padCentral('VIA DO CREDIARIO', 48));
    linhas.push(SEP);
    linhas.push(`DATA/HORA: ${dataHora}   CUPOM N: ${String(numeroCupom).padStart(5, '0')}`);
    linhas.push(`${padEsquerda('VALOR TOTAL DO PEDIDO:', 37)} ${formatValor(total).padStart(10, ' ')}`);
    if (desconto && desconto > 0) {
      linhas.push(`${padEsquerda('DESCONTO:', 37)} ${formatValor(desconto).padStart(10, ' ')}`);
    }
    linhas.push(SEP_L);
    linhas.push(padCentral('DADOS DO CLIENTE', 48));
    linhas.push(SEP_L);
    linhas.push(`NOME: ${cliente?.nome || 'CONSUMIDOR FINAL'}`);
    if (cliente?.cnpj_cpf) linhas.push(`CPF/CNPJ: ${cliente.cnpj_cpf}`);
    if (cliente?.endereco) linhas.push(`ENDERECO: ${cliente.endereco}`);
    if (cliente?.telefone) linhas.push(`TELEFONE: ${cliente.telefone}`);
    linhas.push(SEP);
    if (parcelas.length > 0) {
      linhas.push(padCentral('DADOS DO PARCELAMENTO', 48));
      linhas.push(SEP_L);
      linhas.push('PARCELA    VENCIMENTO                 VALOR (R$)');
      parcelas.forEach((p) => {
        const label = `${String(p.numero).padStart(2, '0')}/${String(p.total).padStart(2, '0')}`;
        linhas.push(`${padEsquerda(label, 12)} ${padEsquerda(p.vencimento, 28)} ${formatValor(p.valor).padStart(10, ' ')}`);
      });
      linhas.push(SEP);
    }
    linhas.push('');
    linhas.push(SEP_L);
    linhas.push(padCentral('ASSINATURA DO CLIENTE', 48));
    linhas.push(SEP);
  }

  return linhas.join('\n');
}

export function imprimirCupomSerial(texto: string): string {
  const linhas = texto.split('\n');
  return linhas
    .map((l) => {
      if (l.startsWith('=')) return '</linha_dupla>';
      if (l.startsWith('-') && !l.includes('CORTE')) return '</linha_simples>';
      if (l.includes('CORTE AQUI')) return '</corte_parcial>';
      return l;
    })
    .join('\n') + '\n</corte_total>';
}