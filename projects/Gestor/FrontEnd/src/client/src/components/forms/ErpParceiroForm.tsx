import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { buscarCep } from '@/lib/api';
import { formatCelular, formatCep, formatCpfCnpj, formatCurrencyInput, formatPhone, parseCurrencyInput } from '@/lib/utils';
import type {
  ErpCliente,
  ErpClientePayload,
  ErpContato,
  ErpEndereco,
  ErpFornecedor,
  ErpFornecedorPayload,
  ErpLookupItem,
  ErpLookups,
  ErpPessoa,
} from '@/types/erp';

interface ErpParceiroFormProps {
  tipo: 'cliente' | 'fornecedor';
  initial?: ErpCliente | ErpFornecedor | null;
  lookups: ErpLookups | null;
  onSubmit: (payload: ErpClientePayload | ErpFornecedorPayload) => Promise<void>;
  onCancel: () => void;
}

interface PessoaForm {
  tipo_pessoa: 'F' | 'J';
  tipo_documento: string;
  documento: string;
  nome: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  regime_tributario: string;
  status: number;
}

interface DadosForm {
  codigo: string;
  condicao_pagamento_id: string;
  tabela_preco_id: string;
  limite_credito: string;
  dia_fechamento: string;
  dia_vencimento: string;
  bloqueado: boolean;
  motivo_bloqueio: string;
  observacao: string;
  categoria: string;
  prazo_entrega_dias: string;
  status: number;
}

interface EnderecoForm {
  tipo: number;
  principal: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  status: number;
}

