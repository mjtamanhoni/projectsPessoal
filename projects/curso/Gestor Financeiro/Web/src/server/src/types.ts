// ======================================================================
// TIPOS PARA AUTENTICAÇÃO
// ======================================================================

// Dados enviados ao login
// Todos os campos são opcionais porque existem dois modos de login:
// 1 - Login/Senha: enviar o login, senha e empresa 
// 2 - PIN: enviar PIN e empresa
export interface LoginRequest {
  login?: string; // Nome de usuário ou email (opcional se uar PIN)
  senha?: string; // Senha do usuário (opcional se usar PIN)
  pin?: string; // PIN do usuário (opcional se usar login e senha)
  empresa?: number; // IS da empresa (Padrão 1)
}

// Resposta do login com dados do usuário e token
export interface LoginResponse {
  id: number; // ID do usuário
  nome: string; // Nome do usuário
  email: string; // Email do usuário
  token: string; // Token JWT para autenticação
}

// Dados do usuário logado
export interface Uusario {
  id: number; // ID do usuário
  nome: string; // Nome do usuário
  email: string; // Email do usuário  
}

// ======================================================================
// TIPOS PARA ENTIDADES DO NEGÓCIO
// ======================================================================

// Cliente (Pessoa que compra serviços/produtos da empresa)
// Campos opcionais: a API pode retornar com ou sem esses campos
export interface Cliente {
  codigo?: number; // ID do cliente único do cliente (pode ver como "codigo" ou "id"))
  id?: number; // ID do cliente (opcional, usado para atualização)
  nome: string; // Nome do cliente (Obrigatório)
  telefone?: string; // Telefone do cliente (opcional)
  celular?: string; // Celular do cliente (opcional)
  endereco?: string; // Endereço do cliente (opcional)
  email?: string; // Email do cliente (opcional)
}

// Fornecedor (Pessoa ou empresa que fornece produtos/serviços)
// Mesma estrutura do cliente, (reutilização de conceito)
export interface Fornecedor {
  codigo?: number; // ID do fornecedor
  id?: number; // ID do fornecedor (opcional, usado para atualização)
  nome: string; // Nome do fornecedor
  telefone?: string; // Telefone do fornecedor (opcional)
  celular?: string; // Celular do fornecedor (opcional)
  endereco?: string; // Endereço do fornecedor (opcional)
  email?: string; // Email do fornecedor (opcional)
}

// Categoria (Classificação das contas)
export interface Categoria {
  codigo?: number; // ID da categoria
  id?: number; // ID da categoria (opcional, usado para atualização)
  nome: string; // Nome da categoria
  descricao?: string; // Descrição da categoria (opcional)
  ativo?: boolean; // Indica se a categoria está ativa (opcional, padrão: true)
}

// ======================================================================
// TIPOS PARA CONTAS FINANCEIRAS
// ======================================================================

// Conta a pagar (Despesas da empresa)
export interface ContaPagar {
  codigo?: number; // ID da conta a pagar
  id?: number; // ID da conta a pagar (opcional, usado para atualização)
  descricao: string; // Descrição da conta a pagar
  valor: number; // Valor da conta a pagar
  dataVencimento: string; // Data de vencimento da conta a pagar (formato ISO)
  fornecedorId: number; // ID do fornecedor da conta a pagar
  fornecedorNome?: string; // Nome do fornecedor (opcional, para exibição)
  categoriaId: number; // ID da categoria da conta a pagar
  categoriaNome?: string; // Nome da categoria (opcional, para exibição)
  pago?: boolean; // Indica se a conta foi paga (opcional, padrão: false)
  dataPagamento?: string; // Data de pagamento da conta (opcional, formato ISO)
}

// Conta a receber (Receitas da empresa)
export interface ContaReceber {
  codigo?: number; // ID da conta a receber
  id?: number; // ID da conta a receber (opcional, usado para atualização)
  descricao: string; // Descrição da conta a receber
  valor: number; // Valor da conta a receber
  dataVencimento: string; // Data de vencimento da conta a receber (formato ISO)
  clienteId: number; // ID do cliente da conta a receber
  clienteNome?: string; // Nome do cliente (opcional, para exibição)
  categoriaId: number; // ID da categoria da conta a receber
  categoriaNome?: string; // Nome da categoria (opcional, para exibição)
  recebido?: boolean; // Indica se a conta foi recebida (opcional, padrão: false)
  dataRecebimento?: string; // Data de recebimento da conta (opcional, formato ISO)
}

