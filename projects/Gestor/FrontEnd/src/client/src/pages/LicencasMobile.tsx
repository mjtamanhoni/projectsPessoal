import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Copy, KeyRound, Loader2, Plus, RefreshCw, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import api, { getErrorMsg } from '@/lib/api';

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

  useEffect(() => {
    void carregar();
  }, [carregar]);

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
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Licenças emitidas</h3>
            <p className="text-sm text-text-secondary">{licencas.length} registro(s)</p>
          </div>
          <Button variant="secondary" onClick={() => void carregar()} disabled={carregando}>
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
    </div>
  );
}
