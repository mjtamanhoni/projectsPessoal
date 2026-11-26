import { useEffect, useMemo, useState, type DragEvent } from 'react';
import api, { getErrorMsg } from '@/lib/api';
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable';
import { buildPDFWithHeader, downloadPDF, viewPDF } from '@/lib/pdf';
import {
  Play,
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  GripVertical,
  X,
  Filter,
  Plus,
  ListTree,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

interface ColunaSchema {
  nome: string;
  tipo: string;
  pk: boolean;
}

interface FKSchema {
  coluna: string;
  tabela_ref: string;
  coluna_ref: string;
}

interface TabelaSchema {
  nome: string;
  tem_empresa: boolean;
  colunas: ColunaSchema[];
  fk: FKSchema[];
}

interface SchemaDB {
  empresa_id: number;
  modulos?: string[];
  tabelas: TabelaSchema[];
}

type FormatoColuna =
  | 'auto'
  | 'moeda'
  | 'decimal'
  | 'inteiro'
  | 'percentual'
  | 'data'
  | 'datahora'
  | 'hora'
  | 'tempo'
  | 'cnpj'
  | 'cpf'
  | 'telefone'
  | 'manual';
type AlinhamentoColuna = 'left' | 'center' | 'right';

interface Escolhida {
  tabela: string;
  coluna: string;
  apelido?: string;
  formato?: FormatoColuna;
  formatoManual?: string;
  alinhamento?: AlinhamentoColuna;
}

interface Ordenacao {
  id: number;
  chave: string;
  direcao: 'ASC' | 'DESC';
}

interface ResultadoConsulta {
  colunas: string[];
  linhas: Record<string, unknown>[];
  sql: string;
  total_linhas: number;
}

type ItemTabela =
  | { tipo: 'grupo'; nivel: number; chave: string; valor: unknown }
  | { tipo: 'linha'; linha: Record<string, unknown> };

type InfoColuna = { escolhida: Escolhida; coluna?: ColunaSchema };

// Tabelas associadas a cada modulo do sistema. Uma tabela pode pertencer a
// mais de um modulo (ex.: cliente e usada por gestor, producao e delivery);
// na tela ela aparece uma unica vez, no primeiro modulo liberado que a lista.
const MODULOS: Record<string, string[]> = {
  GESTOR: [
    'bandeira_cartao', 'categoria_pagar', 'categoria_receber', 'cliente',
    'condicao_pagamento', 'contas_pagar', 'contas_pagar_log', 'contas_receber',
    'contas_receber_log', 'forma_pagamento', 'forma_pagamento_condicao',
    'fornecedor', 'lancamento_automatico_config', 'venda_pagamento',
    'pagamentos_efetuados', 'titulos_pagar', 'licenca_titulos_pagar',
    'licenca_titulos_pagar_solicitacao',
  ],
  PRODUCAO: [
    'adicional', 'adicional_produto_classificacao', 'compra_insumo',
    'compra_insumo_item', 'compra_insumo_old', 'compra_insumo_pagamento',
    'custo_adicional_tipo', 'estoque_insumo', 'estoque_produto_fabricado',
    'fabricacao', 'fabricacao_custo_adicional', 'insumo', 'marca',
    'perda_insumo', 'perda_produto_fabricado', 'produto_adicional',
    'produto_classificacao', 'produto_fabricado', 'produto_venda',
    'receita_ingrediente', 'uso_consumo', 'venda_produto',
    'venda_produto_item', 'venda_produto_item_adicional',
    'venda_produto_item_removido', 'venda_produto_old', 'produto_venda_item',
    'cliente', 'fornecedor', 'forma_pagamento', 'forma_pagamento_condicao',
    'condicao_pagamento', 'bandeira_cartao',
  ],
  'HORAS TRABALHADAS': [
    'horas_abatidas', 'horas_baixa_saldo_geral', 'horas_excedidas',
    'horas_saldo_diario', 'horas_saldo_mensal', 'horas_trabalhadas',
    'lanc_horas_trabalhadas', 'servico', 'horas_excedidas_ponto',
    'cliente', 'usuario',
  ],
  DELIVERY: [
    'encomenda', 'encomenda_avaliacao', 'encomenda_endereco_entrega',
    'encomenda_item', 'encomenda_item_adicional', 'encomenda_item_removido',
    'encomenda_pagamento', 'empresa_regiao_entrega',
    'cliente', 'forma_pagamento', 'forma_pagamento_condicao',
    'condicao_pagamento', 'bandeira_cartao', 'marca',
    'adicional', 'adicional_produto_classificacao', 'produto_adicional',
    'produto_classificacao', 'produto_venda', 'produto_venda_item',
    'produto_fabricado', 'receita_ingrediente', 'insumo', 'fabricacao',
    'fabricacao_custo_adicional', 'custo_adicional_tipo', 'venda_produto',
    'venda_produto_item', 'venda_produto_item_adicional',
    'venda_produto_item_removido', 'venda_produto_old',
  ],
  'TITULOS A PAGAR': [
    'titulos_pagar', 'pagamentos_efetuados', 'licenca_titulos_pagar',
    'licenca_titulos_pagar_solicitacao', 'categoria_pagar',
  ],
  'PONTO ELETRONICO': [
    'lanc_horas_trabalhadas', 'horas_excedidas_ponto', 'horas_abatidas',
    'servico', 'cliente', 'usuario',
  ],
  GERAL: [
    'empresa', 'empresa_modulo', 'empresa_sequences', 'formulario', 'modulo',
    'modulo_formulario', 'permissao', 'usuario', 'usuario_empresa',
    'usuario_formulario', 'usuario_formulario_permissao',
    'empresa_llm_config', 'empresa_token_acesso', 'mensagem', 'mensagem_leitura',
  ],
};

// Normaliza o nome do modulo vindo do banco (ex.: "PONTO ELETRÔNICO")
// para a chave usada em MODULOS ("PONTO ELETRONICO").
function normalizarModulo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const TABELAS_MAPEADAS = new Set(Object.values(MODULOS).flat());

function fmtCelula(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Identidade estavel da coluna escolhida (independente do apelido exibido).
function chaveColuna(e: Pick<Escolhida, 'tabela' | 'coluna'>): string {
  return `${e.tabela}.${e.coluna}`;
}

// Nome que a coluna recebe no resultado (alias quando informado).
function chaveResultado(e: Escolhida): string {
  return (e.apelido ?? '').trim() || e.coluna;
}

// Colunas json/array nao tem operador de ordenacao no Postgres.
function colunaOrdenavel(c: ColunaSchema): boolean {
  const t = c.tipo.toLowerCase();
  return !t.includes('json') && !t.includes('array') && !t.includes('bytea');
}

function escolhidaOrdenavel(schema: SchemaDB | null, e: Escolhida): boolean {
  const col = schema?.tabelas
    .find((t) => t.nome === e.tabela)
    ?.colunas.find((c) => c.nome === e.coluna);
  return !col || colunaOrdenavel(col);
}

// Ordena valores de grupo de forma natural, mas so devolve 0 quando os textos
// sao identicos (mesma regra usada para detectar a troca de grupo).
function compararValores(a: unknown, b: unknown): number {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  if (sa === sb) return 0;
  return sa.localeCompare(sb, 'pt-BR', { numeric: true }) || (sa < sb ? -1 : 1);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function numeroDe(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  const normalizado = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

interface DataHora {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

function extrairDataHora(v: unknown): DataHora | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return {
      y: v.getFullYear(),
      mo: v.getMonth() + 1,
      d: v.getDate(),
      h: v.getHours(),
      mi: v.getMinutes(),
      s: v.getSeconds(),
    };
  }
  const texto = String(v);
  let m = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    return {
      y: +m[1],
      mo: +m[2],
      d: +m[3],
      h: +(m[4] ?? 0),
      mi: +(m[5] ?? 0),
      s: +(m[6] ?? 0),
    };
  }
  m = texto.match(
    /^(\d{2})[/-](\d{2})[/-](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    return {
      y: +m[3],
      mo: +m[2],
      d: +m[1],
      h: +(m[4] ?? 0),
      mi: +(m[5] ?? 0),
      s: +(m[6] ?? 0),
    };
  }
  m = texto.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return { y: 0, mo: 0, d: 0, h: +m[1], mi: +m[2], s: +(m[3] ?? 0) };
  }
  const dt = new Date(texto);
  if (!isNaN(dt.getTime())) {
    return {
      y: dt.getFullYear(),
      mo: dt.getMonth() + 1,
      d: dt.getDate(),
      h: dt.getHours(),
      mi: dt.getMinutes(),
      s: dt.getSeconds(),
    };
  }
  return null;
}

function formatarData(v: unknown): string {
  const dt = extrairDataHora(v);
  if (!dt) return fmtCelula(v);
  return `${pad2(dt.d)}/${pad2(dt.mo)}/${String(dt.y).padStart(4, '0')}`;
}

function formatarDataManual(v: unknown, pattern: string): string {
  const dt = extrairDataHora(v);
  if (!dt) return fmtCelula(v);
  const tokens: Record<string, string> = {
    yyyy: String(dt.y).padStart(4, '0'),
    yy: pad2(dt.y % 100),
    MM: pad2(dt.mo),
    M: String(dt.mo),
    dd: pad2(dt.d),
    d: String(dt.d),
    HH: pad2(dt.h),
    H: String(dt.h),
    mm: pad2(dt.mi),
    m: String(dt.mi),
    ss: pad2(dt.s),
    s: String(dt.s),
  };
  return pattern.replace(/yyyy|yy|MM|M|dd|d|HH|H|mm|m|ss|s/g, (t) => tokens[t] ?? t);
}

function formatarMoeda(v: unknown): string {
  const n = numeroDe(v);
  if (n === null) return fmtCelula(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDecimal(v: unknown): string {
  const n = numeroDe(v);
  if (n === null) return fmtCelula(v);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarCnpj(v: unknown): string {
  const digitos = String(v ?? '').replace(/\D/g, '');
  if (digitos.length === 14) {
    return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return fmtCelula(v);
}

function formatarCpf(v: unknown): string {
  const digitos = String(v ?? '').replace(/\D/g, '');
  if (digitos.length === 11) {
    return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return fmtCelula(v);
}

function formatarTelefone(v: unknown): string {
  const digitos = String(v ?? '').replace(/\D/g, '');
  if (digitos.length === 11) {
    return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (digitos.length === 10) {
    return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return fmtCelula(v);
}

function formatarPercentual(v: unknown): string {
  const n = numeroDe(v);
  if (n === null) return fmtCelula(v);
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatarInteiro(v: unknown): string {
  const n = numeroDe(v);
  if (n === null) return fmtCelula(v);
  return Math.round(n).toLocaleString('pt-BR');
}

function formatarDataHora(v: unknown): string {
  const dt = extrairDataHora(v);
  if (!dt) return fmtCelula(v);
  return `${pad2(dt.d)}/${pad2(dt.mo)}/${String(dt.y).padStart(4, '0')} ${pad2(dt.h)}:${pad2(dt.mi)}`;
}

// Converte horas decimais (ex.: 4,5) em HH:MM:SS (04:30:00).
function horasDecimaisParaHms(n: number): string {
  const totalSeg = Math.round(Math.abs(n) * 3600);
  const sinal = n < 0 ? '-' : '';
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  return `${sinal}${String(h).padStart(2, '0')}:${pad2(m)}:${pad2(s)}`;
}

// Hora do dia no formato HH:NN:SS (00-23). Aceita time do banco ("14:30:00"),
// timestamp ("2026-11-26T14:30:00"), Date e horas decimais (4,5 -> 04:30:00).
// Datas sem horario retornam "-" (em vez de inventar 00:00:00).
function formatarHora(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  const texto = typeof v === 'string' ? v.trim() : '';

  if (typeof v === 'number' || /^-?\d+([.,]\d+)?$/.test(texto)) {
    const n = numeroDe(v);
    if (n !== null) return horasDecimaisParaHms(n);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto) || /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(texto)) {
    return '-';
  }

  const dt = extrairDataHora(v);
  if (!dt) return fmtCelula(v);
  return `${pad2(dt.h)}:${pad2(dt.mi)}:${pad2(dt.s)}`;
}

// Duracao no formato HHH:NN:SS, permitindo horas acima de 23 (ex.: 55:39:11).
// Aceita o texto ja convertido pelo backend ("55:39:11"), intervalos com dias
// ("2 days 07:39:11"), timestamps e numeros (interpretados como horas).
function formatarTempo(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  const padH = (h: number) => String(h).padStart(2, '0');
  const texto = String(v).trim();

  const comDias = texto.match(
    /^(-?)(?:(\d+)\s+days?\s+)?(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?$/i,
  );
  if (comDias) {
    const sinal = comDias[1] ?? '';
    const dias = Number(comDias[2] ?? 0);
    const horas = dias * 24 + Number(comDias[3]);
    const minutos = Number(comDias[4]);
    const segundos = Number(comDias[5] ?? 0);
    return `${sinal}${padH(horas)}:${pad2(minutos)}:${pad2(segundos)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(texto)) {
    const dt = extrairDataHora(texto);
    if (dt) return `${padH(dt.h)}:${pad2(dt.mi)}:${pad2(dt.s)}`;
  }

  const n = numeroDe(v);
  if (n !== null) return horasDecimaisParaHms(n);

  return fmtCelula(v);
}

// Mascara livre baseada em digitos (ex.: 000.000.000-00, (00) 00000-0000).
// Os caracteres 0/# sao preenchidos pelos digitos do valor; o restante e
// tratado como literal, permitindo qualquer formato informado pelo usuario.
function aplicarMascaraDigitos(v: unknown, pattern: string): string {
  const digitos = String(v ?? '').replace(/\D/g, '');
  if (!digitos) return fmtCelula(v);
  let indice = 0;
  let saida = '';
  for (const ch of pattern) {
    if (ch === '0' || ch === '#') {
      if (indice >= digitos.length) break;
      saida += digitos[indice++];
    } else {
      saida += ch;
    }
  }
  if (indice < digitos.length) saida += digitos.slice(indice);
  return saida;
}

function formatarNumeroManual(v: unknown, pattern: string): string {
  const n = numeroDe(v);
  if (n === null) return fmtCelula(v);
  const m = pattern.match(/[#0][#0.,]*/);
  if (!m) return fmtCelula(v);
  const numerico = m[0];
  const inicio = m.index ?? 0;
  const prefixo = pattern.slice(0, inicio);
  const sufixo = pattern.slice(inicio + numerico.length);
  const decMatch = numerico.match(/[.,]([0#]+)$/);
  const parteDecimal = decMatch?.[1] ?? '';
  const minimo = (parteDecimal.match(/0/g) ?? []).length;
  const maximo = (parteDecimal.match(/[0#]/g) ?? []).length;
  const parteInteira = decMatch
    ? numerico.slice(0, numerico.length - decMatch[0].length)
    : numerico;
  const agrupar = /[.,]/.test(parteInteira);
  const formatado = n.toLocaleString('pt-BR', {
    minimumFractionDigits: minimo,
    maximumFractionDigits: maximo,
    useGrouping: agrupar,
  });
  return `${prefixo}${formatado}${sufixo}`;
}

function formatarValor(v: unknown, info?: InfoColuna): string {
  const formato = info?.escolhida.formato ?? 'auto';
  if (formato === 'moeda') return formatarMoeda(v);
  if (formato === 'decimal') return formatarDecimal(v);
  if (formato === 'inteiro') return formatarInteiro(v);
  if (formato === 'percentual') return formatarPercentual(v);
  if (formato === 'data') return formatarData(v);
  if (formato === 'datahora') return formatarDataHora(v);
  if (formato === 'hora') return formatarHora(v);
  if (formato === 'tempo') return formatarTempo(v);
  if (formato === 'cnpj') return formatarCnpj(v);
  if (formato === 'cpf') return formatarCpf(v);
  if (formato === 'telefone') return formatarTelefone(v);
  if (formato === 'manual') {
    const pattern = (info?.escolhida.formatoManual ?? '').trim();
    if (!pattern) return fmtCelula(v);
    const cat = info?.coluna ? categoriaColuna(info.coluna) : 'texto';
    if (cat === 'data' || cat === 'hora') return formatarDataManual(v, pattern);
    if (cat === 'numero') return formatarNumeroManual(v, pattern);
    if (/yyyy|yy|dd|MM|HH|mm|ss/i.test(pattern)) return formatarDataManual(v, pattern);
    if (/[0#]/.test(pattern)) return aplicarMascaraDigitos(v, pattern);
  }
  return fmtCelula(v);
}

function alinhamentoDe(info?: InfoColuna): AlinhamentoColuna {
  return info?.escolhida.alinhamento ?? 'left';
}

// ------------------------- Filtros (WHERE) -------------------------

interface Filtro {
  id: number;
  tabela: string;
  coluna: string;
  operador: string;
  valor: string;
  valor2: string;
  conector: 'E' | 'OU';
}

type Categoria = 'texto' | 'numero' | 'data' | 'hora' | 'booleano';

interface OpDef {
  valor: string;
  label: string;
  precisaValor?: boolean;
  precisaDois?: boolean;
  precisaLista?: boolean;
}

// Todos os operadores disponiveis por categoria de coluna.
const OPERADORES: Record<Categoria, OpDef[]> = {
  texto: [
    { valor: 'contem', label: 'contém', precisaValor: true },
    { valor: 'nao_contem', label: 'não contém', precisaValor: true },
    { valor: 'igual', label: 'é igual a', precisaValor: true },
    { valor: 'diferente', label: 'é diferente de', precisaValor: true },
    { valor: 'comeca', label: 'começa com', precisaValor: true },
    { valor: 'termina', label: 'termina com', precisaValor: true },
    { valor: 'em', label: 'está na lista (separar com ,)', precisaLista: true },
    { valor: 'vazio', label: 'está vazio (NULL)' },
    { valor: 'nao_vazio', label: 'não está vazio' },
  ],
  numero: [
    { valor: 'igual', label: 'é igual a', precisaValor: true },
    { valor: 'diferente', label: 'é diferente de', precisaValor: true },
    { valor: 'maior', label: 'maior que', precisaValor: true },
    { valor: 'menor', label: 'menor que', precisaValor: true },
    { valor: 'maior_igual', label: 'maior ou igual a', precisaValor: true },
    { valor: 'menor_igual', label: 'menor ou igual a', precisaValor: true },
    { valor: 'entre', label: 'entre (faixa)', precisaDois: true },
    { valor: 'em', label: 'está na lista (separar com ,)', precisaLista: true },
    { valor: 'vazio', label: 'está vazio (NULL)' },
    { valor: 'nao_vazio', label: 'não está vazio' },
  ],
  data: [
    { valor: 'periodo', label: 'está no período', precisaDois: true },
    { valor: 'igual', label: 'é igual ao dia', precisaValor: true },
    { valor: 'antes', label: 'é anterior a', precisaValor: true },
    { valor: 'depois', label: 'é posterior a', precisaValor: true },
    { valor: 'em', label: 'está na lista de dias (separar com ,)', precisaLista: true },
    { valor: 'vazio', label: 'está vazio (NULL)' },
    { valor: 'nao_vazio', label: 'não está vazio' },
  ],
  hora: [
    { valor: 'igual', label: 'é igual a', precisaValor: true },
    { valor: 'antes', label: 'é anterior a', precisaValor: true },
    { valor: 'depois', label: 'é posterior a', precisaValor: true },
    { valor: 'entre', label: 'está entre', precisaDois: true },
    { valor: 'vazio', label: 'está vazio (NULL)' },
    { valor: 'nao_vazio', label: 'não está vazio' },
  ],
  booleano: [
    { valor: 'verdadeiro', label: 'é VERDADEIRO (true)' },
    { valor: 'falso', label: 'é FALSO (false)' },
    { valor: 'vazio', label: 'está vazio (NULL)' },
    { valor: 'nao_vazio', label: 'não está vazio' },
  ],
};

function categoriaColuna(c: ColunaSchema): Categoria {
  const t = c.tipo.toLowerCase();
  if (t.includes('timestamp')) return 'data';
  if (t.includes('date')) return 'data';
  if (t.includes('time')) return 'hora';
  if (t.includes('boolean')) return 'booleano';
  if (['bigint', 'integer', 'smallint', 'numeric', 'decimal', 'real', 'double', 'money', 'serial'].some((x) => t.includes(x))) {
    return 'numero';
  }
  return 'texto';
}

function operadorPadrao(cat: Categoria): string {
  if (cat === 'data') return 'periodo';
  if (cat === 'texto') return 'contem';
  if (cat === 'booleano') return 'verdadeiro';
  return 'igual';
}

function aspas(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

function escapaLike(v: string): string {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const RE_NUMERO = /^-?\d+(\.\d+)?$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^\d{1,2}:\d{2}(:\d{2})?$/;
const RE_LISTA_DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataBR(iso: string): string {
  if (!RE_DATA.test(iso)) return iso;
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function montarCondicao(
  col: ColunaSchema,
  ref: string,
  f: Filtro,
): { sql: string | null; erro: string | null } {
  const cat = categoriaColuna(col);
  const op = f.operador;
  const semValor = op === 'vazio' || op === 'nao_vazio' || op === 'verdadeiro' || op === 'falso';

  if (op === 'vazio') return { sql: `${ref} IS NULL`, erro: null };
  if (op === 'nao_vazio') return { sql: `${ref} IS NOT NULL`, erro: null };
  if (cat === 'booleano') {
    return { sql: op === 'falso' ? `${ref} IS FALSE` : `${ref} IS TRUE`, erro: null };
  }

  const v1 = f.valor.trim();
  const v2 = f.valor2.trim();
  const opDef = OPERADORES[cat].find((o) => o.valor === op);
  if (!opDef) return { sql: null, erro: `Filtro de ${ref}: operador inválido.` };
  if (opDef.precisaValor && !v1) return { sql: null, erro: `Filtro em ${ref}: informe o valor.` };
  if (opDef.precisaDois && (!v1 || !v2)) {
    return { sql: null, erro: `Filtro em ${ref}: informe início e fim.` };
  }
  if (opDef.precisaLista && !v1) return { sql: null, erro: `Filtro em ${ref}: informe os valores.` };
  if (semValor) return { sql: null, erro: null };

  if (cat === 'texto') {
    const lista = v1
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    switch (op) {
      case 'contem':
        return { sql: `${ref} LIKE ${aspas(`%${escapaLike(v1)}%`)} ESCAPE '\\'`, erro: null };
      case 'nao_contem':
        return { sql: `${ref} NOT LIKE ${aspas(`%${escapaLike(v1)}%`)} ESCAPE '\\'`, erro: null };
      case 'igual':
        return { sql: `${ref} = ${aspas(v1)}`, erro: null };
      case 'diferente':
        return { sql: `${ref} <> ${aspas(v1)}`, erro: null };
      case 'comeca':
        return { sql: `${ref} LIKE ${aspas(`${escapaLike(v1)}%`)} ESCAPE '\\'`, erro: null };
      case 'termina':
        return { sql: `${ref} LIKE ${aspas(`%${escapaLike(v1)}`)} ESCAPE '\\'`, erro: null };
      case 'em':
        if (!lista.length) return { sql: null, erro: `Filtro em ${ref}: informe os valores.` };
        return { sql: `${ref} IN (${lista.map(aspas).join(', ')})`, erro: null };
    }
    return { sql: null, erro: `Filtro em ${ref}: operador inválido.` };
  }

  if (cat === 'numero') {
    switch (op) {
      case 'entre':
        if (!RE_NUMERO.test(v1) || !RE_NUMERO.test(v2)) {
          return { sql: null, erro: `Filtro em ${ref}: use valores numéricos na faixa (ex.: 10 e 100).` };
        }
        return { sql: `${ref} BETWEEN ${v1} AND ${v2}`, erro: null };
      case 'em': {
        const lista = v1.split(',').map((x) => x.trim()).filter(Boolean);
        if (!lista.length || lista.some((x) => !RE_NUMERO.test(x))) {
          return { sql: null, erro: `Filtro em ${ref}: lista numérica inválida (ex.: 1, 2, 3).` };
        }
        return { sql: `${ref} IN (${lista.join(', ')})`, erro: null };
      }
      case 'igual':
      case 'diferente':
      case 'maior':
      case 'menor':
      case 'maior_igual':
      case 'menor_igual': {
        if (!RE_NUMERO.test(v1)) {
          return { sql: null, erro: `Filtro em ${ref}: valor numérico inválido.` };
        }
        const operadorSql: Record<string, string> = {
          igual: '=',
          diferente: '<>',
          maior: '>',
          menor: '<',
          maior_igual: '>=',
          menor_igual: '<=',
        };
        return { sql: `${ref} ${operadorSql[op]} ${v1}`, erro: null };
      }
    }
    return { sql: null, erro: `Filtro em ${ref}: operador inválido.` };
  }

  if (cat === 'data') {
    // Colunas timestamp sao comparadas como data (dia cheio).
    const refData = col.tipo.toLowerCase().includes('timestamp') ? `${ref}::date` : ref;
    switch (op) {
      case 'periodo':
        if (!RE_DATA.test(v1) || !RE_DATA.test(v2)) {
          return { sql: null, erro: `Filtro em ${ref}: datas inválidas no período.` };
        }
        if (v1 > v2) {
          return { sql: null, erro: `Filtro em ${ref}: o início do período é posterior ao fim.` };
        }
        return { sql: `${refData} BETWEEN ${aspas(v1)} AND ${aspas(v2)}`, erro: null };
      case 'igual':
      case 'antes':
      case 'depois': {
        if (!RE_DATA.test(v1)) return { sql: null, erro: `Filtro em ${ref}: data inválida.` };
        const operadorSql: Record<string, string> = { igual: '=', antes: '<', depois: '>' };
        return { sql: `${refData} ${operadorSql[op]} ${aspas(v1)}`, erro: null };
      }
      case 'em': {
        const lista = v1.split(',').map((x) => x.trim()).filter(Boolean);
        if (!lista.length || lista.some((x) => !RE_LISTA_DATA.test(x))) {
          return { sql: null, erro: `Filtro em ${ref}: lista de datas inválida (ex.: 2026-10-01, 2026-10-15).` };
        }
        return { sql: `${refData} IN (${lista.map(aspas).join(', ')})`, erro: null };
      }
    }
    return { sql: null, erro: `Filtro em ${ref}: operador inválido.` };
  }

  if (cat === 'hora') {
    switch (op) {
      case 'entre':
        if (!RE_HORA.test(v1) || !RE_HORA.test(v2)) {
          return { sql: null, erro: `Filtro em ${ref}: horários inválidos (ex.: 08:00 e 18:00).` };
        }
        return { sql: `${ref} BETWEEN ${aspas(v1)} AND ${aspas(v2)}`, erro: null };
      case 'igual':
      case 'antes':
      case 'depois': {
        if (!RE_HORA.test(v1)) {
          return { sql: null, erro: `Filtro em ${ref}: horário inválido (ex.: 08:00).` };
        }
        const operadorSql: Record<string, string> = { igual: '=', antes: '<', depois: '>' };
        return { sql: `${ref} ${operadorSql[op]} ${aspas(v1)}`, erro: null };
      }
    }
    return { sql: null, erro: `Filtro em ${ref}: operador inválido.` };
  }

  return { sql: null, erro: `Filtro em ${ref}: coluna não suportada.` };
}

function descricaoFiltro(f: Filtro): string {
  const ref = `${f.tabela}.${f.coluna}`;
  const v1 = f.valor.trim();
  const v2 = f.valor2.trim();
  // Recupera o label legivel do operador (busca em todas as categorias).
  let label = f.operador;
  for (const lista of Object.values(OPERADORES)) {
    const o = lista.find((x) => x.valor === f.operador);
    if (o) label = o.label;
  }
  const formatar = (v: string) => (RE_DATA.test(v) ? dataBR(v) : v);
  const valores = v2 ? `${formatar(v1)} a ${formatar(v2)}` : formatar(v1);
  return `${ref} ${label}${v1 ? ` ${valores}` : ''}`;
}

function temEmpresaNaPK(tabela?: TabelaSchema): boolean {
  return !!tabela?.colunas.some((c) => c.nome === 'empresa_id' && c.pk);
}

function temColunaEmpresa(tabela?: TabelaSchema): boolean {
  return !!tabela?.colunas.some((c) => c.nome === 'empresa_id');
}

// Quando a tabela que entra no JOIN tem empresa_id na chave primaria, a
// igualdade de empresa_id precisa fazer parte do ON. Vale para LEFT JOIN e
// INNER JOIN: assim a juncao nao cruza empresas e o LEFT JOIN continua
// preservando as linhas sem correspondencia.
function condEmpresaJoin(
  mapa: Map<string, TabelaSchema>,
  tabelaJuntada: string,
  tabelaExistente: string,
  schema: SchemaDB,
): string {
  const juntada = mapa.get(tabelaJuntada);
  if (!temEmpresaNaPK(juntada)) return '';
  const existente = mapa.get(tabelaExistente);
  if (temColunaEmpresa(existente)) {
    return ` AND ${tabelaJuntada}.empresa_id = ${tabelaExistente}.empresa_id`;
  }
  return ` AND ${tabelaJuntada}.empresa_id = ${schema.empresa_id}`;
}

// Apelidos viram identificadores entre aspas no SELECT; restringimos a letras,
// numeros, espaco e _ para nao permitir quebra da consulta.
const RE_APELIDO = /^[A-Za-zÀ-ÿ0-9_ ]+$/;

// Monta o SELECT: tabela base = primeira coluna arrastada; demais tabelas sao
// conectadas via cadeia de chaves estrangeiras (JOIN automatico).
function gerarSQL(
  schema: SchemaDB,
  escolhidas: Escolhida[],
  juncao: 'LEFT JOIN' | 'INNER JOIN',
  filtros: Filtro[],
  agrupar: string[],
  ordenar: Ordenacao[],
): { sql: string; erro: string | null } {
  if (!escolhidas.length) return { sql: '', erro: null };

  // Os apelidos definem os titulos das colunas no resultado; precisam ser
  // unicos (senao uma coluna sobrescreveria a outra) e seguros para o SQL.
  const nomesUsados = new Map<string, string>();
  for (const e of escolhidas) {
    const apelido = (e.apelido ?? '').trim();
    if (apelido && !RE_APELIDO.test(apelido)) {
      return {
        sql: '',
        erro: `Apelido invalido em ${e.tabela}.${e.coluna}: use letras, numeros, espaco e _ (sem aspas ou pontuacao).`,
      };
    }
    const nome = apelido || e.coluna;
    const anterior = nomesUsados.get(nome);
    if (anterior) {
      return {
        sql: '',
        erro: `O nome "${nome}" ficou repetido (${anterior} e ${e.tabela}.${e.coluna}). Defina um apelido para diferenciar.`,
      };
    }
    nomesUsados.set(nome, `${e.tabela}.${e.coluna}`);
  }

  const porTabela = new Map<string, string[]>();
  const ordem: string[] = [];
  for (const e of escolhidas) {
    if (!porTabela.has(e.tabela)) {
      porTabela.set(e.tabela, []);
      ordem.push(e.tabela);
    }
    const cols = porTabela.get(e.tabela)!;
    if (!cols.includes(e.coluna)) cols.push(e.coluna);
  }

  const mapa = new Map(schema.tabelas.map((t) => [t.nome, t]));
  const base = ordem[0];
  const jaJuntables = new Set<string>([base]);
  const joins: string[] = [];
  const restantes = ordem.slice(1);

  let progresso = true;
  while (restantes.length && progresso) {
    progresso = false;
    for (let i = 0; i < restantes.length; i++) {
      const candidata = restantes[i];
      const tCand = mapa.get(candidata);
      let achou: string | null = null;

      // 1) Uma tabela ja juntable referencia a candidata (fato -> dimensao):
      // e a associacao mais direta e desejavel em relatorios.
      // FKs de empresa_id sao ignoradas: ligam empresas/escopos, nao entidades,
      // e gerariam juncoes com produto cartesiano.
      for (const j of jaJuntables) {
        const tJ = mapa.get(j);
        if (!tJ) continue;
        for (const fk of tJ.fk) {
          if (fk.coluna === 'empresa_id' || fk.coluna_ref === 'empresa_id') continue;
          if (fk.tabela_ref === candidata) {
            achou =
              `${juncao} ${candidata} ON ${j}.${fk.coluna} = ${candidata}.${fk.coluna_ref}` +
              condEmpresaJoin(mapa, candidata, j, schema);
            break;
          }
        }
        if (achou) break;
      }
      // 2) A candidata referencia uma tabela ja juntable (filha -> pai).
      if (!achou && tCand) {
        for (const fk of tCand.fk) {
          if (fk.coluna === 'empresa_id' || fk.coluna_ref === 'empresa_id') continue;
          if (jaJuntables.has(fk.tabela_ref)) {
            achou =
              `${juncao} ${candidata} ON ${candidata}.${fk.coluna} = ${fk.tabela_ref}.${fk.coluna_ref}` +
              condEmpresaJoin(mapa, candidata, fk.tabela_ref, schema);
            break;
          }
        }
      }

      if (achou) {
        joins.push(achou);
        jaJuntables.add(candidata);
        restantes.splice(i, 1);
        progresso = true;
        break;
      }
    }
  }

  if (restantes.length) {
    return {
      sql: '',
      erro: `Sem relacao (chave estrangeira) entre as tabelas: ${restantes.join(', ')} e as demais selecionadas. Arraste tambem as tabelas que fazem a ligacao (ex.: cliente, usuario).`,
    };
  }

  const selectCols = escolhidas.map((e) => {
    const expr = `${e.tabela}.${e.coluna}`;
    const apelido = (e.apelido ?? '').trim();
    return apelido ? `${expr} AS "${apelido}"` : expr;
  });

  const where: string[] = [];
  for (const t of jaJuntables) {
    const tabela = mapa.get(t);
    if (!tabela?.tem_empresa) continue;
    // Tabelas com empresa_id na PK ja entram com a igualdade no ON do JOIN;
    // repetir no WHERE quebraria o LEFT JOIN (filtraria linhas sem par).
    if (t !== base && temEmpresaNaPK(tabela)) continue;
    where.push(`${t}.empresa_id = ${schema.empresa_id}`);
  }

  // Filtros do usuario (WHERE): condicoes encadeadas da esquerda p/ direita,
  // cada uma entre parenteses para nao brigar com precedencia de AND/OR.
  const parcial: Array<{ conector: 'E' | 'OU'; sql: string }> = [];
  for (const f of filtros) {
    const col = mapa.get(f.tabela)?.colunas.find((c) => c.nome === f.coluna);
    if (!col) continue; // coluna ja removida do relatorio
    const r = montarCondicao(col, `${f.tabela}.${f.coluna}`, f);
    if (r.erro) return { sql: '', erro: r.erro };
    if (r.sql) parcial.push({ conector: f.conector, sql: r.sql });
  }
  let combo: string | null = null;
  for (const p of parcial) {
    combo =
      combo === null ? `(${p.sql})` : `(${combo}) ${p.conector === 'OU' ? 'OR' : 'AND'} (${p.sql})`;
  }
  if (combo) where.push(combo);

  const linhasSql = [`SELECT`, `  ${selectCols.join(',\n  ')}`, `FROM ${base}`, ...joins];
  if (where.length) linhasSql.push(`WHERE ${where.join('\n  AND ')}`);

  // O agrupamento e visual, mas ordenar no banco mantem os grupos contiguos
  // mesmo com o limite de linhas do backend. A ordenacao do usuario entra
  // depois das colunas de grupo (para nao quebrar os niveis) e respeita ASC/DESC.
  const gruposSql = agrupar
    .map((chave) => escolhidas.find((e) => chaveColuna(e) === chave))
    .filter((e): e is Escolhida => !!e)
    .filter((e) => {
      const col = mapa.get(e.tabela)?.colunas.find((c) => c.nome === e.coluna);
      return !col || colunaOrdenavel(col);
    })
    .map((e) => `${e.tabela}.${e.coluna}`);

  const ordenarSql = ordenar
    .map((o) => ({ o, e: escolhidas.find((e) => chaveColuna(e) === o.chave) }))
    .filter(
      (x): x is { o: Ordenacao; e: Escolhida } => !!x.e && !agrupar.includes(x.o.chave),
    )
    .filter(({ e }) => {
      const col = mapa.get(e.tabela)?.colunas.find((c) => c.nome === e.coluna);
      return !col || colunaOrdenavel(col);
    })
    .map(({ o, e }) => `${e.tabela}.${e.coluna} ${o.direcao}`);

  const ordemSql = [...gruposSql, ...ordenarSql];
  if (ordemSql.length) linhasSql.push(`ORDER BY ${ordemSql.join(', ')}`);

  return { sql: linhasSql.join('\n'), erro: null };
}

export function MontarRelatorio() {
  const [schema, setSchema] = useState<SchemaDB | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroSchema, setErroSchema] = useState('');
  const [busca, setBusca] = useState('');
  const [escolhidas, setEscolhidas] = useState<Escolhida[]>([]);
  const [juncao, setJuncao] = useState<'LEFT JOIN' | 'INNER JOIN'>('LEFT JOIN');
  const [filtros, setFiltros] = useState<Filtro[]>([]);
  const [agrupar, setAgrupar] = useState<string[]>([]);
  const [ordenar, setOrdenar] = useState<Ordenacao[]>([]);
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [erro, setErro] = useState('');
  // Controle do arrastar-e-soltar para reordenar as colunas escolhidas.
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvoArrasto, setAlvoArrasto] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<SchemaDB>('/relatorio-ia/schema');
        setSchema(r.data);
      } catch (e) {
        setErroSchema(getErrorMsg(e));
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const { sql, erro: erroSql } = useMemo(
    () =>
      schema
        ? gerarSQL(schema, escolhidas, juncao, filtros, agrupar, ordenar)
        : { sql: '', erro: null as string | null },
    [schema, escolhidas, juncao, filtros, agrupar, ordenar],
  );

  const adicionar = (tabela: string, coluna: string) => {
    setEscolhidas((prev) =>
      prev.some((p) => p.tabela === tabela && p.coluna === coluna)
        ? prev
        : [...prev, { tabela, coluna }],
    );
    setResultado(null);
  };

  const remover = (tabela: string, coluna: string) => {
    setEscolhidas((prev) => prev.filter((p) => !(p.tabela === tabela && p.coluna === coluna)));
    // Filtros, agrupamentos e ordenacoes da coluna removida tambem saem.
    setFiltros((prev) => prev.filter((f) => !(f.tabela === tabela && f.coluna === coluna)));
    setAgrupar((prev) => prev.filter((k) => k !== `${tabela}.${coluna}`));
    setOrdenar((prev) => prev.filter((o) => o.chave !== `${tabela}.${coluna}`));
    setResultado(null);
  };

  const renomear = (tabela: string, coluna: string, apelido: string) => {
    setEscolhidas((prev) =>
      prev.map((p) => (p.tabela === tabela && p.coluna === coluna ? { ...p, apelido } : p)),
    );
    setResultado(null);
  };

  const formatarColuna = (
    tabela: string,
    coluna: string,
    mudanca: Partial<Pick<Escolhida, 'formato' | 'formatoManual' | 'alinhamento'>>,
  ) => {
    setEscolhidas((prev) =>
      prev.map((p) =>
        p.tabela === tabela && p.coluna === coluna ? { ...p, ...mudanca } : p,
      ),
    );
    // Formatar/alinhar e apenas visual: mantem o resultado atual na tela.
  };

  const reordenarColuna = (de: string, para: string) => {
    setEscolhidas((prev) => {
      const origem = prev.findIndex((e) => chaveColuna(e) === de);
      const destino = prev.findIndex((e) => chaveColuna(e) === para);
      if (origem < 0 || destino < 0 || origem === destino) return prev;
      const copia = [...prev];
      const [item] = copia.splice(origem, 1);
      copia.splice(destino, 0, item);
      return copia;
    });
    // A ordem das colunas e apenas visual no resultado; nao precisa reexecutar.
  };

  const niveisValidos = agrupar.filter((chave) =>
    escolhidas.some((e) => chaveColuna(e) === chave),
  );

  const adicionarNivel = () => {
    // Precisa sobrar ao menos uma coluna de detalhe fora dos grupos.
    if (escolhidas.length < 2 || agrupar.length >= escolhidas.length - 1) return;
    const usados = new Set(agrupar);
    const disponivel = escolhidas.find((e) => !usados.has(chaveColuna(e)));
    if (!disponivel) return;
    const chave = chaveColuna(disponivel);
    setAgrupar((prev) => [...prev, chave]);
    // Coluna de grupo nao pode ser ordenada separadamente.
    setOrdenar((prev) => prev.filter((o) => o.chave !== chave));
    setResultado(null);
  };

  const alterarNivel = (indice: number, chave: string) => {
    setAgrupar((prev) => prev.map((v, i) => (i === indice ? chave : v)));
    setOrdenar((prev) => prev.filter((o) => o.chave !== chave));
    setResultado(null);
  };

  const removerNivel = (indice: number) => {
    setAgrupar((prev) => prev.filter((_, i) => i !== indice));
    setResultado(null);
  };

  const moverNivel = (indice: number, direcao: -1 | 1) => {
    setAgrupar((prev) => {
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= prev.length) return prev;
      const copia = [...prev];
      [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
      return copia;
    });
    setResultado(null);
  };

  const adicionarOrdenacao = () => {
    const disponiveis = escolhidas.filter(
      (e) =>
        !agrupar.includes(chaveColuna(e)) &&
        !ordenar.some((o) => o.chave === chaveColuna(e)) &&
        escolhidaOrdenavel(schema, e),
    );
    const alvo = disponiveis[0];
    if (!alvo) return;
    setOrdenar((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((o) => o.id)) + 1 : 1,
        chave: chaveColuna(alvo),
        direcao: 'ASC',
      },
    ]);
    setResultado(null);
  };

  const alterarOrdenacao = (id: number, mudanca: Partial<Ordenacao>) => {
    setOrdenar((prev) => prev.map((o) => (o.id === id ? { ...o, ...mudanca } : o)));
    setResultado(null);
  };

  const removerOrdenacao = (id: number) => {
    setOrdenar((prev) => prev.filter((o) => o.id !== id));
    setResultado(null);
  };

  const moverOrdenacao = (indice: number, direcao: -1 | 1) => {
    setOrdenar((prev) => {
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= prev.length) return prev;
      const copia = [...prev];
      [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
      return copia;
    });
    setResultado(null);
  };

  const adicionarFiltro = (tabela?: string, coluna?: string) => {
    const alvo = tabela && coluna ? { tabela, coluna } : escolhidas[0];
    if (!alvo) return;
    const col = schema?.tabelas
      .find((t) => t.nome === alvo.tabela)
      ?.colunas.find((c) => c.nome === alvo.coluna);
    const cat = col ? categoriaColuna(col) : 'texto';
    setFiltros((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((f) => f.id)) + 1 : 1,
        tabela: alvo.tabela,
        coluna: alvo.coluna,
        operador: operadorPadrao(cat),
        valor: '',
        valor2: '',
        conector: 'E',
      },
    ]);
    setResultado(null);
  };

  const atualizarFiltro = (id: number, mudanca: Partial<Filtro> & { coluna?: string }) => {
    setFiltros((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const proximo = { ...f, ...mudanca };
        // Trocou a coluna: operador/valores voltam ao padrao do novo tipo.
        if (
          (mudanca.tabela && mudanca.tabela !== f.tabela) ||
          (mudanca.coluna && mudanca.coluna !== f.coluna)
        ) {
          const col = schema?.tabelas
            .find((t) => t.nome === proximo.tabela)
            ?.colunas.find((c) => c.nome === proximo.coluna);
          const cat = col ? categoriaColuna(col) : 'texto';
          proximo.operador = operadorPadrao(cat);
          proximo.valor = '';
          proximo.valor2 = '';
        }
        return proximo;
      }),
    );
    setResultado(null);
  };

  const removerFiltro = (id: number) => {
    setFiltros((prev) => prev.filter((f) => f.id !== id));
    setResultado(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    try {
      const { tabela, coluna } = JSON.parse(raw) as { tabela?: string; coluna?: string };
      if (tabela && coluna) adicionar(tabela, coluna);
    } catch {
      // payload invalido - ignora
    }
  };

  const executar = async () => {
    if (!sql) return;
    setExecutando(true);
    setErro('');
    try {
      const r = await api.post<ResultadoConsulta>('/relatorio-ia/executar', { sql });
      setResultado(r.data);
    } catch (e) {
      setErro(getErrorMsg(e));
      setResultado(null);
    } finally {
      setExecutando(false);
    }
  };

  // Colunas agrupadas (na ordem dos niveis) e colunas de detalhe (restante).
  const chavesGrupo = niveisValidos
    .map((chave) => escolhidas.find((e) => chaveColuna(e) === chave))
    .filter((e): e is Escolhida => !!e)
    .map(chaveResultado);

  // Ordem das colunas definida pelo usuario na montagem (arrastar para mover).
  const ordemChaves = new Map(escolhidas.map((e, i) => [chaveResultado(e), i]));
  const ordenarPorEscolhidas = (cols: string[]) =>
    [...cols].sort(
      (a, b) =>
        (ordemChaves.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (ordemChaves.get(b) ?? Number.MAX_SAFE_INTEGER),
    );

  const colunasDetalhe = resultado
    ? ordenarPorEscolhidas(resultado.colunas.filter((c) => !chavesGrupo.includes(c)))
    : [];

  const colunasVisiveis = resultado
    ? chavesGrupo.length && colunasDetalhe.length
      ? colunasDetalhe
      : ordenarPorEscolhidas(resultado.colunas)
    : [];

  // Mapeia o titulo exibido no resultado para a coluna escolhida (com formato e
  // alinhamento) e para o tipo real no schema.
  const colunasInfo = new Map<string, InfoColuna>();
  for (const e of escolhidas) {
    const coluna = schema?.tabelas
      .find((t) => t.nome === e.tabela)
      ?.colunas.find((c) => c.nome === e.coluna);
    colunasInfo.set(chaveResultado(e), { escolhida: e, coluna });
  }

  const linhasBase = resultado?.linhas ?? [];
  const linhasOrdenadas = chavesGrupo.length
    ? [...linhasBase].sort((a, b) => {
        for (const k of chavesGrupo) {
          const cmp = compararValores(a[k], b[k]);
          if (cmp) return cmp;
        }
        return 0;
      })
    : linhasBase;

  const itensTabela: ItemTabela[] = [];
  if (chavesGrupo.length) {
    let anterior: unknown[] | null = null;
    for (const linha of linhasOrdenadas) {
      const valores = chavesGrupo.map((k) => linha[k]);
      let primeiroDiferente = 0;
      if (anterior) {
        while (
          primeiroDiferente < chavesGrupo.length &&
          String(valores[primeiroDiferente] ?? '') === String(anterior[primeiroDiferente] ?? '')
        ) {
          primeiroDiferente++;
        }
      }
      for (let nivel = primeiroDiferente; nivel < chavesGrupo.length; nivel++) {
        itensTabela.push({
          tipo: 'grupo',
          nivel,
          chave: chavesGrupo[nivel],
          valor: valores[nivel],
        });
      }
      itensTabela.push({ tipo: 'linha', linha });
      anterior = valores;
    }
  }

  const descricaoGrupos = niveisValidos
    .map((chave) => {
      const e = escolhidas.find((x) => chaveColuna(x) === chave);
      return e ? `${e.tabela}.${e.coluna}` : chave;
    })
    .join(' > ');

  const ordenacaoDisponivel = escolhidas.filter(
    (e) =>
      !agrupar.includes(chaveColuna(e)) &&
      !ordenar.some((o) => o.chave === chaveColuna(e)) &&
      escolhidaOrdenavel(schema, e),
  );

  const gerarPDF = (modo: 'ver' | 'baixar') => {
    if (!resultado) return;
    const doc = buildPDFWithHeader(
      {
        title: 'Relatorio IA - Consulta montada',
        emissionDate: new Date().toLocaleString('pt-BR'),
        filters: [
          `${escolhidas.length} coluna(s)`,
          `${resultado.total_linhas} linha(s)`,
          `Juncao: ${juncao}`,
          ...(descricaoGrupos ? [`Agrupado por: ${descricaoGrupos}`] : []),
          ...filtros.map(descricaoFiltro),
        ],
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        const corpoPdf = (
          chavesGrupo.length
            ? itensTabela.map((item) => {
                if (item.tipo === 'grupo') {
                  const celula: CellDef = {
                    content: formatarValor(item.valor, colunasInfo.get(item.chave)),
                    colSpan: Math.max(colunasVisiveis.length, 1),
                    styles: {
                      fontStyle: 'bold',
                      fillColor: item.nivel === 0 ? [219, 234, 254] : [241, 245, 249],
                      textColor: [30, 41, 59],
                      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 + item.nivel * 4 },
                    },
                  };
                  return [celula];
                }
                return colunasVisiveis.map((c) =>
                  formatarValor(item.linha[c], colunasInfo.get(c)),
                );
              })
            : resultado.linhas.map((row) =>
                colunasVisiveis.map((c) => formatarValor(row[c], colunasInfo.get(c))),
              )
        ) as RowInput[];
        autoTable(d, {
          head: [colunasVisiveis],
          body: corpoPdf,
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
          didParseCell: (data) => {
            if (data.section !== 'body' && data.section !== 'head') return;
            // Linha de grupo usa uma unica celula com colSpan; mantem a esquerda.
            if (data.section === 'body' && data.cell.colSpan > 1) return;
            const col = colunasVisiveis[data.column.index];
            if (!col) return;
            data.cell.styles.halign = alinhamentoDe(colunasInfo.get(col));
            if (data.section === 'head') data.cell.styles.textColor = [255, 255, 255];
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 42;
            }
          },
        });
        const finalY =
          (d as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 200;
        if (finalY < 250) {
          d.setFontSize(7);
          d.setTextColor(120);
          d.text('Consulta utilizada (somente leitura):', 14, finalY + 10);
          d.text((d.splitTextToSize(resultado.sql, 180) as string[]).slice(0, 6), 14, finalY + 14);
        }
      },
    );
    if (modo === 'ver') viewPDF(doc);
    else downloadPDF(doc, `relatorio-ia-montado-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-text-muted gap-2">
        <Loader2 size={16} className="animate-spin" /> Carregando tabelas do banco…
      </div>
    );
  }

  if (erroSchema) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="flex-none mt-0.5" /> {erroSchema}
        </div>
      </div>
    );
  }

  const termo = busca.trim().toLowerCase();
  const tabelasFiltradas = (schema?.tabelas ?? []).filter(
    (t) =>
      !termo ||
      t.nome.toLowerCase().includes(termo) ||
      t.colunas.some((c) => c.nome.toLowerCase().includes(termo)),
  );

  // Modulos liberados para a empresa (vindos do backend). Se a lista nao vier
  // (ex.: banco antigo), exibe todos os modulos para nao esconder tabelas.
  const modulosLiberados = schema?.modulos?.length
    ? new Set(schema.modulos.map(normalizarModulo))
    : new Set(Object.keys(MODULOS));

  // Uma tabela pode pertencer a mais de um modulo (ex.: titulos_pagar esta em
  // GESTOR e em TITULOS A PAGAR; as tabelas de ponto estao em HORAS e em PONTO
  // ELETRONICO). Por isso ela aparece em cada modulo liberado que a utiliza.
  const grupos: Array<[string, TabelaSchema[]]> = [];
  for (const modulo of Object.keys(MODULOS)) {
    if (!modulosLiberados.has(modulo)) continue;
    const ts = tabelasFiltradas
      .filter((t) => MODULOS[modulo].includes(t.nome))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    if (ts.length) grupos.push([modulo, ts]);
  }

  // Tabelas sem modulo conhecido (novas tabelas ainda nao mapeadas) ficam em OUTRAS.
  const outras = tabelasFiltradas
    .filter((t) => !TABELAS_MAPEADAS.has(t.nome))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  if (outras.length) grupos.push(['OUTRAS', outras]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* ---------- Lista de tabelas por modulo ---------- */}
      <aside className="w-80 flex-none flex flex-col border-r border-border-subtle bg-bg-muted/40">
        <div className="p-3 border-b border-border-subtle">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tabela ou coluna…"
            className="w-full rounded-lg border border-border-subtle bg-bg-muted/40 px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-text-muted"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {grupos.map(([modulo, tabelas]) => (
            <details key={modulo}>
              <summary className="cursor-pointer select-none rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary hover:bg-bg-muted">
                {modulo} <span className="text-text-muted font-normal">({tabelas.length})</span>
              </summary>
              <div className="ml-2 space-y-0.5">
                {tabelas.map((t) => (
                  <details key={t.nome}>
                    <summary className="cursor-pointer select-none flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-bg-muted hover:text-text-primary">
                      <span className="truncate">{t.nome}</span>
                      {t.tem_empresa && (
                        <span className="text-[9px] rounded bg-blue-500/20 text-blue-300 px-1">
                          empresa
                        </span>
                      )}
                    </summary>
                    <div className="ml-4 mb-1 space-y-0.5">
                      {t.colunas.map((c) => (
                        <div
                          key={c.nome}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ tabela: t.nome, coluna: c.nome }),
                            );
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() => adicionar(t.nome, c.nome)}
                          title={`${t.nome}.${c.nome} (${c.tipo}) — arraste ou clique`}
                          className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs cursor-grab text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                        >
                          <GripVertical size={11} className="flex-none opacity-40" />
                          <span className="truncate">{c.nome}</span>
                          {c.pk && <span className="text-[9px] text-amber-400 flex-none">PK</span>}
                          <span className="text-[9px] text-text-muted ml-auto flex-none">
                            {c.tipo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
          {!tabelasFiltradas.length && (
            <div className="px-3 py-4 text-xs text-text-muted">Nenhuma tabela encontrada.</div>
          )}
        </div>
        <div className="p-3 border-t border-border-subtle text-[11px] text-text-muted">
          Arraste colunas para a direita. Tabelas de outros módulos são unidas
          automaticamente por chave estrangeira (JOIN).
        </div>
      </aside>

      {/* ---------- Area de montagem ---------- */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Colunas do relatório
              <span className="ml-2 text-[11px] font-normal text-text-muted">
                arraste pelo ícone para reordenar
              </span>
            </h2>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              Junção:
              <select
                value={juncao}
                onChange={(e) => setJuncao(e.target.value as 'LEFT JOIN' | 'INNER JOIN')}
                className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
              >
                <option value="LEFT JOIN">LEFT JOIN (padrão)</option>
                <option value="INNER JOIN">INNER JOIN</option>
              </select>
            </label>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="min-h-20 rounded-xl border-2 border-dashed border-border-subtle bg-bg-muted/30 p-3 flex flex-wrap gap-2 items-start content-start"
          >
            {!escolhidas.length && (
              <span className="text-xs text-text-muted py-2">
                Arraste colunas da lista da esquerda (ou clique nelas) para montar o relatório…
              </span>
            )}
            {escolhidas.map((e) => {
              const chave = chaveColuna(e);
              const arrastandoEste = arrastando === chave;
              const alvoEste = alvoArrasto === chave && arrastando !== chave;
              return (
                <span
                  key={chave}
                  onDragOver={(ev) => {
                    if (arrastando && arrastando !== chave) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setAlvoArrasto(chave);
                    }
                  }}
                  onDragLeave={() => {
                    if (alvoArrasto === chave) setAlvoArrasto(null);
                  }}
                  onDrop={(ev) => {
                    if (arrastando && arrastando !== chave) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      reordenarColuna(arrastando, chave);
                    }
                    setArrastando(null);
                    setAlvoArrasto(null);
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border bg-bg-muted px-2.5 py-1.5 text-xs transition ${
                    alvoEste ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-border-subtle'
                  } ${arrastandoEste ? 'opacity-50' : ''}`}
                >
                  <span
                    draggable
                    onDragStart={(ev) => {
                      ev.stopPropagation();
                      setArrastando(chave);
                      ev.dataTransfer.effectAllowed = 'move';
                      ev.dataTransfer.setData('text/plain', chave);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setAlvoArrasto(null);
                    }}
                    title="Arraste para mover a coluna"
                    className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary"
                  >
                    <GripVertical size={12} />
                  </span>
                  <span className="text-text-muted">{e.tabela}.</span>
                  <span className="text-text-primary font-medium">{e.coluna}</span>
                  <span className="text-[10px] text-text-muted">AS</span>
                  <input
                    value={e.apelido ?? ''}
                    onChange={(ev) => renomear(e.tabela, e.coluna, ev.target.value)}
                    placeholder="apelido"
                    maxLength={63}
                    title="Renomear esta coluna no resultado (AS)"
                    className="w-28 rounded border border-border-subtle bg-bg-base/40 px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-500 placeholder:text-text-muted"
                  />
                  <button
                    onClick={() => adicionarFiltro(e.tabela, e.coluna)}
                    className="ml-1 text-text-muted hover:text-blue-400"
                    title="Filtrar por esta coluna"
                  >
                    <Filter size={12} />
                  </button>
                  <button
                    onClick={() => remover(e.tabela, e.coluna)}
                    className="ml-1 text-text-muted hover:text-red-400"
                    title="Remover coluna"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>

          {/* ---------- Agrupamento ---------- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <ListTree size={14} /> Agrupar por{' '}
                <span className="text-text-muted font-normal">(níveis)</span>
              </h2>
              <button
                onClick={adicionarNivel}
                disabled={escolhidas.length < 2 || niveisValidos.length >= escolhidas.length - 1}
                className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
                title={
                  escolhidas.length < 2
                    ? 'Selecione ao menos duas colunas (uma para agrupar e outra de detalhe).'
                    : 'Adicionar um nível de agrupamento'
                }
              >
                <Plus size={13} /> Adicionar nível
              </button>
            </div>

            {!agrupar.length && (
              <p className="text-[11px] text-text-muted">
                Sem agrupamento. Escolha colunas acima e clique em “Adicionar nível” para agrupar
                (ex.: usuário &gt; cliente &gt; registros). As colunas usadas nos grupos não se
                repetem nas linhas de detalhe.
              </p>
            )}

            {agrupar.map((chave, idx) => {
              const usadosEmOutros = new Set(agrupar.filter((_, j) => j !== idx));
              const opcoes = escolhidas.filter((e) => !usadosEmOutros.has(chaveColuna(e)));
              const atual = escolhidas.find((e) => chaveColuna(e) === chave);
              return (
                <div
                  key={`nivel-${idx}`}
                  className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-muted/30 px-2 py-2"
                >
                  <span className="text-[11px] font-semibold text-text-secondary">
                    Nível {idx + 1}
                  </span>
                  <select
                    value={chave}
                    onChange={(e) => alterarNivel(idx, e.target.value)}
                    className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  >
                    {opcoes.map((e) => (
                      <option key={chaveColuna(e)} value={chaveColuna(e)}>
                        {e.coluna} — {e.tabela}
                        {e.apelido ? ` (${e.apelido})` : ''}
                      </option>
                    ))}
                    {!atual && <option value={chave}>{chave}</option>}
                  </select>
                  <button
                    onClick={() => moverNivel(idx, -1)}
                    disabled={idx === 0}
                    className="text-text-muted hover:text-text-primary disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => moverNivel(idx, 1)}
                    disabled={idx === agrupar.length - 1}
                    className="text-text-muted hover:text-text-primary disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    onClick={() => removerNivel(idx)}
                    className="ml-auto text-text-muted hover:text-red-400"
                    title="Remover nível"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ---------- Ordenação ---------- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <ArrowUpDown size={14} /> Ordenação{' '}
                <span className="text-text-muted font-normal">(ORDER BY)</span>
              </h2>
              <button
                onClick={adicionarOrdenacao}
                disabled={!ordenacaoDisponivel.length}
                className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
                title={
                  !escolhidas.length
                    ? 'Selecione colunas para ordenar.'
                    : agrupar.length
                      ? 'Colunas de grupo são ordenadas automaticamente primeiro.'
                      : 'Adicionar um nível de ordenação'
                }
              >
                <Plus size={13} /> Adicionar ordenação
              </button>
            </div>

            {!ordenar.length && (
              <p className="text-[11px] text-text-muted">
                Sem ordenação definida. A consulta usa a ordem natural do banco. Adicione níveis
                para ordenar por uma ou mais colunas.
              </p>
            )}

            {ordenar.map((o, idx) => {
              const opcoes = escolhidas.filter((e) => {
                const chave = chaveColuna(e);
                return (
                  !agrupar.includes(chave) &&
                  (!ordenar.some((x) => x.chave === chave) || chave === o.chave) &&
                  escolhidaOrdenavel(schema, e)
                );
              });
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-muted/30 px-2 py-2"
                >
                  <span className="text-[11px] font-semibold text-text-secondary">
                    Ordem {idx + 1}
                  </span>
                  <select
                    value={o.chave}
                    onChange={(e) => alterarOrdenacao(o.id, { chave: e.target.value })}
                    title="Coluna da ordenação"
                    className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  >
                    {opcoes.map((e) => (
                      <option key={chaveColuna(e)} value={chaveColuna(e)}>
                        {e.coluna} — {e.tabela}
                        {e.apelido ? ` (${e.apelido})` : ''}
                      </option>
                    ))}
                    {!opcoes.some((e) => chaveColuna(e) === o.chave) && (
                      <option value={o.chave}>{o.chave}</option>
                    )}
                  </select>
                  <select
                    value={o.direcao}
                    onChange={(e) =>
                      alterarOrdenacao(o.id, { direcao: e.target.value as 'ASC' | 'DESC' })
                    }
                    title="Direção da ordenação"
                    className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="ASC">Crescente (A→Z)</option>
                    <option value="DESC">Decrescente (Z→A)</option>
                  </select>
                  <button
                    onClick={() => moverOrdenacao(idx, -1)}
                    disabled={idx === 0}
                    className="text-text-muted hover:text-text-primary disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => moverOrdenacao(idx, 1)}
                    disabled={idx === ordenar.length - 1}
                    className="text-text-muted hover:text-text-primary disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    onClick={() => removerOrdenacao(o.id)}
                    className="ml-auto text-text-muted hover:text-red-400"
                    title="Remover ordenação"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
            {agrupar.length > 0 && (
              <p className="text-[11px] text-text-muted">
                As colunas de agrupamento são aplicadas primeiro no ORDER BY para manter os
                níveis contíguos.
              </p>
            )}
          </div>

          {/* ---------- Formatação e alinhamento ---------- */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Palette size={14} /> Formatação e alinhamento
            </h2>

            {!escolhidas.length && (
              <p className="text-[11px] text-text-muted">
                Adicione colunas para configurar formato e alinhamento.
              </p>
            )}

            {escolhidas.map((e) => (
              <div
                key={`${e.tabela}.${e.coluna}`}
                className="space-y-2 rounded-xl border border-border-subtle bg-bg-muted/30 px-2 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="min-w-40 truncate text-[11px] font-semibold text-text-secondary">
                    {e.coluna} <span className="font-normal text-text-muted">— {e.tabela}</span>
                  </span>
                  <select
                    value={e.formato ?? 'auto'}
                    onChange={(ev) =>
                      formatarColuna(e.tabela, e.coluna, {
                        formato: ev.target.value as FormatoColuna,
                      })
                    }
                    title="Formato de exibição (máscara)"
                    className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="auto">Automático</option>
                    <option value="moeda">Moeda (R$)</option>
                    <option value="decimal">Decimal (2 casas)</option>
                    <option value="inteiro">Inteiro</option>
                    <option value="percentual">Percentual (%)</option>
                    <option value="data">Data (dd/MM/yyyy)</option>
                    <option value="datahora">Data e hora (dd/MM/yyyy HH:mm)</option>
                    <option value="hora">Hora (HH:NN:SS)</option>
                    <option value="tempo">Tempo (HHH:NN:SS)</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="telefone">Telefone</option>
                    <option value="manual">Personalizada…</option>
                  </select>
                  <div
                    className="inline-flex overflow-hidden rounded-lg border border-border-subtle"
                    title="Alinhamento da coluna"
                  >
                    {(
                      [
                        { valor: 'left', Icone: AlignLeft, titulo: 'Alinhar à esquerda' },
                        { valor: 'center', Icone: AlignCenter, titulo: 'Centralizar' },
                        { valor: 'right', Icone: AlignRight, titulo: 'Alinhar à direita' },
                      ] as const
                    ).map(({ valor, Icone, titulo }) => {
                      const ativo = (e.alinhamento ?? 'left') === valor;
                      return (
                        <button
                          key={valor}
                          type="button"
                          onClick={() =>
                            formatarColuna(e.tabela, e.coluna, { alinhamento: valor })
                          }
                          title={titulo}
                          aria-pressed={ativo}
                          className={`px-2 py-1.5 transition ${
                            ativo
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          <Icone size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(e.formato ?? 'auto') === 'manual' && (
                  <input
                    value={e.formatoManual ?? ''}
                    onChange={(ev) =>
                      formatarColuna(e.tabela, e.coluna, { formatoManual: ev.target.value })
                    }
                    placeholder="Máscara livre: R$ #,##0.00 · #,##0.00 · 000.000.000-00 · (00) 00000-0000 · dd/MM/yyyy HH:mm"
                    className="w-full rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500 placeholder:text-text-muted"
                  />
                )}
              </div>
            ))}
          </div>

          {/* ---------- Filtros (WHERE) ---------- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Filter size={14} /> Filtros{' '}
                <span className="text-text-muted font-normal">(WHERE)</span>
              </h2>
              <button
                onClick={() => adicionarFiltro()}
                disabled={!escolhidas.length}
                className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={13} /> Adicionar filtro
              </button>
            </div>

            {!filtros.length && (
              <p className="text-[11px] text-text-muted">
                Nenhum filtro ainda. Clique no ícone <Filter size={11} className="inline align-[-2px]" />{' '}
                de uma coluna escolhida ou em “Adicionar filtro”. Cobre: texto (contém, começa com,
                lista…), número (igual, maior, faixa, lista), data (dia, período), hora e booleano.
                Vários filtros são ligados por <strong>E/OU</strong>.
              </p>
            )}

            {filtros.map((f, idx) => {
              const tabela = schema?.tabelas.find((t) => t.nome === f.tabela);
              const col = tabela?.colunas.find((c) => c.nome === f.coluna);
              const cat: Categoria = col ? categoriaColuna(col) : 'texto';
              const ops = OPERADORES[cat];
              const opDef = ops.find((o) => o.valor === f.operador) ?? ops[0];
              const tipoInput = cat === 'data' ? 'date' : cat === 'hora' ? 'time' : 'text';
              return (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-muted/30 px-2 py-2"
                >
                  {idx > 0 && (
                    <select
                      value={f.conector}
                      onChange={(e) =>
                        atualizarFiltro(f.id, { conector: e.target.value as 'E' | 'OU' })
                      }
                      title="Conector com o filtro anterior"
                      className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="E">E</option>
                      <option value="OU">OU</option>
                    </select>
                  )}
                  <select
                    value={`${f.tabela}.${f.coluna}`}
                    onChange={(e) => {
                      const ponto = e.target.value.indexOf('.');
                      if (ponto < 0) return;
                      atualizarFiltro(f.id, {
                        tabela: e.target.value.slice(0, ponto),
                        coluna: e.target.value.slice(ponto + 1),
                      });
                    }}
                    title="Coluna do relatório (título da coluna)"
                    className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  >
                    {escolhidas.map((e) => (
                      <option key={`${e.tabela}.${e.coluna}`} value={`${e.tabela}.${e.coluna}`}>
                        {e.coluna} — {e.tabela}
                      </option>
                    ))}
                  </select>
                  <select
                    value={f.operador}
                    onChange={(e) => atualizarFiltro(f.id, { operador: e.target.value, valor2: '' })}
                    title="Operador do filtro"
                    className="rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  >
                    {ops.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {opDef.precisaDois && (
                    <>
                      <input
                        type={tipoInput}
                        value={f.valor}
                        onChange={(e) => atualizarFiltro(f.id, { valor: e.target.value })}
                        placeholder={cat === 'numero' ? 'ex.: 10' : 'início'}
                        className="w-28 rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                      <span className="text-[11px] text-text-muted">a</span>
                      <input
                        type={tipoInput}
                        value={f.valor2}
                        onChange={(e) => atualizarFiltro(f.id, { valor2: e.target.value })}
                        placeholder={cat === 'numero' ? 'ex.: 100' : 'fim'}
                        className="w-28 rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </>
                  )}
                  {!opDef.precisaDois && (opDef.precisaValor || opDef.precisaLista) && (
                    <input
                      type={tipoInput}
                      value={f.valor}
                      onChange={(e) => atualizarFiltro(f.id, { valor: e.target.value })}
                      placeholder={
                        opDef.precisaLista
                          ? 'ex.: 1, 2, 3'
                          : cat === 'numero'
                            ? 'ex.: 100'
                            : 'valor'
                      }
                      className="w-40 rounded-lg border border-border-subtle bg-bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                  )}
                  {!opDef.precisaValor && !opDef.precisaDois && !opDef.precisaLista && (
                    <span className="text-[11px] text-text-muted">sem valor</span>
                  )}

                  <button
                    onClick={() => removerFiltro(f.id)}
                    className="ml-auto text-text-muted hover:text-red-400"
                    title="Remover filtro"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={executar}
              disabled={!sql || executando}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {executando ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}{' '}
              Executar consulta
            </button>
            <button
              onClick={() => gerarPDF('ver')}
              disabled={!resultado}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <FileText size={13} /> Ver PDF
            </button>
            <button
              onClick={() => gerarPDF('baixar')}
              disabled={!resultado}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              Baixar PDF
            </button>
            <button
              onClick={() => {
                setEscolhidas([]);
                setFiltros([]);
                setAgrupar([]);
                setOrdenar([]);
                setResultado(null);
                setErro('');
              }}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Limpar
            </button>
            {resultado && (
              <span className="text-[11px] text-text-muted">{resultado.total_linhas} linha(s)</span>
            )}
          </div>

          {erroSql && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <AlertCircle size={16} className="flex-none mt-0.5" /> {erroSql}
            </div>
          )}
          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="flex-none mt-0.5" /> {erro}
            </div>
          )}

          {sql && (
            <details open>
              <summary className="cursor-pointer text-[11px] text-text-muted hover:text-text-secondary">
                SQL gerado (somente leitura)
              </summary>
              <pre className="mt-1.5 p-2.5 rounded-lg bg-black/30 border border-border-subtle text-[11px] text-green-400 overflow-x-auto whitespace-pre-wrap">
                {sql}
              </pre>
            </details>
          )}

          {resultado && (
            <div className="rounded-xl border border-border-subtle overflow-hidden">
              {chavesGrupo.length > 0 && !colunasDetalhe.length && (
                <div className="px-3 py-2 text-[11px] text-amber-300 bg-amber-500/10 border-b border-amber-500/30">
                  Todas as colunas escolhidas estão nos grupos. Adicione uma coluna de detalhe para
                  ver as linhas.
                </div>
              )}
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-bg-muted/70">
                      {colunasVisiveis.map((c) => (
                        <th
                          key={c}
                          style={{ textAlign: alinhamentoDe(colunasInfo.get(c)) }}
                          className="font-semibold text-text-secondary px-3 py-2 whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chavesGrupo.length
                      ? itensTabela.map((item, i) =>
                          item.tipo === 'grupo' ? (
                            <tr
                              key={`g-${i}`}
                              className={
                                item.nivel === 0
                                  ? 'bg-blue-500/10 border-t border-border-subtle'
                                  : 'bg-bg-muted/40 border-t border-border-subtle'
                              }
                            >
                              <td
                                colSpan={Math.max(colunasVisiveis.length, 1)}
                                style={{ paddingLeft: 12 + item.nivel * 18 }}
                                className="px-3 py-2 font-semibold text-text-primary whitespace-nowrap"
                              >
                                {formatarValor(item.valor, colunasInfo.get(item.chave))}
                              </td>
                            </tr>
                          ) : (
                            <tr key={`l-${i}`} className="border-t border-border-subtle">
                              {colunasVisiveis.map((c) => (
                                <td
                                  key={c}
                                  style={{ textAlign: alinhamentoDe(colunasInfo.get(c)) }}
                                  className="px-3 py-2 text-text-primary whitespace-nowrap"
                                >
                                  {formatarValor(item.linha[c], colunasInfo.get(c))}
                                </td>
                              ))}
                            </tr>
                          ),
                        )
                      : resultado.linhas.map((row, i) => (
                          <tr key={i} className="border-t border-border-subtle">
                            {colunasVisiveis.map((c) => (
                              <td
                                key={c}
                                style={{ textAlign: alinhamentoDe(colunasInfo.get(c)) }}
                                className="px-3 py-2 text-text-primary whitespace-nowrap"
                              >
                                {formatarValor(row[c], colunasInfo.get(c))}
                              </td>
                            ))}
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
