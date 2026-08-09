import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { excluirMarca, extrairErro, listarMarcas, salvarMarca, type Marca } from '../api';
import MarcaModal from '../components/MarcaModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

export default function Marcas() {
  const navigate = useNavigate();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Marca | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Marca | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setMarcas(await listarMarcas());
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

  const abrirEditar = (m: Marca) => {
    setEditing(m);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: Marca) => {
    await salvarMarca({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirMarca(confirmDelete.id);
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
        Marcas
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Cadastro de marcas
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && marcas.length === 0 && (
          <div className="list-empty">Nenhuma marca cadastrada</div>
        )}
        {!loading && !erro && marcas.length > 0 && (
          <div className="list-scroll">
            {marcas.map((m) => (
              <div key={m.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{m.id}</div>
                  <div className="insumo-nome">{m.nome}</div>
                  <div className="insumo-det" style={{ color: m.ativo ? '#2d5e3a' : '#c0392b' }}>
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(m) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(m) },
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
        <MarcaModal
          key={`marca-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Marca' : 'Nova Marca'}
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
          titulo="Excluir Marca"
          nome={confirmDelete.nome}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}
    </div>
  );
}
