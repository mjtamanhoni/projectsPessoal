import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirCustoAdicionalTipo,
  extrairErro,
  listarCustosAdicionaisTipo,
  salvarCustoAdicionalTipo,
  type CustoAdicionalTipo,
} from '../api';
import CustoAdicionalModal from '../components/CustoAdicionalModal';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

export default function CustosAdicionais() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState<CustoAdicionalTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustoAdicionalTipo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<CustoAdicionalTipo | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setTipos(await listarCustosAdicionaisTipo());
    } catch (e) {
      setErro(extrairErro(e));
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

  const abrirEditar = (t: CustoAdicionalTipo) => {
    setEditing(t);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: CustoAdicionalTipo) => {
    await salvarCustoAdicionalTipo({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirCustoAdicionalTipo(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/cadastro')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Custos Adicionais
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Tipos de custo adicional
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && tipos.length === 0 && (
          <div className="list-empty">Nenhum custo adicional cadastrado</div>
        )}
        {!loading && !erro && tipos.length > 0 && (
          <div className="list-scroll">
            {tipos.map((t) => (
              <div key={t.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{t.id}</div>
                  <div className="insumo-nome">{t.nome}</div>
                  <div className="insumo-det" style={{ color: t.ativo ? '#2d5e3a' : '#c0392b' }}>
                    {t.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                  <button
                    className="row-btn"
                    style={{ top: 16, color: '#6b706c', fontSize: 18 }}
                    onClick={() => abrirEditar(t)}
                  >
                    ✎
                  </button>
                  <button
                    className="row-btn"
                    style={{ top: 44, color: '#dc2626', fontSize: 16 }}
                    onClick={() => setConfirmDelete(t)}
                  >
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
        <CustoAdicionalModal
          key={`custo-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Custo Adicional' : 'Novo Custo Adicional'}
          inicial={editing}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Custo Adicional"
          nome={confirmDelete.nome}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}
    </div>
  );
}
