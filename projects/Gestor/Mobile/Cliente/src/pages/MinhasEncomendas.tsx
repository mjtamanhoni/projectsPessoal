import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  atualizarItensEncomendaPublica,
  cancelarEncomendaPublica,
  extrairErro,
  listarEncomendasPublicas,
  listarProdutosFabricadosPublico,
  type Encomenda,
  type EncomendaItem,
  type ProdutoFabricado,
} from '../api';
import { useSessao } from '../auth';
import BackButton from '../components/BackButton';
import CupomModal from '../components/CupomModal';
import PlusButton from '../components/PlusButton';
import RowMenu from '../components/RowMenu';
import SeletorProdutoPopup from '../components/SeletorProdutoPopup';
import SeletorRegistro from '../components/SeletorRegistro';
import { formatarDataBR, formatarMoeda, numeroParaDecimal } from '../format';

const ETAPAS: Record<number, { label: string; cor: string; fundo: string }> = {
  0: { label: 'Aguardando', cor: '#92400e', fundo: '#fef3c7' },
  1: { label: 'Em produção', cor: '#1e40af', fundo: '#dbeafe' },
  2: { label: 'Finalizado', cor: '#166534', fundo: '#dcfce7' },
  3: { label: 'Entregue', cor: '#065f46', fundo: '#d1fae5' },
  4: { label: 'Cancelada', cor: '#991b1b', fundo: '#fee2e2' },
};

const CHIPS_FILTRO: { valor: number; label: string }[] = [
  { valor: 0, label: 'Aguardando' },
  { valor: 1, label: 'Em produção' },
  { valor: 2, label: 'Finalizado' },
  { valor: 3, label: 'Entregue' },
  { valor: 4, label: 'Cancelada' },
];

function estiloBadge(status: number): CSSProperties {
  const info = ETAPAS[status] ?? ETAPAS[0];
  return {
    display: 'inline-block',
    padding: '1px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    color: info.cor,
    background: info.fundo,
  };
}

const QTD_CASAS = 2;

