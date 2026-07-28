import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Server, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getServerConfig, saveServerConfig, type ServerConfig } from '@/lib/serverConfig';
import { fetchSettings } from '@/lib/settings';
import axios from 'axios';

export function ServerConfig() {
  const navigate = useNavigate();
  const existing = getServerConfig();
  const [host, setHost] = useState(existing?.host ?? '');
  const [port, setPort] = useState(String(existing?.port ?? 3001));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (testResult === 'ok') {
      const t = setTimeout(() => setTestResult(null), 4000);
      return () => clearTimeout(t);
    }
  }, [testResult]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError('');
    const cfg: ServerConfig = { host, port: parseInt(port, 10) || 3001 };
    const baseURL = `http://${cfg.host}:${cfg.port}`;
    try {
      await axios.get(`${baseURL}/health`, { timeout: 5000 });
      setTestResult('ok');
      saveServerConfig(cfg);
    } catch {
      setTestResult('fail');
      setError('Não foi possível conectar ao servidor. Verifique o host e a porta.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!host.trim()) { setError('Informe o host do servidor'); return; }
    const cfg: ServerConfig = { host: host.trim(), port: parseInt(port, 10) || 3001 };
    saveServerConfig(cfg);
    try {
      await fetchSettings();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-accent-blue/20">
            <Server size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Configuração do Servidor</h1>
          <p className="text-sm text-text-secondary">Informe o endereço do servidor para conectar o aplicativo</p>
        </div>

        <div className="bg-bg-secondary rounded-xl p-6 space-y-4 border border-border-primary">
          <Input
            label="Host"
            placeholder="ex: 192.168.1.100 ou meuservidor.com"
            value={host}
            onChange={(e) => { setHost(e.target.value); setTestResult(null); setError(''); }}
          />
          <Input
            label="Porta"
            placeholder="3001"
            value={port}
            onChange={(e) => { setPort(e.target.value.replace(/\D/g, '')); setTestResult(null); setError(''); }}
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/5 rounded-lg p-3">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {testResult === 'ok' && (
            <div className="flex items-center gap-2 text-sm text-accent-green bg-accent-green/5 rounded-lg p-3">
              <CheckCircle size={16} />
              <span>Conexão OK!</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={testConnection}
              disabled={testing || !host.trim()}
            >
              {testing ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={!host.trim() || testing}
            >
              <Save size={16} /> Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}