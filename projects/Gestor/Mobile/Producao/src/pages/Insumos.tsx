import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirInsumo,
  extrairErro,
  listarFornecedores,
  listarInsumos,
  listarMarcas,
  salvarInsumo,
  type Fornecedor,
  type Insumo,
  type Marca,
} from '../api';
import InsumoModal from '../components/InsumoModal';
import RowMenu from '../components/RowMenu';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

function fmtCusto(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Insumos() {
  const navigate = useNavigate();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Insumo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [busca, setBusca] = useState('');
const [filtroAtivo, setFiltroAtivo] = useState(true);
const [filtroInativo, setFiltroInativo] = useState(false);

const insumosFiltrados = useMemo(() => {
  let lista = insumos;
  if (filtroAtivo !== filtroInativo) {
    lista = lista.filter(
      (i) => (filtroAtivo && i.ativo === true) || (filtroInativo && i.ativo !== true),
    );
  }
  return lista.filter((i) => passaBusca([i.nome, i.fornecedor_nome, i.marca_nome], busca));
}, [insumos, busca, filtroAtivo, filtroInativo]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [i, f, m] = await Promise.all([listarInsumos(), listarFornecedores(), listarMarcas()]);
      setInsumos(i);
      setFornecedores(f);
      setMarcas(m);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const fornNome = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const marcaNome = new Map(marcas.map((m) => [m.id, m.nome]));

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = (i: Insumo) => {
    setEditing(i);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: Insumo) => {
    await salvarInsumo({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await excluirInsumo(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/cadastro')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Insumos
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie seus insumos
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
        {loading && (
          <div className="list-empty">Carregando...</div>
        )}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && insumosFiltrados.length === 0 && (
          <div className="list-empty">Nenhum insumo cadastrado</div>
        )}
        {!loading && !erro && insumos.length > 0 && (
          <div className="list-scroll">
            {insumosFiltrados.map((i) => (
              <div key={i.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{i.id}</div>
                  <div className="insumo-nome">{i.nome}</div>
                  <div className="insumo-det">
                    {i.unidade_medida || '—'} &nbsp;•&nbsp; R$ {fmtCusto(i.custo_medio)}
                  </div>
                  <div className="insumo-det">
                    {fornNome.get(i.id_fornecedor ?? 0) ?? '—'} &nbsp;•&nbsp;{' '}
                    {marcaNome.get(i.id_marca ?? 0) ?? '—'}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(i) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(i) },
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
        <InsumoModal
          key={`insumo-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Insumo' : 'Novo Insumo'}
          inicial={editing}
          fornecedores={fornecedores}
          marcas={marcas}
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
            <div className="confirm-title">Excluir Insumo</div>
            <div className="confirm-msg">
              Tem certeza que deseja excluir {confirmDelete.nome}? Esta ação não pode ser desfeita.
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
