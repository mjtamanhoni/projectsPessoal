import { useEffect, useState } from 'react';
import { setAguardeHandler } from '../aguarde';

interface Estado {
  visivel: boolean;
  msg: string;
}

export default function Aguarde() {
  const [estado, setEstado] = useState<Estado>({ visivel: false, msg: '' });

  useEffect(() => {
    setAguardeHandler((visivel, msg) => setEstado({ visivel, msg }));
    return () => setAguardeHandler(() => {});
  }, []);

  if (!estado.visivel) return null;

  return (
    <div className="aguarde-overlay">
      <div className="aguarde-card">
        <div className="aguarde-spinner" />
        <div className="aguarde-titulo">Aguarde...</div>
        <div className="aguarde-msg">{estado.msg}</div>
      </div>
    </div>
  );
}
