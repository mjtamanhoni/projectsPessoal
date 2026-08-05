import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { LogoBox } from '../components/auth';
import BackButton from '../components/BackButton';

const BOTOES = [
  { label: 'CADASTRO', destino: '/cadastro' },
  { label: 'MOVIMENTO', destino: '/movimento' },
  { label: 'RELATÓRIOS', destino: '/relatorios' },
  { label: 'AJUDA', destino: '/ajuda' },
  { label: 'CONFIGURAÇÕES', destino: '/server-config' },
  { label: 'SAIR', destino: '/login' },
];

export default function MenuPrincipal() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const aoClicar = (label: string, destino: string) => {
    if (label === 'SAIR') {
      logout();
      navigate('/login');
      return;
    }
    navigate(destino);
  };

  return (
    <div className="screen">
      <BackButton onClick={() => navigate('/dashboard')} />
      <LogoBox />
      <div className="auth-title">Oficina de Sabores</div>
      <div className="auth-subtitle">Menu Principal</div>

      <div className="auth-card" style={{ top: 290, height: 400 }}>
        {BOTOES.map((b, i) => (
          <button
            key={b.label}
            className="green-button"
            style={{ top: 20 + i * 60 }}
            onClick={() => aoClicar(b.label, b.destino)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="version" style={{ top: 770 }}>
        Oficina de Sabores v1.5
      </div>
    </div>
  );
}