export default function MinhasEncomendas() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [expandida, setExpandida] = useState<number | null>(null);
  const [cupomDe, setCupomDe] = useState<Encomenda | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<number[]>([0, 1]);
  const [cancelarDe, setCancelarDe] = useState<Encomenda | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [editandoDe, setEditandoDe] = useState<Encomenda | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [produtosCarregados, setProdutosCarregados] = useState(false);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [excluirDe, setExcluirDe] = useState<Encomenda | null>(null);

  const documento = (cliente?.cnpj_cpf || '').replace(/\D/g, '');

  useEffect(() => {
    if (!seletorAberto || !empresa || produtos.length > 0 || produtosCarregados) return;
    let cancelado = false;
    setProdutosLoading(true);
    listarProdutosFabricadosPublico(empresa.id)
      .then((lista) => {
        if (cancelado) return;
        setProdutos(lista.filter((p) => Number(p.preco) > 0));
        setProdutosCarregados(true);
      })
      .catch((e) => {
        if (!cancelado) setErro(extrairErro(e));
      })
      .finally(() => {
        if (!cancelado) setProdutosLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seletorAberto, empresa]);

  const carregar = async () => {
    if (!empresa || !documento) return;
    setCarregando(true);
    setErro('');
    try {
      setEncomendas(await listarEncomendasPublicas(empresa.id, documento));
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(
    () =>
      encomendas.filter(
        (e) => filtroStatus.length === 0 || filtroStatus.includes(Number(e.status ?? 0)),
      ),
    [encomendas, filtroStatus],
  );

  const podeCancelar = (e: Encomenda) => Number(e.status ?? 0) < 2;
  const podeEditarItens = (e: Encomenda) => Number(e.status ?? 0) === 0;
  const precoDe = (p: ProdutoFabricado) => Number(p.preco) || 0;

  const salvarItens = async (e: Encomenda, novos: EncomendaItem[]) => {
    if (!empresa) return;
    if (novos.length === 0) {
      setErro('A encomenda precisa ter pelo menos um item');
      return;
    }
    setErro('');
    try {
      await atualizarItensEncomendaPublica(empresa.id, {
        id: e.id ?? 0,
        cliente_id: cliente?.id,
        documento,
        itens: novos,
      });
      setSeletorAberto(false);
      await carregar();
    } catch (err) {
      setErro(extrairErro(err));
    }
  };

  const abrirSeletorItens = (e: Encomenda) => {
    setEditandoDe(e);
    setSeletorAberto(true);
  };

  const confirmarExclusao = (item: EncomendaItem) => {
    if (!excluirDe) return;
    const e = excluirDe;
    setExcluirDe(null);
    const novos = (e.itens ?? []).filter((i) => i.id !== item.id);
    salvarItens(e, novos);
  };

  const renderItens = (e: Encomenda) => {
    const itens = e.itens ?? [];
    return (
      <div className="compra-sub">
        <div className="compra-sub-row compra-hdr" style={{ padding: '4px 4px 0' }}>
          <span className="col-produto" style={{ flex: 1 }}>Produto</span>
          <span className="col-qtd">Qtd</span>
          <span className="col-unit">Valor Un.</span>
          <span className="col-total" style={{ width: 64 }}>Valor Total</span>
        </div>
        <div className="compra-sub-sep" />
        {itens.length === 0 ? (
          <div style={{ padding: 8, fontSize: 10, color: '#9ca09d' }}>Nenhum item</div>
        ) : (
          itens.map((item, i) => (
            <div key={i}>
              <div className="compra-sub-row compra-item" style={{ padding: '4px 4px 0' }}>
                <span className="col-produto" style={{ flex: 1 }}>
                  {item.produto_nome || `ID ${item.produto_fabricado_id}`}
                </span>
                <span className="col-qtd">{numeroParaDecimal(item.quantidade, QTD_CASAS)}</span>
                <span className="col-unit">{numeroParaDecimal(item.valor_unitario, QTD_CASAS)}</span>
                <span className="col-total" style={{ width: 64 }}>
                  {numeroParaDecimal(item.valor_total, QTD_CASAS)}
                </span>
              </div>
              <div className="compra-sub-sep" />
            </div>
          ))
        )}
        {e.observacao && (
          <div style={{ padding: '4px 8px 0', fontSize: 10, color: '#6b706c' }}>Obs.: {e.observacao}</div>
        )}
        <div className="compra-sub-total">Total: {formatarMoeda(Number(e.valor_total) || 0)}</div>
      </div>
    );
  };

  const confirmarCancelamento = async () => {
    if (!cancelarDe || !empresa) return;
    setCancelando(true);
    setErro('');
    try {
      await cancelarEncomendaPublica(empresa.id, {
        id: cancelarDe.id ?? 0,
        cliente_id: cliente?.id,
        documento,
      });
      setCancelarDe(null);
      await carregar();
    } catch (e) {
      setCancelarDe(null);
      setErro(extrairErro(e));
    } finally {
      setCancelando(false);
    }
  };

  if (!empresa || !cliente) return null;

  const sairVoltar = () => {
    sair();
    navigate('/', { replace: true });
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={sairVoltar} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Encomendas
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Acompanhe o status das suas encomendas
      </div>
      <PlusButton onClick={() => navigate('/pedido')} />

      <div className="list-card" style={{ top: 88, bottom: 12 }}>
        <div className="filtros-bar">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
            {CHIPS_FILTRO.map((chip) => {
              const ativo = filtroStatus.includes(chip.valor);
              return (
                <button
                  key={chip.valor}
                  onClick={() =>
                    setFiltroStatus((prev) =>
                      ativo ? prev.filter((v) => v !== chip.valor) : [...prev, chip.valor],
                    )
                  }
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    border: ativo ? '1px solid #2d5e3a' : '1px solid #d6ddd0',
                    background: ativo ? '#2d5e3a' : '#ffffff',
                    color: ativo ? '#ffffff' : '#6b706c',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {carregando && <div className="list-empty">Carregando...</div>}
        {!carregando && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!carregando && !erro && filtradas.length === 0 && (
          <div className="list-empty">Nenhuma encomenda para os filtros selecionados</div>
        )}

        {!carregando && !erro && filtradas.length > 0 && (
          <div className="list-scroll">
            {filtradas.map((e) => {
              const status = Number(e.status ?? 0);
              const etapa = ETAPAS[status] ?? ETAPAS[0];
              const aberto = expandida === e.id;
              const podeEditar = podeEditarItens(e);
              const nItens = (e.itens ?? []).length;
              return (
                <div key={e.id ?? 0}>
                  <div className="compra-row">
                    <div className="compra-cod">#{e.codigo ?? e.id}</div>
                    <div className="compra-nome">{cliente.nome}</div>
                    <div className="compra-det">
                      {formatarDataBR(e.data_encomenda)} &nbsp;•&nbsp;
                      <span style={estiloBadge(status)}>{etapa.label}</span>
                      {' • '}
                      {nItens} {nItens === 1 ? 'item' : 'itens'}
                    </div>
                    <div
                      className="compra-total"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#6b706c' }}>
                        {e.data_entrega ? `Entrega: ${formatarDataBR(e.data_entrega)}` : ''}
                      </span>
                      <span>{formatarMoeda(Number(e.valor_total) || 0)}</span>
                    </div>
                    <RowMenu
                      className="compra-btn"
                      style={{ top: 10, height: 36 }}
                      fontSize={21}
                      opcoes={[
                        ...(podeEditar
                          ? [
                              { rotulo: 'Incluir Item', cor: '#10b981', onPress: () => abrirSeletorItens(e) },
                              { rotulo: 'Excluir Item', cor: '#dc2626', onPress: () => setExcluirDe(e) },
                            ]
                          : []),
                        ...(status >= 2
                          ? [{ rotulo: 'Ver Cupom', cor: '#10b981', onPress: () => setCupomDe(e) }]
                          : []),
                        ...(podeCancelar(e)
                          ? [{ rotulo: 'Cancelar Encomenda', cor: '#dc2626', onPress: () => setCancelarDe(e) }]
                          : []),
                      ]}
                    />
                    <button
                      className="compra-btn"
                      style={{ top: 50, height: 36, color: '#9ca09d', fontSize: 16 }}
                      onClick={() => setExpandida(aberto ? null : (e.id ?? null))}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderItens(e)}
                  </div>
                  <div className="row-sep" />
                </div>
              );
            })}
            <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
              <div className="link-button" onClick={carregar}>
                Atualizar
              </div>
            </div>
          </div>
        )}
      </div>

      {cancelarDe && (
        <div className="modal-overlay" style={{ zIndex: 55 }}>
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Cancelar Encomenda</div>
              <button className="modal-close" onClick={() => setCancelarDe(null)} disabled={cancelando}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: '#6b706c', lineHeight: 1.5, margin: '0 4px 16px', padding: 8, background: '#f4f6f4', borderRadius: 6 }}>
                Deseja cancelar a encomenda #{cancelarDe.codigo ?? cancelarDe.id}? Esta ação não pode ser desfeita.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  className="modal-btn cancel"
                  style={{ position: 'static', top: 0 }}
                  onClick={() => setCancelarDe(null)}
                  disabled={cancelando}
                >
                  Voltar
                </button>
                <button
                  className="modal-btn save"
                  style={{ position: 'static', top: 0 }}
                  onClick={confirmarCancelamento}
                  disabled={cancelando}
                >
                  {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cupomDe && (
        <CupomModal
          empresa={empresa}
          cliente={cliente}
          encomenda={cupomDe}
          onClose={() => setCupomDe(null)}
        />
      )}

      {seletorAberto && editandoDe && (
        <SeletorProdutoPopup
          titulo="Itens da Encomenda"
          produtos={produtosLoading ? [] : produtos}
          selecionados={editandoDe.itens ?? []}
          precoDe={precoDe}
          carregando={produtosLoading}
          onConfirmar={(novos) =>
            salvarItens(
              editandoDe,
              novos.map((i) => ({ ...i, valor_total: i.quantidade * i.valor_unitario })),
            )
          }
          fechar={() => setSeletorAberto(false)}
        />
      )}

      {excluirDe && (
        <SeletorRegistro<EncomendaItem>
          titulo="Excluir Item"
          placeholder="Buscar item..."
          registros={excluirDe.itens ?? []}
          rotulo={(i) => i.produto_nome || `Produto #${i.produto_fabricado_id}`}
          subtitulo={(i) =>
            `${numeroParaDecimal(i.quantidade, QTD_CASAS)} × ${formatarMoeda(Number(i.valor_unitario) || 0)}`
          }
          aoSelecionar={confirmarExclusao}
          fechar={() => setExcluirDe(null)}
        />
      )}
    </div>
  );
}
