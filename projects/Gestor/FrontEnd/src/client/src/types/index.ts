export interface Formulario {
  codigo?: number;
  id?: number;
  nome: string;
}

export interface UsuarioFormulario {
  codigo?: number;
  id?: number;
  usuarioId: number;
  formularioId: number;
  usuarioNome?: string;
  formularioNome?: string;
}

export interface Cliente {
  id?: number;
  codigo?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  email?: string;
  endereco?: string;
  cpf_cnpj?: string;
  status?: number;
}

export interface Fornecedor {
  codigo?: number;
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
  status?: number;
}

export interface Categoria {
  codigo?: number;
  id?: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

export interface ContaPagar {
  codigo?: number;
  id?: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  fornecedorId: number;
  fornecedorNome?: string;
  idCategoria?: number;
  categoriaNome?: string;
  pago?: boolean;
  dataPagamento?: string;
  valorBaixa?: number;
  desconto?: number;
  acrescimo?: number;
  lancamentoOrigemId?: number;
}

export interface ContaReceber {
  codigo?: number;
  id?: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  clienteId: number;
  clienteNome?: string;
  idCategoria?: number;
  categoriaNome?: string;
  recebido?: boolean;
  dataRecebimento?: string;
  valorBaixa?: number;
  desconto?: number;
  acrescimo?: number;
  lancamentoOrigemId?: number;
  lancamento_origem?: number;
}

export interface Usuario {
  codigo?: number;
  id?: number;
  nome: string;
  email?: string;
  status?: number;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  token: string;
  empresaId: number;
  is_superadmin?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface HorseApiSettings {
  host: string;
  port: number;
  protocol: string;
}

export interface GridSettings {
  defaultPageSize: number;
  pageSizeOptions: number[];
}

export interface DisplaySettings {
  grid: GridSettings;
  number?: NumberSettings;
  moduloInicialId?: number;
  formularioInicialId?: number;
}

export interface NumberSettings {
  decimalPlaces: number;
}

export interface AppSettings {
  horseApi: HorseApiSettings;
  display: DisplaySettings;
  logoBase64?: string | null;
  logoPdfBase64?: string | null;
  sessionTimeout?: number;
  financeiro?: FinanceiroSettings;
  printer?: PrinterSettings;
  empresaNome?: string;
  empresaCnpj?: string;
  empresaEndereco?: string;
  empresaTelefone?: string;
  rateLimit?: RateLimitSettings;
}

export interface RateLimitSettings {
  max: number;
}

export interface FinanceiroSettings {
  categoriaReceberVendaPadrao?: number;
  categoriaPagarCompraPadrao?: number;
}

export interface PrinterSettings {
  modelo: number;
  porta: string;
  deviceParams: string;
  colunas: number;
  espacoEntreLinhas: number;
  linhasBuffer: number;
  linhasPular: number;
  cortarPapel: boolean;
  controlePorta: boolean;
  paginaCodigo: number;
  barrasLargura: number;
  barrasAltura: number;
  barrasHRI: boolean;
  qrcodeTipo: number;
  qrcodeLarguraModulo: number;
  qrcodeErrorLevel: number;
  logoKC1: number;
  logoKC2: number;
  logoFatorX: number;
  logoFatorY: number;
}

export interface ParcelasConfig {
  quantidade: number;
  tipoVencimento: 'fixo' | 'intervalo';
  tipoParcela: 'dividir' | 'mesmo';
  diaFixo?: number;
  intervalo?: number;
}

export interface BaixaFormData {
  dataPagamento?: string;
  dataRecebimento?: string;
  valor: string;
  desconto: string;
  acrescimo: string;
}

export interface HoraTrabalhada {
  codigo?: number;
  id?: number;
  usuarioId?: number;
  clienteId?: number;
  clienteNome?: string;
  servicoId?: number;
  servicoNome?: string;
  valorHora: number;
  dataServico: string;
  horaInicio: string;
  horaTermino: string;
  quantidadeHoras?: number;
  totalHoras?: number;
  observacoes?: string;
}

export interface Servico {
  codigo?: number;
  id?: number;
  nome: string;
  valorHora: number;
  horasMinimas: string;
  status?: number;
}

export interface HoraAbatida {
  codigo?: number;
  id?: number;
  usuarioId: number;
  usuarioNome?: string;
  clienteId: number;
  clienteNome?: string;
  servicoId: number;
  servicoNome?: string;
  dataAbatimento: string;
  valor: number;
  valorHora: number;
  quantidadeHoras: number;
  observacoes?: string;
}

export interface HoraExcedida {
  codigo?: number;
  id?: number;
  usuarioId: number;
  usuarioNome?: string;
  clienteId: number;
  clienteNome?: string;
  servicoId: number;
  servicoNome?: string;
  mesOrigem: number;
  anoOrigem: number;
  deltaHoras: number;
  dataCriacao?: string;
}

export interface FormularioPermissao {
  nome: string;
  permissoes: string[];
  formulario_start?: number;
}

export interface Insumo {
  codigo?: number;
  id?: number;
  nome: string;
  unidade_medida: string;
  custo_medio?: number;
  ativo?: boolean;
  id_fornecedor?: number;
  id_marca?: number;
  fornecedor_nome?: string;
  marca_nome?: string;
}

export interface Marca {
  codigo?: number;
  id?: number;
  nome: string;
  ativo?: boolean;
}

export interface CompraInsumoItem {
  insumo_id: number;
  insumo_nome?: string;
  marca_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface CompraInsumo {
  codigo?: number;
  id?: number;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  data_compra: string;
  valor_total: number;
  observacao?: string;
  pago?: boolean;
  qtd_itens?: number;
  itens?: CompraInsumoItem[];
}

export interface ProdutoFabricado {
  codigo?: number;
  id?: number;
  nome: string;
  descricao?: string;
  rendimento?: number;
  unidade_medida?: string;
  custo_unitario?: number;
  margem_lucro?: number;
  valor_venda_sugerido?: number;
  preco?: number;
  foto?: string;
  ativo?: boolean;
}

export interface ReceitaIngrediente {
  codigo?: number;
  id?: number;
  produto_fabricado_id: number;
  insumo_id: number;
  insumo_nome?: string;
  insumo_ativo?: boolean;
  insumo_unidade_medida?: string;
  insumo_custo_medio?: number;
  quantidade: number;
}

export interface CustoAdicionalTipo {
  codigo?: number;
  id?: number;
  nome: string;
  ativo?: boolean;
}

export interface Adicional {
  codigo?: number;
  id?: number;
  nome: string;
  descricao?: string;
  preco: number;
  ativo?: boolean;
}

export interface ProdutoAdicional {
  produto_fabricado_id: number;
  adicional_id: number;
  adicional_nome?: string;
  adicional_descricao?: string;
  adicional_preco?: number;
  adicional_ativo?: boolean;
}

export interface ProdutoVenda {
  codigo?: number;
  id?: number;
  nome: string;
  descricao?: string;
  preco: number;
  produto_fabricado_id?: number | null;
  produto_fabricado_nome?: string | null;
  foto?: string;
  ativo?: boolean;
}

export interface ProdutoVendaItem {
  codigo?: number;
  id?: number;
  produto_venda_id: number;
  produto_venda_nome?: string;
  nome: string;
  pode_remover: boolean;
  pode_adicionar: boolean;
  adicional_id?: number | null;
  adicional_nome?: string | null;
  adicional_preco?: number | null;
  ordem: number;
  ativo?: boolean;
}

export interface AdicionalItemPedido {
  adicional_id?: number;
  produto_venda_item_id?: number;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
}

export interface Fabricacao {
  codigo?: number;
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade_produzida: number;
  data_fabricacao: string;
  custo_insumos?: number;
  custo_adicional_total?: number;
  custo_total?: number;
  custo_unitario?: number;
  observacao?: string;
}

export interface FabricacaoCustoAdicional {
  codigo?: number;
  id?: number;
  fabricacao_id: number;
  custo_adicional_tipo_id: number;
  custo_adicional_nome?: string;
  valor: number;
}

export interface LancamentoAutomaticoConfig {
  codigo?: number;
  id?: number;
  empresa_id?: number;
  tipo_origem: string;
  tipo_lancamento: string;
  categoria_id: number;
  dias_vencimento?: number;
  descricao_template?: string;
  usuario_id?: number;
  ativo?: boolean;
}

export interface VendaProdutoItem {
  item_id?: number;
  id?: number;
  produto_fabricado_id?: number;
  produto_nome?: string;
  produto_venda_id?: number;
  produto_venda_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  removidos?: (string | { nome: string; produto_venda_item_id?: number })[];
  adicionais?: AdicionalItemPedido[];
}

export interface VendaProduto {
  codigo?: number;
  id?: number;
  cliente_id: number;
  cliente_nome?: string;
  usuario_id?: number;
  valor_total: number;
  data_venda: string;
  contas_receber_id?: number;
  observacao?: string;
  categoria_receber_id?: number;
  recebido?: boolean;
  qtd_itens?: number;
  itens?: VendaProdutoItem[];
}

export interface EncomendaItem {
  item_id?: number;
  id?: number;
  produto_fabricado_id?: number;
  produto_nome?: string;
  produto_venda_id?: number;
  produto_venda_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  removidos?: (string | { nome: string; produto_venda_item_id?: number })[];
  adicionais?: AdicionalItemPedido[];
}

export interface Encomenda {
  codigo?: number;
  id?: number;
  cliente_id: number;
  cliente_nome?: string;
  usuario_id?: number;
  valor_total: number;
  data_encomenda: string;
  data_entrega?: string;
  observacao?: string;
  status?: number;
  baixado?: boolean;
  venda_id?: number;
  qtd_itens?: number;
  itens?: EncomendaItem[];
}

export interface EstoqueInsumo {
  codigo?: number;
  id?: number;
  insumo_id: number;
  insumo_nome?: string;
  quantidade: number;
  data_atualizacao: string;
  observacao?: string;
}

export interface EstoqueProdutoFabricado {
  codigo?: number;
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  data_atualizacao: string;
  observacao?: string;
}

export interface ProducaoDashboardData {
  kpis: {
    total_vendas: number;
    qtd_vendida: number;
    qtd_vendas: number;
    total_compras: number;
    qtd_compras: number;
    qtd_fabricada: number;
    custo_total: number;
    qtd_fabricacoes: number;
    lucro_bruto: number;
    lucro_liquido: number;
  };
  mensal_vendas: { mes: number; valor: number; qtd: number; qtd_vendas: number }[];
  mensal_compras: { mes: number; valor: number; qtd: number }[];
  mensal_fabricacao: { mes: number; qtd_fabricada: number; custo_total: number; qtd: number }[];
  diario_fabricacao: { dia: string; qtd_fabricada: number }[];
  diario_vendas: { dia: string; valor: number }[];
}

export interface HorasDashboardData {
  kpis: {
    totalHoras: number;
    totalValor: number;
    totalAbatido: number;
    diasTrabalhados: number;
  };
  diario: { dia: string; horas: number; valor: number }[];
  mensal: { mes: number; horas: number; valor: number }[];
  abatidoMensal: { mes: number; horas_abatidas: number }[];
}

export interface Empresa {
  codigo?: number;
  id?: number;
  razao_social: string;
  fantasia?: string;
  cnpj_cpf?: string;
  inscricao_estadual_identidade?: string;
  regime_tributario?: string;
  endereco?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  chave_pix?: string;
  logomarca?: string | null;
  delivery?: number;
  status?: number;
}

export interface Modulo {
  codigo?: number;
  id?: number;
  nome: string;
  descricao?: string;
  status?: number;
}

export interface ModuloFormulario {
  codigo?: number;
  id?: number;
  modulo_id: number;
  formulario_id: number;
  modulo_nome?: string;
  formulario_nome?: string;
  abertura?: number;
}

export interface EmpresaModulo {
  codigo?: number;
  id?: number;
  empresa_id: number;
  modulo_id: number;
  modulo_nome?: string;
}

export interface PerdaInsumo {
  codigo?: number;
  id?: number;
  insumo_id: number;
  insumo_nome?: string;
  quantidade: number;
  data_perda: string;
  motivo?: string;
  usuario_id?: number;
}

export interface PerdaProdutoFabricado {
  codigo?: number;
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  data_perda: string;
  motivo?: string;
  usuario_id?: number;
}

export interface UsoConsumo {
  codigo?: number;
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  data_uso: string;
  motivo?: string;
  usuario_id?: number;
}

export interface DashboardData {
  totalAReceber: number;
  totalAPagar: number;
  totalRecebido: number;
  totalPago: number;
  saldo: number;
  contasPendentesPagar: number;
  contasPendentesReceber: number;
  contasAtrasadasPagar: number;
  contasAtrasadasReceber: number;
  receitasPorMes: { mes: string; valor: number }[];
  despesasPorMes: { mes: string; valor: number }[];
  receberAberto: number;
  receberRecebido: number;
  pagarAberto: number;
  pagarPago: number;
  lucroPorMes: { mes: string; lucro: number }[];
  filtrosAplicados: { dataInicio?: string; dataFim?: string; status: string };
}