interface ContatoForm {
  nome: string;
  cargo: string;
  departamento: string;
  principal: boolean;
  status: number;
  telefone: string;
  whatsapp: boolean;
  email: string;
  rede: string;
  observacao: string;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const TIPO_ENDERECO = [
  { value: 1, label: 'Comercial' },
  { value: 2, label: 'Residencial' },
  { value: 3, label: 'Entrega' },
  { value: 4, label: 'Cobrança' },
  { value: 5, label: 'Correspondência' },
  { value: 6, label: 'Outro' },
];

const CATEGORIAS_FORNECEDOR = [
  { value: '1', label: 'Matéria-prima' },
  { value: '2', label: 'Serviço' },
  { value: '3', label: 'Revenda' },
  { value: '4', label: 'Uso e consumo' },
  { value: '5', label: 'Locação' },
  { value: '6', label: 'Outro' },
];

const REGIMES = [
  { value: '1', label: 'Simples Nacional' },
  { value: '2', label: 'Simples Nacional - excesso de sublimite' },
  { value: '3', label: 'Regime Normal' },
  { value: '4', label: 'MEI' },
];

function moneyInput(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return formatCurrencyInput(String(Math.round(n * 100)));
}

function moneyNumber(value: string): number {
  return parseCurrencyInput(value);
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function lookupLabel(item: ErpLookupItem): string {
  const name = item.nome ?? item.descricao ?? item.razao_social ?? `#${item.id}`;
  return item.codigo ? `${item.codigo} - ${name}` : String(name);
}

function LookupSelect({
  label,
  value,
  onChange,
  items,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: ErpLookupItem[] | undefined;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label-field">{label}</label>
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {(items ?? []).map((item) => (
          <option key={item.id} value={String(item.id)}>
            {lookupLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}

function emptyEndereco(): EnderecoForm {
  return {
    tipo: 1,
    principal: false,
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    status: 1,
  };
}

function emptyContato(): ContatoForm {
  return {
    nome: '',
    cargo: '',
    departamento: '',
    principal: false,
    status: 1,
    telefone: '',
    whatsapp: false,
    email: '',
    rede: '',
    observacao: '',
  };
}

function mapEndereco(e: ErpEndereco): EnderecoForm {
  return {
    tipo: e.tipo ?? 1,
    principal: Boolean(e.principal),
    cep: e.cep ? formatCep(e.cep) : '',
    logradouro: e.logradouro ?? '',
    numero: e.numero ?? '',
    complemento: e.complemento ?? '',
    bairro: e.bairro ?? '',
    municipio: e.municipio ?? '',
    uf: e.uf ?? '',
    status: e.status ?? 1,
  };
}

function mapContato(c: ErpContato): ContatoForm {
  const telefone = c.telefones?.[0];
  const email = c.emails?.[0];
  const rede = c.redes?.[0];
  const digits = (telefone?.numero ?? '').replace(/\D/g, '');
  return {
    nome: c.nome ?? '',
    cargo: c.cargo ?? '',
    departamento: c.departamento ?? '',
    principal: Boolean(c.principal),
    status: c.status ?? 1,
    telefone: digits.length > 10 ? formatCelular(digits) : formatPhone(digits),
    whatsapp: Boolean(telefone?.whatsapp),
    email: email?.email ?? '',
    rede: rede?.identificador ?? '',
    observacao: c.observacao ?? '',
  };
}

export function ErpParceiroForm({ tipo, initial, lookups, onSubmit, onCancel }: ErpParceiroFormProps) {
  const pessoaInicial = initial?.pessoa;
  const [pessoa, setPessoa] = useState<PessoaForm>({
    tipo_pessoa: (pessoaInicial?.tipo_pessoa as 'F' | 'J') ?? 'J',
    tipo_documento: pessoaInicial?.tipo_documento ?? 'CNPJ',
    documento: pessoaInicial?.documento ? formatCpfCnpj(pessoaInicial.documento) : '',
    nome: pessoaInicial?.nome ?? initial?.nome ?? '',
    nome_fantasia: pessoaInicial?.nome_fantasia ?? initial?.nome_fantasia ?? '',
    inscricao_estadual: pessoaInicial?.inscricao_estadual ?? '',
    inscricao_municipal: pessoaInicial?.inscricao_municipal ?? '',
    regime_tributario: pessoaInicial?.regime_tributario ? String(pessoaInicial.regime_tributario) : '',
    status: pessoaInicial?.status ?? initial?.status ?? 1,
  });

  const [dados, setDados] = useState<DadosForm>({
    codigo: initial?.codigo ?? '',
    condicao_pagamento_id: initial?.condicao_pagamento_id ? String(initial.condicao_pagamento_id) : '',
    tabela_preco_id: tipo === 'cliente' && 'tabela_preco_id' in (initial ?? {})
      ? String((initial as ErpCliente).tabela_preco_id ?? '')
      : '',
    limite_credito: tipo === 'cliente' && 'limite_credito' in (initial ?? {})
      ? moneyInput((initial as ErpCliente).limite_credito)
      : moneyInput(0),
    dia_fechamento: tipo === 'cliente' && (initial as ErpCliente)?.dia_fechamento
      ? String((initial as ErpCliente).dia_fechamento)
      : '',
    dia_vencimento: tipo === 'cliente' && (initial as ErpCliente)?.dia_vencimento
      ? String((initial as ErpCliente).dia_vencimento)
      : '',
    bloqueado: tipo === 'cliente' ? Boolean((initial as ErpCliente)?.bloqueado) : false,
    motivo_bloqueio: tipo === 'cliente' ? ((initial as ErpCliente)?.motivo_bloqueio ?? '') : '',
    observacao: initial?.observacao ?? '',
    categoria: tipo === 'fornecedor' && (initial as ErpFornecedor)?.categoria
      ? String((initial as ErpFornecedor).categoria)
      : '1',
    prazo_entrega_dias: tipo === 'fornecedor' && (initial as ErpFornecedor)?.prazo_entrega_dias !== undefined
      ? String((initial as ErpFornecedor).prazo_entrega_dias)
      : '0',
    status: initial?.status ?? 1,
  });

  const [enderecos, setEnderecos] = useState<EnderecoForm[]>(() => {
    const list = initial?.enderecos ?? pessoaInicial?.enderecos ?? [];
    return list.length > 0 ? list.map(mapEndereco) : [emptyEndereco()];
  });

  const [contatos, setContatos] = useState<ContatoForm[]>(() => {
    const list = initial?.contatos ?? pessoaInicial?.contatos ?? [];
    return list.length > 0 ? list.map(mapContato) : [emptyContato()];
  });

  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState<number | null>(null);

  useEffect(() => {
    setErro('');
  }, [initial]);

  const setPessoaField = <K extends keyof PessoaForm>(key: K, value: PessoaForm[K]) => {
    setPessoa((prev) => ({ ...prev, [key]: value }));
  };

  const setDado = <K extends keyof DadosForm>(key: K, value: DadosForm[K]) => {
    setDados((prev) => ({ ...prev, [key]: value }));
  };

  const updateEndereco = <K extends keyof EnderecoForm>(index: number, key: K, value: EnderecoForm[K]) => {
    setEnderecos((prev) => prev.map((e, i) => (i === index ? { ...e, [key]: value } : e)));
  };

  const updateContato = <K extends keyof ContatoForm>(index: number, key: K, value: ContatoForm[K]) => {
    setContatos((prev) => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)));
  };

  const handleCepBlur = async (index: number) => {
    const digits = enderecos[index].cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setBuscandoCep(index);
    try {
      const result = await buscarCep(enderecos[index].cep);
      if (result) {
        setEnderecos((prev) =>
          prev.map((e, i) =>
            i === index
              ? {
                  ...e,
                  logradouro: result.logradouro || e.logradouro,
                  bairro: result.bairro || e.bairro,
                  municipio: result.localidade || e.municipio,
                  uf: result.uf || e.uf,
                }
              : e,
          ),
        );
      }
    } finally {
      setBuscandoCep(null);
    }
  };

  const changeTipoPessoa = (value: 'F' | 'J') => {
    setPessoa((prev) => ({
      ...prev,
      tipo_pessoa: value,
      tipo_documento: value === 'F' ? 'CPF' : 'CNPJ',
      documento: '',
    }));
  };

  const handleDocumentoChange = (value: string) => {
    if (pessoa.tipo_documento === 'CPF' || pessoa.tipo_documento === 'CNPJ') {
      setPessoaField('documento', formatCpfCnpj(value));
    } else {
      setPessoaField('documento', value.toUpperCase());
    }
  };

  const handleTelefoneChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    updateContato(index, 'telefone', digits.length > 10 ? formatCelular(value) : formatPhone(value));
  };

  const buildPayload = (): ErpClientePayload | ErpFornecedorPayload => {
    const enderecosPayload = enderecos
      .filter((e) => e.logradouro.trim() || e.municipio.trim() || e.cep.trim())
      .map((e) => ({
        tipo: e.tipo,
        principal: e.principal,
        cep: e.cep,
        logradouro: e.logradouro.trim(),
        numero: e.numero.trim(),
        complemento: e.complemento.trim(),
        bairro: e.bairro.trim(),
        municipio: e.municipio.trim(),
        uf: e.uf,
        status: e.status,
      }));

    const contatosPayload = contatos
      .filter((c) => c.nome.trim() || c.telefone.trim() || c.email.trim())
      .map((c) => ({
        nome: c.nome.trim(),
        cargo: c.cargo.trim(),
        departamento: c.departamento.trim(),
        principal: c.principal,
        observacao: c.observacao.trim(),
        status: c.status,
        telefones: c.telefone.trim()
          ? [{ tipo: 1, numero: c.telefone, whatsapp: c.whatsapp, principal: true, status: 1 }]
          : [],
        emails: c.email.trim()
          ? [{ tipo: 1, email: c.email.trim().toLowerCase(), principal: true, status: 1 }]
          : [],
        redes: c.rede.trim()
          ? [{ tipo: 1, identificador: c.rede.trim(), principal: true, status: 1 }]
          : [],
      }));

    const pessoaPayload: ErpPessoa = {
      ...(pessoaInicial?.id ? { id: pessoaInicial.id } : {}),
      tipo_pessoa: pessoa.tipo_pessoa,
      tipo_documento: pessoa.tipo_documento,
      documento: pessoa.documento,
      nome: pessoa.nome.trim(),
      nome_fantasia: pessoa.nome_fantasia.trim(),
      inscricao_estadual: pessoa.inscricao_estadual.trim(),
      inscricao_municipal: pessoa.inscricao_municipal.trim(),
      regime_tributario: numberOrUndefined(pessoa.regime_tributario),
      limite_credito: moneyNumber(dados.limite_credito),
      status: pessoa.status,
      enderecos: enderecosPayload,
      contatos: contatosPayload,
    };

    const base = {
      ...(initial?.id ? { id: initial.id } : {}),
      ...(initial?.pessoa_id ? { pessoa_id: initial.pessoa_id } : {}),
      codigo: dados.codigo.trim() || undefined,
      condicao_pagamento_id: numberOrUndefined(dados.condicao_pagamento_id),
      observacao: dados.observacao.trim(),
      status: dados.status,
      pessoa: pessoaPayload,
    };

    if (tipo === 'cliente') {
      return {
        ...base,
        tabela_preco_id: numberOrUndefined(dados.tabela_preco_id),
        limite_credito: moneyNumber(dados.limite_credito),
        dia_fechamento: numberOrUndefined(dados.dia_fechamento),
        dia_vencimento: numberOrUndefined(dados.dia_vencimento),
        bloqueado: dados.bloqueado,
        motivo_bloqueio: dados.motivo_bloqueio.trim(),
      };
    }

    return {
      ...base,
      categoria: numberOrUndefined(dados.categoria) ?? 1,
      prazo_entrega_dias: numberOrUndefined(dados.prazo_entrega_dias) ?? 0,
    };
  };

  const validate = (): string => {
    if (!pessoa.nome.trim()) return 'Informe o nome / razão social';
    const digits = pessoa.documento.replace(/\D/g, '');
    if (pessoa.tipo_documento === 'CPF' && digits.length !== 11) return 'CPF deve conter 11 dígitos';
    if (pessoa.tipo_documento === 'CNPJ' && digits.length !== 14) return 'CNPJ deve conter 14 dígitos';
    if (!pessoa.documento.trim()) return 'Informe o documento';
    for (const [index, e] of enderecos.entries()) {
      const preenchido = e.logradouro.trim() || e.municipio.trim() || e.cep.trim();
      if (preenchido && (!e.logradouro.trim() || !e.municipio.trim())) {
        return `Endereço ${index + 1}: informe logradouro e município`;
      }
    }
    for (const [index, c] of contatos.entries()) {
      const preenchido = c.nome.trim() || c.telefone.trim() || c.email.trim();
      if (preenchido && !c.nome.trim()) {
        return `Contato ${index + 1}: informe o nome`;
      }
    }
    return '';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setErro(validation);
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      await onSubmit(buildPayload());
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar cadastro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Dados da pessoa</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="label-field">Tipo de pessoa</label>
            <select
              className="input-field"
              value={pessoa.tipo_pessoa}
              onChange={(e) => changeTipoPessoa(e.target.value as 'F' | 'J')}
            >
              <option value="J">Jurídica</option>
              <option value="F">Física</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label-field">Tipo de documento</label>
            <select
              className="input-field"
              value={pessoa.tipo_documento}
              onChange={(e) => setPessoaField('tipo_documento', e.target.value)}
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="NIF">NIF</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <Input
            label="Documento *"
            value={pessoa.documento}
            onChange={(e) => handleDocumentoChange(e.target.value)}
            placeholder={pessoa.tipo_documento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={pessoa.tipo_pessoa === 'J' ? 'Razão social *' : 'Nome *'}
            value={pessoa.nome}
            onChange={(e) => setPessoaField('nome', e.target.value)}
            autoFocus
          />
          <Input
            label="Nome fantasia"
            value={pessoa.nome_fantasia}
            onChange={(e) => setPessoaField('nome_fantasia', e.target.value)}
          />
          <Input
            label="Inscrição estadual"
            value={pessoa.inscricao_estadual}
            onChange={(e) => setPessoaField('inscricao_estadual', e.target.value)}
          />
          <Input
            label="Inscrição municipal"
            value={pessoa.inscricao_municipal}
            onChange={(e) => setPessoaField('inscricao_municipal', e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="label-field">Regime tributário</label>
            <select
              className="input-field"
              value={pessoa.regime_tributario}
              onChange={(e) => setPessoaField('regime_tributario', e.target.value)}
            >
              <option value="">Não informado</option>
              {REGIMES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label-field">Status</label>
            <select
              className="input-field"
              value={pessoa.status}
              onChange={(e) => setPessoaField('status', Number(e.target.value))}
            >
              <option value={1}>Ativo</option>
              <option value={0}>Inativo</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Dados do {tipo === 'cliente' ? 'cliente' : 'fornecedor'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Código"
            value={dados.codigo}
            onChange={(e) => setDado('codigo', e.target.value)}
            placeholder="Automático"
          />
          <LookupSelect
            label="Condição de pagamento"
            value={dados.condicao_pagamento_id}
            onChange={(v) => setDado('condicao_pagamento_id', v)}
            items={lookups?.condicoes_pagamento}
            placeholder="Não informada"
          />
          {tipo === 'cliente' ? (
            <LookupSelect
              label="Tabela de preço"
              value={dados.tabela_preco_id}
              onChange={(v) => setDado('tabela_preco_id', v)}
              items={lookups?.tabelas_preco}
              placeholder="Não informada"
            />
          ) : (
            <div className="space-y-1.5">
              <label className="label-field">Categoria</label>
              <select
                className="input-field"
                value={dados.categoria}
                onChange={(e) => setDado('categoria', e.target.value)}
              >
                {CATEGORIAS_FORNECEDOR.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          {tipo === 'cliente' ? (
            <>
              <Input
                label="Limite de crédito"
                value={dados.limite_credito}
                onChange={(e) => setDado('limite_credito', formatCurrencyInput(e.target.value))}
              />
              <Input
                label="Dia de fechamento"
                type="number"
                min={1}
                max={31}
                value={dados.dia_fechamento}
                onChange={(e) => setDado('dia_fechamento', e.target.value)}
              />
              <Input
                label="Dia de vencimento"
                type="number"
                min={1}
                max={31}
                value={dados.dia_vencimento}
                onChange={(e) => setDado('dia_vencimento', e.target.value)}
              />
            </>
          ) : (
            <Input
              label="Prazo de entrega (dias)"
              type="number"
              min={0}
              value={dados.prazo_entrega_dias}
              onChange={(e) => setDado('prazo_entrega_dias', e.target.value)}
            />
          )}
          <div className="space-y-1.5">
            <label className="label-field">Status</label>
            <select
              className="input-field"
              value={dados.status}
              onChange={(e) => setDado('status', Number(e.target.value))}
            >
              <option value={1}>Ativo</option>
              <option value={0}>Inativo</option>
            </select>
          </div>
        </div>
        {tipo === 'cliente' && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={dados.bloqueado}
                onChange={(e) => setDado('bloqueado', e.target.checked)}
              />
              Cliente bloqueado
            </label>
            <div className="flex-1 min-w-[240px]">
              <Input
                label="Motivo do bloqueio"
                value={dados.motivo_bloqueio}
                onChange={(e) => setDado('motivo_bloqueio', e.target.value)}
              />
            </div>
          </div>
        )}
        <div>
          <label className="label-field">Observação</label>
          <textarea
            className="input-field min-h-[70px] resize-none"
            value={dados.observacao}
            onChange={(e) => setDado('observacao', e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Endereços</h3>
          <Button type="button" variant="secondary" onClick={() => setEnderecos((prev) => [...prev, emptyEndereco()])}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
        {enderecos.map((endereco, index) => (
          <div key={index} className="rounded-lg border border-border-primary p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Endereço {index + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={endereco.principal}
                    onChange={(e) => updateEndereco(index, 'principal', e.target.checked)}
                  />
                  Principal
                </label>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-bg-muted text-accent-red"
                  onClick={() => setEnderecos((prev) => prev.filter((_, i) => i !== index))}
                  title="Remover endereço"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="label-field">Tipo</label>
                <select
                  className="input-field"
                  value={endereco.tipo}
                  onChange={(e) => updateEndereco(index, 'tipo', Number(e.target.value))}
                >
                  {TIPO_ENDERECO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="CEP"
                value={endereco.cep}
                placeholder={buscandoCep === index ? 'Buscando...' : '00000-000'}
                onChange={(e) => updateEndereco(index, 'cep', formatCep(e.target.value))}
                onBlur={() => handleCepBlur(index)}
              />
              <div className="md:col-span-2">
                <Input
                  label="Logradouro"
                  value={endereco.logradouro}
                  onChange={(e) => updateEndereco(index, 'logradouro', e.target.value)}
                />
              </div>
              <Input
                label="Número"
                value={endereco.numero}
                onChange={(e) => updateEndereco(index, 'numero', e.target.value)}
              />
              <Input
                label="Complemento"
                value={endereco.complemento}
                onChange={(e) => updateEndereco(index, 'complemento', e.target.value)}
              />
              <Input
                label="Bairro"
                value={endereco.bairro}
                onChange={(e) => updateEndereco(index, 'bairro', e.target.value)}
              />
              <Input
                label="Município"
                value={endereco.municipio}
                onChange={(e) => updateEndereco(index, 'municipio', e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="label-field">UF</label>
                <select
                  className="input-field"
                  value={endereco.uf}
                  onChange={(e) => updateEndereco(index, 'uf', e.target.value)}
                >
                  <option value="">UF</option>
                  {UF_OPTIONS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Contatos</h3>
          <Button type="button" variant="secondary" onClick={() => setContatos((prev) => [...prev, emptyContato()])}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
        {contatos.map((contato, index) => (
          <div key={index} className="rounded-lg border border-border-primary p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Contato {index + 1}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={contato.principal}
                    onChange={(e) => updateContato(index, 'principal', e.target.checked)}
                  />
                  Principal
                </label>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-bg-muted text-accent-red"
                  onClick={() => setContatos((prev) => prev.filter((_, i) => i !== index))}
                  title="Remover contato"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                label="Nome"
                value={contato.nome}
                onChange={(e) => updateContato(index, 'nome', e.target.value)}
              />
              <Input
                label="Cargo"
                value={contato.cargo}
                onChange={(e) => updateContato(index, 'cargo', e.target.value)}
              />
              <Input
                label="Departamento"
                value={contato.departamento}
                onChange={(e) => updateContato(index, 'departamento', e.target.value)}
              />
              <Input
                label="Telefone"
                value={contato.telefone}
                placeholder="(00) 00000-0000"
                onChange={(e) => handleTelefoneChange(index, e.target.value)}
              />
              <div className="md:col-span-2">
                <Input
                  label="E-mail"
                  type="email"
                  value={contato.email}
                  onChange={(e) => updateContato(index, 'email', e.target.value)}
                />
              </div>
              <Input
                label="Rede social"
                value={contato.rede}
                onChange={(e) => updateContato(index, 'rede', e.target.value)}
              />
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={contato.whatsapp}
                    onChange={(e) => updateContato(index, 'whatsapp', e.target.checked)}
                  />
                  WhatsApp
                </label>
              </div>
            </div>
            <div>
              <label className="label-field">Observação</label>
              <textarea
                className="input-field min-h-[55px] resize-none"
                value={contato.observacao}
                onChange={(e) => updateContato(index, 'observacao', e.target.value)}
              />
            </div>
          </div>
        ))}
      </section>

      {erro && <p className="text-sm text-accent-red">{erro}</p>}

      <div className="flex justify-center gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
