// services/horseAPI.ts
// Serviço centralizado para comuinicação com API HorseApi
// Padrão Singleton: apenas uma instância do serviço é criada

import axios, { AxiosInstance, AxiosError} from 'axios'

// Interface  que define a estrutra de retorno padrão do API
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Interface para credenciais de login
interface LoginCredentials {
  login: string
  senha: string
}

// Interface para credenciais de login com PIN
interface PinCredentials {
  pin: string
}

// Interface que representa um usuário autenticado
interface usuario {
  id: number
  nome: string
  login: string
  token: string
}

// Interface para cliente/fornecedor (usa o mesmo para ambos)
interface Cliente {
  id?: number
  nome: string
  cpfCnpj?: string
  telefone?: string
  email?: string
  observacoes?: string
}

// Interface para categorias (Receber/Pagar)
interface Categoria {
  id?: number
  nome: string
  tipo: 'pagar' | 'receber'
}

// Interface para conta a pagar/receber
interface Conta {
  id?: number
  descricao: string
  valor: number
  dataVencimento: string
  dataPagamento?: string
  status: 'prendente' | 'pago' | 'atrasado' | 'cancelado'
  clienteFornecedorId?: number
  categoriaId?: number
  observacoes?: string
  formaPagamento?: string
}

// Interface para filtros do dashboard
interface DashboardFilters {
  dataInicio?: string
  dataFim?: string
  status?: string
}

// Interface para dados do dashboard
interface DashboardData {
  totalPagar: number
  totalReceber: number
  saldo: number
  contasPagar: Conta[]
  contasReceber: Conta[]
  pagamentosMes: number
  recebimentosMes: number
}

// Continuar daqui...