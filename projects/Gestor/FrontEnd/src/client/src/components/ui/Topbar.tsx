import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getLogo } from '@/lib/settings';
import { getUploadsUrl } from '@/lib/empresaLogo';
import api, { getErrorMsg } from '@/lib/api';
import type { Empresa } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';
import { MessageBell } from './MessageBell';
import { PerfilModal } from '@/components/PerfilModal';

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Topbar({ collapsed, onToggle }: TopbarProps) {
  const { user, empresaNome, empresa, isSuperadmin, logout } = useAuth();
  const { addToast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trocaPendente, setTrocaPendente] = useState<Empresa | null>(null);
  const [trocando, setTrocando] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) return;
    api.get('/empresas').then((r) => setEmpresas(r.data as Empresa[])).catch(() => {});
  }, [isSuperadmin]);

  const executarTroca = async () => {
    if (!trocaPendente?.id) return;
    setTrocando(true);
    try {
      const res = await api.post('/auth/trocar-empresa', { empresa_id: trocaPendente.id });
      const token = (res.data as { token: string }).token;
      const stored = sessionStorage.getItem('user');
      const userObj = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
      const novoUsuario = {
        ...userObj,
        token,
        empresaId: (res.data as { empresa: number }).empresa,
        empresa_info: (res.data as { empresa_info?: unknown }).empresa_info,
      };
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(novoUsuario));
      sessionStorage.removeItem('empresaNome');
      window.location.reload();
    } catch (err: unknown) {
      addToast('error', getErrorMsg(err, 'Erro ao trocar de empresa'));
      setTrocando(false);
      setTrocaPendente(null);
    }
  };

  const logo = getLogo() ?? (empresa?.logomarca ? getUploadsUrl(empresa.logomarca) : null);
  const inicial = (user?.nome || 'U').trim().charAt(0).toUpperCase();
  const avatarUrl = getUploadsUrl(user?.avatar);

  return (
    <header className="h-16 shrink-0 bg-bg-card border-b border-border-subtle flex items-center gap-3 px-4 relative z-40">
      <button
        type="button"
        onClick={onToggle}
        className="p-1.5 rounded-lg hover:bg-background-hover transition-colors shrink-0"
        title={collapsed ? 'Expandir menu' : 'Retrair menu'}
      >
        {collapsed ? (
          <PanelLeftOpen size={18} className="text-text-secondary" />
        ) : (
          <PanelLeftClose size={18} className="text-text-secondary" />
        )}
      </button>

      <div className="flex items-center gap-3 min-w-0">
        {logo ? (
          <img src={logo} alt="Logo" className="h-9 max-w-28 object-contain shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-accent-primary/15 text-accent-primary flex items-center justify-center shrink-0">
            <Building size={18} />
          </div>
        )}
        <div className="min-w-0 hidden sm:block">
          <h1 className="text-base font-heading font-bold text-accent-primary truncate">
            Gestor Financeiro
          </h1>
          <p className="text-[11px] text-text-muted truncate">
            {empresaNome || 'Gestão financeira'}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0">
        {isSuperadmin && empresas.length > 0 && (
          <select
            className="hidden md:block max-w-52 px-2 py-1.5 bg-background-input border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            value={user?.empresaId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              const alvo = empresas.find((emp) => (emp.id ?? emp.codigo) === id);
              if (alvo && id !== user?.empresaId) setTrocaPendente(alvo);
            }}
            title="Trocar de empresa (superadmin)"
          >
            <option value="" disabled>Selecionar empresa...</option>
            {empresas.map((emp) => (
              <option key={emp.id ?? emp.codigo} value={emp.id ?? emp.codigo}>
                {emp.fantasia || emp.razao_social || `Empresa ${emp.id}`}
              </option>
            ))}
          </select>
        )}

        <MessageBell />

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border-subtle min-w-0">
          <button
            type="button"
            onClick={() => setPerfilAberto(true)}
            className="flex items-center gap-2 min-w-0 rounded-lg hover:bg-background-hover transition-colors p-1 -m-1"
            title="Meu perfil"
          >
            <span className="w-8 h-8 rounded-full overflow-hidden bg-accent-primary/15 text-accent-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto do usuário" className="w-full h-full object-cover" />
              ) : (
                inicial
              )}
            </span>
            <span className="hidden lg:block min-w-0 text-left">
              <span className="block text-xs font-medium text-text-primary truncate max-w-40">{user?.nome}</span>
              <span className="block text-[11px] text-text-muted truncate max-w-40">{empresaNome}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg hover:bg-background-hover transition-colors shrink-0"
            title="Sair"
          >
            <LogOut size={18} className="text-text-secondary" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={trocaPendente !== null}
        onClose={() => setTrocaPendente(null)}
        onConfirm={executarTroca}
        title="Trocar de empresa"
        message={`Todos os dados exibidos passarao a ser da empresa "${trocaPendente?.fantasia || trocaPendente?.razao_social || ''}" e as proximas gravacoes serao feitas nela. Deseja continuar?`}
        variant="warning"
        confirmLabel="Sim, trocar"
        loading={trocando}
      />

      <PerfilModal isOpen={perfilAberto} onClose={() => setPerfilAberto(false)} />
    </header>
  );
}
