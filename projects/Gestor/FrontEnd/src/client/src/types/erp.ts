export interface ErpEndereco {
  id?: number;
  empresa_id?: number;
  pessoa_id?: number | null;
  tipo: number;
  principal: boolean;
  cep?: string | null;
  logradouro: string;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio: string;
  uf?: string | null;
  codigo_ibge_municipio?: string | null;
  pais?: string | null;
  pais_codigo_iso?: string | null;
  referencia?: string | null;
  status: number;
}

export interface ErpTelefone {
  id?: number;
  tipo: number;
  numero: string;
  ramal?: string | null;
  whatsapp: boolean;
  principal: boolean;
  status: number;
}

export interface ErpEmail {
  id?: number;
  tipo: number;
  email: string;
  principal: boolean;
  status: number;
}

export interface ErpRedeSocial {
  id?: number;
  tipo: number;
  identificador: string;
  url?: string | null;
  principal: boolean;
  status: number;
}

export interface ErpContato {
  id?: number;
  empresa_id?: number;
  pessoa_id?: number | null;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  principal: boolean;
  observacao?: string | null;
  status: number;
  telefones?: ErpTelefone[];
  emails?: ErpEmail[];
  redes?: ErpRedeSocial[];
}

export interface ErpPessoa {
  id?: number;
  empresa_id?: number;
  tipo_pessoa: 'F' | 'J';
  tipo_documento: string;
  documento: string;
  nome: string;
  nome_fantasia?: string | null;
  nome_abreviado?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  inscricao_suframa?: string | null;
  regime_tributario?: number | null;
  data_nascimento?: string | null;
  data_fundacao?: string | null;
  sexo?: string | null;
  estado_civil?: number | null;
  profissao?: string | null;
  nacionalidade?: string | null;
  naturalidade?: string | null;
  limite_credito: number;
  observacao?: string | null;
  status: number;
  enderecos?: ErpEndereco[];
  contatos?: ErpContato[];
}

export interface ErpCliente {
  id?: number;
  empresa_id?: number;
  pessoa_id: number;
  codigo?: string;
  condicao_pagamento_id?: number | null;
  tabela_preco_id?: number | null;
  limite_credito: number;
  dia_fechamento?: number | null;
  dia_vencimento?: number | null;
  bloqueado: boolean;
  motivo_bloqueio?: string | null;
  observacao?: string | null;
  status: number;
  nome?: string;
  nome_fantasia?: string | null;
  documento?: string;
  tipo_pessoa?: string;
  tipo_documento?: string;
  endereco_principal?: string | null;
  telefone_principal?: string | null;
  email_principal?: string | null;
  pessoa?: ErpPessoa;
  enderecos?: ErpEndereco[];
  contatos?: ErpContato[];
}

export interface ErpFornecedor {
  id?: number;
  empresa_id?: number;
  pessoa_id: number;
  codigo?: string;
  categoria: number;
  condicao_pagamento_id?: number | null;
  prazo_entrega_dias: number;
  observacao?: string | null;
  status: number;
  nome?: string;
  nome_fantasia?: string | null;
  documento?: string;
  tipo_pessoa?: string;
  tipo_documento?: string;
  endereco_principal?: string | null;
  telefone_principal?: string | null;
  email_principal?: string | null;
  pessoa?: ErpPessoa;
  enderecos?: ErpEndereco[];
  contatos?: ErpContato[];
}

export interface ErpLookupItem {
  id: number;
  codigo?: string;
  nome?: string;
  descricao?: string;
  razao_social?: string;
  tipo?: number | string;
  [key: string]: unknown;
}

export interface ErpLookups {
  plano_contas: ErpLookupItem[];
  centros_custo: ErpLookupItem[];
  formas_pagamento: ErpLookupItem[];
  contas_bancarias: ErpLookupItem[];
  tabelas_preco: ErpLookupItem[];
  unidades_medida: ErpLookupItem[];
  categorias: ErpLookupItem[];
  familias: ErpLookupItem[];
  segmentos: ErpLookupItem[];
  marcas: ErpLookupItem[];
  fabricantes: ErpLookupItem[];
  depositos: ErpLookupItem[];
  grupos: ErpLookupItem[];
  subgrupos: ErpLookupItem[];
  condicoes_pagamento: ErpLookupItem[];
}

export interface ErpClientePayload {
  id?: number;
  pessoa_id?: number;
  codigo?: string;
  condicao_pagamento_id?: number;
  tabela_preco_id?: number;
  limite_credito: number;
  dia_fechamento?: number;
  dia_vencimento?: number;
  bloqueado: boolean;
  motivo_bloqueio?: string;
  observacao?: string;
  status: number;
  pessoa: ErpPessoa;
}

export interface ErpFornecedorPayload {
  id?: number;
  pessoa_id?: number;
  codigo?: string;
  categoria: number;
  condicao_pagamento_id?: number;
  prazo_entrega_dias: number;
  observacao?: string;
  status: number;
  pessoa: ErpPessoa;
}
