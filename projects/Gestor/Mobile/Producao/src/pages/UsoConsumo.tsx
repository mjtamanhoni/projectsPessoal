import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirUsoConsumo,
  extrairErro,
  listarProdutosFabricados,
  listarUsoConsumos,
  salvarUsoConsumo,
  type ProdutoFabricado,
  type UsoConsumo,
} from '../api';
import UsoConsumoModal from '../components/UsoConsumoModal';
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

export default function UsoConsumo() {
  const navigate = useNavigate();
  const [usos, setUsos] = useState<UsoConsumo[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UsoConsumo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<UsoConsumo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [u, p] = await Promise.all([listarUsoConsumos(), listarProdutosFabricados()]);
      setUsos(u);
      setProdutos(p);
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

  const abrirEditar = (u: UsoConsumo) => {
    setEditing(u);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: UsoConsumo) => {
    await salvarUsoConsumo({ ...data, id: editing?.id ?? editing?.codigo });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    const id = confirmDelete?.id ?? confirmDelete?.codigo;
    if (id == null) return;
    setDeleting(true);
    try {
      await excluirUsoConsumo(id);
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
        Uso & Consumo
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Baixa no estoque de produtos fabricados
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && usos.length === 0 && (
          <div className="list-empty">Nenhum registro de uso/consumo</div>
        )}
        {!loading && !erro && usos.length > 0 && (
          <div className="list-scroll">
            {usos.map((u) => (
              <div key={u.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{u.id}</div>
                  <div className="insumo-nome">
                    {u.produto_nome ?? `ID ${u.produto_fabricado_id}`}
                  </div>
                  <div className="insumo-det">
                    <span style={{ color: '#b45309', fontWeight: 700 }}>
                      {fmtQtd(u.quantidade)}
                    </span>{' '}
                    &nbsp;•&nbsp; {fmtData(u.data_uso)}
                  </div>
                  <div className="insumo-det">{u.motivo || '—'}</div>
                  <button className="row-btn" style={{ top: 16, color: '#6b706c', fontSize: 18 }} onClick={() => abrirEditar(u)}>
                    ✎
                  </button>
                  <button className="row-btn" style={{ top: 44, color: '#dc2626', fontSize: 16 }} onClick={() => setConfirmDelete(u)}>
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
        <UsoConsumoModal
          key={`uso-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Uso/Consumo' : 'Novo Uso/Consumo'}
          inicial={editing}
          produtos={produtos}
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
            <div className="confirm-title">Excluir Uso/Consumo</div>
            <div className="confirm-msg">
              Tem certeza que deseja excluir o registro de uso de {confirmDelete.produto_nome}? O estoque será restaurado.
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