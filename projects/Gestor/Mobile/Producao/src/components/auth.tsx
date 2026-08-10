import { useState } from 'react';
import type { EmpresaPublic } from '../api';

export function LogoBox() {
  return <div className="logo-box">G</div>;
}

export function AuthTitle({ subtitle }: { subtitle: string }) {
  return (
    <>
      <div className="auth-title">Oficina de Sabores</div>
      <div className="auth-subtitle">{subtitle}</div>
    </>
  );
}

interface EmpresaFieldProps {
  empresas: EmpresaPublic[];
  empresaId: number;
  onEmpresaId: (id: number) => void;
  codigo: string;
  onCodigo: (v: string) => void;
}

export function EmpresaField({ empresas, empresaId, onEmpresaId, codigo, onCodigo }: EmpresaFieldProps) {
  const [aberto, setAberto] = useState(false);

  const nome = (e: EmpresaPublic) => e.fantasia || e.razao_social;

  if (empresas.length === 0) {
    return (
      <>
        <div className="field-label" style={{ top: 18 }}>
          Empresa
        </div>
        <input
          className="field-input"
          style={{ top: 38 }}
          type="tel"
          inputMode="numeric"
          placeholder="Código da Empresa"
          value={codigo}
          onChange={(e) => onCodigo(e.target.value.replace(/\D/g, ''))}
        />
      </>
    );
  }

  const selecionada = empresas.find((e) => e.id === empresaId) ?? empresas[0];

  return (
    <>
      <div className="field-label" style={{ top: 18 }}>
        Empresa
      </div>
      <div
        className="field-select"
        style={{ top: 38, zIndex: 20 }}
        onClick={() => setAberto(!aberto)}
      >
        <span>{nome(selecionada)}</span>
        <span className="arrow">{aberto ? '˄' : '>'}</span>
      </div>
      {aberto && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 84,
            width: 'calc(100% - 40px)',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #d6ddd0',
            zIndex: 30,
            overflow: 'hidden',
          }}
        >
          {empresas.map((e) => (
            <div
              key={e.id}
              onClick={() => {
                onEmpresaId(e.id);
                setAberto(false);
              }}
              style={{
                padding: '12px 14px',
                fontSize: 13,
                cursor: 'pointer',
                background: e.id === selecionada.id ? '#f5f3ee' : '#ffffff',
                borderBottom: '1px solid #efeee9',
              }}
            >
              {nome(e)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function AuthFooter({ top = 700, onServerConfig }: { top?: number; onServerConfig: () => void }) {
  return (
    <>
      <div className="auth-footer" style={{ top }} onClick={onServerConfig}>
        <b>Servidor do App</b>
      </div>
      <div className="auth-footer" style={{ top: top + 20 }} onClick={onServerConfig}>
        Configurações do Servidor
      </div>
      <div className="version" style={{ top: top + 70 }}>
        Oficina de Sabores v1.5
      </div>
    </>
  );
}
