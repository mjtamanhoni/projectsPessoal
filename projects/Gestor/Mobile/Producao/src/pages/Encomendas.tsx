import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirEncomenda,
  extrairErro,
  gerarVendaDeEncomenda,
  listarClientes,
  listarEncomendaItens,
  listarEncomendas,
  listarProdutosFabricados,
  salvarEncomenda,
  type Encomenda,
  type EncomendaItem,
  type Cliente,
  type ProdutoFabricado,
} from '../api';
import EncomendaModal from '../components/EncomendaModal';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(`${d.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function fmtQtd(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtValor(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ExpandState = Record<number, EncomendaItem[] | 'loading'>;

export default function Encomendas() {
  const navigate = useNavigate();
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Encomenda | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Encomenda | null>(null);
  const [expandido, setExpandido] = useState<ExpandState>({});
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [baixar, setBaixar] = useState<{ id: number; cliente?: string } | null>(null);
  const [baixarData, setBaixarData] = useState('');
  const [baixarRecebido, setBaixarRecebido] = useState(true);
  const [baixando, setBaixando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [e, p, c] = await Promise.all([
        listarEncomendas(),
        listarProdutosFabricados(),
        listarClientes(),
      ]);
      setEncomendas(e);
      setProdutos(p);
      setClientes(c);
    } catch (err) {
      setErro(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const idEncomenda = (e: Encomenda): number | undefined => e.id ?? e.codigo;

  const toggleExpandir = async (e: Encomenda) => {
    const id = idEncomenda(e);
    if (id == null) return;
    const atual = expandido[id];
    if (atual !== undefined) {
      setExpandido((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setExpandido((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const itens = await listarEncomendaItens(id);
      setExpandido((prev) => ({ ...prev, [id]: itens }));
    } catch {
      setExpandido((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = async (e: Encomenda) => {
    const id = idEncomenda(e);
    setCarregandoEdicao(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    if (id == null) {
      setEditing(e);
      setCarregandoEdicao(false);
      return;
    }
    try {
      const itens = await listarEncomendaItens(id);
      setEditing({ ...e, itens });
    } catch {
      setEditing(e);
    } finally {
      setCarregandoEdicao(false);
    }
  };

  const aoSalvar = async (data: Encomenda) => {
    await salvarEncomenda({ ...data, id: editing?.id ?? editing?.codigo });
    setModalOpen(false);
    setEditing(null);
    setExpandido({});
    await carregar();
  };

  const confirmarBaixar = async () => {
    if (!baixar) return;
    setBaixando(true);
    setErro('');
    try {
      await gerarVendaDeEncomenda({
        id_encomenda: baixar.id,
        data_venda: baixarData,
        recebido: baixarRecebido,
      });
      setBaixar(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setBaixar(null);
      setErro(extrairErro(e));
    } finally {
      setBaixando(false);
    }
  };

  const aoExcluir = async () => {
    const id = confirmDelete ? idEncomenda(confirmDelete) : undefined;
    if (id == null) return;
    try {
      await excluirEncomenda(id);
      setConfirmDelete(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const qtdItens = (e: Encomenda): number | undefined => {
    if (e.qtd_itens != null) return e.qtd_itens;
    const id = idEncomenda(e);
    if (id != null) {
      const itens = expandido[id];
      if (Array.isArray(itens)) return itens.length;
    }
    return undefined;
  };

  const renderSubComponent = (e: Encomenda) => {
    const id = idEncomenda(e);
    if (id == null) return null;
    const itens = expandido[id];
    if (itens === 'loading') {
      return (
        <div className="compra-sub">
          <div style={{ padding: 8, fontSize: 10, color: '#9ca09d' }}>Carregando...</div>
        </div>
      );
    }
    if (!Array.isArray(itens)) return null;
    if (itens.length === 0) {
      return (
        <div className="compra-sub">
          <div style={{ padding: 8, fontSize: 10, color: '#9ca09d' }}>Nenhum item</div>
        </div>
      );
    }
    return (
      <div className="compra-sub">
        <div className="compra-sub-row compra-hdr">
          <span className="col-produto">Produto</span>
          <span className="col-qtd">Qtd</span>
          <span className="col-unit">Valor Un.</span>
          <span className="col-total">Valor Total</span>
        </div>
        <div className="compra-sub-sep" />
        {itens.map((item, i) => (
          <div key={i}>
            <div className="compra-sub-row compra-item">
              <span className="col-produto">
                {produtos.find((p) => (p.id) === item.produto_fabricado_id)?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}
              </span>
              <span className="col-qtd">{fmtQtd(item.quantidade)}</span>
              <span className="col-unit">{fmtValor(item.valor_unitario)}</span>
              <span className="col-total">{fmtValor(item.valor_total)}</span>
            </div>
            <div className="compra-sub-sep" />
          </div>
        ))}
        <div className="compra-sub-total">Total: {fmtMoeda(itens.reduce((acc, it) => acc + it.valor_total, 0))}</div>
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/movimento')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Encomendas
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie encomendas de produtos
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && encomendas.length === 0 && (
          <div className="list-empty">Nenhuma encomenda cadastrada</div>
        )}
        {!loading && !erro && encomendas.length > 0 && (
          <div className="list-scroll">
            {encomendas.map((e) => {
              const id = idEncomenda(e);
              const aberto = id != null && expandido[id] !== undefined;
              const nItens = qtdItens(e);
              const baixada = !!e.baixado;
              return (
                <div key={id ?? `${e.cliente_id}-${e.data_encomenda}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{e.cliente_nome || '—'}</div>
                    <div className="compra-det">
                      {fmtData(e.data_encomenda)} &nbsp;•&nbsp;{' '}
                      {baixada ? `Baixada${e.venda_id ? ` (venda #${e.venda_id})` : ''}` : 'Em aberto'} &nbsp;•&nbsp;{' '}
                      {nItens != null ? `${nItens} ${nItens === 1 ? 'item' : 'itens'}` : '—'}
                    </div>
                    <div className="compra-total">{fmtMoeda(e.valor_total)}</div>
                    <button
                      className="compra-btn"
                      style={{ top: 12, color: baixada ? '#9ca09d' : '#10b981', fontSize: 11 }}
                      disabled={baixada}
                      onClick={() => {
                        setBaixar({ id: id ?? 0, cliente: e.cliente_nome });
                        setBaixarData(new Date().toISOString().slice(0, 10));
                        setBaixarRecebido(true);
                      }}
                    >
                      {baixada ? 'Baixada' : 'Baixar'}
                    </button>
                    <button
                      className="compra-btn"
                      style={{ top: 36, color: '#6b706c', fontSize: 16 }}
                      onClick={() => abrirEditar(e)}
                    >
                      ✎
                    </button>
                    <button
                      className="compra-btn"
                      style={{ top: 56, color: '#dc2626', fontSize: 14 }}
                      onClick={() => setConfirmDelete(e)}
                    >
                      🗑
                    </button>
                    <button
                      className="compra-btn"
                      style={{ top: 76, color: '#9ca09d', fontSize: 12 }}
                      onClick={() => toggleExpandir(e)}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderSubComponent(e)}
                  </div>
                  <div className="row-sep" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (carregandoEdicao ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#9ca09d' }}>
              Carregando...
            </div>
          </div>
        </div>
      ) : (
        <EncomendaModal
          key={`encomenda-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Encomenda' : 'Nova Encomenda'}
          inicial={editing}
          clientes={clientes}
          produtos={produtos}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      ))}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Encomenda"
          nome={confirmDelete.cliente_nome ?? `a encomenda #${idEncomenda(confirmDelete)}`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}

      {baixar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Baixar Encomenda</div>
              <button className="modal-close" onClick={() => setBaixar(null)} disabled={baixando}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: '#6b706c', lineHeight: 1.5, margin: '0 4px 12px', padding: 8, background: '#f4f6f4', borderRadius: 6 }}>
                A mercadoria foi entregue? Ao baixar a encomenda será gerada uma venda de produto com os itens desta encomenda (baixa de estoque e contas a receber).
                {baixar.cliente ? ` Cliente: ${baixar.cliente}.` : ''}
              </div>
              <div className="modal-label" style={{ top: 6 }}>
                Data da Venda *
              </div>
              <input
                className="modal-input"
                style={{ top: 22 }}
                type="date"
                value={baixarData}
                onChange={(e) => setBaixarData(e.target.value)}
              />
              <div className="modal-check-row" style={{ top: 64 }}>
                <div className={`modal-checkbox ${baixarRecebido ? 'checked' : ''}`} onClick={() => setBaixarRecebido(!baixarRecebido)}>
                  {baixarRecebido && <div className="modal-check-fill" />}
                </div>
                <span className="modal-check-label">Venda já foi recebida?</span>
              </div>
              <div style={{ position: 'absolute', left: 0, top: 102, width: 350, display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="modal-btn cancel" onClick={() => setBaixar(null)} disabled={baixando}>
                  Cancelar
                </button>
                <button className="modal-btn save" onClick={confirmarBaixar} disabled={baixando || !baixarData}>
                  {baixando ? 'Gerando...' : 'Baixar e Gerar Venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}