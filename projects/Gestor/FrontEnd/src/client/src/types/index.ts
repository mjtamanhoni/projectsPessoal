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
  codigo?: number;
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
}

export interface Fornecedor {
  codigo?: number;
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
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
}

export interface NumberSettings {
  decimalPlaces: number;
}

export interface AppSettings {
  horseApi: HorseApiSettings;
  display: DisplaySettings;
  logoBase64?: string;
  logoPdfBase64?: string;
  sessionTimeout?: number;
  financeiro?: FinanceiroSettings;
}

export interface FinanceiroSettings {
  categoriaReceberVendaPadrao?: number;
  categoriaPagarCompraPadrao?: number;
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
}

export interface CompraInsumo {
  codigo?: number;
  id?: number;
  insumo_id: number;
  insumo_nome?: string;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  quantidade: number;
  valor_total: number;
  valor_unitario?: number;
  data_compra: string;
  observacao?: string;
  pago?: boolean;
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

export interface VendaProduto {
  codigo?: number;
  id?: number;
  produto_fabricado_id: number;
  produto_nome?: string;
  cliente_id: number;
  cliente_nome?: string;
  usuario_id: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  data_venda: string;
  contas_receber_id?: number;
  observacao?: string;
  recebido?: boolean;
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
}

export interface Modulo {
  codigo?: number;
  id?: number;
  nome: string;
  descricao?: string;
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
