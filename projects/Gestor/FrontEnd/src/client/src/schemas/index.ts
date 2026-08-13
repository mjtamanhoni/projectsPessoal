import { z } from 'zod';

export const clienteSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  cpf_cnpj: z.string()
    .min(1, 'CPF/CNPJ e obrigatorio')
    .max(18)
    .refine((v) => v.replace(/\D/g, '').length >= 11, 'CPF/CNPJ invalido'),
  telefone: z.string().max(20).optional().or(z.literal('')),
  celular: z.string().max(20).optional().or(z.literal('')),
  endereco: z.string().max(300).optional().or(z.literal('')),
  email: z.string().email('Email invalido').max(200).optional().or(z.literal('')),
});

export const fornecedorSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  telefone: z.string().max(20).optional().or(z.literal('')),
  celular: z.string().max(20).optional().or(z.literal('')),
  endereco: z.string().max(300).optional().or(z.literal('')),
  email: z.string().email('Email invalido').max(200).optional().or(z.literal('')),
});

export const categoriaSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  descricao: z.string().max(500).optional().or(z.literal('')),
  ativo: z.boolean().optional(),
});

export const contaPagarSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  descricao: z.string().min(1, 'Descricao e obrigatoria').max(300),
  valor: z.number().positive('Valor deve ser maior que zero'),
  dataVencimento: z.string().min(1, 'Data e obrigatoria'),
  fornecedorId: z.number().int().positive('Fornecedor e obrigatorio'),
  fornecedorNome: z.string().optional(),
  idCategoria: z.number().int().positive().nullable().optional(),
  categoriaNome: z.string().optional(),
  pago: z.boolean().optional(),
  dataPagamento: z.string().optional(),
  valorBaixa: z.number().optional(),
  desconto: z.number().optional(),
  acrescimo: z.number().optional(),
  lancamentoOrigemId: z.number().int().positive().nullable().optional(),
});

export const contaReceberSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  descricao: z.string().min(1, 'Descricao e obrigatoria').max(300),
  valor: z.number().positive('Valor deve ser maior que zero'),
  dataVencimento: z.string().min(1, 'Data e obrigatoria'),
  clienteId: z.number().int().positive('Cliente e obrigatorio'),
  clienteNome: z.string().optional(),
  idCategoria: z.number().int().positive().nullable().optional(),
  categoriaNome: z.string().optional(),
  recebido: z.boolean().optional(),
  dataRecebimento: z.string().optional(),
  valorBaixa: z.number().optional(),
  desconto: z.number().optional(),
  acrescimo: z.number().optional(),
  lancamentoOrigemId: z.number().int().positive().nullable().optional(),
  lancamento_origem: z.number().int().min(0).default(0).optional(),
});

export const formularioSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
});

export const usuarioFormularioSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive('Usuario e obrigatorio'),
  formularioId: z.number().int().positive('Formulario e obrigatorio'),
});

export const empresaSchema = z.object({
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
  logomarca: z.string().max(11 * 1024 * 1024).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  login: z.string().min(1, 'Login e obrigatorio').max(200).optional(),
  senha: z.string().min(1, 'Senha e obrigatoria').max(100).optional(),
  pin: z.string().min(4, 'PIN deve ter pelo menos 4 digitos').max(10).optional(),
  empresa: z.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.pin) return true;
    return !!data.login && !!data.senha;
  },
  { message: 'Informe login e senha, ou PIN', path: ['login'] }
);

export const usuarioSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
  email: z.string().email('Email invalido').max(100).optional().or(z.literal('')),
  senha: z.string().min(4, 'Senha deve ter pelo menos 4 caracteres').max(100).optional().or(z.literal('')),
  confirmarSenha: z.string().min(4, 'Confirmacao deve ter pelo menos 4 caracteres').max(100).optional().or(z.literal('')),
  pin: z.string().length(4, 'PIN deve ter exatamente 4 digitos').optional().or(z.literal('')),
  confirmarPin: z.string().length(4, 'Confirmacao deve ter exatamente 4 digitos').optional().or(z.literal('')),
}).refine((data) => {
  const isNew = !data.id && !data.codigo;
  if (!isNew) return true;
  return !!data.senha && data.senha.length >= 4;
}, { message: 'Senha e obrigatoria para novo usuario', path: ['senha'] })
.refine((data) => {
  const isNew = !data.id && !data.codigo;
  if (!isNew) return true;
  return !!data.confirmarSenha && data.confirmarSenha.length >= 4;
}, { message: 'Confirmacao de senha e obrigatoria', path: ['confirmarSenha'] })
.refine((data) => {
  const isNew = !data.id && !data.codigo;
  if (!isNew) return true;
  return data.senha === data.confirmarSenha;
}, { message: 'As senhas nao conferem', path: ['confirmarSenha'] })
.refine((data) => {
  const isNew = !data.id && !data.codigo;
  if (!isNew) return true;
  return !!data.pin && data.pin.length === 4;
}, { message: 'PIN e obrigatorio para novo usuario', path: ['pin'] })
.refine((data) => {
  const isNew = !data.id && !data.codigo;
  if (!isNew) return true;
  return !!data.confirmarPin && data.confirmarPin.length === 4;
}, { message: 'Confirmacao de PIN e obrigatoria', path: ['confirmarPin'] })
.refine((data) => {
  const isNew = !data.id && !data.codigo;
  if (!isNew) return true;
  return data.pin === data.confirmarPin;
}, { message: 'Os PINs nao conferem', path: ['confirmarPin'] });

