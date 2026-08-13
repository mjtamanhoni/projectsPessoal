"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginBodySchema = exports.usoConsumoBodySchema = exports.perdaProdutoFabricadoBodySchema = exports.perdaInsumoBodySchema = exports.usuarioEmpresaBodySchema = exports.empresaModuloBodySchema = exports.moduloFormularioBodySchema = exports.moduloBodySchema = exports.empresaBodySchema = exports.estoqueProdutoFabricadoBodySchema = exports.estoqueInsumoBodySchema = exports.fabricacaoCustoAdicionalBodySchema = exports.encomendaBaixaSchema = exports.encomendaStatusSchema = exports.encomendaBodySchema = exports.vendaProdutoBodySchema = exports.fabricacaoBodySchema = exports.custoAdicionalTipoBodySchema = exports.receitaIngredienteBodySchema = exports.produtoFabricadoBodySchema = exports.compraInsumoBodySchema = exports.insumoBodySchema = exports.horaAbatidaBodySchema = exports.servicoBodySchema = exports.horaTrabalhadaBodySchema = exports.usuarioFormularioBodySchema = exports.formularioBodySchema = exports.usuarioPinBodySchema = exports.usuarioSenhaBodySchema = exports.usuarioBodySchema = exports.contaReceberBodySchema = exports.contaPagarBodySchema = exports.categoriaSaveSchema = exports.categoriaBodySchema = exports.fornecedorBodySchema = exports.clienteBodySchema = void 0;
const zod_1 = require("zod");
exports.clienteBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(200),
    cpf_cnpj: zod_1.z.string()
        .min(1, 'CPF/CNPJ e obrigatorio')
        .max(18)
        .refine((v) => v.replace(/\D/g, '').length >= 11, 'CPF/CNPJ invalido'),
    telefone: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    celular: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    endereco: zod_1.z.string().max(300).optional().or(zod_1.z.literal('')),
    email: zod_1.z.string().email('Email invalido').max(200).optional().or(zod_1.z.literal('')),
});
exports.fornecedorBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(200),
    telefone: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    celular: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    endereco: zod_1.z.string().max(300).optional().or(zod_1.z.literal('')),
    email: zod_1.z.string().email('Email invalido').max(200).optional().or(zod_1.z.literal('')),
});
exports.categoriaBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(200),
    descricao: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
    ativo: zod_1.z.boolean().optional(),
});
exports.categoriaSaveSchema = zod_1.z.union([
    exports.categoriaBodySchema,
    exports.categoriaBodySchema.array(),
]);
exports.contaPagarBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    descricao: zod_1.z.string().min(1, 'Descricao e obrigatoria').max(300),
    valor: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
    dataVencimento: zod_1.z.string().min(1, 'Data e obrigatoria'),
    fornecedorId: zod_1.z.number().int().positive('Fornecedor e obrigatorio'),
    idCategoria: zod_1.z.number().int().positive().nullable().optional(),
    pago: zod_1.z.boolean().optional(),
    dataPagamento: zod_1.z.string().optional(),
    valorBaixa: zod_1.z.number().optional(),
    desconto: zod_1.z.number().optional(),
    acrescimo: zod_1.z.number().optional(),
    lancamentoOrigemId: zod_1.z.number().int().positive().nullable().optional(),
});
exports.contaReceberBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    descricao: zod_1.z.string().min(1, 'Descricao e obrigatoria').max(300),
    valor: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
    dataVencimento: zod_1.z.string().min(1, 'Data e obrigatoria'),
    clienteId: zod_1.z.number().int().positive('Cliente e obrigatorio'),
    idCategoria: zod_1.z.number().int().positive().nullable().optional(),
    recebido: zod_1.z.boolean().optional(),
    dataRecebimento: zod_1.z.string().optional(),
    valorBaixa: zod_1.z.number().optional(),
    desconto: zod_1.z.number().optional(),
    acrescimo: zod_1.z.number().optional(),
    lancamentoOrigemId: zod_1.z.number().int().positive().nullable().optional(),
    lancamento_origem: zod_1.z.number().int().min(0).default(0).optional(),
});
exports.usuarioBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(100),
    email: zod_1.z.string().email('Email invalido').max(100).optional().or(zod_1.z.literal('')),
    senha: zod_1.z.string().min(4, 'Senha deve ter pelo menos 4 caracteres').max(100).optional().or(zod_1.z.literal('')),
    pin: zod_1.z.string().length(4, 'PIN deve ter exatamente 4 digitos').optional().or(zod_1.z.literal('')),
});
exports.usuarioSenhaBodySchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
    novaSenha: zod_1.z.string().min(4, 'Senha deve ter pelo menos 4 caracteres').max(100),
});
exports.usuarioPinBodySchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
    novoPin: zod_1.z.string().length(4, 'PIN deve ter exatamente 4 digitos'),
});
exports.formularioBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(100),
});
exports.usuarioFormularioBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    usuarioId: zod_1.z.number().int().positive('Usuario e obrigatorio'),
    formularioId: zod_1.z.number().int().positive('Formulario e obrigatorio'),
});
exports.horaTrabalhadaBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    usuarioId: zod_1.z.number().int().positive().nullable().optional(),
    clienteId: zod_1.z.number().int().positive().nullable().optional(),
    servicoId: zod_1.z.number().int().positive().nullable().optional(),
    valorHora: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor da hora deve ser maior que zero'),
    dataServico: zod_1.z.string().min(1, 'Data e obrigatoria'),
    horaInicio: zod_1.z.string().min(1, 'Hora inicio e obrigatoria'),
    horaTermino: zod_1.z.string().min(1, 'Hora termino e obrigatoria'),
    quantidadeHoras: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).optional(),
    totalHoras: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).optional(),
    observacoes: zod_1.z.string().max(500).optional(),
}).refine((data) => {
    if (!data.horaInicio || !data.horaTermino)
        return true;
    const [hI, mI] = data.horaInicio.split(':').map(Number);
    const [hT, mT] = data.horaTermino.split(':').map(Number);
    const inicio = hI * 60 + mI;
    const termino = hT * 60 + mT;
    return termino > inicio || termino < inicio;
}, { message: 'Hora termino deve ser diferente da hora inicio', path: ['horaTermino'] });
exports.servicoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(100),
    valorHora: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor da hora deve ser maior que zero'),
    horasMinimas: zod_1.z.string().min(1, 'Horas minimas e obrigatoria'),
});
exports.horaAbatidaBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    usuarioId: zod_1.z.number().int().positive('Usuario e obrigatorio'),
    clienteId: zod_1.z.number().int().positive('Cliente e obrigatorio'),
    servicoId: zod_1.z.number().int().positive('Servico e obrigatorio'),
    dataAbatimento: zod_1.z.string().min(1, 'Data e obrigatoria'),
    valor: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s.replace(',', '.')))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
    valorHora: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s.replace(',', '.')))]).refine((v) => v > 0, 'Valor da hora deve ser maior que zero'),
    quantidadeHoras: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s.replace(',', '.')))]).refine((v) => v > 0, 'Quantidade de horas deve ser maior que zero'),
    observacoes: zod_1.z.string().max(500).optional(),
});
exports.insumoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(200),
    unidade_medida: zod_1.z.string().min(1, 'Unidade de medida e obrigatoria').max(20),
    custo_medio: zod_1.z.number().optional(),
    ativo: zod_1.z.boolean().optional(),
    id_fornecedor: zod_1.z.union([zod_1.z.number().int().positive(), zod_1.z.null()]).optional(),
    id_marca: zod_1.z.union([zod_1.z.number().int().positive(), zod_1.z.null()]).optional(),
});
const compraInsumoItemSchema = zod_1.z.object({
    insumo_id: zod_1.z.number().int().positive('Insumo e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
    valor_unitario: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
    valor_total: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor total deve ser maior que zero'),
});
exports.compraInsumoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    fornecedor_id: zod_1.z.number().int().positive().optional(),
    valor_total: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).optional(),
    data_compra: zod_1.z.string().min(1, 'Data e obrigatoria'),
    observacao: zod_1.z.string().max(500).optional(),
    categoria_pagar_id: zod_1.z.number().int().positive().optional(),
    pago: zod_1.z.boolean().optional(),
    itens: zod_1.z.array(compraInsumoItemSchema).min(1, 'Adicione ao menos um item'),
});
exports.produtoFabricadoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(200),
    descricao: zod_1.z.string().max(500).optional(),
    rendimento: zod_1.z.number().optional(),
    unidade_medida: zod_1.z.string().max(20).optional(),
    custo_unitario: zod_1.z.number().optional(),
    margem_lucro: zod_1.z.number().optional(),
    valor_venda_sugerido: zod_1.z.number().optional(),
    preco: zod_1.z.number().optional(),
    foto: zod_1.z.string().optional(),
    ativo: zod_1.z.boolean().optional(),
});
exports.receitaIngredienteBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    insumo_id: zod_1.z.number().int().positive('Insumo e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
});
exports.custoAdicionalTipoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(200),
    ativo: zod_1.z.boolean().optional(),
});
exports.fabricacaoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    quantidade_produzida: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade produzida deve ser maior que zero'),
    data_fabricacao: zod_1.z.string().min(1, 'Data e obrigatoria'),
    observacao: zod_1.z.string().max(500).optional(),
});
const vendaProdutoItemSchema = zod_1.z.object({
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
    valor_unitario: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
    valor_total: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor total deve ser maior que zero'),
});
exports.vendaProdutoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    cliente_id: zod_1.z.number().int().positive('Cliente e obrigatorio'),
    valor_total: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).optional(),
    data_venda: zod_1.z.string().min(1, 'Data e obrigatoria'),
    contas_receber_id: zod_1.z.number().int().positive().optional(),
    observacao: zod_1.z.string().max(500).optional(),
    categoria_receber_id: zod_1.z.number().int().positive().optional(),
    recebido: zod_1.z.boolean().optional(),
    itens: zod_1.z.array(vendaProdutoItemSchema).min(1, 'Adicione ao menos um item'),
});
const encomendaItemSchema = zod_1.z.object({
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
    valor_unitario: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
    valor_total: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor total deve ser maior que zero'),
});
exports.encomendaBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    cliente_id: zod_1.z.number().int().positive('Cliente e obrigatorio'),
    valor_total: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).optional(),
    data_encomenda: zod_1.z.string().min(1, 'Data e obrigatoria'),
    data_entrega: zod_1.z.string().optional(),
    observacao: zod_1.z.string().max(500).optional(),
    itens: zod_1.z.array(encomendaItemSchema).min(1, 'Adicione ao menos um item'),
});
exports.encomendaStatusSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive('Encomenda e obrigatoria'),
    status: zod_1.z.number().int().min(0).max(4, 'Status invalido'),
    data_venda: zod_1.z.string().optional(),
    recebido: zod_1.z.boolean().optional(),
    categoria_receber_id: zod_1.z.number().int().positive().optional(),
});
exports.encomendaBaixaSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive('Encomenda e obrigatoria'),
    id_encomenda: zod_1.z.number().int().positive().optional(),
    data_venda: zod_1.z.string().min(1, 'Data da venda e obrigatoria'),
    recebido: zod_1.z.boolean().optional(),
    categoria_receber_id: zod_1.z.number().int().positive().optional(),
});
exports.fabricacaoCustoAdicionalBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    fabricacao_id: zod_1.z.number().int().positive('Fabricacao e obrigatorio'),
    custo_adicional_tipo_id: zod_1.z.number().int().positive('Tipo de custo adicional e obrigatorio'),
    valor: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Valor deve ser maior que zero'),
});
exports.estoqueInsumoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    insumo_id: zod_1.z.number().int().positive('Insumo e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v >= 0, 'Quantidade nao pode ser negativa'),
    data_atualizacao: zod_1.z.string().min(1, 'Data e obrigatoria'),
    observacao: zod_1.z.string().max(500).optional(),
});
exports.estoqueProdutoFabricadoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v >= 0, 'Quantidade nao pode ser negativa'),
    data_atualizacao: zod_1.z.string().min(1, 'Data e obrigatoria'),
    observacao: zod_1.z.string().max(500).optional(),
});
exports.empresaBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    razao_social: zod_1.z.string().min(1, 'Razao social e obrigatoria').max(200),
    fantasia: zod_1.z.string().max(200).optional().or(zod_1.z.literal('')),
    cnpj_cpf: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    inscricao_estadual_identidade: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    regime_tributario: zod_1.z.string().max(50).optional().or(zod_1.z.literal('')),
    endereco: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
    telefone: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    celular: zod_1.z.string().max(20).optional().or(zod_1.z.literal('')),
    email: zod_1.z.string().email('Email invalido').max(200).optional().or(zod_1.z.literal('')),
    chave_pix: zod_1.z.string().max(255).optional().or(zod_1.z.literal('')),
});
exports.moduloBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    nome: zod_1.z.string().min(1, 'Nome e obrigatorio').max(255),
    descricao: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
});
exports.moduloFormularioBodySchema = zod_1.z.object({
    modulo_id: zod_1.z.number().int().positive('Modulo e obrigatorio'),
    formularios: zod_1.z.array(zod_1.z.number().int().positive()),
    abertura: zod_1.z.number().int().optional(),
});
exports.empresaModuloBodySchema = zod_1.z.object({
    empresa_id: zod_1.z.number().int().positive('Empresa e obrigatorio'),
    modulos: zod_1.z.array(zod_1.z.number().int().positive()),
});
exports.usuarioEmpresaBodySchema = zod_1.z.object({
    usuario_id: zod_1.z.number().int().positive('Usuario e obrigatorio'),
    empresas: zod_1.z.array(zod_1.z.number().int().positive()),
});
exports.perdaInsumoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    insumo_id: zod_1.z.number().int().positive('Insumo e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
    data_perda: zod_1.z.string().min(1, 'Data e obrigatoria'),
    motivo: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
});
exports.perdaProdutoFabricadoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
    data_perda: zod_1.z.string().min(1, 'Data e obrigatoria'),
    motivo: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
});
exports.usoConsumoBodySchema = zod_1.z.object({
    codigo: zod_1.z.number().int().positive().optional(),
    id: zod_1.z.number().int().positive().optional(),
    produto_fabricado_id: zod_1.z.number().int().positive('Produto e obrigatorio'),
    quantidade: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform((s) => parseFloat(s))]).refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
    data_uso: zod_1.z.string().min(1, 'Data e obrigatoria'),
    motivo: zod_1.z.string().max(500).optional().or(zod_1.z.literal('')),
});
exports.loginBodySchema = zod_1.z.object({
    login: zod_1.z.string().min(1).max(200).optional(),
    senha: zod_1.z.string().min(1).max(100).optional(),
    pin: zod_1.z.string().min(4).max(10).optional(),
    empresa: zod_1.z.union([zod_1.z.number().int().positive(), zod_1.z.string().min(1)]).optional(),
}).refine((data) => {
    if (data.pin)
        return true;
    return !!data.login && !!data.senha;
}, { message: 'Informe login e senha, ou PIN', path: ['login'] });
//# sourceMappingURL=index.js.map