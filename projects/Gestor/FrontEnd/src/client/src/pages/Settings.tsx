import { useState, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { fetchSettings, saveSettings } from '@/lib/settings';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import api from '@/lib/api';
import type { AppSettings, Categoria, Empresa } from '@/types';
import { Save, Server, Monitor, Loader2, Trash2, DollarSign, AlertTriangle, Database, CheckCircle, Printer, HardDrive, Play, Check, Search, Download, QrCode, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import type { ModuleItem } from '@/context/ModuleContext';
import { useAuth } from '@/context/AuthContext';
import { listarImpressorasUSB, solicitarImpressoraUSB, imprimirTesteUSB, webusbDisponivel, diagnosWebUSB, listarDispositivosUSB, type ImpressoraLocal } from '@/lib/printer-local';
import { imprimirCupomComum } from '@/lib/cupom';
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


type Tab = 'servidor' | 'exibicao' | 'financeiro' | 'impressao' | 'limpeza' | 'sequencias' | 'migracoes' | 'instalacao';

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
  const [subTabImpressao, setSubTabImpressao] = useState<'termica' | 'comum'>('termica');
  const [impressorasUSB, setImpressorasUSB] = useState<ImpressoraLocal[]>([]);
  const [dispositivosUSB, setDispositivosUSB] = useState<ImpressoraLocal[]>([]);
  const [procurandoUSB, setProcurandoUSB] = useState(false);
  const [testandoImpressora, setTestandoImpressora] = useState(false);
  const [msgImpressora, setMsgImpressora] = useState<{ tipo: string; texto: string } | null>(null);
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
    if (tab === 'migracoes') {
      api.get('/migracoes').then((r) => setMigracoes(r.data ?? [])).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (!isSuperadmin && (tab === 'limpeza' || tab === 'migracoes' || tab === 'instalacao')) {
      setTab('servidor');
    }
  }, [isSuperadmin, tab]);

  useEffect(() => {
    if (tab === 'impressao') {
      listarImpressorasUSB().then(setImpressorasUSB).catch(() => setImpressorasUSB([]));
      listarDispositivosUSB().then(setDispositivosUSB).catch(() => setDispositivosUSB([]));
    }
    if (tab === 'instalacao') {
      api.get('/apk').then((r) => setApks(r.data ?? [])).catch(() => setApks([]));
    }
  }, [tab]);

  const procurarImpressora = async () => {
    setProcurandoUSB(true);
    setMsgImpressora(null);
    try {
      if (!webusbDisponivel()) {
        setMsgImpressora({ tipo: 'erro', texto: `WebUSB indisponivel: acesso via HTTP externo nao permite acesso USB. Configure a porta manualmente (ex: USB:0456:0808).` });
        return;
      }
      const impressora = await solicitarImpressoraUSB();
      if (!impressora) {
        setMsgImpressora({ tipo: 'erro', texto: 'Nenhuma impressora selecionada.' });
        return;
      }
      setImpressorasUSB((prev) => (prev.some((i) => i.porta === impressora.porta) ? prev : [...prev, impressora]));
      setMsgImpressora({ tipo: 'sucesso', texto: `Impressora detectada: ${impressora.nome}` });
    } finally {
      setProcurandoUSB(false);
    }
  };

  const usarImpressora = (imp: ImpressoraLocal) => {
    if (!settings?.printer) return;
    setSettings({ ...settings, printer: { ...settings.printer, porta: imp.porta } });
    addToast('success', `Impressora configurada: ${imp.nome}`);
  };

  const testarImpressora = async () => {
    if (!settings?.printer) return;
    setTestandoImpressora(true);
    setMsgImpressora(null);
    try {
      const porta = settings.printer.porta;
      if (!porta) {
        setMsgImpressora({ tipo: 'erro', texto: 'Configure a porta da impressora antes de testar.' });
        return;
      }
      if (porta.toUpperCase().startsWith('USB:')) {
        await imprimirTesteUSB(porta);
        setMsgImpressora({ tipo: 'sucesso', texto: 'Teste enviado para a impressora USB.' });
        return;
      }
      const texto = '*** TESTE DE IMPRESSÃO TÉRMICA ***\n\nSe o texto abaixo estiver correto,\na impressora está configurada.\n\nSistema Gestor\n';
      await api.post('/print/cupom', {
        texto,
        modelo: settings.printer.modelo,
        porta,
        deviceParams: settings.printer.deviceParams,
        colunas: settings.printer.colunas,
        cortarPapel: settings.printer.cortarPapel,
        espacoEntreLinhas: settings.printer.espacoEntreLinhas,
        linhasBuffer: settings.printer.linhasBuffer,
        linhasPular: settings.printer.linhasPular,
      });
      setMsgImpressora({ tipo: 'sucesso', texto: 'Teste enviado para impressão.' });
    } catch (err) {
      setMsgImpressora({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Erro ao testar impressora' });
    } finally {
      setTestandoImpressora(false);
    }
  };

  const testarImpressoraComum = () => {
    imprimirCupomComum(
      '*** TESTE DE IMPRESSORA COMUM ***\n\nSe você está vendo este texto,\na impressora comum está funcionando.\n\nSistema Gestor\n',
    );
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
              <h2 className="text-lg font-semibold text-text-primary">Dados da Empresa para Cupom</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="label-field">Nome da Empresa</label>
                <input
                  type="text"
                  value={settings.empresaNome ?? ''}
                  onChange={(e) => setSettings({ ...settings, empresaNome: e.target.value })}
                  className="input-field"
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">CNPJ</label>
                <input
                  type="text"
                  value={settings.empresaCnpj ?? ''}
                  onChange={(e) => setSettings({ ...settings, empresaCnpj: e.target.value })}
                  className="input-field"
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Endereco</label>
                <input
                  type="text"
                  value={settings.empresaEndereco ?? ''}
                  onChange={(e) => setSettings({ ...settings, empresaEndereco: e.target.value })}
                  className="input-field"
                  placeholder="Rua, numero, bairro, cidade/UF"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Telefone</label>
                <input
                  type="text"
                  value={settings.empresaTelefone ?? ''}
                  onChange={(e) => setSettings({ ...settings, empresaTelefone: e.target.value })}
                  className="input-field"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="border-t border-border-subtle pt-4">
              <div className="flex gap-1 mb-4">
                <button
                  type="button"
                  onClick={() => setSubTabImpressao('termica')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    subTabImpressao === 'termica'
                      ? 'bg-accent-primary text-text-inverse'
                      : 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
                  }`}
                >
                  Impressora Termica
                </button>
                <button
                  type="button"
                  onClick={() => setSubTabImpressao('comum')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    subTabImpressao === 'comum'
                      ? 'bg-accent-primary text-text-inverse'
                      : 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
                  }`}
                >
                  Impressoras Comuns
                </button>
              </div>

              {subTabImpressao === 'termica' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Printer size={20} className="text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary">Impressora Termica (PosPrinter)</h2>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Configure a impressora termica para impressao de cupons nao fiscais.
                    Modelos compativeis: Epson TM, Daruma, Bematech, Elgin, etc.
                  </p>
                  <div className="rounded-lg border border-border-primary p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">Localizar impressora termica neste computador</h3>
                    <p className="text-xs text-text-tertiary">
                      Detecta impressoras termicas USB conectadas a este computador e define a porta automaticamente.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" disabled={procurandoUSB} onClick={procurarImpressora}>
                        {procurandoUSB ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        {procurandoUSB ? 'Procurando...' : 'Localizar Impressora'}
                      </Button>
                      <Button type="button" variant="secondary" disabled={testandoImpressora} onClick={testarImpressora}>
                        {testandoImpressora ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        {testandoImpressora ? 'Testando...' : 'Testar Impressão'}
                      </Button>
                    </div>
                    {!webusbDisponivel() && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1">
                        <p className="text-xs font-semibold text-amber-800">WebUSB nao disponivel</p>
                        <p className="text-xs text-amber-700">
                          O WebUSB so funciona em <strong>HTTPS</strong> ou <strong>localhost</strong>.
                          Acesso via HTTP externo ({window.location.hostname}) nao permite acesso USB.
                        </p>
                        <p className="text-xs text-amber-700">
                          Configure a porta manualmente no campo abaixo (ex: USB:0456:0808).
                        </p>
                      </div>
                    )}
                    {impressorasUSB.length > 0 && (
                      <div className="border border-border-primary rounded-lg divide-y divide-border-primary">
                        {impressorasUSB.map((imp) => (
                          <div key={imp.porta} className="flex items-center justify-between px-3 py-2 gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{imp.nome}</p>
                              <p className="text-xs text-text-tertiary">{imp.porta}</p>
                            </div>
                            <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => usarImpressora(imp)}>
                              Usar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {msgImpressora && (
                      <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: msgImpressora.tipo === 'sucesso' ? '#f0fdf4' : '#fef2f2', color: msgImpressora.tipo === 'sucesso' ? '#166534' : '#991b1b' }}>
                        {msgImpressora.tipo === 'sucesso' ? <Check size={16} /> : <AlertTriangle size={16} />}
                        {msgImpressora.texto}
                      </div>
                    )}
                  </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="label-field">Modelo</label>
                <select
                  value={settings.printer?.modelo ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, modelo: Number(e.target.value) } })}
                  className="input-field"
                >
                  <option value={0}>Nenhum</option>
                  <option value={1}>Epson TM</option>
                  <option value={2}>Daruma</option>
                  <option value={3}>Bematech</option>
                  <option value={4}>Elgin</option>
                  <option value={5}>Sweda</option>
                  <option value={6}>Diebold</option>
                  <option value={7}>ICAPlayer</option>
                  <option value={8}>Generic</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Porta</label>
                <input
                  type="text"
                  value={settings.printer?.porta ?? ''}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, porta: e.target.value } })}
                  className="input-field"
                  placeholder="Ex: COM1, USB001, TCP:192.168.0.10:9100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Params (Serial)</label>
                <input
                  type="text"
                  value={settings.printer?.deviceParams ?? ''}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, deviceParams: e.target.value } })}
                  className="input-field"
                  placeholder="Ex: 9600,N,8,1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Colunas</label>
                <input
                  type="number"
                  min={20}
                  max={80}
                  value={settings.printer?.colunas ?? 48}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, colunas: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Espaco entre linhas</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.printer?.espacoEntreLinhas ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, espacoEntreLinhas: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Linhas em Buffer</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={settings.printer?.linhasBuffer ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, linhasBuffer: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Linhas entre cupons</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.printer?.linhasPular ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, linhasPular: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Pagina de Codigo</label>
                <select
                  value={settings.printer?.paginaCodigo ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, paginaCodigo: Number(e.target.value) } })}
                  className="input-field"
                >
                  <option value={0}>PC850</option>
                  <option value={1}>PC852</option>
                  <option value={2}>PC860</option>
                  <option value={3}>PC861</option>
                  <option value={4}>PC862</option>
                  <option value={5}>PC863</option>
                  <option value={6}>PC865</option>
                  <option value={7}>PC866</option>
                  <option value={8}>PC869</option>
                  <option value={9}>ISO8859-1</option>
                  <option value={10}>UTF8</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.printer?.cortarPapel ?? true}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, cortarPapel: e.target.checked } })}
                  className="rounded border-border-subtle"
                />
                Cortar Papel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.printer?.controlePorta ?? false}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, controlePorta: e.target.checked } })}
                  className="rounded border-border-subtle"
                />
                Controle de Porta
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.printer?.barrasHRI ?? true}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, barrasHRI: e.target.checked } })}
                  className="rounded border-border-subtle"
                />
                Mostrar codigo (Barras HRI)
              </label>
            </div>
            <h3 className="text-sm font-medium text-text-primary mt-4 mb-2">Codigo de Barras</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="label-field">Largura</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.printer?.barrasLargura ?? 2}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, barrasLargura: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Altura</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={settings.printer?.barrasAltura ?? 100}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, barrasAltura: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
            </div>
            <h3 className="text-sm font-medium text-text-primary mt-4 mb-2">QRCode</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="label-field">Tipo</label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={settings.printer?.qrcodeTipo ?? 2}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, qrcodeTipo: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Largura do Modulo</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.printer?.qrcodeLarguraModulo ?? 6}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, qrcodeLarguraModulo: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Error Level</label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={settings.printer?.qrcodeErrorLevel ?? 2}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, qrcodeErrorLevel: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
            </div>
            <h3 className="text-sm font-medium text-text-primary mt-4 mb-2">Logo (gravado na impressora)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="label-field">KeyCode 1</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={settings.printer?.logoKC1 ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, logoKC1: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">KeyCode 2</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={settings.printer?.logoKC2 ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, logoKC2: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Fator X</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={settings.printer?.logoFatorX ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, logoFatorX: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Fator Y</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={settings.printer?.logoFatorY ?? 0}
                  onChange={(e) => setSettings({ ...settings, printer: { ...settings.printer!, logoFatorY: Number(e.target.value) } })}
                  className="input-field w-24"
                />
              </div>
            </div>
            </div>
              )}

              {subTabImpressao === 'comum' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Printer size={20} className="text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary">Impressoras Comuns</h2>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Impressoras comuns (A4, carta) usam a janela de impressao do navegador, onde voce escolhe a
                    impressora instalada neste computador. Nenhuma configuracao adicional e necessaria.
                  </p>
                  <p className="text-sm text-text-secondary">
                    No cupom, use a opcao "Impressora Comum" para imprimir em uma impressora comum.
                  </p>
                  <div className="rounded-lg border border-border-primary p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">Detectar dispositivos USB deste computador</h3>
                    <p className="text-xs text-text-tertiary">
                      O navegador nao lista as impressoras instaladas, mas mostra os dispositivos USB autorizados.
                      Use o teste abaixo para escolher a impressora na janela de impressao do sistema.
                    </p>
                    {!webusbDisponivel() && (
                      <p className="text-xs text-amber-600">
                        WebUSB indisponivel (acesso via HTTP externo). O teste via janela de impressao continua disponivel.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" onClick={testarImpressoraComum}>
                        <Play size={16} /> Testar Impressora Comum
                      </Button>
                    </div>
                    {dispositivosUSB.length > 0 && (
                      <div className="border border-border-primary rounded-lg divide-y divide-border-primary">
                        {dispositivosUSB.map((disp) => (
                          <div key={disp.porta} className="flex items-center justify-between px-3 py-2 gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{disp.nome}</p>
                              <p className="text-xs text-text-tertiary">{disp.porta}</p>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              onClick={() =>
                                imprimirCupomComum(
                                  `*** TESTE DE IMPRESSÃO COMUM ***\n\nDispositivo detectado:\n${disp.nome}\n\nSelecione a impressora na janela de impressao.\n\nSistema Gestor\n`,
                                )
                              }
                            >
                              Testar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {dispositivosUSB.length === 0 && webusbDisponivel() && (
                      <p className="text-xs text-text-tertiary">
                        Nenhum dispositivo USB autorizado ainda. Se sua impressora comum estiver conectada via USB, clique em
                        "Localizar Impressora" na aba Impressora Termica e autorize o acesso.
                      </p>
                    )}
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
                          const formData = new FormData();
                          formData.append('apk', file);
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
                          const formData = new FormData();
                          formData.append('apk', file);
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

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </Button>
        </div>
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
