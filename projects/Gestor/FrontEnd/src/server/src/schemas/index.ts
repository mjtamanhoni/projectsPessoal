import { z } from 'zod';

export const clienteBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  telefone: z.string().max(20).optional().or(z.literal('')),
  celular: z.string().max(20).optional().or(z.literal('')),
  endereco: z.string().max(300).optional().or(z.literal('')),
  email: z.string().email('Email invalido').max(200).optional().or(z.literal('')),
});

export const fornecedorBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  telefone: z.string().max(20).optional().or(z.literal('')),
  celular: z.string().max(20).optional().or(z.literal('')),
  endereco: z.string().max(300).optional().or(z.literal('')),
  email: z.string().email('Email invalido').max(200).optional().or(z.literal('')),
});

export const categoriaBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  descricao: z.string().max(500).optional().or(z.literal('')),
  ativo: z.boolean().optional(),
});

export const categoriaSaveSchema = z.union([
  categoriaBodySchema,
  categoriaBodySchema.array(),
]);

export const contaPagarBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  descricao: z.string().min(1, 'Descricao e obrigatoria').max(300),
  valor: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
  dataVencimento: z.string().min(1, 'Data e obrigatoria'),
  fornecedorId: z.number().int().positive('Fornecedor e obrigatorio'),
  idCategoria: z.number().int().positive().nullable().optional(),
  pago: z.boolean().optional(),
  dataPagamento: z.string().optional(),
  valorBaixa: z.number().optional(),
  desconto: z.number().optional(),
  acrescimo: z.number().optional(),
  lancamentoOrigemId: z.number().int().positive().nullable().optional(),
});

export const contaReceberBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  descricao: z.string().min(1, 'Descricao e obrigatoria').max(300),
  valor: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
  dataVencimento: z.string().min(1, 'Data e obrigatoria'),
  clienteId: z.number().int().positive('Cliente e obrigatorio'),
  idCategoria: z.number().int().positive().nullable().optional(),
  recebido: z.boolean().optional(),
  dataRecebimento: z.string().optional(),
  valorBaixa: z.number().optional(),
  desconto: z.number().optional(),
  acrescimo: z.number().optional(),
  lancamentoOrigemId: z.number().int().positive().nullable().optional(),
  lancamento_origem: z.number().int().min(0).default(0).optional(),
});

export const usuarioBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
  email: z.string().email('Email invalido').max(100).optional().or(z.literal('')),
  senha: z.string().min(4, 'Senha deve ter pelo menos 4 caracteres').max(100).optional().or(z.literal('')),
  pin: z.string().length(4, 'PIN deve ter exatamente 4 digitos').optional().or(z.literal('')),
});

export const usuarioSenhaBodySchema = z.object({
  id: z.number().int().positive(),
  novaSenha: z.string().min(4, 'Senha deve ter pelo menos 4 caracteres').max(100),
});

export const usuarioPinBodySchema = z.object({
  id: z.number().int().positive(),
  novoPin: z.string().length(4, 'PIN deve ter exatamente 4 digitos'),
});

export const formularioBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
});

export const usuarioFormularioBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive('Usuario e obrigatorio'),
  formularioId: z.number().int().positive('Formulario e obrigatorio'),
});

export const horaTrabalhadaBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive().nullable().optional(),
  clienteId: z.number().int().positive().nullable().optional(),
  servicoId: z.number().int().positive().nullable().optional(),
  valorHora: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor da hora deve ser maior que zero'),
  dataServico: z.string().min(1, 'Data e obrigatoria'),
  horaInicio: z.string().min(1, 'Hora inicio e obrigatoria'),
  horaTermino: z.string().min(1, 'Hora termino e obrigatoria'),
  quantidadeHoras: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).optional(),
  totalHoras: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).optional(),
  observacoes: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (!data.horaInicio || !data.horaTermino) return true;
    const [hI, mI] = data.horaInicio.split(':').map(Number);
    const [hT, mT] = data.horaTermino.split(':').map(Number);
    const inicio = hI * 60 + mI;
    const termino = hT * 60 + mT;
    return termino > inicio || termino < inicio;
  },
  { message: 'Hora termino deve ser diferente da hora inicio', path: ['horaTermino'] }
);

export const servicoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
  valorHora: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor da hora deve ser maior que zero'),
  horasMinimas: z.string().min(1, 'Horas minimas e obrigatoria'),
});

export const horaAbatidaBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive('Usuario e obrigatorio'),
  clienteId: z.number().int().positive('Cliente e obrigatorio'),
  servicoId: z.number().int().positive('Servico e obrigatorio'),
  dataAbatimento: z.string().min(1, 'Data e obrigatoria'),
  valor: z.union([z.number(), z.string().transform((s) => parseFloat(s.replace(',', '.')))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
  valorHora: z.union([z.number(), z.string().transform((s) => parseFloat(s.replace(',', '.')))]).refine((v) => v > 0, 'Valor da hora deve ser maior que zero'),
  quantidadeHoras: z.union([z.number(), z.string().transform((s) => parseFloat(s.replace(',', '.')))]).refine((v) => v > 0, 'Quantidade de horas deve ser maior que zero'),
  observacoes: z.string().max(500).optional(),
});

export const insumoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  unidade_medida: z.string().min(1, 'Unidade de medida e obrigatoria').max(20),
  custo_medio: z.number().optional(),
  ativo: z.boolean().optional(),
  id_fornecedor: z.union([z.number().int().positive(), z.null()]).optional(),
  id_marca: z.union([z.number().int().positive(), z.null()]).optional(),
});

