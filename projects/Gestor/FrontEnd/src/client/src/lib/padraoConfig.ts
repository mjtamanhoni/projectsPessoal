export type PadraoCampoTipo = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface PadraoCampo {
  name: string;
  label: string;
  tipo: PadraoCampoTipo;
  required?: boolean;
  step?: string;
  relacao?: string;
  options?: { value: string | number; label: string }[];
  padrao?: string | number | boolean;
  largura?: 'full' | 'half';
}

export interface PadraoTabelaConfig {
  tabela: string;
  titulo: string;
  subtitulo?: string;
  pk: string[];
  serial: boolean;
  campos: PadraoCampo[];
  colunas: string[];
}

const TIPOS_PADRAO = [
  'marca',
  'produto_classificacao',
  'insumo',
  'adicional',
  'custo_adicional_tipo',
  'produto_fabricado',
  'receita_ingrediente',
  'produto_venda',
  'produto_venda_item',
];

export const padraoTabelas: Record<string, PadraoTabelaConfig> = {
  marca: {
    tabela: 'marca',
    titulo: 'Marcas Padrao',
    subtitulo: 'Marcas usadas como base nos cadastros padrao',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
    ],
    colunas: ['codigo', 'nome', 'ativo'],
  },
  produto_classificacao: {
    tabela: 'produto_classificacao',
    titulo: 'Classificacoes Padrao',
    subtitulo: 'Classificacoes dos produtos de venda',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'ordem', label: 'Ordem', tipo: 'number', padrao: 0 },
      { name: 'status', label: 'Status', tipo: 'number', padrao: 1 },
    ],
    colunas: ['codigo', 'nome', 'ordem', 'status'],
  },
  insumo: {
    tabela: 'insumo',
    titulo: 'Insumos Padrao',
    subtitulo: 'Materias-primas usadas nas receitas',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'unidade_medida', label: 'Unidade *', tipo: 'text', required: true },
      { name: 'custo_medio', label: 'Custo medio', tipo: 'number', step: '0.0001', padrao: 0 },
      { name: 'marca_id', label: 'Marca', tipo: 'select', relacao: 'marca' },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
      { name: 'status', label: 'Status', tipo: 'number', padrao: 1 },
    ],
    colunas: ['codigo', 'nome', 'unidade_medida', 'custo_medio', 'marca_id', 'ativo'],
  },
  adicional: {
    tabela: 'adicional',
    titulo: 'Adicionais Padrao',
    subtitulo: 'Adicionais que podem ser oferecidos ao cliente',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'descricao', label: 'Descricao', tipo: 'textarea' },
      { name: 'preco', label: 'Preco', tipo: 'number', step: '0.01', padrao: 0 },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
    ],
    colunas: ['codigo', 'nome', 'preco', 'ativo'],
  },
  adicional_produto_classificacao: {
    tabela: 'adicional_produto_classificacao',
    titulo: 'Adicionais x Classificacao Padrao',
    subtitulo: 'Quais adicionais podem ser usados em cada classificacao',
    pk: ['adicional_id', 'produto_classificacao_id'],
    serial: false,
    campos: [
      { name: 'adicional_id', label: 'Adicional *', tipo: 'select', relacao: 'adicional', required: true },
      {
        name: 'produto_classificacao_id',
        label: 'Classificacao *',
        tipo: 'select',
        relacao: 'produto_classificacao',
        required: true,
      },
      { name: 'status', label: 'Status', tipo: 'number', padrao: 1 },
    ],
    colunas: ['adicional_id', 'produto_classificacao_id', 'status'],
  },
  custo_adicional_tipo: {
    tabela: 'custo_adicional_tipo',
    titulo: 'Custos Adicionais Padrao',
    subtitulo: 'Tipos de custo adicional de fabricacao',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
      { name: 'status', label: 'Status', tipo: 'number', padrao: 1 },
    ],
    colunas: ['codigo', 'nome', 'ativo', 'status'],
  },
  produto_fabricado: {
    tabela: 'produto_fabricado',
    titulo: 'Produtos Fabricados Padrao',
    subtitulo: 'Produtos produzidos internamente',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'descricao', label: 'Descricao', tipo: 'textarea' },
      { name: 'rendimento', label: 'Rendimento', tipo: 'number', step: '0.0001' },
      { name: 'unidade_medida', label: 'Unidade', tipo: 'text', padrao: 'un' },
      { name: 'custo_unitario', label: 'Custo unitario', tipo: 'number', step: '0.0001', padrao: 0 },
      { name: 'margem_lucro', label: 'Margem (%)', tipo: 'number', step: '0.01', padrao: 0 },
      { name: 'valor_venda_sugerido', label: 'Venda sugerida', tipo: 'number', step: '0.01', padrao: 0 },
      { name: 'preco', label: 'Preco', tipo: 'number', step: '0.01' },
      { name: 'foto', label: 'Foto (URL)', tipo: 'text' },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
      { name: 'status', label: 'Status', tipo: 'number', padrao: 1 },
    ],
    colunas: ['codigo', 'nome', 'custo_unitario', 'valor_venda_sugerido', 'ativo'],
  },
  receita_ingrediente: {
    tabela: 'receita_ingrediente',
    titulo: 'Receitas Padrao',
    subtitulo: 'Insumos que compoem cada produto fabricado',
    pk: ['id'],
    serial: true,
    campos: [
      {
        name: 'produto_fabricado_id',
        label: 'Produto fabricado *',
        tipo: 'select',
        relacao: 'produto_fabricado',
        required: true,
      },
      { name: 'insumo_id', label: 'Insumo *', tipo: 'select', relacao: 'insumo', required: true },
      { name: 'quantidade', label: 'Quantidade *', tipo: 'number', step: '0.0001', required: true },
    ],
    colunas: ['produto_fabricado_id', 'insumo_id', 'quantidade'],
  },
  produto_adicional: {
    tabela: 'produto_adicional',
    titulo: 'Produtos x Adicionais Padrao',
    subtitulo: 'Adicionais disponiveis para cada produto fabricado',
    pk: ['produto_fabricado_id', 'adicional_id'],
    serial: false,
    campos: [
      {
        name: 'produto_fabricado_id',
        label: 'Produto fabricado *',
        tipo: 'select',
        relacao: 'produto_fabricado',
        required: true,
      },
      { name: 'adicional_id', label: 'Adicional *', tipo: 'select', relacao: 'adicional', required: true },
    ],
    colunas: ['produto_fabricado_id', 'adicional_id'],
  },
  produto_venda: {
    tabela: 'produto_venda',
    titulo: 'Produtos Venda Padrao',
    subtitulo: 'Produtos comercializados (cardapio)',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'descricao', label: 'Descricao', tipo: 'textarea' },
      { name: 'preco', label: 'Preco', tipo: 'number', step: '0.01', padrao: 0 },
      {
        name: 'produto_fabricado_id',
        label: 'Produto fabricado',
        tipo: 'select',
        relacao: 'produto_fabricado',
      },
      {
        name: 'produto_classificacao_id',
        label: 'Classificacao',
        tipo: 'select',
        relacao: 'produto_classificacao',
      },
      { name: 'foto', label: 'Foto (URL)', tipo: 'text' },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
    ],
    colunas: ['codigo', 'nome', 'preco', 'produto_classificacao_id', 'ativo'],
  },
  produto_venda_item: {
    tabela: 'produto_venda_item',
    titulo: 'Itens Produto Venda Padrao',
    subtitulo: 'Itens que compoem cada produto de venda',
    pk: ['id'],
    serial: true,
    campos: [
      {
        name: 'produto_venda_id',
        label: 'Produto venda *',
        tipo: 'select',
        relacao: 'produto_venda',
        required: true,
      },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'pode_remover', label: 'Pode remover', tipo: 'boolean', padrao: false },
      { name: 'pode_adicionar', label: 'Pode adicionar', tipo: 'boolean', padrao: false },
      { name: 'adicional_id', label: 'Adicional', tipo: 'select', relacao: 'adicional' },
      { name: 'ordem', label: 'Ordem', tipo: 'number', padrao: 0 },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
    ],
    colunas: ['produto_venda_id', 'nome', 'pode_remover', 'pode_adicionar', 'ordem', 'ativo'],
  },
  pacote: {
    tabela: 'pacote',
    titulo: 'Pacotes Padrao',
    subtitulo: 'Pacotes de cadastros base (ex.: Lanchonete)',
    pk: ['id'],
    serial: true,
    campos: [
      { name: 'codigo', label: 'Codigo *', tipo: 'text', required: true },
      { name: 'nome', label: 'Nome *', tipo: 'text', required: true },
      { name: 'descricao', label: 'Descricao', tipo: 'textarea' },
      { name: 'ativo', label: 'Ativo', tipo: 'boolean', padrao: true },
    ],
    colunas: ['codigo', 'nome', 'ativo'],
  },
  pacote_item: {
    tabela: 'pacote_item',
    titulo: 'Itens Pacote Padrao',
    subtitulo: 'Vinculo entre pacotes e registros do catalogo',
    pk: ['pacote_id', 'tipo', 'padrao_id'],
    serial: false,
    campos: [
      { name: 'pacote_id', label: 'Pacote *', tipo: 'select', relacao: 'pacote', required: true },
      {
        name: 'tipo',
        label: 'Tipo *',
        tipo: 'select',
        required: true,
        options: TIPOS_PADRAO.map((t) => ({ value: t, label: t })),
      },
      { name: 'padrao_id', label: 'ID no catalogo *', tipo: 'number', required: true },
      { name: 'ordem', label: 'Ordem', tipo: 'number', padrao: 0 },
    ],
    colunas: ['pacote_id', 'tipo', 'padrao_id', 'ordem'],
  },
};

export function getPadraoConfig(tabela: string): PadraoTabelaConfig | undefined {
  return padraoTabelas[tabela];
}
