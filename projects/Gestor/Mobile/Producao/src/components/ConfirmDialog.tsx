import { useState } from 'react';

interface Props {
  titulo: string;
  nome: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function ConfirmDialog({ titulo, nome, onCancel, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false);

  const confirmar = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="confirm-card">
        <div className="confirm-title">{titulo}</div>
        <div className="confirm-msg">
          Tem certeza que deseja excluir {nome}? Esta ação não pode ser desfeita.
        </div>
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel} disabled={deleting}>
            Cancelar
          </button>
          <button className="confirm-btn danger" onClick={confirmar} disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
