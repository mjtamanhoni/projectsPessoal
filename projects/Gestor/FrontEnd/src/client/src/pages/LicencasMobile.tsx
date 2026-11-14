import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import api, { getErrorMsg } from '@/lib/api';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

interface LicencaMobile {
  id: number;
  cliente: string;
  cnpj: string;
  device: string;
  plano: string;
  key_id: string;
  token: string;
  emitido_em: string;
  expira_em: string;
  observacoes: string;
  revogado_em: string;
  criado_em: string;
}

interface SolicitacaoMobile {
  id: number;
  device: string;
  cliente: string;
  cnpj: string;
  app_versao: string;
  plataforma: string;
  status: string;
  pix_chave: string;
  valor_centavos: number;
  mensagem: string;
  comprovante_nome: string;
  comprovante_tipo: string;
  has_comprovante: boolean;
  comprovante_em: string;
  criado_em: string;
  atualizado_em: string;
  ultimo_contato_em: string;
  liberado_em: string;
  entregue_em: string;
}

interface FormLiberar {
  cliente: string;
  cnpj: string;
  validade: string;
  observacoes: string;
}

const FORM_LIBERAR_INICIAL: FormLiberar = {
  cliente: '',
  cnpj: '',
  validade: '',
  observacoes: '',
};

interface FormPix {
  pix_chave: string;
  valor: string;
}

const FORM_PIX_INICIAL: FormPix = {
  pix_chave: '',
  valor: '',
};

const PIX_PADRAO_KEY = 'gestor:licencas:pixChavePadrao';

interface FormLicenca {
  cliente: string;
  cnpj: string;
  device: string;
  validade: string;
  observacoes: string;
}

const FORM_INICIAL: FormLicenca = {
  cliente: '',
  cnpj: '',
  device: '',
  validade: '',
  observacoes: '',
};

