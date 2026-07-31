import { useSearchParams } from 'react-router-dom';

export default function EmBreve() {
  const [params] = useSearchParams();
  const t = params.get('t') ?? 'essa tela';
  return (
    <div className="screen">
      <div className="auth-subtitle" style={{ top: 380 }}>
        {t}
      </div>
      <div className="auth-subtitle" style={{ top: 404, color: '#9ca09d' }}>
        Em breve
      </div>
    </div>
  );
}
