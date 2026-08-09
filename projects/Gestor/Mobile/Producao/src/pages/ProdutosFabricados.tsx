import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  enviarFotoProdutoFabricado,
  excluirProdutoFabricado,
  extrairErro,
  listarProdutosFabricados,
  salvarProdutoFabricado,
  type ProdutoFabricado,
} from '../api';
import ProdutoFabricadoModal from '../components/ProdutoFabricadoModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProdutosFabricados() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoFabricado | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<ProdutoFabricado | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setProdutos(await listarProdutosFabricados());
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

  const abrirEditar = (p: ProdutoFabricado) => {
    setEditing(p);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: ProdutoFabricado, foto?: { dataUrl?: string; remover?: boolean }) => {
    const res = await salvarProdutoFabricado({ ...data, id: editing?.id });
    const id = res?.id ?? editing?.id;
    if (id && foto) {
      try {
        await enviarFotoProdutoFabricado(id, foto.dataUrl ?? '');
      } catch (e) {
        setErro(extrairErro(e));
        return;
      }
    }
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirProdutoFabricado(confirmDelete.id);
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
        Produtos Fabricados
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie seus produtos
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && produtos.length === 0 && (
          <div className="list-empty">Nenhum produto fabricado cadastrado</div>
        )}
        {!loading && !erro && produtos.length > 0 && (
          <div className="list-scroll">
            {produtos.map((p) => (
              <div key={p.id}>
                <div
                  className="insumo-row"
                  onClick={() => p.id != null && navigate(`/ingredientes/${p.id}`)}
                >
                  <div className="insumo-cod">#{p.id}</div>
                  <div className="insumo-nome">{p.nome}</div>
                  <div className="insumo-det">
                    {p.unidade_medida || '—'} &nbsp;•&nbsp; {fmtMoeda(p.custo_unitario)}
                  </div>
                  <div className="insumo-det" style={{ color: '#2d5e3a' }}>
                    Venda: {fmtMoeda(p.preco ?? p.valor_venda_sugerido)}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    stopPropagacao
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
        <ProdutoFabricadoModal
          key={`produto-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Produto' : 'Novo Produto'}
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
          titulo="Excluir Produto"
          nome={confirmDelete.nome}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}
    </div>
  );
}
