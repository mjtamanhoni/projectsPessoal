import { NavLink } from 'react-router-dom';
import { ReceiptIcon, SettingsIcon } from './Icons';

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavLink
        to="/titulos"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <ReceiptIcon size={22} />
        <span>Títulos</span>
      </NavLink>
      <NavLink
        to="/configuracoes"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <SettingsIcon size={22} />
        <span>Configurações</span>
      </NavLink>
    </nav>
  );
}
