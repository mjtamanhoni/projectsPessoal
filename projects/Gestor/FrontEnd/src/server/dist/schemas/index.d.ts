import { z } from 'zod';
export declare const clienteBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    telefone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    celular: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    endereco: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const fornecedorBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    telefone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    celular: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    endereco: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const categoriaBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    descricao: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const categoriaSaveSchema: z.ZodUnion<readonly [z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    descricao: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodArray<z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    descricao: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>]>;
export declare const contaPagarBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    descricao: z.ZodString;
    valor: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    dataVencimento: z.ZodString;
    fornecedorId: z.ZodNumber;
    idCategoria: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    pago: z.ZodOptional<z.ZodBoolean>;
    dataPagamento: z.ZodOptional<z.ZodString>;
    valorBaixa: z.ZodOptional<z.ZodNumber>;
    desconto: z.ZodOptional<z.ZodNumber>;
    acrescimo: z.ZodOptional<z.ZodNumber>;
    lancamentoOrigemId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export declare const contaReceberBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    descricao: z.ZodString;
    valor: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    dataVencimento: z.ZodString;
    clienteId: z.ZodNumber;
    idCategoria: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    recebido: z.ZodOptional<z.ZodBoolean>;
    dataRecebimento: z.ZodOptional<z.ZodString>;
    valorBaixa: z.ZodOptional<z.ZodNumber>;
    desconto: z.ZodOptional<z.ZodNumber>;
    acrescimo: z.ZodOptional<z.ZodNumber>;
    lancamentoOrigemId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lancamento_origem: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, z.core.$strip>;
export declare const usuarioBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    senha: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    pin: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const usuarioSenhaBodySchema: z.ZodObject<{
    id: z.ZodNumber;
    novaSenha: z.ZodString;
}, z.core.$strip>;
export declare const usuarioPinBodySchema: z.ZodObject<{
    id: z.ZodNumber;
    novoPin: z.ZodString;
}, z.core.$strip>;
export declare const formularioBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
}, z.core.$strip>;
export declare const usuarioFormularioBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    usuarioId: z.ZodNumber;
    formularioId: z.ZodNumber;
}, z.core.$strip>;
export declare const horaTrabalhadaBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    usuarioId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    clienteId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    servicoId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    valorHora: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    dataServico: z.ZodString;
    horaInicio: z.ZodString;
    horaTermino: z.ZodString;
    quantidadeHoras: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>>;
    totalHoras: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>>;
    observacoes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const servicoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    valorHora: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    horasMinimas: z.ZodString;
}, z.core.$strip>;
export declare const horaAbatidaBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    usuarioId: z.ZodNumber;
    clienteId: z.ZodNumber;
    servicoId: z.ZodNumber;
    dataAbatimento: z.ZodString;
    valor: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    valorHora: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    quantidadeHoras: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    observacoes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const insumoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    unidade_medida: z.ZodString;
    custo_medio: z.ZodOptional<z.ZodNumber>;
    ativo: z.ZodOptional<z.ZodBoolean>;
    id_fornecedor: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodNull]>>;
    id_marca: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodNull]>>;
}, z.core.$strip>;
export declare const compraInsumoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    fornecedor_id: z.ZodOptional<z.ZodNumber>;
    valor_total: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>>;
    data_compra: z.ZodString;
    observacao: z.ZodOptional<z.ZodString>;
    categoria_pagar_id: z.ZodOptional<z.ZodNumber>;
    pago: z.ZodOptional<z.ZodBoolean>;
    itens: z.ZodArray<z.ZodObject<{
        insumo_id: z.ZodNumber;
        quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
        valor_unitario: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
        valor_total: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const produtoFabricadoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    rendimento: z.ZodOptional<z.ZodNumber>;
    unidade_medida: z.ZodOptional<z.ZodString>;
    custo_unitario: z.ZodOptional<z.ZodNumber>;
    margem_lucro: z.ZodOptional<z.ZodNumber>;
    valor_venda_sugerido: z.ZodOptional<z.ZodNumber>;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const receitaIngredienteBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    produto_fabricado_id: z.ZodNumber;
    insumo_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
}, z.core.$strip>;
export declare const custoAdicionalTipoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const fabricacaoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    produto_fabricado_id: z.ZodNumber;
    quantidade_produzida: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_fabricacao: z.ZodString;
    observacao: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const vendaProdutoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    produto_fabricado_id: z.ZodNumber;
    cliente_id: z.ZodNumber;
    usuario_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    valor_unitario: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    valor_total: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_venda: z.ZodString;
    contas_receber_id: z.ZodOptional<z.ZodNumber>;
    observacao: z.ZodOptional<z.ZodString>;
    categoria_receber_id: z.ZodOptional<z.ZodNumber>;
    recebido: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const fabricacaoCustoAdicionalBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    fabricacao_id: z.ZodNumber;
    custo_adicional_tipo_id: z.ZodNumber;
    valor: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
}, z.core.$strip>;
export declare const estoqueInsumoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    insumo_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_atualizacao: z.ZodString;
    observacao: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const estoqueProdutoFabricadoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    produto_fabricado_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_atualizacao: z.ZodString;
    observacao: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const empresaBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    razao_social: z.ZodString;
    fantasia: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    cnpj_cpf: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    inscricao_estadual_identidade: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    regime_tributario: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    endereco: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    telefone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    celular: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const moduloBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    nome: z.ZodString;
    descricao: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const moduloFormularioBodySchema: z.ZodObject<{
    modulo_id: z.ZodNumber;
    formularios: z.ZodArray<z.ZodNumber>;
    abertura: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const empresaModuloBodySchema: z.ZodObject<{
    empresa_id: z.ZodNumber;
    modulos: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
export declare const usuarioEmpresaBodySchema: z.ZodObject<{
    usuario_id: z.ZodNumber;
    empresas: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
export declare const perdaInsumoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    insumo_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_perda: z.ZodString;
    motivo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const perdaProdutoFabricadoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    produto_fabricado_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_perda: z.ZodString;
    motivo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const usoConsumoBodySchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    produto_fabricado_id: z.ZodNumber;
    quantidade: z.ZodUnion<readonly [z.ZodNumber, z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>]>;
    data_uso: z.ZodString;
    motivo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const loginBodySchema: z.ZodObject<{
    login: z.ZodOptional<z.ZodString>;
    senha: z.ZodOptional<z.ZodString>;
    pin: z.ZodOptional<z.ZodString>;
    empresa: z.ZodNumber;
}, z.core.$strip>;
//# sourceMappingURL=index.d.ts.map