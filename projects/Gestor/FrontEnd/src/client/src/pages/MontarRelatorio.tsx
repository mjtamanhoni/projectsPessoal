import { useEffect, useMemo, useState, type DragEvent } from 'react';
import api, { getErrorMsg } from '@/lib/api';
import autoTable from 'jspdf-autotable';
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
  tabelas: TabelaSchema[];
}

interface Escolhida {
  tabela: string;
  coluna: string;
}

interface ResultadoConsulta {
  colunas: string[];
  linhas: Record<string, unknown>[];
  sql: string;
  total_linhas: number;
}

// Agrupamento por convencao de nomes das tabelas -> modulo do sistema.
const MODULOS: Record<string, string[]> = {
  GESTOR: [
    'bandeira_cartao', 'categoria_pagar', 'categoria_receber', 'cliente',
    'condicao_pagamento', 'contas_pagar', 'contas_pagar_log', 'contas_receber',
    'contas_receber_log', 'forma_pagamento', 'forma_pagamento_condicao',
    'fornecedor', 'lancamento_automatico_config', 'venda_pagamento',
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
    'venda_produto_item_removido', 'venda_produto_old',
  ],
  'HORAS TRABALHADAS': [
    'horas_abatidas', 'horas_baixa_saldo_geral', 'horas_excedidas',
    'horas_saldo_diario', 'horas_saldo_mensal', 'horas_trabalhadas',
    'lanc_horas_trabalhadas', 'servico',
  ],
  DELIVERY: [
    'encomenda', 'encomenda_avaliacao', 'encomenda_endereco_entrega',
    'encomenda_item', 'encomenda_item_adicional', 'encomenda_item_removido',
    'encomenda_pagamento',
  ],
  GERAL: [
    'empresa', 'empresa_modulo', 'empresa_sequences', 'formulario', 'modulo',
    'modulo_formulario', 'permissao', 'usuario', 'usuario_empresa',
    'usuario_formulario', 'usuario_formulario_permissao',
  ],
};

function moduloDaTabela(nome: string): string {
  for (const [modulo, tabelas] of Object.entries(MODULOS)) {
    if (tabelas.includes(nome)) return modulo;
  }
  return 'OUTRAS';
}

function fmtCelula(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
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

// Monta o SELECT: tabela base = primeira coluna arrastada; demais tabelas sao
// conectadas via cadeia de chaves estrangeiras (JOIN automatico).
function gerarSQL(
  schema: SchemaDB,
  escolhidas: Escolhida[],
  juncao: 'LEFT JOIN' | 'INNER JOIN',
  filtros: Filtro[],
): { sql: string; erro: string | null } {
  if (!escolhidas.length) return { sql: '', erro: null };

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
            achou = `${juncao} ${candidata} ON ${j}.${fk.coluna} = ${candidata}.${fk.coluna_ref}`;
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
            achou = `${juncao} ${candidata} ON ${candidata}.${fk.coluna} = ${fk.tabela_ref}.${fk.coluna_ref}`;
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

  const selectCols = escolhidas
    .map((e) => `${e.tabela}.${e.coluna}`)
    .filter((c, i, arr) => arr.indexOf(c) === i);

  const where: string[] = [];
  for (const t of jaJuntables) {
    if (mapa.get(t)?.tem_empresa) where.push(`${t}.empresa_id = ${schema.empresa_id}`);
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
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [erro, setErro] = useState('');

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
        ? gerarSQL(schema, escolhidas, juncao, filtros)
        : { sql: '', erro: null as string | null },
    [schema, escolhidas, juncao, filtros],
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
    // Filtros da coluna removida tambem saem.
    setFiltros((prev) => prev.filter((f) => !(f.tabela === tabela && f.coluna === coluna)));
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
          ...filtros.map(descricaoFiltro),
        ],
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [resultado.colunas],
          body: resultado.linhas.map((row) => resultado.colunas.map((c) => fmtCelula(row[c]))),
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
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

  const grupos: Array<[string, TabelaSchema[]]> = [];
  for (const modulo of [...Object.keys(MODULOS), 'OUTRAS']) {
    const ts = tabelasFiltradas
      .filter((t) => moduloDaTabela(t.nome) === modulo)
      .sort((a, b) => a.nome.localeCompare(b.nome));
    if (ts.length) grupos.push([modulo, ts]);
  }

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
            <h2 className="text-sm font-semibold">Colunas do relatório</h2>
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
            {escolhidas.map((e) => (
              <span
                key={`${e.tabela}.${e.coluna}`}
                className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-muted px-2.5 py-1.5 text-xs"
              >
                <span className="text-text-muted">{e.tabela}.</span>
                <span className="text-text-primary font-medium">{e.coluna}</span>
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
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-bg-muted/70">
                      {resultado.colunas.map((c) => (
                        <th
                          key={c}
                          className="text-left font-semibold text-text-secondary px-3 py-2 whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.linhas.map((row, i) => (
                      <tr key={i} className="border-t border-border-subtle">
                        {resultado.colunas.map((c) => (
                          <td key={c} className="px-3 py-2 text-text-primary whitespace-nowrap">
                            {fmtCelula(row[c])}
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