export const usuarioSenhaSchema = z.object({
  id: z.number().int().positive(),
  novaSenha: z.string().min(4, 'Senha deve ter pelo menos 4 caracteres').max(100),
  confirmarSenha: z.string().min(4, 'Confirmacao deve ter pelo menos 4 caracteres').max(100),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas nao conferem',
  path: ['confirmarSenha'],
});

export const usuarioPinSchema = z.object({
  id: z.number().int().positive(),
  novoPin: z.string().min(4, 'PIN deve ter pelo menos 4 digitos').max(4, 'PIN deve ter exatamente 4 digitos'),
  confirmarPin: z.string().min(4, 'Confirmacao deve ter pelo menos 4 digitos').max(4),
}).refine((data) => data.novoPin === data.confirmarPin, {
  message: 'Os PINs nao conferem',
  path: ['confirmarPin'],
});

export const moduloSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(255),
  descricao: z.string().max(500).optional().or(z.literal('')),
});

export const moduloFormularioSchema = z.object({
  modulo_id: z.number().int().positive('Modulo e obrigatorio'),
  formularios: z.array(z.number().int().positive()),
});

export const empresaModuloSchema = z.object({
  empresa_id: z.number().int().positive('Empresa e obrigatorio'),
  modulos: z.array(z.number().int().positive()),
});

export const horaTrabalhadaSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive('Usuario e obrigatorio'),
  clienteId: z.number().int().positive().nullable().optional().or(z.literal(0)),
  servicoId: z.number().int().positive().nullable().optional().or(z.literal(0)),
  valorHora: z.number().positive('Valor da hora deve ser maior que zero'),
  dataServico: z.string().min(1, 'Data e obrigatoria'),
  horaInicio: z.string().min(1, 'Hora inicio e obrigatoria'),
  horaTermino: z.string().min(1, 'Hora termino e obrigatoria'),
  observacoes: z.string().max(500).optional().or(z.literal('')),
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

export const servicoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
  valorHora: z.number().positive('Valor da hora deve ser maior que zero'),
  horasMinimas: z.string().min(1, 'Horas minimas e obrigatoria'),
});

export const horaAbatidaSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive('Usuario e obrigatorio'),
  clienteId: z.number().int().positive('Cliente e obrigatorio'),
  servicoId: z.number().int().positive('Servico e obrigatorio'),
  dataAbatimento: z.string().min(1, 'Data e obrigatoria'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  valorHora: z.number().positive('Valor da hora deve ser maior que zero'),
  quantidadeHoras: z.number().optional(),
  observacoes: z.string().max(500).optional().or(z.literal('')),
});

export type HoraTrabalhadaInput = z.infer<typeof horaTrabalhadaSchema>;
export type ServicoInput = z.infer<typeof servicoSchema>;
export type HoraAbatidaInput = z.infer<typeof horaAbatidaSchema>;
export type FormularioInput = z.infer<typeof formularioSchema>;
export type UsuarioFormularioInput = z.infer<typeof usuarioFormularioSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type FornecedorInput = z.infer<typeof fornecedorSchema>;
export type CategoriaInput = z.infer<typeof categoriaSchema>;
export type ContaPagarInput = z.infer<typeof contaPagarSchema>;
export type ContaReceberInput = z.infer<typeof contaReceberSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UsuarioInput = z.infer<typeof usuarioSchema>;
export type UsuarioSenhaInput = z.infer<typeof usuarioSenhaSchema>;
export type UsuarioPinInput = z.infer<typeof usuarioPinSchema>;
export type EmpresaInput = z.infer<typeof empresaSchema>;
export type ModuloInput = z.infer<typeof moduloSchema>;
export type ModuloFormularioInput = z.infer<typeof moduloFormularioSchema>;
export type EmpresaModuloInput = z.infer<typeof empresaModuloSchema>;