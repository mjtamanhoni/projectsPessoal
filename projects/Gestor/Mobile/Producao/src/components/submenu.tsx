import { useNavigate } from 'react-router-dom';

export interface SubMenuItem {
  icon: string;
  bg: string;
  label: string;
  destino: string;
}

export default function SubMenu({ titulo, subtitulo, items }: { titulo: string; subtitulo: string; items: SubMenuItem[] }) {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <button className="menu-back" onClick={() => navigate('/menu')}>
        ←
      </button>
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        {titulo}
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 48, fontSize: 12 }}>
        {subtitulo}
      </div>
      <div className="submenu-card" style={{ top: 80, height: 24 + items.length * 68 }}>
        {items.map((item, i) => (
          <button key={item.label} className="submenu-row" style={{ top: 12 + i * 68 }} onClick={() => navigate(item.destino)}>
            <div className="submenu-icon" style={{ background: item.bg }}>
              {item.icon}
            </div>
            <span className="submenu-label">{item.label}</span>
            <span className="submenu-arrow">&gt;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
