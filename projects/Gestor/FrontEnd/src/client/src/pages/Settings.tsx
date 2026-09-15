import { useState, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { fetchSettings, saveSettings } from '@/lib/settings';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import api from '@/lib/api';
import type { AppSettings, Categoria, Empresa } from '@/types';
import { Save, Server, Monitor, Loader2, Trash2, DollarSign, AlertTriangle, Database, CheckCircle, Printer, HardDrive, Play, Check, Search, Download, QrCode, Upload, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import type { ModuleItem } from '@/context/ModuleContext';
import { useAuth } from '@/context/AuthContext';

interface PortaDetectada {
  nome: string;
  porta: string;
  tipo: string;
  fonte: string;
}
import { getServerConfig } from '@/lib/serverConfig';
import QRCode from 'qrcode';

function QRCodeImage({ value, size = 180 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => {});
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#999' }}>Gerando QR Code...</div>;
  return <img src={src} alt="QR Code" style={{ width: size, height: size }} />;
}


type Tab = 'servidor' | 'exibicao' | 'financeiro' | 'impressao' | 'limpeza' | 'sequencias' | 'migracoes' | 'instalacao' | 'guia';

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('servidor');
  const [categoriasPagar, setCategoriasPagar] = useState<Categoria[]>([]);
  const [categoriasReceber, setCategoriasReceber] = useState<Categoria[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaLimpeza, setEmpresaLimpeza] = useState<number>(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [atualizandoSeq, setAtualizandoSeq] = useState(false);
  const [resultadoSeq, setResultadoSeq] = useState<string | null>(null);
  const [migracoes, setMigracoes] = useState<{ nome: string; aplicada: boolean; aplicada_em?: string }[] | null>(null);
  const [modulos, setModulos] = useState<ModuleItem[]>([]);
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [msgMigracao, setMsgMigracao] = useState<{ tipo: string; texto: string } | null>(null);
  const [filtroMigracao, setFiltroMigracao] = useState<'pendentes' | 'aplicadas' | 'todas'>('pendentes');
  const [portasDetectadas, setPortasDetectadas] = useState<PortaDetectada[]>([]);
  const [procurandoPortas, setProcurandoPortas] = useState(false);
  const [testandoImpressora, setTestandoImpressora] = useState(false);
  const [msgImpressora, setMsgImpressora] = useState<{ tipo: string; texto: string } | null>(null);
  const [agentStatus, setAgentStatus] = useState<{ agents: { id: string; printers: { name: string; port: string }[]; selectedPrinter: string | null }[]; pendingJobs: number; recentJobs: { id: string; status: string; error?: string }[] } | null>(null);
  const [showAgentInstall, setShowAgentInstall] = useState(false);
  const [apks, setApks] = useState<{ nome: string; tamanho: number; modificado: string; versao: string }[]>([]);
  const [uploadingAPK, setUploadingAPK] = useState(false);
  const [excluindoAPK, setExcluindoAPK] = useState<string | null>(null);
  const { addToast } = useToast();
  const { isSuperadmin } = useAuth();

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => addToast('error', 'Erro ao carregar configurações'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    Promise.all([
      api.get('/categorias/pagar'),
      api.get('/categorias/receber'),
    ]).then(([p, r]) => {
      setCategoriasPagar((p.data as Categoria[]) ?? []);
      setCategoriasReceber((r.data as Categoria[]) ?? []);
    }).catch(() => {});
    api.get<Empresa[]>('/empresas').then((r) => setEmpresas(r.data ?? [])).catch(() => {});
    api.get('/auth/menu').then((r) => setModulos(r.data as ModuleItem[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'impressao') return;
    let active = true;
    const poll = () => {
      if (!active) return;
      api.get('/print/agent/status').then(r => { if (active) setAgentStatus(r.data); }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [tab]);

  useEffect(() => {
    if (tab === 'migracoes') {
      api.get('/migracoes').then((r) => setMigracoes(r.data ?? [])).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (!isSuperadmin && (tab === 'limpeza' || tab === 'migracoes' || tab === 'instalacao' || tab === 'guia')) {
      setTab('servidor');
    }
  }, [isSuperadmin, tab]);

  useEffect(() => {
    if (tab === 'impressao') {
      detectarPortasServidor();
    }
    if (tab === 'instalacao') {
      api.get('/apk').then((r) => setApks(r.data ?? [])).catch(() => setApks([]));
    }
  }, [tab]);

  const detectarPortasServidor = async () => {
    setProcurandoPortas(true);
    setMsgImpressora(null);
    try {
      const res = await api.get('/print/ports');
      const portas = (res.data ?? []) as PortaDetectada[];
      setPortasDetectadas(portas);
      if (portas.length === 0) {
        setMsgImpressora({ tipo: 'info', texto: 'Nenhuma impressora detectada automaticamente. Configure a porta manualmente (ex: COM3, TCP:192.168.1.100:9100).' });
      } else {
        setMsgImpressora({ tipo: 'sucesso', texto: `${portas.length} porta(s) detectada(s)` });
      }
    } catch (err) {
      setMsgImpressora({ tipo: 'erro', texto: 'Erro ao detectar portas. Configure manualmente.' });
    } finally {
      setProcurandoPortas(false);
    }
  };

  const usarPorta = (porta: string) => {
    if (!settings?.printer) return;
    setSettings({ ...settings, printer: { ...settings.printer, porta } });
    addToast('success', `Porta configurada: ${porta}`);
  };

  const testarImpressora = async () => {
    if (!settings?.printer) return;
    setTestandoImpressora(true);
    setMsgImpressora(null);
    try {
      const res = await api.post('/print/test', {
        porta: settings.printer.porta || '',
        modelo: settings.printer.modelo,
        deviceParams: settings.printer.deviceParams,
        colunas: settings.printer.colunas,
      });
      const via = res.data?.via === 'agent' ? ' (via Print Agent)' : ' (impressao local)';
      setMsgImpressora({ tipo: 'sucesso', texto: (res.data?.message || 'Teste enviado com sucesso') + via });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; dica?: string; porta?: string; impressora?: string; todasImpressoras?: string[] } } })?.response?.data;
      const parts: string[] = [];
      if (data?.error) parts.push(data.error);
      if (data?.todasImpressoras && data.todasImpressoras.length > 0) {
        parts.push('Impressoras no Windows:\n' + data.todasImpressoras.join('\n'));
      }
      if (data?.dica) parts.push(data.dica);
      const msg = parts.length > 0 ? parts.join('\n\n') : (err instanceof Error ? err.message : 'Erro ao testar impressora');
      setMsgImpressora({ tipo: 'erro', texto: msg });
    } finally {
      setTestandoImpressora(false);
    }
  };

  async function aplicarMigracao(nome: string) {
    setAplicando(nome);
    setMsgMigracao(null);
    try {
      const res = await api.post('/migracoes/aplicar', { nome });
      setMsgMigracao({ tipo: 'sucesso', texto: res.data?.mensagem || 'Migração aplicada' });
      const lista = await api.get('/migracoes');
      setMigracoes(lista.data ?? []);
    } catch {
      setMsgMigracao({ tipo: 'erro', texto: 'Erro ao aplicar migração' });
    } finally {
      setAplicando(null);
    }
  }

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await saveSettings(settings);
      setSettings(updated);
      addToast('success', 'Configurações salvas com sucesso');
    } catch {
      addToast('error', 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent-primary" />
        </div>
      </Layout>
    );
  }

  if (!settings) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'servidor', label: 'Servidor', icon: <Server size={16} /> },
    { key: 'exibicao', label: 'Exibição', icon: <Monitor size={16} /> },
    { key: 'financeiro', label: 'Financeiro', icon: <DollarSign size={16} /> },
    { key: 'impressao', label: 'Impressao', icon: <Printer size={16} /> },
    ...(isSuperadmin ? [{ key: 'limpeza' as Tab, label: 'Limpeza', icon: <AlertTriangle size={16} /> }] : []),
    { key: 'sequencias', label: 'Sequências', icon: <Database size={16} /> },
    ...(isSuperadmin ? [{ key: 'migracoes' as Tab, label: 'Banco de Dados', icon: <HardDrive size={16} /> }] : []),
    ...(isSuperadmin ? [{ key: 'instalacao' as Tab, label: 'Instalação do App', icon: <Download size={16} /> }] : []),
    ...(isSuperadmin ? [{ key: 'guia' as Tab, label: 'Guia Superadmin', icon: <BookOpen size={16} /> }] : []),
  ];

  return (
    <Layout>
      <PageHeader title="Configurações" subtitle="Configurações do sistema" />

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-accent-primary text-text-inverse'
                : 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {tab === 'servidor' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Server size={20} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Servidor Horse</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="label-field">Protocolo</label>
                <select
                  value={settings.horseApi.protocol}
                  onChange={(e) => setSettings({ ...settings, horseApi: { ...settings.horseApi, protocol: e.target.value } })}
                  className="input-field"
                >
                  <option value="http">http</option>
                  <option value="https">https</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Host</label>
                <input
                  type="text"
                  value={settings.horseApi.host}
                  onChange={(e) => setSettings({ ...settings, horseApi: { ...settings.horseApi, host: e.target.value } })}
                  className="input-field"
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Porta</label>
                <input
                  type="number"
                  value={settings.horseApi.port}
                  onChange={(e) => setSettings({ ...settings, horseApi: { ...settings.horseApi, port: Number(e.target.value) } })}
                  className="input-field"
                  placeholder="9000"
                />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Limite de Requisições</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-field">Máximo por janela (15 min)</label>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    value={settings.rateLimit?.max ?? 1000}
                    onChange={(e) => setSettings({ ...settings, rateLimit: { max: Number(e.target.value) } })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === 'exibicao' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Monitor size={20} className="text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Exibição</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-field">Registros por página (grid)</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.display?.grid?.defaultPageSize ?? 10}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      display: {
                        ...(settings.display ?? { number: undefined }),
                        grid: { defaultPageSize: Number(e.target.value), pageSizeOptions: settings.display?.grid?.pageSizeOptions ?? [5, 10, 15, 20, 30, 50] },
                      },
                    })
                  }
                  className="input-field w-32"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Opções de página (separadas por vírgula)</label>
                <input
                  type="text"
                  value={settings.display?.grid?.pageSizeOptions?.join(', ') ?? '5, 10, 15, 20, 30, 50'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      display: {
                        ...(settings.display ?? { number: undefined }),
                        grid: {
                          defaultPageSize: settings.display?.grid?.defaultPageSize ?? 10,
                          pageSizeOptions: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n)),
                        },
                      },
                    })
                  }
                  className="input-field"
                  placeholder="5, 10, 15, 20, 30, 50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Decimais</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={settings.display?.number?.decimalPlaces ?? 4}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        display: {
                          ...(settings.display ?? { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] } }),
                          number: { decimalPlaces: Number(e.target.value) },
                        },
                      })
                    }
                    className="input-field w-32"
                  />
                  <span className="text-sm text-text-secondary">casas decimais</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Atualização automática da tela de Encomendas (segundos)</label>
                <p className="text-xs text-text-secondary mb-3">A lista de encomendas é recarregada automaticamente neste intervalo. Use 0 para desativar e atualizar apenas manualmente.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={settings.display?.encomendasRefreshSegundos ?? 60}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        display: {
                          ...(settings.display ?? { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] } }),
                          encomendasRefreshSegundos: Number(e.target.value),
                        },
                      })
                    }
                    className="input-field w-32"
                  />
                  <span className="text-sm text-text-secondary">segundos</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Módulo Inicial</h3>
                <p className="text-xs text-text-secondary mb-3">Após o login, redirecionar automaticamente para o módulo e formulário selecionados</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label-field">Módulo</label>
                    <RegistroSelect<number>
                      value={settings.display?.moduloInicialId ?? null}
                      onChange={(modId) => {
                        setSettings({
                          ...settings,
                          display: {
                            ...(settings.display ?? { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] }, number: { decimalPlaces: 4 } }),
                            moduloInicialId: modId,
                            formularioInicialId: undefined,
                          },
                        });
                      }}
                      options={modulos.map((mod) => ({ value: mod.id, label: mod.nome }))}
                      title="Selecionar Módulo Inicial"
                      placeholder="Nenhum (selecionar manualmente)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label-field">Formulário</label>
                    <RegistroSelect<number>
                      value={settings.display?.formularioInicialId ?? null}
                      onChange={(formId) =>
                        setSettings({
                          ...settings,
                          display: {
                            ...(settings.display ?? { grid: { defaultPageSize: 10, pageSizeOptions: [5, 10, 15, 20, 30, 50] }, number: { decimalPlaces: 4 } }),
                            moduloInicialId: settings.display?.moduloInicialId,
                            formularioInicialId: formId,
                          },
                        })
                      }
                      options={(modulos.find((m) => m.id === settings.display?.moduloInicialId)?.formularios ?? []).map((f) => ({ value: f.id, label: f.nome }))}
                      title="Selecionar Formulário Inicial"
                      placeholder="Nenhum (formulário padrão do módulo)"
                      disabled={!settings.display?.moduloInicialId}
                    />
                </div>
              </div>
            </div>
            </div>
          </Card>
        )}

        {tab === 'financeiro' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Financeiro</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-field">Categoria padrão para contas a receber (venda)</label>
                <p className="text-xs text-text-secondary">Ao registrar uma venda, a conta a receber será criada com esta categoria</p>
                <RegistroSelect<number>
                  value={settings.financeiro?.categoriaReceberVendaPadrao ?? null}
                  onChange={(catId) =>
                    setSettings({
                      ...settings,
                      financeiro: { ...settings.financeiro, categoriaReceberVendaPadrao: catId },
                    })
                  }
                  options={categoriasReceber.map((cat) => ({ value: (cat.id ?? cat.codigo)!, label: cat.nome }))}
                  title="Categoria padrão (venda)"
                  placeholder="Sem categoria padrão"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Categoria padrão para contas a pagar (compra)</label>
                <p className="text-xs text-text-secondary">Ao registrar uma compra de insumo, a conta a pagar será criada com esta categoria</p>
                <RegistroSelect<number>
                  value={settings.financeiro?.categoriaPagarCompraPadrao ?? null}
                  onChange={(catId) =>
                    setSettings({
                      ...settings,
                      financeiro: { ...settings.financeiro, categoriaPagarCompraPadrao: catId },
                    })
                  }
                  options={categoriasPagar.map((cat) => ({ value: (cat.id ?? cat.codigo)!, label: cat.nome }))}
                  title="Categoria padrão (compra)"
                  placeholder="Sem categoria padrão"
                />
              </div>
            </div>
          </Card>
        )}

        {tab === 'impressao' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Printer size={20} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Impressora Termica</h2>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Detecte e configure a impressora termica para cupoms nao fiscais.
            </p>
            <div className="rounded-lg border border-border-primary p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" disabled={procurandoPortas} onClick={detectarPortasServidor}>
                  {procurandoPortas ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {procurandoPortas ? 'Detectando...' : 'Detectar Impressora'}
                </Button>
                <Button type="button" variant="secondary" disabled={testandoImpressora} onClick={testarImpressora}>
                  {testandoImpressora ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {testandoImpressora ? 'Testando...' : 'Testar Impressao'}
                </Button>
                {(!agentStatus || agentStatus.agents.length === 0) && (
                  <Button type="button" variant="secondary" onClick={async () => {
                    try {
                      const url = `/api/print/agent/install?url=${encodeURIComponent(window.location.origin)}`;
                      const res = await fetch(url);
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = 'instalar-agent.bat';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(blobUrl);
                      setShowAgentInstall(true);
                    } catch {
                      window.open(`/api/print/agent/install?url=${encodeURIComponent(window.location.origin)}`, '_blank');
                      setShowAgentInstall(true);
                    }
                  }}>
                    <Download size={16} />
                    Instalar Agent
                  </Button>
                )}
              </div>

              {showAgentInstall && (!agentStatus || agentStatus.agents.length === 0) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-amber-800 text-sm">
                    <Download size={16} />
                    Instalacao do Print Agent
                  </div>
                  <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-800">
                    <strong>IMPORTANTE:</strong> Execute no <strong>PC LOCAL</strong> (onde a impressora USB esta conectada), <strong>NAO</strong> pelo Remote Desktop (RDP).
                  </div>
                  <div className="rounded bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                    <p className="font-semibold mb-1">Arquivo baixado! Abra sua pasta de Downloads.</p>
                    <p>Clique <strong>duas vezes</strong> em <strong>instalar-agent.bat</strong> para instalar e iniciar o agent.</p>
                    <p className="text-xs mt-2 text-green-700">O agent sera instalado automaticamente e comecara a imprimir.</p>
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    O agent deve ficar aberto enquanto quiser imprimir. Para fechar, pressione Ctrl+C.
                  </p>
                </div>
              )}
              {settings?.printer?.porta && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <Check size={16} className="text-green-600" />
                  <span className="text-sm text-green-800">
                    Impressora configurada: <strong>{settings.printer.porta}</strong>
                  </span>
                </div>
              )}
              {portasDetectadas.length > 0 && (
                <div className="border border-border-primary rounded-lg divide-y divide-border-primary">
                  {portasDetectadas.map((p) => (
                    <div key={p.porta} className="flex items-center justify-between px-3 py-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{p.nome}</p>
                        <p className="text-xs text-text-tertiary">{p.porta} ({p.tipo})</p>
                      </div>
                      <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => usarPorta(p.porta)}>
                        Usar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {msgImpressora && (
                <div className="p-3 rounded-lg text-xs whitespace-pre-wrap" style={{ background: msgImpressora.tipo === 'sucesso' ? '#f0fdf4' : msgImpressora.tipo === 'info' ? '#eff6ff' : '#fef2f2', color: msgImpressora.tipo === 'sucesso' ? '#166534' : msgImpressora.tipo === 'info' ? '#1e40af' : '#991b1b' }}>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    {msgImpressora.tipo === 'sucesso' ? <Check size={16} /> : msgImpressora.tipo === 'info' ? <Search size={16} /> : <AlertTriangle size={16} />}
                    {msgImpressora.tipo === 'sucesso' ? 'Sucesso' : msgImpressora.tipo === 'info' ? 'Info' : 'Erro'}
                  </div>
                  {msgImpressora.texto}
                </div>
              )}
              <div className="border-t border-border-subtle pt-3">
                <p className="text-xs text-text-tertiary mb-2">Ou informe a porta manualmente:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="porta-manual"
                    className="input-field flex-1"
                    placeholder="Ex: USB001, COM3, TCP:192.168.1.100:9100"
                  />
                  <Button type="button" variant="secondary" onClick={() => {
                    const input = document.getElementById('porta-manual') as HTMLInputElement;
                    if (input?.value.trim()) usarPorta(input.value.trim());
                  }}>
                    Usar
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border-primary p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${agentStatus && agentStatus.agents.length > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                <h3 className="text-sm font-semibold text-text-primary">
                  Print Agent {agentStatus && agentStatus.agents.length > 0 ? '(Conectado)' : '(Desconectado)'}
                </h3>
              </div>
              {agentStatus && agentStatus.agents.length > 0 ? (
                <div className="space-y-3">
                  {agentStatus.agents.map((a) => (
                    <div key={a.id} className="text-xs bg-green-50 rounded p-3 space-y-2">
                      <p className="text-green-700"><strong>Agent:</strong> {a.id}</p>
                      <div className="flex items-center gap-2">
                        <label className="text-green-700 font-semibold">Impressora:</label>
                        <select
                          className="flex-1 text-xs border border-green-300 rounded px-2 py-1 bg-white text-text-primary"
                          value={a.selectedPrinter || ''}
                          onChange={async (e) => {
                            const printer = e.target.value;
                            try {
                              await api.post('/print/agent/set-printer', { agentId: a.id, printerName: printer });
                              setAgentStatus(prev => prev ? {
                                ...prev,
                                agents: prev.agents.map(ag => ag.id === a.id ? { ...ag, selectedPrinter: printer } : ag),
                              } : null);
                              addToast('success', `Impressora alterada para: ${printer}`);
                            } catch {
                              addToast('error', 'Erro ao alterar impressora');
                            }
                          }}
                        >
                          {a.printers.map(p => (
                            <option key={p.name} value={p.name}>{p.name} [{p.port}]</option>
                          ))}
                        </select>
                      </div>
                      {agentStatus.pendingJobs > 0 && (
                        <p className="text-amber-600">{agentStatus.pendingJobs} job(s) na fila...</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-secondary space-y-2">
                  <p>O Print Agent roda no <strong>PC local</strong> (onde a impressora USB esta conectada) e recebe os dados de impressao do servidor.</p>
                  <div className="bg-gray-50 rounded p-2 text-[11px]">
                    <p className="font-semibold text-text-primary mb-1">Para instalar:</p>
                    <p>Clique em <strong>Instalar Agent</strong> acima, depois abra o arquivo <strong>instalar-agent.bat</strong> na pasta Downloads.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === 'limpeza' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Limpeza de Dados</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Esta operação irá <strong>remover permanentemente</strong> todos os registros associados à
                empresa selecionada, mantendo apenas o cadastro da empresa.
              </p>
              <div className="space-y-1.5">
                <label className="label-field">Selecione a empresa</label>
                <RegistroSelect<number>
                  value={empresaLimpeza || null}
                  onChange={setEmpresaLimpeza}
                  options={empresas.map((emp) => ({ value: (emp.id ?? emp.codigo)!, label: emp.razao_social }))}
                  title="Selecionar Empresa"
                  placeholder="Selecione..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="danger"
                  disabled={empresaLimpeza === 0 || cleaning}
                  onClick={() => setConfirmOpen(true)}
                >
                  {cleaning ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Limpar dados da empresa
                </Button>
              </div>
            </div>
          </Card>
        )}

        {tab === 'sequencias' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Database size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Sequências de ID</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Esta operação varre todas as tabelas do sistema e atualiza os registros de
                sequência (<code>empresa_sequences</code>) com o maior ID encontrado em cada
                tabela por empresa. Utilize esta opção caso a tabela de sequências tenha sido
                corrompida ou apagada.
              </p>
              {resultadoSeq && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  <CheckCircle size={16} />
                  {resultadoSeq}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  disabled={atualizandoSeq}
                  onClick={async () => {
                    setAtualizandoSeq(true);
                    setResultadoSeq(null);
                    try {
                      const res = await api.post('/empresas/atualizar-sequencias');
                      setResultadoSeq(res.data?.mensagem || 'Sequências atualizadas com sucesso');
                      addToast('success', 'Sequências atualizadas');
                    } catch {
                      addToast('error', 'Erro ao atualizar sequências');
                    } finally {
                      setAtualizandoSeq(false);
                    }
                  }}
                >
                  {atualizandoSeq ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                  {atualizandoSeq ? 'Atualizando...' : 'Atualizar sequências'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {tab === 'migracoes' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <HardDrive size={20} className="text-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Atualização do Banco de Dados</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Execute scripts de atualização do banco de dados. Cada migração é executada uma única vez.
              </p>
              <div className="space-y-1.5">
                <label className="label-field">Situação</label>
                <select
                  value={filtroMigracao}
                  onChange={(e) => setFiltroMigracao(e.target.value as 'pendentes' | 'aplicadas' | 'todas')}
                  className="input-field w-48"
                >
                  <option value="pendentes">Pendentes</option>
                  <option value="aplicadas">Aplicadas</option>
                  <option value="todas">Todas</option>
                </select>
              </div>
              {migracoes === null ? (
                <Spinner />
              ) : (
                (() => {
                  const lista =
                    filtroMigracao === 'todas'
                      ? migracoes
                      : migracoes.filter((m) => m.aplicada === (filtroMigracao === 'aplicadas'));
                  if (lista.length === 0) {
                    return (
                      <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                        <CheckCircle size={16} />
                        {filtroMigracao === 'pendentes'
                          ? 'Nenhuma migração pendente.'
                          : filtroMigracao === 'aplicadas'
                            ? 'Nenhuma migração aplicada.'
                            : 'Nenhuma migração cadastrada.'}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {lista.map((m) => (
                    <div key={m.nome} className={`flex items-center justify-between p-3 rounded-lg border ${m.aplicada ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div>
                        <span className={`text-sm font-medium ${m.aplicada ? 'text-green-700' : 'text-amber-700'}`}>{m.nome}</span>
                        {m.aplicada && <span className="text-xs text-green-500 ml-2">Aplicada em {m.aplicada_em}</span>}
                      </div>
                      {!m.aplicada && (
                        <button
                          onClick={() => aplicarMigracao(m.nome)}
                          disabled={aplicando === m.nome}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
                        >
                          {aplicando === m.nome ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          {aplicando === m.nome ? 'Aplicando...' : 'Aplicar'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                  );
                })()
              )}
              {msgMigracao && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: msgMigracao.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2', color: msgMigracao.tipo === 'sucesso' ? '#166534' : '#991b1b' }}>
                  {msgMigracao.tipo === 'sucesso' ? <Check size={16} /> : <AlertTriangle size={16} />}
                  {msgMigracao.texto}
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === 'instalacao' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* App Cliente */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <QrCode size={20} className="text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">App Cliente (Chegou)</h2>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Faça upload do APK do app do cliente e gere o QR Code para instalação.
                </p>
                <div className="mb-4">
                  <label className="label-field">Enviar arquivo APK</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".apk"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAPK(true);
                        try {
                          const renamed = new File([file], 'app-chegou.apk', { type: file.type });
                          const formData = new FormData();
                          formData.append('apk', renamed);
                          formData.append('app', 'cliente');
                          await api.post('/apk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                          addToast('success', `APK "${file.name}" enviado com sucesso`);
                          const r = await api.get('/apk');
                          setApks(r.data ?? []);
                        } catch {
                          addToast('error', 'Erro ao enviar APK');
                        } finally {
                          setUploadingAPK(false);
                          e.target.value = '';
                        }
                      }}
                      className="input-field"
                      disabled={uploadingAPK}
                    />
                    {uploadingAPK && <Loader2 size={18} className="animate-spin text-text-secondary" />}
                  </div>
                </div>
                {apks.filter((a) => !a.nome.toLowerCase().includes('producao') && !a.nome.toLowerCase().includes('fabrica')).length === 0 ? (
                  <div className="text-sm text-text-secondary py-4 text-center">Nenhum APK do cliente disponível</div>
                ) : (
                  <div className="space-y-4">
                    {apks.filter((a) => !a.nome.toLowerCase().includes('producao') && !a.nome.toLowerCase().includes('fabrica')).map((apk) => {
                      const cfg = getServerConfig();
                      const baseUrl = cfg ? `http://${cfg.host}:${cfg.port}` : '';
                      const downloadUrl = `${baseUrl}/apk/${encodeURIComponent(apk.nome)}`;
                      const imprimirQRCode = () => {
                        const printWindow = window.open('', '_blank', 'width=500,height=600');
                        if (!printWindow) return;
                        QRCode.toDataURL(downloadUrl, { width: 300, margin: 2, errorCorrectionLevel: 'M' }).then((dataUrl) => {
                          printWindow.document.write(`<!DOCTYPE html>
<html><head><title>QR Code - ${apk.nome}</title>
<style>
  body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 30px; margin: 0; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p { font-size: 13px; color: #555; margin: 2px 0; }
  img { margin: 20px 0; }
  .inst { font-size: 11px; color: #888; margin-top: 10px; text-align: center; max-width: 300px; }
  @media print { body { padding: 15px; } }
</style></head><body>
  <h1>Escaneie para instalar o App</h1>
  <p>Aponte a câmera do celular para o QR Code</p>
  <img src="${dataUrl}" width="300" height="300" />
  <div class="inst">
    <p><strong>Como instalar:</strong></p>
    <p>1. Abra a câmera do celular</p>
    <p>2. Aponte para o QR Code</p>
    <p>3. Toque no link que aparecer</p>
    <p>4. Baixe e instale o APK</p>
  </div>
</body></html>`);
                          printWindow.document.close();
                          printWindow.onload = () => { printWindow.print(); };
                        });
                      };
                      return (
                        <div key={apk.nome} className="rounded-lg border border-border-primary bg-bg-secondary p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm font-semibold text-text-primary">{apk.nome}</div>
                              <div className="text-xs text-text-secondary">
                                {apk.versao && <span className="font-medium text-accent-primary">v{apk.versao}</span>}
                                {apk.versao && ' · '}
                                {(apk.tamanho / 1024 / 1024).toFixed(1)} MB
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={imprimirQRCode} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Imprimir QR Code">
                                <Printer size={14} className="text-text-secondary" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Excluir "${apk.nome}"?`)) return;
                                  setExcluindoAPK(apk.nome);
                                  try {
                                    await api.delete(`/apk/${encodeURIComponent(apk.nome)}`);
                                    addToast('success', 'APK excluído');
                                    setApks((prev) => prev.filter((a) => a.nome !== apk.nome));
                                  } catch {
                                    addToast('error', 'Erro ao excluir APK');
                                  } finally {
                                    setExcluindoAPK(null);
                                  }
                                }}
                                disabled={excluindoAPK === apk.nome}
                                className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
                                title="Excluir"
                              >
                                {excluindoAPK === apk.nome ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="text-red-500" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white">
                            <QRCodeImage value={downloadUrl} size={160} />
                            <div className="text-xs text-text-secondary text-center break-all">{downloadUrl}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* App Produção */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <QrCode size={20} className="text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">App Produção (Fábrica)</h2>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Faça upload do APK do app de produção e gere o QR Code para instalação.
                </p>
                <div className="mb-4">
                  <label className="label-field">Enviar arquivo APK</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".apk"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAPK(true);
                        try {
                          const renamed = new File([file], 'app-producao.apk', { type: file.type });
                          const formData = new FormData();
                          formData.append('apk', renamed);
                          formData.append('app', 'producao');
                          await api.post('/apk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                          addToast('success', `APK "${file.name}" enviado com sucesso`);
                          const r = await api.get('/apk');
                          setApks(r.data ?? []);
                        } catch {
                          addToast('error', 'Erro ao enviar APK');
                        } finally {
                          setUploadingAPK(false);
                          e.target.value = '';
                        }
                      }}
                      className="input-field"
                      disabled={uploadingAPK}
                    />
                    {uploadingAPK && <Loader2 size={18} className="animate-spin text-text-secondary" />}
                  </div>
                </div>
                {apks.filter((a) => a.nome.toLowerCase().includes('producao') || a.nome.toLowerCase().includes('fabrica')).length === 0 ? (
                  <div className="text-sm text-text-secondary py-4 text-center">Nenhum APK de produção disponível</div>
                ) : (
                  <div className="space-y-4">
                    {apks.filter((a) => a.nome.toLowerCase().includes('producao') || a.nome.toLowerCase().includes('fabrica')).map((apk) => {
                      const cfg = getServerConfig();
                      const baseUrl = cfg ? `http://${cfg.host}:${cfg.port}` : '';
                      const downloadUrl = `${baseUrl}/apk/${encodeURIComponent(apk.nome)}`;
                      const imprimirQRCode = () => {
                        const printWindow = window.open('', '_blank', 'width=500,height=600');
                        if (!printWindow) return;
                        QRCode.toDataURL(downloadUrl, { width: 300, margin: 2, errorCorrectionLevel: 'M' }).then((dataUrl) => {
                          printWindow.document.write(`<!DOCTYPE html>
<html><head><title>QR Code - ${apk.nome}</title>
<style>
  body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 30px; margin: 0; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p { font-size: 13px; color: #555; margin: 2px 0; }
  img { margin: 20px 0; }
  .inst { font-size: 11px; color: #888; margin-top: 10px; text-align: center; max-width: 300px; }
  @media print { body { padding: 15px; } }
</style></head><body>
  <h1>Escaneie para instalar o App de Produção</h1>
  <p>Aponte a câmera do celular para o QR Code</p>
  <img src="${dataUrl}" width="300" height="300" />
  <div class="inst">
    <p><strong>Como instalar:</strong></p>
    <p>1. Abra a câmera do celular</p>
    <p>2. Aponte para o QR Code</p>
    <p>3. Toque no link que aparecer</p>
    <p>4. Baixe e instale o APK</p>
  </div>
</body></html>`);
                          printWindow.document.close();
                          printWindow.onload = () => { printWindow.print(); };
                        });
                      };
                      return (
                        <div key={apk.nome} className="rounded-lg border border-border-primary bg-bg-secondary p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm font-semibold text-text-primary">{apk.nome}</div>
                              <div className="text-xs text-text-secondary">
                                {apk.versao && <span className="font-medium text-accent-primary">v{apk.versao}</span>}
                                {apk.versao && ' · '}
                                {(apk.tamanho / 1024 / 1024).toFixed(1)} MB
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={imprimirQRCode} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Imprimir QR Code">
                                <Printer size={14} className="text-text-secondary" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Excluir "${apk.nome}"?`)) return;
                                  setExcluindoAPK(apk.nome);
                                  try {
                                    await api.delete(`/apk/${encodeURIComponent(apk.nome)}`);
                                    addToast('success', 'APK excluído');
                                    setApks((prev) => prev.filter((a) => a.nome !== apk.nome));
                                  } catch {
                                    addToast('error', 'Erro ao excluir APK');
                                  } finally {
                                    setExcluindoAPK(null);
                                  }
                                }}
                                disabled={excluindoAPK === apk.nome}
                                className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
                                title="Excluir"
                              >
                                {excluindoAPK === apk.nome ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="text-red-500" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white">
                            <QRCodeImage value={downloadUrl} size={160} />
                            <div className="text-xs text-text-secondary text-center break-all">{downloadUrl}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {tab === 'guia' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Guia de Configuracao para Superadmin</h2>
                  <p className="text-sm text-text-secondary">Passo a passo para configurar uma nova empresa no sistema</p>
                </div>
              </div>
            </Card>

            {/* Passo 1 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Cadastrar a Empresa</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Acesse <strong>Empresas</strong> no menu <strong>Geral &gt; Configuracoes do Sistema</strong> e cadastre a nova empresa com os dados:
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 mb-3">
                    <li>Razao Social e Fantasia</li>
                    <li>CNPJ ou CPF</li>
                    <li>Endereco, Telefone, Email</li>
                    <li>Regime Tributario</li>
                  </ul>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs text-blue-700">
                      <strong>Dica:</strong> O CNPJ/CPF informado aqui sera utilizado no login do usuario para selecionar a empresa.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Passo 2 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-600">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Atribuir Modulos a Empresa</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Acesse <strong>Empresa x Modulo</strong> no menu <strong>Geral &gt; Configuracoes do Sistema</strong> e vincule os modulos que a empresa deve utilizar:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Geral</p>
                      <p className="text-xs text-text-secondary">Cadastros basicos (Clientes, Fornecedores, Usuarios)</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Gestor</p>
                      <p className="text-xs text-text-secondary">Financeiro (Contas a Pagar/Receber, Categorias)</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Producao</p>
                      <p className="text-xs text-text-secondary">Insumos, Receitas, Fabricacao, Vendas, Encomendas</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Horas Trabalhadas</p>
                      <p className="text-xs text-text-secondary">Servicos, Horas, Abatimentos</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-700">
                      <strong>Importante:</strong> Sem modulos vinculados, o usuario nao verah nenhum menu apos o login.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Passo 3 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-green-600">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Cadastrar Usuarios</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Acesse <strong>Usuarios</strong> no menu <strong>Geral &gt; Cadastro</strong> e crie os usuarios da empresa:
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 mb-3">
                    <li>Informe o <strong>email</strong> (sera usado como login) e a <strong>senha</strong></li>
                    <li>Selecione a <strong>Empresa</strong> correta no campo Empresa</li>
                    <li>Marque <strong>Superadmin</strong> apenas para usuarios administradores do sistema</li>
                    <li>Cada usuario so acessa a empresa vinculada ao seu cadastro</li>
                  </ul>
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-xs text-green-700">
                      <strong>Dica:</strong> O campo "Empresa" no cadastro define qual empresa o usuario acessa. O Superadmin pode acessar qualquer empresa.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Passo 4 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-600">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Configurar Permissoes (Opcional)</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Por padrao, todos os usuarios veem todos os formularios dos modulos atribuidos a empresa. Para restringir acesso a formularios especificos:
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 mb-3">
                    <li>Acesse <strong>Usuario x Formulario</strong> no menu <strong>Geral &gt; Configuracoes</strong></li>
                    <li>Selecione o usuario e vincule apenas os formularios que ele deve acessar</li>
                    <li>Se nenhum formulario for vinculado, o usuario fica <strong>irrestrito</strong> (acessa todos)</li>
                  </ul>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-700">
                      <strong>Nota:</strong> O formulario "Permissoes" fica disponivel apenas para Superadmins.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Passo 5 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-indigo-600">5</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Cadastrar Formas de Pagamento</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Acesse <strong>Formas de Pagamento</strong> no menu <strong>Geral &gt; Cadastro</strong> e cadastre as formas de pagamento utilizadas pela empresa:
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                    <li>Dinheiro, Cartao de Credito, Cartao de Debito, PIX, etc.</li>
                    <li>Cada forma deve ter uma <strong>Classificacao</strong> (DINHEIRO, CARTAO_CREDITO, PIX, etc.)</li>
                    <li>Vincule as <strong>Condicoes de Pagamento</strong> (a vista, parcelado, etc.)</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Passo 6 - Producao */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-rose-600">6</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Cadastrar Cadastros de Producao (se aplicavel)</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Se a empresa utiliza o modulo <strong>Producao</strong>, cadastre os dados basicos:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Insumos</p>
                      <p className="text-xs text-text-secondary">Materias-primas utilizadas na producao</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Produtos Fabricados</p>
                      <p className="text-xs text-text-secondary">Produtos finais que a empresa produz</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Receitas Ingredientes</p>
                      <p className="text-xs text-text-secondary">Composicao de cada produto (insumos + quantidades)</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">Clientes e Fornecedores</p>
                      <p className="text-xs text-text-secondary">Cadastros basicos para vendas e compras</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Passo 7 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-teal-600">7</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Configuracoes Adicionais</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Acesse <strong>Configuracoes</strong> no menu <strong>Geral &gt; Configuracoes</strong> para ajustar:
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                    <li>Dados da empresa para cupom nao fiscal (nome, CNPJ, endereco)</li>
                    <li>Configuracoes da impressora termica</li>
                    <li>Categorias financeiras padrao</li>
                    <li>Modulo e formulario inicial apos o login</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Passo 8 */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-600">8</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">Testar o Acesso</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Faca logout e teste o login com o usuario criado:
                  </p>
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                    <li>Informe o <strong>email</strong> do usuario</li>
                    <li>Informe a <strong>senha</strong> definida no cadastro</li>
                    <li>Selecione a empresa pelo <strong>CNPJ/CPF</strong> no campo Empresa</li>
                    <li>Verifique se os menus e formularios esperados estao visiveis</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab !== 'guia' && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </Button>
        </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          setCleaning(true);
          try {
            await api.post('/empresas/limpar-dados', { empresa_id: empresaLimpeza });
            addToast('success', 'Dados limpos com sucesso');
            setEmpresaLimpeza(0);
          } catch {
            addToast('error', 'Erro ao limpar dados');
          } finally {
            setCleaning(false);
          }
        }}
        title="Limpar dados"
        message="Tem certeza que deseja remover todos os dados da empresa selecionada? Esta operação não pode ser desfeita."
        confirmLabel="Sim, limpar dados"
        variant="danger"
        loading={cleaning}
      />
    </Layout>
  );
}