function formatarData(iso?: string): string {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(iso?: string): string {
  if (!iso) return '-';
  const [data, hora] = iso.split('T');
  return `${formatarData(data)}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
}

function formatarValor(centavos?: number): string {
  if (!centavos || centavos <= 0) return 'não informado';
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusSolicitacao(solicitacao: SolicitacaoMobile): { label: string; classe: string } {
  if (solicitacao.status === 'revogada') {
    return { label: 'Revogada', classe: 'bg-red-100 text-red-700' };
  }
  if (solicitacao.status === 'liberada') {
    return solicitacao.entregue_em
      ? { label: 'Entregue ao app', classe: 'bg-green-100 text-green-700' }
      : { label: 'Token gerado', classe: 'bg-blue-100 text-blue-700' };
  }
  if (!solicitacao.pix_chave) {
    return { label: 'Aguardando chave PIX', classe: 'bg-amber-100 text-amber-700' };
  }
  if (!solicitacao.has_comprovante) {
    return { label: 'Aguardando comprovante', classe: 'bg-sky-100 text-sky-700' };
  }
  return { label: 'Comprovante enviado', classe: 'bg-violet-100 text-violet-700' };
}

function hojeISO(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

function statusLicenca(licenca: LicencaMobile): { label: string; classe: string } {
  if (licenca.revogado_em) {
    return { label: 'Revogada', classe: 'bg-red-100 text-red-700' };
  }
  if (licenca.expira_em && licenca.expira_em < hojeISO()) {
    return { label: 'Vencida', classe: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Ativa', classe: 'bg-green-100 text-green-700' };
}

function lembrarPixPadrao(chave: string): void {
  try {
    localStorage.setItem(PIX_PADRAO_KEY, chave);
  } catch {
    return;
  }
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function LicencasMobile() {
  const { addToast } = useToast();
  const [form, setForm] = useState<FormLicenca>(FORM_INICIAL);
  const [licencas, setLicencas] = useState<LicencaMobile[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [revogando, setRevogando] = useState<number | null>(null);
  const [tokenGerado, setTokenGerado] = useState<LicencaMobile | null>(null);

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMobile[]>([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [liberarAlvo, setLiberarAlvo] = useState<SolicitacaoMobile | null>(null);
  const [formLiberar, setFormLiberar] = useState<FormLiberar>(FORM_LIBERAR_INICIAL);
  const [liberando, setLiberando] = useState(false);
  const [pixAlvo, setPixAlvo] = useState<SolicitacaoMobile | null>(null);
  const [formPix, setFormPix] = useState<FormPix>(FORM_PIX_INICIAL);
  const [enviandoPix, setEnviandoPix] = useState(false);
  const [revogandoSolicitacao, setRevogandoSolicitacao] = useState<number | null>(null);
  const [comprovante, setComprovante] = useState<{ nome: string; tipo: string; base64: string } | null>(null);
  const [comprovanteAberto, setComprovanteAberto] = useState(false);
  const [carregandoComprovante, setCarregandoComprovante] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<LicencaMobile[]>('/licencaTitulosPagar');
      setLicencas(Array.isArray(data) ? data : []);
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao carregar licenças'));
    } finally {
      setCarregando(false);
    }
  }, [addToast]);

  const carregarSolicitacoes = useCallback(async () => {
    setCarregandoSolicitacoes(true);
    try {
      const { data } = await api.get<SolicitacaoMobile[]>('/licencaTitulosPagar/solicitacoes');
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao carregar solicitações'));
    } finally {
      setCarregandoSolicitacoes(false);
    }
  }, [addToast]);

  useEffect(() => {
    void carregar();
    void carregarSolicitacoes();
  }, [carregar, carregarSolicitacoes]);

  const totalAtivas = useMemo(
    () => licencas.filter((l) => !l.revogado_em && (!l.expira_em || l.expira_em >= hojeISO())).length,
    [licencas]
  );

  const atualizarCampo = (campo: keyof FormLicenca, valor: string) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const gerar = async () => {
    if (!form.cliente.trim()) {
      addToast('error', 'Informe o cliente');
      return;
    }
    if (form.device.trim() && form.device.trim().length !== 8) {
      addToast('error', 'Código do aparelho deve ter 8 caracteres');
      return;
    }
    setGerando(true);
    try {
      const { data } = await api.post<LicencaMobile>('/licencaTitulosPagar', {
        cliente: form.cliente.trim(),
        cnpj: form.cnpj.trim(),
        device: form.device.trim().toUpperCase(),
        plano: 'full',
        validade: form.validade,
        observacoes: form.observacoes.trim(),
      });
      setTokenGerado(data);
      setForm(FORM_INICIAL);
      await carregar();
      addToast('success', 'Licença gerada. Copie o token e envie ao cliente.');
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao gerar licença'));
    } finally {
      setGerando(false);
    }
  };

  const copiar = async (texto: string, mensagem = 'Token copiado') => {
    const ok = await copiarTexto(texto);
    addToast(ok ? 'success' : 'error', ok ? mensagem : 'Não foi possível copiar');
  };

  const revogar = async (licenca: LicencaMobile) => {
    if (!window.confirm(`Revogar a licença de "${licenca.cliente}"? O controle é apenas administrativo; o token já instalado continua válido offline.`)) {
      return;
    }
    setRevogando(licenca.id);
    try {
      await api.post('/licencaTitulosPagar/revogar', {
        id: licenca.id,
        motivo: 'Revogada pelo Gestor',
      });
      await carregar();
      addToast('success', 'Licença revogada no controle interno');
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao revogar licença'));
    } finally {
      setRevogando(null);
    }
  };

  const abrirLiberar = (solicitacao: SolicitacaoMobile) => {
    setLiberarAlvo(solicitacao);
    setFormLiberar({
      cliente: solicitacao.cliente || '',
      cnpj: solicitacao.cnpj || '',
      validade: '',
      observacoes: solicitacao.mensagem || '',
    });
  };

  const abrirPix = (solicitacao: SolicitacaoMobile) => {
    let padrao = '';
    try {
      padrao = localStorage.getItem(PIX_PADRAO_KEY) ?? '';
    } catch {
      padrao = '';
    }
    setPixAlvo(solicitacao);
    setFormPix({
      pix_chave: solicitacao.pix_chave || padrao,
      valor:
        solicitacao.valor_centavos > 0
          ? formatCurrencyInput(String(solicitacao.valor_centavos))
          : '',
    });
  };

  const enviarPix = async () => {
    if (!pixAlvo) return;
    const chave = formPix.pix_chave.trim();
    if (!chave) {
      addToast('error', 'Informe a chave PIX');
      return;
    }
    setEnviandoPix(true);
    try {
      const valorCentavos = Math.round(parseCurrencyInput(formPix.valor) * 100);
      await api.post('/licencaTitulosPagar/solicitacoes/pix', {
        id: pixAlvo.id,
        pix_chave: chave,
        valor_centavos: valorCentavos > 0 ? valorCentavos : undefined,
      });
      lembrarPixPadrao(chave);
      setPixAlvo(null);
      setFormPix(FORM_PIX_INICIAL);
      await carregarSolicitacoes();
      addToast('success', 'Chave PIX enviada. O app receberá na próxima atualização.');
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao enviar chave PIX'));
    } finally {
      setEnviandoPix(false);
    }
  };

  const atualizarCampoLiberar = (campo: keyof FormLiberar, valor: string) => {
    setFormLiberar((atual) => ({ ...atual, [campo]: valor }));
  };

  const liberar = async () => {
    if (!liberarAlvo) return;
    if (!formLiberar.cliente.trim()) {
      addToast('error', 'Informe o cliente para liberar a licença');
      return;
    }
    setLiberando(true);
    try {
      const { data } = await api.post<LicencaMobile>('/licencaTitulosPagar/solicitacoes/liberar', {
        id: liberarAlvo.id,
        cliente: formLiberar.cliente.trim(),
        cnpj: formLiberar.cnpj.trim(),
        validade: formLiberar.validade,
        observacoes: formLiberar.observacoes.trim(),
      });
      setTokenGerado(data);
      setLiberarAlvo(null);
      setFormLiberar(FORM_LIBERAR_INICIAL);
      await Promise.all([carregar(), carregarSolicitacoes()]);
      addToast('success', 'Solicitação liberada. O app receberá o token ao verificar.');
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao liberar solicitação'));
    } finally {
      setLiberando(false);
    }
  };

  const revogarSolicitacao = async (solicitacao: SolicitacaoMobile) => {
    if (!window.confirm(`Revogar a solicitação de "${solicitacao.cliente || solicitacao.device}"?`)) {
      return;
    }
    setRevogandoSolicitacao(solicitacao.id);
    try {
      await api.post('/licencaTitulosPagar/solicitacoes/revogar', { id: solicitacao.id });
      await carregarSolicitacoes();
      addToast('success', 'Solicitação revogada');
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao revogar solicitação'));
    } finally {
      setRevogandoSolicitacao(null);
    }
  };

  const verComprovante = async (solicitacao: SolicitacaoMobile) => {
    setCarregandoComprovante(solicitacao.id);
    try {
      const { data } = await api.get<{ nome: string; tipo: string; base64: string }>(
        '/licencaTitulosPagar/solicitacoes/comprovante',
        { params: { id: solicitacao.id } }
      );
      setComprovante({
        nome: data.nome || `comprovante-${solicitacao.id}`,
        tipo: data.tipo || 'application/octet-stream',
        base64: data.base64,
      });
      setComprovanteAberto(true);
    } catch (e) {
      addToast('error', getErrorMsg(e, 'Erro ao carregar comprovante'));
    } finally {
      setCarregandoComprovante(null);
    }
  };

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;
  const comprovanteUrl = comprovante
    ? `data:${comprovante.tipo};base64,${comprovante.base64}`
    : '';

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <KeyRound size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Licenças Mobile</h2>
              <p className="text-sm text-text-secondary">
                Gere tokens para o APK Títulos a Pagar offline. A assinatura acontece no servidor.
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">{totalAtivas}</div>
            <div className="text-xs text-text-secondary">licenças ativas</div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-5">
          <p className="text-xs text-blue-700">
            <strong>Como funciona:</strong> o app exibe um código de 8 caracteres em Configurações → Licença.
            Informe o código abaixo para vincular o token a um aparelho. Sem código, o token vale em qualquer aparelho.
            Validade vazia gera uma licença permanente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Cliente *"
            value={form.cliente}
            onChange={(e) => atualizarCampo('cliente', e.target.value)}
            placeholder="Nome do cliente ou empresa"
          />
          <Input
            label="CNPJ/CPF (informativo)"
            value={form.cnpj}
            onChange={(e) => atualizarCampo('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
          />
          <div className="space-y-1.5">
            <label className="label-field">Código do aparelho</label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                className="input-field pl-9 uppercase tracking-widest"
                value={form.device}
                maxLength={8}
                onChange={(e) => atualizarCampo('device', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Ex: 7K3M92QD"
              />
            </div>
            <p className="text-xs text-text-secondary">Deixe vazio para licença multi-dispositivo.</p>
          </div>
          <div className="space-y-1.5">
            <label className="label-field">Validade</label>
            <input
              type="date"
              className="input-field"
              value={form.validade}
              onChange={(e) => atualizarCampo('validade', e.target.value)}
            />
            <p className="text-xs text-text-secondary">Deixe vazio para licença permanente.</p>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="label-field">Observações</label>
            <textarea
              className="input-field min-h-[80px]"
              value={form.observacoes}
              onChange={(e) => atualizarCampo('observacoes', e.target.value)}
              placeholder="Anotações internas sobre esta licença"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => void gerar()} disabled={gerando}>
            {gerando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {gerando ? 'Gerando...' : 'Gerar token'}
          </Button>
        </div>
      </Card>

      {tokenGerado && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Token gerado</h3>
              <p className="text-sm text-text-secondary">
                {tokenGerado.cliente} {tokenGerado.device ? `• ${tokenGerado.device}` : '• multi-dispositivo'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => void copiar(tokenGerado.token)}>
              <Copy size={16} />
              Copiar token
            </Button>
          </div>
          <textarea
            readOnly
            className="input-field w-full min-h-[140px] font-mono text-xs break-all"
            value={tokenGerado.token}
          />
          <p className="text-xs text-text-secondary mt-2">
            Envie este texto ao cliente. No app, ele deve colar em Configurações → Licença → Ativar licença.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Smartphone size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Solicitações de desbloqueio</h3>
              <p className="text-sm text-text-secondary">
                {pendentes} pendente(s) • {solicitacoes.length} registro(s)
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => void carregarSolicitacoes()}
            disabled={carregandoSolicitacoes}
          >
            <RefreshCw size={16} className={carregandoSolicitacoes ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>

        <p className="text-xs text-text-secondary mb-3">
          Fluxo: o app envia a solicitação → você envia a chave PIX → o cliente paga e anexa o
          comprovante → você libera o token.
        </p>

        {carregandoSolicitacoes ? (
          <div className="flex items-center justify-center py-10 text-text-secondary gap-2">
            <Loader2 size={18} className="animate-spin" />
            Carregando solicitações...
          </div>
        ) : solicitacoes.length === 0 ? (
          <div className="text-center py-10 text-text-secondary">
            Nenhuma solicitação de desbloqueio recebida.
          </div>
        ) : (
          <div className="space-y-3">
            {solicitacoes.map((solicitacao) => {
              const status = statusSolicitacao(solicitacao);
              return (
                <div
                  key={solicitacao.id}
                  className="rounded-xl border border-border-primary p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">
                          {solicitacao.cliente || 'Sem nome'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.classe}`}>
                          {status.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-muted text-text-secondary font-mono tracking-wider">
                          {solicitacao.device}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {solicitacao.cnpj && <span>CNPJ/CPF: {solicitacao.cnpj}</span>}
                        <span>Valor: {formatarValor(solicitacao.valor_centavos)}</span>
                        {solicitacao.pix_chave ? (
                          <span>PIX: {solicitacao.pix_chave}</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Chave PIX ainda não enviada</span>
                        )}
                        <span>Enviada: {formatarDataHora(solicitacao.criado_em)}</span>
                        <span>Último contato: {formatarDataHora(solicitacao.ultimo_contato_em)}</span>
                        {solicitacao.app_versao && (
                          <span>
                            App: {solicitacao.app_versao}
                            {solicitacao.plataforma ? ` (${solicitacao.plataforma})` : ''}
                          </span>
                        )}
                      </div>
                      {solicitacao.mensagem && (
                        <p className="text-xs text-text-secondary mt-1">“{solicitacao.mensagem}”</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(solicitacao.status === 'pendente' || solicitacao.status === 'revogada') && (
                        <Button variant="secondary" onClick={() => abrirPix(solicitacao)}>
                          <KeyRound size={15} />
                          {solicitacao.pix_chave ? 'Alterar PIX' : 'Enviar PIX'}
                        </Button>
                      )}
                      {solicitacao.has_comprovante && (
                        <Button
                          variant="secondary"
                          onClick={() => void verComprovante(solicitacao)}
                          disabled={carregandoComprovante === solicitacao.id}
                        >
                          {carregandoComprovante === solicitacao.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Eye size={15} />
                          )}
                          Comprovante
                        </Button>
                      )}
                      {solicitacao.status === 'pendente' && solicitacao.has_comprovante && (
                        <Button onClick={() => abrirLiberar(solicitacao)}>
                          <CheckCircle2 size={15} />
                          Liberar
                        </Button>
                      )}
                      {solicitacao.status !== 'revogada' && (
                        <Button
                          variant="danger"
                          onClick={() => void revogarSolicitacao(solicitacao)}
                          disabled={revogandoSolicitacao === solicitacao.id}
                        >
                          {revogandoSolicitacao === solicitacao.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Ban size={15} />
                          )}
                          Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Licenças emitidas</h3>
            <p className="text-sm text-text-secondary">{licencas.length} registro(s)</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void carregar();
              void carregarSolicitacoes();
            }}
            disabled={carregando}
          >
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-10 text-text-secondary gap-2">
            <Loader2 size={18} className="animate-spin" />
            Carregando licenças...
          </div>
        ) : licencas.length === 0 ? (
          <div className="text-center py-10 text-text-secondary">
            Nenhuma licença emitida ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {licencas.map((licenca) => {
              const status = statusLicenca(licenca);
              return (
                <div key={licenca.id} className="rounded-xl border border-border-primary p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">{licenca.cliente}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.classe}`}>
                          {status.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-muted text-text-secondary">
                          {licenca.plano}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {licenca.cnpj && <span>CNPJ/CPF: {licenca.cnpj}</span>}
                        <span>Aparelho: {licenca.device || 'qualquer'}</span>
                        <span>Emitida: {formatarData(licenca.emitido_em)}</span>
                        <span>Validade: {licenca.expira_em ? formatarData(licenca.expira_em) : 'permanente'}</span>
                      </div>
                      {licenca.observacoes && (
                        <p className="text-xs text-text-secondary mt-1">{licenca.observacoes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => void copiar(licenca.token)}>
                        <Copy size={15} />
                        Copiar
                      </Button>
                      {!licenca.revogado_em && (
                        <Button
                          variant="danger"
                          onClick={() => void revogar(licenca)}
                          disabled={revogando === licenca.id}
                        >
                          {revogando === licenca.id ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                          Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-accent-primary cursor-pointer">Ver token</summary>
                    <textarea
                      readOnly
                      className="input-field w-full min-h-[110px] font-mono text-xs break-all mt-2"
                      value={licenca.token}
                    />
                  </details>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-text-secondary mt-4">
          Revogar serve apenas para controle interno. Como a validação é offline, um token já instalado
          continua funcionando até ser substituído ou expirar.
        </p>
      </Card>

      <Modal
        isOpen={!!pixAlvo}
        onClose={() => {
          if (!enviandoPix) setPixAlvo(null);
        }}
        title="Enviar chave PIX ao app"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            A chave será enviada ao aparelho{' '}
            <strong className="font-mono tracking-wider">{pixAlvo?.device}</strong>. O app mostrará
            o PIX copia e cola para o cliente pagar.
          </div>
          <Input
            label="Chave PIX *"
            value={formPix.pix_chave}
            onChange={(e) => setFormPix((atual) => ({ ...atual, pix_chave: e.target.value }))}
            placeholder="CNPJ, e-mail, telefone ou chave aleatória"
          />
          <div className="space-y-1.5">
            <label className="label-field">Valor da licença (opcional)</label>
            <input
              className="input-field"
              inputMode="numeric"
              placeholder="0,00"
              value={formPix.valor}
              onChange={(e) =>
                setFormPix((atual) => ({ ...atual, valor: formatCurrencyInput(e.target.value) }))
              }
            />
            <p className="text-xs text-text-secondary">
              Se informado, o app gera o PIX já com o valor. Deixe vazio para combinar com o cliente.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPixAlvo(null)} disabled={enviandoPix}>
              Cancelar
            </Button>
            <Button onClick={() => void enviarPix()} disabled={enviandoPix}>
              {enviandoPix ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {enviandoPix ? 'Enviando...' : 'Enviar chave PIX'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!liberarAlvo}
        onClose={() => {
          if (!liberando) setLiberarAlvo(null);
        }}
        title="Liberar solicitação"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
            O token será vinculado ao aparelho{' '}
            <strong className="font-mono tracking-wider">{liberarAlvo?.device}</strong> e
            entregue automaticamente ao app na próxima verificação de liberação.
          </div>

          <Input
            label="Cliente *"
            value={formLiberar.cliente}
            onChange={(e) => atualizarCampoLiberar('cliente', e.target.value)}
            placeholder="Nome do cliente ou empresa"
          />
          <Input
            label="CNPJ/CPF (informativo)"
            value={formLiberar.cnpj}
            onChange={(e) => atualizarCampoLiberar('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
          />
          <div className="space-y-1.5">
            <label className="label-field">Validade</label>
            <input
              type="date"
              className="input-field"
              value={formLiberar.validade}
              onChange={(e) => atualizarCampoLiberar('validade', e.target.value)}
            />
            <p className="text-xs text-text-secondary">Deixe vazio para licença permanente.</p>
          </div>
          <div className="space-y-1.5">
            <label className="label-field">Observações</label>
            <textarea
              className="input-field min-h-[70px]"
              value={formLiberar.observacoes}
              onChange={(e) => atualizarCampoLiberar('observacoes', e.target.value)}
              placeholder="Anotações internas sobre esta liberação"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setLiberarAlvo(null)}
              disabled={liberando}
            >
              Cancelar
            </Button>
            <Button onClick={() => void liberar()} disabled={liberando}>
              {liberando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {liberando ? 'Liberando...' : 'Liberar e gerar token'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={comprovanteAberto}
        onClose={() => setComprovanteAberto(false)}
        title="Comprovante de pagamento"
        maxWidth="max-w-2xl"
      >
        {comprovante && (
          <div className="space-y-3">
            <div className="text-xs text-text-secondary">
              {comprovante.nome} • {comprovante.tipo}
            </div>
            {comprovante.tipo.startsWith('image/') ? (
              <img
                src={comprovanteUrl}
                alt="Comprovante de pagamento"
                className="max-h-[65vh] w-full object-contain rounded-lg border border-border-primary bg-bg-muted"
              />
            ) : (
              <>
                <iframe
                  title="Comprovante de pagamento"
                  src={comprovanteUrl}
                  className="w-full h-[65vh] rounded-lg border border-border-primary"
                />
                <a
                  href={comprovanteUrl}
                  download={comprovante.nome}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <FileText size={15} />
                  Baixar PDF
                </a>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
