import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { fetchSettings, saveSettings } from '@/lib/settings';
import api from '@/lib/api';
import type { AppSettings, Categoria, Empresa } from '@/types';
import { Save, Server, Monitor, Loader2, ImageIcon, Trash2, DollarSign, AlertTriangle, Database, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Tab = 'servidor' | 'exibicao' | 'financeiro' | 'logomarcas' | 'limpeza' | 'sequencias';

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
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputPdfRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'page' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((prev) => prev ? { ...prev, [type === 'page' ? 'logoBase64' : 'logoPdfBase64']: reader.result as string } : null);
    };
    reader.readAsDataURL(file);
  };

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
  }, []);

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
    { key: 'logomarcas', label: 'Logomarcas', icon: <ImageIcon size={16} /> },
    { key: 'limpeza', label: 'Limpeza', icon: <AlertTriangle size={16} /> },
    { key: 'sequencias', label: 'Sequências', icon: <Database size={16} /> },
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
                <select
                  value={settings.financeiro?.categoriaReceberVendaPadrao ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      financeiro: {
                        ...settings.financeiro,
                        categoriaReceberVendaPadrao: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="input-field"
                >
                  <option value="">Sem categoria padrão</option>
                  {categoriasReceber.map((cat) => (
                    <option key={cat.id ?? cat.codigo} value={cat.id ?? cat.codigo}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="label-field">Categoria padrão para contas a pagar (compra)</label>
                <p className="text-xs text-text-secondary">Ao registrar uma compra de insumo, a conta a pagar será criada com esta categoria</p>
                <select
                  value={settings.financeiro?.categoriaPagarCompraPadrao ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      financeiro: {
                        ...settings.financeiro,
                        categoriaPagarCompraPadrao: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="input-field"
                >
                  <option value="">Sem categoria padrão</option>
                  {categoriasPagar.map((cat) => (
                    <option key={cat.id ?? cat.codigo} value={cat.id ?? cat.codigo}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
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
                <select
                  value={empresaLimpeza}
                  onChange={(e) => setEmpresaLimpeza(Number(e.target.value))}
                  className="input-field"
                >
                  <option value={0}>Selecione...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id ?? emp.codigo} value={emp.id ?? emp.codigo}>
                      {emp.razao_social}
                    </option>
                  ))}
                </select>
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

        {tab === 'logomarcas' && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <ImageIcon size={20} className="text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Logomarcas</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-primary">Logomarca do Menu (Páginas)</h3>
                <p className="text-xs text-text-secondary">Exibida no menu lateral do sistema</p>
                {settings.logoBase64 ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={settings.logoBase64}
                      alt="Logo Menu"
                      className="max-h-16 max-w-40 object-contain border border-border-subtle rounded-lg p-2"
                    />
                    <Button variant="secondary" onClick={() => setSettings({ ...settings, logoBase64: undefined })}>
                      <Trash2 size={16} />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">Nenhuma logo selecionada. O sistema usará o texto padrão.</p>
                )}
                <div>
                  <label className="label-field">Selecionar imagem</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleLogoUpload(e, 'page')}
                    className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-hover cursor-pointer"
                  />
                </div>
              </div>

              <div className="border-t border-border-subtle pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-primary">Logomarca dos Relatórios (PDF)</h3>
                  <p className="text-xs text-text-secondary">Exibida no cabeçalho dos relatórios gerados em PDF</p>
                  {settings.logoPdfBase64 ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={settings.logoPdfBase64}
                        alt="Logo PDF"
                        className="max-h-16 max-w-40 object-contain border border-border-subtle rounded-lg p-2"
                      />
                      <Button variant="secondary" onClick={() => setSettings({ ...settings, logoPdfBase64: undefined })}>
                        <Trash2 size={16} />
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">Nenhuma logo selecionada. Os relatórios não terão logomarca.</p>
                  )}
                  <div>
                    <label className="label-field">Selecionar imagem</label>
                    <input
                      ref={fileInputPdfRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleLogoUpload(e, 'pdf')}
                      className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-hover cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
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
