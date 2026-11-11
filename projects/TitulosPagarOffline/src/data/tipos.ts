export interface TituloPagar {
  id?: number;
  credor: string;
  descricao?: string;
  numero_documento?: string;
  chave_pix?: string | null;
  parcela?: number | null;
  valor_total: number;
  data_emissao?: string;
  data_vencimento: string;
  status?: string;
  total_pago?: number;
  saldo_devedor?: number;
}

export interface TituloPagarInput {
  id?: number;
  credor: string;
  descricao?: string;
  numero_documento?: string;
  chave_pix?: string;
  parcela?: number;
  valor_total: number;
  data_emissao?: string;
  data_vencimento: string;
  status?: string;
}

export interface PagamentoEfetuado {
  id?: number;
  titulo_id: number;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento?: string;
  observacao?: string;
  usuario_nome?: string;
  criado_em?: string;
}

export interface PagamentoInput {
  titulo_id: number;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento?: string;
  observacao?: string;
}

export interface ConfigApp {
  id: number;
  nome: string;
  empresa: string;
  cnpj: string;
  chave_pix: string;
  pin_hash: string | null;
  pin_salt: string | null;
  pin_iter: number;
  pin_len: number;
  biometria: boolean;
}

export interface BackupConfig {
  nome: string;
  empresa: string;
  cnpj: string;
  chave_pix: string;
}

export interface BackupTitulo {
  id: number;
  credor: string;
  descricao: string | null;
  numero_documento: string | null;
  chave_pix: string | null;
  parcela: number;
  valor_total_centavos: number;
  data_emissao: string;
  data_vencimento: string;
  cancelado_em: string | null;
  criado_em: string;
}

export interface BackupPagamento {
  id: number;
  titulo_id: number;
  data_pagamento: string;
  valor_centavos: number;
  forma: string;
  observacao: string | null;
  criado_em: string;
}

export interface BackupArquivo {
  app: string;
  versao: number;
  exportado_em: string;
  config: BackupConfig;
  titulos: BackupTitulo[];
  pagamentos: BackupPagamento[];
}
