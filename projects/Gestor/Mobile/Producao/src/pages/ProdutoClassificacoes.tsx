import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirProdutoClassificacao,
  extrairErro,
  listarProdutoClassificacoes,
  salvarProdutoClassificacao,
  type ProdutoClassificacao,
} from '../api';
import ProdutoClassificacaoModal from '../components/ProdutoClassificacaoModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

export default function ProdutoClassificacoes() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<ProdutoClassificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoClassificacao | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<ProdutoClassificacao | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState(true);
  const [filtroInativo, setFiltroInativo] = useState(false);

  const filtrados = useMemo(() => {
    let lista = itens;
    if (filtroAtivo !== filtroInativo) {
      lista = lista.filter((t) => (filtroAtivo && t.status === 1) || (filtroInativo && t.status !== 1));
    }
    return lista.filter((t) => passaBusca([t.nome], busca));
  }, [itens, busca, filtroAtivo, filtroInativo]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setItens(await listarProdutoClassificacoes());
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditing(null); setFormKey((k) => k + 1); setModalOpen(true); };
  const abrirEditar = (t: ProdutoClassificacao) => { setEditing(t); setFormKey((k) => k + 1); setModalOpen(true); };

  const aoSalvar = async (data: ProdutoClassificacao) => {
    await salvarProdutoClassificacao({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirProdutoClassificacao(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) { setErro(extrairErro(e)); }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/cadastro')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>Classificação de Produtos</div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>Categorias para produtos de venda</div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar
            busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar...' }}
            checks={{ opcao1: filtroAtivo, onOpcao1: setFiltroAtivo, opcao2: filtroInativo, onOpcao2: setFiltroInativo, label1: 'Ativos', label2: 'Inativos' }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && <div className="list-empty" style={{ color: '#c0392b' }}>{erro}</div>}
        {!loading && !erro && filtrados.length === 0 && <div className="list-empty">Nenhuma classificação cadastrada</div>}
        {!loading && !erro && filtrados.length > 0 && (
          <div className="list-scroll">
            {filtrados.map((t) => (
              <div key={t.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{t.id}</div>
                  <div className="insumo-nome">{t.nome}</div>
                  <div className="insumo-det" style={{ color: t.status === 1 ? '#2d5e3a' : '#c0392b' }}>
                    {t.status === 1 ? 'Ativo' : 'Inativo'}
                  </div>
                  <RowMenu style={{ top: 12, height: 32 }} fontSize={19} opcoes={[
                    { rotulo: 'Editar', onPress: () => abrirEditar(t) },
                    { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(t) },
                  ]} />
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ProdutoClassificacaoModal
          key={`class-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Classificação' : 'Nova Classificação'}
          inicial={editing}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog titulo="Excluir Classificação" nome={confirmDelete.nome} onCancel={() => setConfirmDelete(null)} onConfirm={aoExcluir} />
      )}
    </div>
  );
}
