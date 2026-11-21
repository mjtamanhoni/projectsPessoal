import { NavLink } from 'react-router-dom';
import { BarChart3, Clock, LayoutDashboard, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const itens = [
  { to: '/ponto-eletronico', label: 'Marcações', icon: Clock, end: true },
  { to: '/ponto-eletronico/horas-excedidas', label: 'Horas Excedidas', icon: Timer, end: false },
  { to: '/ponto-eletronico/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
  { to: '/ponto-eletronico/relatorios', label: 'Relatórios', icon: BarChart3, end: false },
];

export function PontoNav() {
  const { temAcesso } = useAuth();

  return (
    <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl bg-bg-muted border border-border-subtle">
      {itens.filter((item) => temAcesso(item.to)).map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-border-subtle hover:text-text-primary'
              }`
            }
          >
            <Icon size={16} />
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}