const compraInsumoItemSchema = z.object({
  insumo_id: z.number().int().positive('Insumo e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  valor_unitario: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
  valor_total: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor total deve ser maior que zero'),
});

export const compraInsumoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  fornecedor_id: z.number().int().positive().optional(),
  valor_total: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).optional(),
  data_compra: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional(),
  categoria_pagar_id: z.number().int().positive().optional(),
  pago: z.boolean().optional(),
  itens: z.array(compraInsumoItemSchema).min(1, 'Adicione ao menos um item'),
});

export const produtoFabricadoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  descricao: z.string().max(500).optional(),
  rendimento: z.number().optional(),
  unidade_medida: z.string().max(20).optional(),
  custo_unitario: z.number().optional(),
  margem_lucro: z.number().optional(),
  valor_venda_sugerido: z.number().optional(),
  preco: z.number().optional(),
  foto: z.string().optional(),
  ativo: z.boolean().optional(),
});

export const receitaIngredienteBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  insumo_id: z.number().int().positive('Insumo e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
});

export const custoAdicionalTipoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  ativo: z.boolean().optional(),
});

export const fabricacaoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade_produzida: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade produzida deve ser maior que zero'),
  data_fabricacao: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional(),
});

const vendaProdutoItemSchema = z.object({
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  valor_unitario: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
  valor_total: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor total deve ser maior que zero'),
});

export const vendaProdutoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  cliente_id: z.number().int().positive('Cliente e obrigatorio'),
  valor_total: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).optional(),
  data_venda: z.string().min(1, 'Data e obrigatoria'),
  contas_receber_id: z.number().int().positive().optional(),
  observacao: z.string().max(500).optional(),
  categoria_receber_id: z.number().int().positive().optional(),
  recebido: z.boolean().optional(),
  itens: z.array(vendaProdutoItemSchema).min(1, 'Adicione ao menos um item'),
});

const encomendaItemSchema = z.object({
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  valor_unitario: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
  valor_total: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor total deve ser maior que zero'),
});

export const encomendaBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  cliente_id: z.number().int().positive('Cliente e obrigatorio'),
  valor_total: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).optional(),
  data_encomenda: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional(),
  itens: z.array(encomendaItemSchema).min(1, 'Adicione ao menos um item'),
});

export const encomendaBaixaSchema = z.object({
  id: z.number().int().positive('Encomenda e obrigatoria'),
  id_encomenda: z.number().int().positive().optional(),
  data_venda: z.string().min(1, 'Data da venda e obrigatoria'),
  recebido: z.boolean().optional(),
  categoria_receber_id: z.number().int().positive().optional(),
});

export const fabricacaoCustoAdicionalBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  fabricacao_id: z.number().int().positive('Fabricacao e obrigatorio'),
  custo_adicional_tipo_id: z.number().int().positive('Tipo de custo adicional e obrigatorio'),
  valor: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
});

export const estoqueInsumoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  insumo_id: z.number().int().positive('Insumo e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v >= 0, 'Quantidade nao pode ser negativa'),
  data_atualizacao: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional(),
});

export const estoqueProdutoFabricadoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v >= 0, 'Quantidade nao pode ser negativa'),
  data_atualizacao: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional(),
});

export const empresaBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  razao_social: z.string().min(1, 'Razao social e obrigatoria').max(200),
  fantasia: z.string().max(200).optional().or(z.literal('')),
  cnpj_cpf: z.string().max(20).optional().or(z.literal('')),
  inscricao_estadual_identidade: z.string().max(20).optional().or(z.literal('')),
  regime_tributario: z.string().max(50).optional().or(z.literal('')),
  endereco: z.string().max(500).optional().or(z.literal('')),
  telefone: z.string().max(20).optional().or(z.literal('')),
  celular: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email invalido').max(200).optional().or(z.literal('')),
  chave_pix: z.string().max(255).optional().or(z.literal('')),
});

export const moduloBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(255),
  descricao: z.string().max(500).optional().or(z.literal('')),
});

export const moduloFormularioBodySchema = z.object({
  modulo_id: z.number().int().positive('Modulo e obrigatorio'),
  formularios: z.array(z.number().int().positive()),
  abertura: z.number().int().optional(),
});

export const empresaModuloBodySchema = z.object({
  empresa_id: z.number().int().positive('Empresa e obrigatorio'),
  modulos: z.array(z.number().int().positive()),
});

export const usuarioEmpresaBodySchema = z.object({
  usuario_id: z.number().int().positive('Usuario e obrigatorio'),
  empresas: z.array(z.number().int().positive()),
});

export const perdaInsumoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  insumo_id: z.number().int().positive('Insumo e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  data_perda: z.string().min(1, 'Data e obrigatoria'),
  motivo: z.string().max(500).optional().or(z.literal('')),
});

export const perdaProdutoFabricadoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  data_perda: z.string().min(1, 'Data e obrigatoria'),
  motivo: z.string().max(500).optional().or(z.literal('')),
});

export const usoConsumoBodySchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade: z.union([z.number(), z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  data_uso: z.string().min(1, 'Data e obrigatoria'),
  motivo: z.string().max(500).optional().or(z.literal('')),
});

export const loginBodySchema = z.object({
  login: z.string().min(1).max(200).optional(),
  senha: z.string().min(1).max(100).optional(),
  pin: z.string().min(4).max(10).optional(),
  empresa: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
}).refine(
  (data) => {
    if (data.pin) return true;
    return !!data.login && !!data.senha;
  },
  { message: 'Informe login e senha, ou PIN', path: ['login'] }
);