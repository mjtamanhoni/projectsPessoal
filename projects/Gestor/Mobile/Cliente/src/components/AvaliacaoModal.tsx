import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Encomenda } from '../api';
import { avaliarEncomenda } from '../api';

interface Props {
  empresaId: number;
  clienteId: number;
  encomenda: Encomenda;
  onClose: () => void;
  onAvaliado: () => void;
}

export default function AvaliacaoModal({ empresaId, clienteId, encomenda, onClose, onAvaliado }: Props) {
  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [justificativa, setJustificativa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const numeroEncomenda = encomenda.id ?? encomenda.codigo ?? 0;
  const notaEfetiva = hoverNota || nota;
  const precisaJustificativa = notaEfetiva > 0 && notaEfetiva <= 3;
  const justificativaInvalida = precisaJustificativa && justificativa.trim().length < 20;
  const podeEnviar = notaEfetiva >= 1 && notaEfetiva <= 5 && !justificativaInvalida && !enviando;

  const handleEnviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro('');
    try {
      const resultado = await avaliarEncomenda(empresaId, encomenda.id!, clienteId, notaEfetiva, justificativa.trim());
      if (resultado) {
        onAvaliado();
        onClose();
      } else {
        setErro('Erro ao enviar avaliação. Tente novamente.');
      }
    } catch {
      setErro('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        width: '90%',
        maxWidth: 400,
        background: '#1a1a2e',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            Avaliar Atendimento
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#999',
            fontSize: 20,
            cursor: 'pointer',
            padding: '0 4px',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
            Encomenda #{numeroEncomenda}
          </div>

          <div style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>
            Como foi seu atendimento?
          </div>

          {/* Estrelas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setNota(i)}
                onMouseEnter={() => setHoverNota(i)}
                onMouseLeave={() => setHoverNota(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  transition: 'transform 0.15s',
                  transform: i <= notaEfetiva ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill={i <= notaEfetiva ? '#facc15' : 'none'}
                  stroke={i <= notaEfetiva ? '#facc15' : '#555'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
            {notaEfetiva === 0 && 'Toque nas estrelas para avaliar'}
            {notaEfetiva === 1 && 'Muito ruim'}
            {notaEfetiva === 2 && 'Ruim'}
            {notaEfetiva === 3 && 'Regular'}
            {notaEfetiva === 4 && 'Bom'}
            {notaEfetiva === 5 && 'Excelente'}
          </div>

          {/* Justificativa (obrigatória para nota <= 3) */}
          {precisaJustificativa && (
            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <label style={{ fontSize: 12, color: '#ccc', display: 'block', marginBottom: 6 }}>
                Explique o motivo da avaliação (mínimo 20 caracteres):
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o que aconteceu..."
                maxLength={500}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: justificativaInvalida && justificativa.length > 0
                    ? '1px solid #ef4444'
                    : '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: 13,
                  resize: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 11, color: justificativaInvalida && justificativa.length > 0 ? '#ef4444' : '#888', marginTop: 4, textAlign: 'right' }}>
                {justificativa.length}/20 mínimo
              </div>
            </div>
          )}

          {erro && (
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{erro}</div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#aaa',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Agora Não
            </button>
            <button
              onClick={handleEnviar}
              disabled={!podeEnviar}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 10,
                border: 'none',
                background: podeEnviar ? '#7c3aed' : '#444',
                color: podeEnviar ? '#fff' : '#888',
                fontSize: 14,
                fontWeight: 600,
                cursor: podeEnviar ? 'pointer' : 'not-allowed',
              }}
            >
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
