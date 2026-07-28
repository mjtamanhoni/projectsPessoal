import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LogIn, KeyRound, Settings, Server, Loader2, Save, Building } from 'lucide-react';
import { fetchSettings, saveSettings } from '@/lib/settings';
import api from '@/lib/api';
import type { AppSettings, Empresa } from '@/types';

export function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number>(0);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connSettings, setConnSettings] = useState<AppSettings | null>(null);
  const [connLoading, setConnLoading] = useState(false);
  const [connSaving, setConnSaving] = useState(false);
  const [connError, setConnError] = useState('');

  useEffect(() => {
    const expired = searchParams.get('expired');
    const message = searchParams.get('message');
    if (expired) {
      setError(message || 'Sessão expirada. Faça login novamente.');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchEmpresas = async () => {
      setLoadingEmpresas(true);
      try {
        const res = await api.get('/auth/empresas');
        const data = res.data as Empresa[];
        setEmpresas(data);
        if (data.length > 0) {
          setEmpresaId(data[0].id ?? data[0].codigo ?? 0);
        }
      } catch {
        setEmpresas([]);
      } finally {
        setLoadingEmpresas(false);
      }
    };
    fetchEmpresas();
  }, []);

  const openSettings = async () => {
    setSettingsOpen(true);
    setConnLoading(true);
    setConnError('');
    try {
      const s = await fetchSettings();
      setConnSettings(s);
    } catch {
      setConnError('Erro ao carregar configurações');
    } finally {
      setConnLoading(false);
    }
  };

  const handleSaveConn = async () => {
    if (!connSettings) return;
    setConnSaving(true);
    setConnError('');
    try {
      const updated = await saveSettings(connSettings);
      setConnSettings(updated);
    } catch {
      setConnError('Erro ao salvar configurações');
    } finally {
      setConnSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (usePin) {
        await authLogin('', '', pin, empresaId);
      } else {
        await authLogin(login, senha, undefined, empresaId);
      }
      const redirectTo = (() => {
        try {
          const val = localStorage.getItem('redirectAfterLogin');
          localStorage.removeItem('redirectAfterLogin');
          return val;
        } catch { return null; }
      })();
      navigate(redirectTo || '/');
    } catch (err: unknown) {
      const message = (() => {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
          return axiosErr.response?.data?.error ?? axiosErr.message ?? 'Erro ao fazer login';
        }
        return err instanceof Error ? err.message : 'Erro ao fazer login';
      })();
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground-primary">Gestor Financeiro</h1>
            <p className="text-text-secondary mt-1">Acesse sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-sm text-accent-red">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="label-field">Empresa</label>
              {loadingEmpresas ? (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando empresas...
                </div>
              ) : empresas.length > 0 ? (
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                  className="input-field"
                >
                  {empresas.map((emp) => (
                    <option key={emp.id ?? emp.codigo} value={emp.id ?? emp.codigo}>
                      {emp.razao_social}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  label="Codigo da Empresa"
                  value={empresaId || ''}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                  placeholder="Digite o codigo da empresa"
                  type="number"
                />
              )}
            </div>

            {usePin ? (
              <Input
                label="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Digite seu PIN"
                required
              />
            ) : (
              <>
                <Input
                  label="Login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Digite seu usuário ou email"
                  required
                />

                <Input
                  label="Senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                />
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <button
              type="button"
              onClick={() => setUsePin(!usePin)}
              className="w-full text-sm text-accent-primary hover:text-accent-primary/80 transition-colors flex items-center justify-center gap-1"
            >
              <KeyRound size={14} />
              {usePin ? 'Usar login e senha' : 'Entrar com PIN'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border-subtle text-center space-y-2">
            <button
              type="button"
              onClick={() => navigate('/server-config')}
              className="text-xs text-text-muted hover:text-accent-primary transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <Server size={12} />
              Servidor do App
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="text-xs text-text-muted hover:text-accent-primary transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <Settings size={12} />
              Configurações do Servidor
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          Gestor Financeiro v1.0
        </p>

        <Modal isOpen={settingsOpen} onClose={() => { setSettingsOpen(false); setConnError(''); }} title="Configurações do Servidor" maxWidth="max-w-md">
          {connLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-accent-primary" />
            </div>
          ) : connError && !connSettings ? (
            <div className="space-y-4">
              <p className="text-sm text-accent-red">{connError}</p>
              <Button variant="secondary" onClick={openSettings} className="w-full">Tentar novamente</Button>
            </div>
          ) : connSettings ? (
            <div className="space-y-4">
              {connError && (
                <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-sm text-accent-red">
                  {connError}
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Server size={16} className="text-text-secondary" />
                <span className="text-sm font-medium text-text-primary">Conexão Horse API</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="label-field">Protocolo</label>
                  <select
                    value={connSettings.horseApi.protocol}
                    onChange={(e) => setConnSettings({ ...connSettings, horseApi: { ...connSettings.horseApi, protocol: e.target.value } })}
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
                    value={connSettings.horseApi.host}
                    onChange={(e) => setConnSettings({ ...connSettings, horseApi: { ...connSettings.horseApi, host: e.target.value } })}
                    className="input-field"
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-field">Porta</label>
                  <input
                    type="number"
                    value={connSettings.horseApi.port}
                    onChange={(e) => setConnSettings({ ...connSettings, horseApi: { ...connSettings.horseApi, port: Number(e.target.value) } })}
                    className="input-field"
                    placeholder="9000"
                  />
                </div>
              </div>
              <div className="text-xs text-text-muted bg-bg-muted p-2 rounded">
                URL: <code>{connSettings.horseApi.protocol}://{connSettings.horseApi.host}:{connSettings.horseApi.port}</code>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setSettingsOpen(false); setConnError(''); }} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveConn} disabled={connSaving} className="flex-1">
                  {connSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}
