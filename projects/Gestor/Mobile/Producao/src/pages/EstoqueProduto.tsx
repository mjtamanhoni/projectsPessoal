import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirEstoqueProduto,
  extrairErro,
  listarEstoqueProdutos,
  listarProdutosFabricados,
  salvarEstoqueProduto,
  type EstoqueProdutoFabricado,
  type ProdutoFabricado,
} from '../api';
import EstoqueProdutoModal from '../components/EstoqueProdutoModal';
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

export default function EstoqueProduto() {
  const navigate = useNavigate();
  const [estoques, setEstoques] = useState<EstoqueProdutoFabricado[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EstoqueProdutoFabricado | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<EstoqueProdutoFabricado | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [busca, setBusca] = useState('');

  const estoquesFiltrados = useMemo(
    () => estoques.filter((e) => passaBusca([e.produto_nome], busca)),
    [estoques, busca],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [e, p] = await Promise.all([listarEstoqueProdutos(), listarProdutosFabricados()]);
      setEstoques(e);
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

  const abrirEditar = (e: EstoqueProdutoFabricado) => {
    setEditing(e);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: EstoqueProdutoFabricado) => {
    await salvarEstoqueProduto({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await excluirEstoqueProduto(confirmDelete.id);
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
        Estoque Produto
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Saldo atual de produtos fabricados
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar produto...' }} />
        )}
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
            {estoquesFiltrados.map((e) => (
              <div key={e.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{e.id}</div>
                  <div className="insumo-nome">
                    {e.produto_nome ?? `ID ${e.produto_fabricado_id}`}
                  </div>
                  <div className="insumo-det">
                    <span style={{ color: '#2d5e3a', fontWeight: 700 }}>
                      {e.unidade_medida ? `${fmtQtd(e.quantidade)} ${e.unidade_medida}` : fmtQtd(e.quantidade)}
                    </span>
                  </div>
                  <div className="insumo-det">
                    Atualizado em {fmtData(e.data_atualizacao)}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(e) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(e) },
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
        <EstoqueProdutoModal
          key={`estoque-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Estoque' : 'Novo Lançamento'}
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
            <div className="confirm-title">Excluir Lançamento</div>
            <div className="confirm-msg">
              Tem certeza que deseja excluir o lançamento de {confirmDelete.produto_nome}? Esta ação não pode ser desfeita.
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