// Dados para baixar uma conta (pagar ou receber)
// Usado quando o usuário clica em baixar ou receber
export interface BaixarRequest {
  id: number; // ID da conta a baixar
  dataPagamento?: string; // Data de pagamento (opcional, formato ISO)
  dataRecebimento?: string; // Data de recebimento (opcional, formato ISO)
  valor?: number; // Valor pago (opcional, padrão: valor da conta)
}

// ======================================================================
// TIPOS PARA API E RESPOSTAS
// ======================================================================

// Resposta genérica da API (para mensagens de sucesso ou erro)
// O tipo T é um "genérico" - pode ser qualquer tipo
// Ex: ApiResponse<Cliente[]> ou ApiResponse<LoginResponse:
export interface ApiResponse<T> {
  data?: T; // Dados retornados pela API (opcional)
  message?: string; // Mensagem de sucesso ou erro (opcional)
  error?: string; // Mensagem de erro (opcional)
}

// Erro retornado pela API Horse (backend Delphi)
// A API pode usar "erro" ou "mensagem" para retornar erros
export interface HorseError {
  error: string; // Mensagem de erro retornada pela API Horse
  message: string; // Detalhes do erro retornado pela API Horse
}

// ======================================================================
// TIPOS PARA DASHBOARD
// ======================================================================

// Dados completos do Dashboard
// Contém todos os valores calculados para exibição
export interface DashboardData {
  // Totais financeiro
  totalAReceber: number; // Total de contas a receber pendentes
  totalAPagar: number; // Total de contas a pagar pendentes
  totalRecebido: number; // Total de contas recebidas
  totalPago: number; // Total de contas pagas
  saldo: number; // Saldo atual (total a receber - total a pagar)

  // Contadores
  contasPendentesPagar: number; // Quantidade de contas a pagar pendentes
  contasPendentesReceber: number; // Quantidade de contas a receber pendentes
  contasAtrasadasPagar: number; //contas a pagar atrasadas
  contasAtrasadasReceber: number; // contas a receber atrasadas

  // Dados para gráficos (últimos 6 meses)
  receitasPorMes: { mes: string; varlo: number }[]; // Receitas dos últimos 6 meses
  despesasPorMes: { mes: string; valor: number }[]; // Despesas dos últimos 6 meses

  // Totais gerais (Sem filtro de período)
  receberAberto: number; // Total de contas a receber em aberto
  receberRecebido: number; // Total de contas a receber recebidas
  pagarAberto: number; // Total de contas a pagar em aberto
  pagarPago: number; // Total de contas a pagar pagas

  // Lucro mensal do ano
  lucroPorMes: { mes: string; lucro: number }[]; // Lucro mensal do ano

  // Filtros aplicados para exibição na UI
  filtrosAplicados: {
    dataInicio?: string; // Data de início do filtro (opcional, formato ISO)
    dataFim?: string; // Data de fim do filtro (opcional, formato ISO)
    status?: 'baixado' | 'aberto' | 'ambos'; // Status das contas (opcional)
  }; // Filtros aplicados na consulta do d
}

// Filtros para o dashboard
// Todos opcionais - usuário pode filtrar por qualquer combinação
export interface DashboardFilters {
  dataInicio?: string; // Data de início do filtro (opcional, formato ISO)
  dataFim?: string; // Data de fim do filtro (opcional, formato ISO)
  status?: 'baixado' | 'aberto' | 'ambos'; // Status das contas (opcional)
}

// ======================================================================
// TIPOS PARA CONFIGURAÇÕES DO SISTEMA
// ======================================================================

// Configurações da API Horse (para o settings service)
export interface HorseApiSettings {
  host: string; // Host base da API Horse
  port: number; // Porta da API 
  protocol: 'http' | 'https'; // Protocolo da API (opcional, padrão é 'https')
}

// Configurações de Exibição de grades/tabelas
export interface GridSettings {
  defaultPageSize: number; // Tamanho padrão da página (opcional, padrão é 10)
  pageSizeOptions: number[]; // Opções de tamanho de página (opcional, padrão é [5, 10, 25, 50])
}

// Configurações de exibição gerais
export interface displaySettings {
  grid: GridSettings; // Configurações da grade
}

// Configurações complets do sistema
export interface AppSettings {
  horseApi: HorseApiSettings; // Configurações da API Horse
  display: displaySettings; // Configurações de exibição
  logoBase64?: string; // Logo da empresa em base64 (opcional)        
}

// ======================================================================
// CLASSES DE ERRO
// ======================================================================

// Classe de erro customizada para a aplicação
export class AppError extends Error {
  status: number; // Código de status HTTP
  constructor(message: string, status: number) {
    super(message); // Chama o construtor da classe pai (Error)
    this.status = status;
    this.name // Nome da classe para identificação em logs
  }
}
