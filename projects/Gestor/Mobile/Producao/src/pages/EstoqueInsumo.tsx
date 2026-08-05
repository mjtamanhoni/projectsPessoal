import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirEstoqueInsumo,
  extrairErro,
  listarEstoqueInsumos,
  listarInsumos,
  salvarEstoqueInsumo,
  type EstoqueInsumo,
  type Insumo,
} from '../api';
import EstoqueInsumoModal from '../components/EstoqueInsumoModal';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

function fmtData(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(`${d.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function fmtQtd(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function EstoqueInsumo() {
  const navigate = useNavigate();
  const [estoques, setEstoques] = useState<EstoqueInsumo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EstoqueInsumo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<EstoqueInsumo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [e, i] = await Promise.all([listarEstoqueInsumos(), listarInsumos()]);
      setEstoques(e);
      setInsumos(i);
    } catch (err) {
      setErro(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = (e: EstoqueInsumo) => {
    setEditing(e);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: EstoqueInsumo) => {
    await salvarEstoqueInsumo({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await excluirEstoqueInsumo(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (err) {
      setErro(extrairErro(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/movimento')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Estoque Insumo
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Saldo atual de insumos
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && estoques.length === 0 && (
          <div className="list-empty">Nenhum lançamento de estoque</div>
        )}
        {!loading && !erro && estoques.length > 0 && (
          <div className="list-scroll">
            {estoques.map((e) => (
              <div key={e.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{e.id}</div>
                  <div className="insumo-nome">
                    {e.insumo_nome ?? `ID ${e.insumo_id}`}
                  </div>
                  <div className="insumo-det">
                    <span style={{ color: '#2d5e3a', fontWeight: 700 }}>
                      {e.unidade_medida ? `${fmtQtd(e.quantidade)} ${e.unidade_medida}` : fmtQtd(e.quantidade)}
                    </span>
                  </div>
                  <div className="insumo-det">
                    Atualizado em {fmtData(e.data_atualizacao)}
                  </div>
                  <button className="row-btn" style={{ top: 16, color: '#6b706c', fontSize: 18 }} onClick={() => abrirEditar(e)}>
                    ✎
                  </button>
                  <button className="row-btn" style={{ top: 44, color: '#dc2626', fontSize: 16 }} onClick={() => setConfirmDelete(e)}>
                    🗑
                  </button>
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <EstoqueInsumoModal
          key={`estoque-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Estoque' : 'Novo Lançamento'}
          inicial={editing}
          insumos={insumos}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <div className="confirm-title">Excluir Lançamento</div>
            <div className="confirm-msg">
              Tem certeza que deseja excluir o lançamento de {confirmDelete.insumo_nome}? Esta ação não pode ser desfeita.
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="confirm-btn danger" onClick={aoExcluir} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}