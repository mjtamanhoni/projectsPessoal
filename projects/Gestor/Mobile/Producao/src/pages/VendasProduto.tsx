import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirVendaProduto,
  extrairErro,
  listarClientes,
  listarProdutosFabricados,
  listarVendaProdutoItens,
  listarVendasProduto,
  salvarVendaProduto,
  type VendaProduto,
  type VendaProdutoItem,
  type Cliente,
  type ProdutoFabricado,
} from '../api';
import VendaProdutoModal from '../components/VendaProdutoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';
import { gerarPDFCupom } from '../lib/cupom-pdf';
import { compartilharPDF } from '../lib/share';
import { useAuth } from '../auth';

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

type ExpandState = Record<number, VendaProdutoItem[] | 'loading'>;

export default function VendasProduto() {
  const navigate = useNavigate();
  const { empresaNome, empresa } = useAuth();
  const [vendas, setVendas] = useState<VendaProduto[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendaProduto | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<VendaProduto | null>(null);
  const [expandido, setExpandido] = useState<ExpandState>({});
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [cupomVenda, setCupomVenda] = useState<VendaProduto | null>(null);
  const [cupomBusy, setCupomBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [v, p, c] = await Promise.all([
        listarVendasProduto(),
        listarProdutosFabricados(),
        listarClientes(),
      ]);
      setVendas(v);
      setProdutos(p);
      setClientes(c);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const idVenda = (v: VendaProduto): number | undefined => v.id ?? v.codigo;

  const toggleExpandir = async (v: VendaProduto) => {
    const id = idVenda(v);
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
      const itens = await listarVendaProdutoItens(id);
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

  const abrirEditar = async (v: VendaProduto) => {
    const id = idVenda(v);
    setCarregandoEdicao(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    if (id == null) {
      setEditing(v);
      setCarregandoEdicao(false);
      return;
    }
    try {
      const itens = await listarVendaProdutoItens(id);
      setEditing({ ...v, itens });
    } catch {
      setEditing(v);
    } finally {
      setCarregandoEdicao(false);
    }
  };

  const aoSalvar = async (data: VendaProduto) => {
    const isNova = !editing;
    const resp = await salvarVendaProduto({ ...data, id: editing?.id ?? editing?.codigo });
    const novoId = resp?.id ?? resp?.codigo ?? data.id ?? data.codigo;
    setModalOpen(false);
    setEditing(null);
    setExpandido({});
    await carregar();
    if (isNova && novoId != null) {
      setCupomVenda({ ...data, id: novoId, codigo: novoId });
    }
  };

  const gerarCupom = async () => {
    if (!cupomVenda) return;
    setCupomBusy(true);
    setErro('');
    try {
      const cliente = clientes.find((c) => c.id === cupomVenda.cliente_id) ?? null;
      const numero = cupomVenda.id ?? cupomVenda.codigo ?? 0;
      const doc = gerarPDFCupom({
        empresaNome: empresa?.fantasia || empresa?.razao_social || empresaNome || 'MARCOS JOSE TAMANHONI',
        empresaCnpj: empresa?.cnpj_cpf || '56.134.688/0001-57',
        empresaEndereco: empresa?.endereco || '',
        empresaTelefone: empresa?.celular || empresa?.telefone || '(27) 9 8833-7323',
        empresaEmail: empresa?.email || '',
        venda: cupomVenda,
        cliente,
        numeroCupom: numero,
        formaPagamento: cupomVenda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
        parcelas: [],
        desconto: 0,
      });
      await compartilharPDF(doc, `cupom-${String(numero).padStart(5, '0')}-${new Date().toISOString().split('T')[0]}.pdf`, 'Cupom Não Fiscal');
      setCupomVenda(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar/compartilhar o cupom');
    } finally {
      setCupomBusy(false);
    }
  };

  const aoExcluir = async () => {
    const id = confirmDelete ? idVenda(confirmDelete) : undefined;
    if (id == null) return;
    try {
      await excluirVendaProduto(id);
      setConfirmDelete(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const qtdItens = (v: VendaProduto): number | undefined => {
    if (v.qtd_itens != null) return v.qtd_itens;
    const id = idVenda(v);
    if (id != null) {
      const itens = expandido[id];
      if (Array.isArray(itens)) return itens.length;
    }
    return undefined;
  };

  const renderSubComponent = (v: VendaProduto) => {
    const id = idVenda(v);
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
        Vendas Produto
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie vendas de produtos
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && vendas.length === 0 && (
          <div className="list-empty">Nenhuma venda cadastrada</div>
        )}
        {!loading && !erro && vendas.length > 0 && (
          <div className="list-scroll">
            {vendas.map((v) => {
              const id = idVenda(v);
              const aberto = id != null && expandido[id] !== undefined;
              const nItens = qtdItens(v);
              return (
                <div key={id ?? `${v.cliente_id}-${v.data_venda}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{v.cliente_nome || '—'}</div>
                    <div className="compra-det">
                      {fmtData(v.data_venda)} &nbsp;•&nbsp; {v.recebido ? 'Sim' : 'Não'} &nbsp;•&nbsp;{' '}
                      {nItens != null ? `${nItens} ${nItens === 1 ? 'item' : 'itens'}` : '—'}
                    </div>
                    <div className="compra-total">{fmtMoeda(v.valor_total)}</div>
                    <button
                      className="compra-btn"
                      style={{ top: 12, color: '#6b706c', fontSize: 16 }}
                      onClick={() => abrirEditar(v)}
                    >
                      ✎
                    </button>
                    <button
                      className="compra-btn"
                      style={{ top: 36, color: '#dc2626', fontSize: 14 }}
                      onClick={() => setConfirmDelete(v)}
                    >
                      🗑
                    </button>
                    <button
                      className="compra-btn"
                      style={{ top: 56, color: '#9ca09d', fontSize: 12 }}
                      onClick={() => toggleExpandir(v)}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderSubComponent(v)}
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
        <VendaProdutoModal
          key={`venda-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Venda' : 'Nova Venda'}
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
          titulo="Excluir Venda"
          nome={confirmDelete.cliente_nome ?? `a venda #${idVenda(confirmDelete)}`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}

      {cupomVenda && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <div className="confirm-title">Cupom Não Fiscal</div>
            <div className="confirm-msg">
              Venda salva com sucesso! Deseja gerar o cupom não fiscal em PDF para enviar ao cliente{' '}
              {cupomVenda.cliente_nome ? `(${cupomVenda.cliente_nome})` : ''}?
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setCupomVenda(null)} disabled={cupomBusy}>
                Agora não
              </button>
              <button className="confirm-btn save" onClick={gerarCupom} disabled={cupomBusy}>
                {cupomBusy ? 'Gerando...' : 'Gerar e enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}