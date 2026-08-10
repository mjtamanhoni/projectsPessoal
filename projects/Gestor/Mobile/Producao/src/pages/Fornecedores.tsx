import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import { excluirFornecedor, extrairErro, listarFornecedores, salvarFornecedor, type Fornecedor } from '../api';
import PessoaModal from '../components/PessoaModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

export default function Fornecedores() {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Fornecedor | null>(null);

  const [busca, setBusca] = useState('');
const [filtroAtivo, setFiltroAtivo] = useState(true);
const [filtroInativo, setFiltroInativo] = useState(false);

const fornecedoresFiltrados = useMemo(() => {
  let lista = fornecedores;
  if (filtroAtivo !== filtroInativo) {
    lista = lista.filter((f) => {
      const st = Number(f.status);
      return (filtroAtivo && (st === 1 || f.status == null)) || (filtroInativo && st === 0);
    });
  }
  return lista.filter((f) => passaBusca([f.nome, f.telefone, f.celular, f.email], busca));
}, [fornecedores, busca, filtroAtivo, filtroInativo]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setFornecedores(await listarFornecedores());
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

  const abrirEditar = (f: Fornecedor) => {
    setEditing(f);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: Fornecedor) => {
    await salvarFornecedor({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirFornecedor(confirmDelete.id);
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
        Fornecedores
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie seus fornecedores
      </div>
      <PlusButton onClick={abrirNovo} />

            <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar
            busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar...' }}
            checks={{
              opcao1: filtroAtivo,
              onOpcao1: setFiltroAtivo,
              opcao2: filtroInativo,
              onOpcao2: setFiltroInativo,
              label1: 'Ativos',
              label2: 'Inativos',
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && fornecedoresFiltrados.length === 0 && (
          <div className="list-empty">Nenhum fornecedor cadastrado</div>
        )}
        {!loading && !erro && fornecedores.length > 0 && (
          <div className="list-scroll">
            {fornecedoresFiltrados.map((f) => (
              <div key={f.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{f.id}</div>
                  <div className="insumo-nome">{f.nome}</div>
                  <div className="insumo-det">
                    {f.telefone || f.celular || '—'} &nbsp;•&nbsp; {f.email || '—'}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(f) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(f) },
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
        <PessoaModal
          key={`fornecedor-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          rotulo="fornecedor"
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
          titulo="Excluir Fornecedor"
          nome={confirmDelete.nome}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}
    </div>
  );
}
