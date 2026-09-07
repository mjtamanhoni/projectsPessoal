import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirAdicional,
  extrairErro,
  listarAdicionais,
  salvarAdicional,
  type Adicional,
} from '../api';
import AdicionalModal from '../components/AdicionalModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

export default function Adicionais() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<Adicional[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Adicional | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Adicional | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState(true);
  const [filtroInativo, setFiltroInativo] = useState(false);

  const filtrados = useMemo(() => {
    let lista = itens;
    if (filtroAtivo !== filtroInativo) {
      lista = lista.filter((t) => (filtroAtivo && t.ativo === true) || (filtroInativo && t.ativo !== true));
    }
    return lista.filter((t) => passaBusca([t.nome, t.descricao ?? ''], busca));
  }, [itens, busca, filtroAtivo, filtroInativo]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setItens(await listarAdicionais());
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setEditing(null); setFormKey((k) => k + 1); setModalOpen(true); };
  const abrirEditar = (t: Adicional) => { setEditing(t); setFormKey((k) => k + 1); setModalOpen(true); };

  const aoSalvar = async (data: Adicional) => {
    await salvarAdicional({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirAdicional(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) { setErro(extrairErro(e)); }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/cadastro')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>Adicionais</div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>Extras para personalização de produtos</div>
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
        {!loading && !erro && filtrados.length === 0 && <div className="list-empty">Nenhum adicional cadastrado</div>}
        {!loading && !erro && filtrados.length > 0 && (
          <div className="list-scroll">
            {filtrados.map((t) => (
              <div key={t.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{t.id}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="insumo-nome">{t.nome}</div>
                    {t.descricao && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{t.descricao}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2d5e3a', marginRight: 8 }}>
                    R$ {Number(t.preco ?? 0).toFixed(2)}
                  </div>
                  <div className="insumo-det" style={{ color: t.ativo ? '#2d5e3a' : '#c0392b', marginRight: 4 }}>
                    {t.ativo ? 'Ativo' : 'Inativo'}
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
        <AdicionalModal
          key={`adic-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Adicional' : 'Novo Adicional'}
          inicial={editing}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog titulo="Excluir Adicional" nome={confirmDelete.nome} onCancel={() => setConfirmDelete(null)} onConfirm={aoExcluir} />
      )}
    </div>
  );
}
