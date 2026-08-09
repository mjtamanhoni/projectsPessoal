import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirPerdaInsumo,
  extrairErro,
  listarInsumos,
  listarPerdasInsumo,
  salvarPerdaInsumo,
  type Insumo,
  type PerdaInsumo,
} from '../api';
import PerdaInsumoModal from '../components/PerdaInsumoModal';
import RowMenu from '../components/RowMenu';
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

export default function PerdasInsumo() {
  const navigate = useNavigate();
  const [perdas, setPerdas] = useState<PerdaInsumo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PerdaInsumo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<PerdaInsumo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [p, i] = await Promise.all([listarPerdasInsumo(), listarInsumos()]);
      setPerdas(p);
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

  const abrirEditar = (p: PerdaInsumo) => {
    setEditing(p);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: PerdaInsumo) => {
    await salvarPerdaInsumo({ ...data, id: editing?.id ?? editing?.codigo });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    const id = confirmDelete?.id ?? confirmDelete?.codigo;
    if (id == null) return;
    setDeleting(true);
    try {
      await excluirPerdaInsumo(id);
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
        Perdas Insumo
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Baixa no estoque de insumos
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && perdas.length === 0 && (
          <div className="list-empty">Nenhuma perda cadastrada</div>
        )}
        {!loading && !erro && perdas.length > 0 && (
          <div className="list-scroll">
            {perdas.map((p) => (
              <div key={p.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{p.id}</div>
                  <div className="insumo-nome">
                    {p.insumo_nome ?? `ID ${p.insumo_id}`}
                  </div>
                  <div className="insumo-det">
                    <span style={{ color: '#c0392b', fontWeight: 700 }}>
                      {fmtQtd(p.quantidade)}
                    </span>{' '}
                    &nbsp;•&nbsp; {fmtData(p.data_perda)}
                  </div>
                  <div className="insumo-det">{p.motivo || '—'}</div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(p) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(p) },
                    ]}
                  />
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <PerdaInsumoModal
          key={`perda-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Perda' : 'Nova Perda'}
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
            <div className="confirm-title">Excluir Perda</div>
            <div className="confirm-msg">
              Tem certeza que deseja excluir a perda de {confirmDelete.insumo_nome}? O estoque será restaurado.
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