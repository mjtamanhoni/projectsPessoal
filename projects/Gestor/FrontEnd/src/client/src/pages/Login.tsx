import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LogIn, Settings, Server, Loader2, Save, KeyRound } from 'lucide-react';
import { fetchSettings, saveSettings } from '@/lib/settings';
import { formatCpfCnpj } from '@/lib/utils';
import api from '@/lib/api';
import type { AppSettings } from '@/types';

export function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connSettings, setConnSettings] = useState<AppSettings | null>(null);
  const [connLoading, setConnLoading] = useState(false);
  const [connSaving, setConnSaving] = useState(false);
  const [connError, setConnError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLogin, setResetLogin] = useState('');
  const [resetEmpresa, setResetEmpresa] = useState('');
  const [resetSenhaAtual, setResetSenhaAtual] = useState('');
  const [resetNovaSenha, setResetNovaSenha] = useState('');
  const [resetConfirmar, setResetConfirmar] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    const expired = searchParams.get('expired');
    const message = searchParams.get('message');
    if (expired) {
      setError(message || 'Sessão expirada. Faça login novamente.');
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const lastLogin = localStorage.getItem('lastLogin');
      if (lastLogin) setLogin(lastLogin);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const last = localStorage.getItem('lastCnpjCpf');
      if (last) setCnpjCpf(last);
    } catch {}
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

  const openReset = () => {
    setResetLogin(login);
    setResetEmpresa(cnpjCpf);
    setResetSenhaAtual('');
    setResetNovaSenha('');
    setResetConfirmar('');
    setResetError('');
    setResetSuccess('');
    setResetOpen(true);
  };

  const handleResetSenha = async () => {
    setResetError('');
    setResetSuccess('');
    if (!resetLogin.trim() || !resetEmpresa.trim() || !resetSenhaAtual.trim() || !resetNovaSenha.trim()) {
      setResetError('Todos os campos são obrigatórios');
      return;
    }
    if (resetNovaSenha !== resetConfirmar) {
      setResetError('As senhas não coincidem');
      return;
    }
    if (resetNovaSenha.length < 4) {
      setResetError('A nova senha deve ter pelo menos 4 caracteres');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/redefinir-senha', {
        login: resetLogin.trim(),
        empresa: resetEmpresa.trim(),
        senhaAtual: resetSenhaAtual,
        novaSenha: resetNovaSenha,
      });
      setResetSuccess('Senha redefinida com sucesso! Agora faça login.');
      setResetSenhaAtual('');
      setResetNovaSenha('');
      setResetConfirmar('');
    } catch (err: unknown) {
      const message = (() => {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { erro?: string } }; message?: string };
          return axiosErr.response?.data?.erro ?? axiosErr.message ?? 'Erro ao redefinir senha';
        }
        return err instanceof Error ? err.message : 'Erro ao redefinir senha';
      })();
      setResetError(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authLogin(login, senha, undefined, cnpjCpf);
      try {
        localStorage.setItem('lastLogin', login);
        localStorage.setItem('lastCnpjCpf', cnpjCpf);
      } catch {}
      const settings = await fetchSettings().catch(() => null);
      const hasInitialForm = settings?.display?.moduloInicialId && settings?.display?.formularioInicialId;
      if (hasInitialForm) {
        try { localStorage.removeItem('redirectAfterLogin'); } catch {}
        navigate('/');
      } else {
        const redirectTo = (() => {
          try {
            const val = localStorage.getItem('redirectAfterLogin');
            localStorage.removeItem('redirectAfterLogin');
            return val;
          } catch { return null; }
        })();
        navigate(redirectTo || '/');
      }
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
              <Input
                label="CNPJ/CPF da Empresa"
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(formatCpfCnpj(e.target.value))}
                placeholder="Digite o CNPJ/CPF da empresa"
                required
              />
            </div>

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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={openReset}
              className="text-sm text-accent-primary hover:text-accent-primary/80 transition-colors flex items-center justify-center gap-1.5 mx-auto"
            >
              <KeyRound size={14} />
              Esqueci minha senha
            </button>
          </div>

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

        <Modal isOpen={resetOpen} onClose={() => { setResetOpen(false); setResetError(''); setResetSuccess(''); }} title="Redefinir Senha" maxWidth="max-w-md">
          {resetSuccess ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {resetSuccess}
              </div>
              <Button onClick={() => { setResetOpen(false); setResetSuccess(''); }} className="w-full">
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {resetError && (
                <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-sm text-accent-red">
                  {resetError}
                </div>
              )}
              <Input
                label="CNPJ/CPF da Empresa"
                value={resetEmpresa}
                onChange={(e) => setResetEmpresa(formatCpfCnpj(e.target.value))}
                placeholder="Digite o CNPJ/CPF da empresa"
              />
              <Input
                label="Login"
                value={resetLogin}
                onChange={(e) => setResetLogin(e.target.value)}
                placeholder="Digite seu usuário ou email"
              />
              <Input
                label="Senha Atual"
                type="password"
                value={resetSenhaAtual}
                onChange={(e) => setResetSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
              />
              <Input
                label="Nova Senha"
                type="password"
                value={resetNovaSenha}
                onChange={(e) => setResetNovaSenha(e.target.value)}
                placeholder="Digite a nova senha"
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={resetConfirmar}
                onChange={(e) => setResetConfirmar(e.target.value)}
                placeholder="Confirme a nova senha"
              />
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setResetOpen(false); setResetError(''); setResetSuccess(''); }} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleResetSenha} disabled={resetLoading} className="flex-1">
                  {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Redefinir
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
