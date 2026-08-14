import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import BackButton from '../components/BackButton';

export default function Ajuda() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const itens: { label: string; valor: string }[] = [
    { label: 'Aplicativo', valor: 'Fábrica de Sabores — Produção' },
    { label: 'Versão', valor: '1.5' },
    { label: 'Usuário', valor: usuario?.nome ?? '—' },
    { label: 'Contato de suporte', valor: usuario?.email ?? '—' },
  ];

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/menu')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Ajuda
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Informações do aplicativo
      </div>

      <div className="auth-card" style={{ top: 80, height: 220 }}>
        {itens.map((item, i) => (
          <div key={item.label}>
            <div className="field-label" style={{ top: 18 + i * 52 }}>
              {item.label}
            </div>
            <div className="ajuda-valor" style={{ top: 38 + i * 52 }}>
              {item.valor}
            </div>
          </div>
        ))}
      </div>

      <div className="auth-subtitle" style={{ top: 330, color: '#9ca09d', fontSize: 11 }}>
        Em caso de dúvidas, entre em contato com o suporte informado acima.
      </div>
    </div>
  );
}
