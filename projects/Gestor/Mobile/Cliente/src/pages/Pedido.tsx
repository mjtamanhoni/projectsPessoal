import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  criarEncomendaPublica,
  extrairErro,
  listarProdutosFabricadosPublico,
  type AdicionalItemPedido,
  type AdicionalPublico,
  type Encomenda,
  type EncomendaItem,
  type IngredientePublico,
  type ProdutoFabricado,
} from '../api';
import { useSessao } from '../auth';
import BackButton from '../components/BackButton';
import CupomModal from '../components/CupomModal';
import FotoProduto from '../components/FotoProduto';
import { dataHojeISO, formatarMoeda, numeroParaDecimal } from '../format';

const QTD_CASAS = 2;

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseJsonList(raw: string | undefined): unknown[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function ingredientesDoProduto(p: ProdutoFabricado): IngredientePublico[] {
  return parseJsonList(p.ingredientes).map((x) => {
    const o = x as Record<string, unknown>;
    return {
      id: Number(o.id ?? 0) || undefined,
      insumo_id: Number(o.insumo_id ?? 0) || undefined,
      nome: String(o.nome ?? ''),
      quantidade: Number(o.quantidade ?? 0) || undefined,
    };
  });
}

function adicionaisDoProduto(p: ProdutoFabricado): AdicionalPublico[] {
  return parseJsonList(p.adicionais).map((x) => {
    const o = x as Record<string, unknown>;
    return {
      adicional_id: Number(o.adicional_id ?? 0),
      nome: String(o.nome ?? ''),
      descricao: o.descricao != null ? String(o.descricao) : undefined,
      preco: Number(o.preco ?? 0),
    };
  });
}

interface ExtraSelecionado {
  adicional_id: number;
  nome: string;
  preco: number;
  qtd: number;
}

function subtotalExtras(extras: ExtraSelecionado[]): number {
  return extras.reduce((acc, e) => acc + e.qtd * e.preco, 0);
}

function somaAdicionaisItem(item: EncomendaItem): number {
  return (item.adicionais ?? []).reduce((acc, a) => acc + a.quantidade * a.valor_unitario, 0);
}

export default function Pedido() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [itens, setItens] = useState<EncomendaItem[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [produtosCarregados, setProdutosCarregados] = useState(false);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [encomendaCriada, setEncomendaCriada] = useState<Encomenda | null>(null);

  const [personalizando, setPersonalizando] = useState<ProdutoFabricado | null>(null);
  const [removidosSel, setRemovidosSel] = useState<string[]>([]);
  const [extrasSel, setExtrasSel] = useState<ExtraSelecionado[]>([]);

  const totalEncomenda = itens.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0);
  const precoDe = (p: ProdutoFabricado) => Number(p.preco) || 0;

  useEffect(() => {
    if (!empresa || produtos.length > 0 || produtosCarregados) return;
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
  }, [empresa]);

  const qtdDe = useCallback(
    (id: number) => itens.find((i) => i.produto_fabricado_id === id)?.quantidade ?? 0,
    [itens],
  );

  const itemDe = useCallback(
    (id: number) => itens.find((i) => i.produto_fabricado_id === id),
    [itens],
  );

  const abrirPersonalizacao = (p: ProdutoFabricado) => {
    const id = p.id ?? 0;
    if (!id) return;
    const existente = itemDe(id);
    const base = precoDe(p);
    setPersonalizando(p);
    setRemovidosSel(existente?.removidos ?? []);
    setExtrasSel(
      (existente?.adicionais ?? []).map((a) => ({
        adicional_id: a.adicional_id ?? 0,
        nome: a.nome,
        preco: a.valor_unitario,
        qtd: a.quantidade,
      })),
    );
    if (existente) {
      setItens(itens.filter((i) => i.produto_fabricado_id !== id));
    }
    void base;
  };

  const tocarProduto = (p: ProdutoFabricado) => {
    const id = p.id ?? 0;
    if (!id) return;
    const qtd = qtdDe(id);
    if (qtd === 0) {
      const temOpcoes = ingredientesDoProduto(p).length > 0 || adicionaisDoProduto(p).length > 0;
      if (temOpcoes) {
        abrirPersonalizacao(p);
        return;
      }
      const vr = precoDe(p);
      setItens([
        ...itens,
        { produto_fabricado_id: id, produto_nome: p.nome, quantidade: 1, valor_unitario: vr, valor_total: vr },
      ]);
      return;
    }
    if (qtd === 1) {
      setItens(itens.filter((i) => i.produto_fabricado_id !== id));
    }
  };

  const confirmarPersonalizacao = () => {
    if (!personalizando) return;
    const id = personalizando.id ?? 0;
    if (!id) return;
    const vr = precoDe(personalizando);
    const extras: AdicionalItemPedido[] = extrasSel
      .filter((e) => e.qtd > 0)
      .map((e) => ({
        adicional_id: e.adicional_id,
        nome: e.nome,
        quantidade: e.qtd,
        valor_unitario: e.preco,
        valor_total: e.qtd * e.preco,
      }));
    const valorAdicionais = subtotalExtras(extrasSel);
    const quantidade = Math.max(1, qtdDe(id));
    const valorTotal = Math.round((quantidade * vr + valorAdicionais) * 100) / 100;
    setItens((prev) => {
      const sem = prev.filter((i) => i.produto_fabricado_id !== id);
      return [
        ...sem,
        {
          produto_fabricado_id: id,
          produto_nome: personalizando.nome,
          quantidade,
          valor_unitario: vr,
          valor_total: valorTotal,
          removidos: removidosSel,
          adicionais: extras,
        },
      ];
    });
    setPersonalizando(null);
  };

  const aumentarExtras = (adicionalId: number) => {
    setExtrasSel((prev) =>
      prev.map((e) => (e.adicional_id === adicionalId ? { ...e, qtd: e.qtd + 1 } : e)),
    );
  };

  const diminuirExtras = (adicionalId: number) => {
    setExtrasSel((prev) =>
      prev.map((e) => (e.adicional_id === adicionalId ? { ...e, qtd: Math.max(0, e.qtd - 1) } : e)),
    );
  };

  const aumentarProduto = (id: number) => {
    setItens((prev) =>
      prev.map((i) =>
        i.produto_fabricado_id === id
          ? {
              ...i,
              quantidade: i.quantidade + 1,
              valor_total: Math.round(((i.quantidade + 1) * i.valor_unitario + somaAdicionaisItem(i)) * 100) / 100,
            }
          : i,
      ),
    );
  };

  const diminuirProduto = (id: number) => {
    setItens((prev) =>
      prev.map((i) =>
        i.produto_fabricado_id === id
          ? {
              ...i,
              quantidade: Math.max(1, i.quantidade - 1),
              valor_total: Math.round((Math.max(1, i.quantidade - 1) * i.valor_unitario + somaAdicionaisItem(i)) * 100) / 100,
            }
          : i,
      ),
    );
  };

  if (!empresa || !cliente) return null;

  const sairVoltar = () => {
    sair();
    navigate('/', { replace: true });
  };

  const salvar = async () => {
    setErro('');
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item à encomenda');
      return;
    }
    const dataEncomenda = dataHojeISO();
    setSalvando(true);
    try {
      const criada = await criarEncomendaPublica(empresa.id, {
        cliente_id: cliente.id,
        data_encomenda: dataEncomenda,
        itens,
      });
      if (!criada?.id) {
        throw new Error('Resposta inválida do servidor');
      }
      const completa: Encomenda = {
        id: criada.id,
        codigo: criada.id,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        data_encomenda: dataEncomenda,
        valor_total: totalEncomenda,
        status: 0,
        baixado: false,
        itens,
      };
      setEncomendaCriada(completa);
      setItens([]);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const personalizado = (item: EncomendaItem) =>
    (item.removidos?.length ?? 0) > 0 || (item.adicionais?.length ?? 0) > 0;

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={sairVoltar} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Nova Encomenda
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Monte a sua encomenda de produtos
      </div>

      <div style={{ height: '100%', overflowY: 'auto', padding: '86px 16px 24px' }}>
        <div className="modal-label" style={{ position: 'static', margin: '0 4px 4px', fontWeight: 700 }}>
          Escolha seus produtos
        </div>
        <div style={{ fontSize: 11, color: '#6b706c', margin: '0 4px 8px' }}>
          Toque no produto para adicionar (quantidade 1). Use + / − para ajustar. Toque novamente com quantidade 1 para remover.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 0 8px' }}>
          {produtos.map((p) => {
            const id = p.id ?? 0;
            const qtd = qtdDe(id);
            const selecionado = qtd > 0;
            const temOpcoes = ingredientesDoProduto(p).length > 0 || adicionaisDoProduto(p).length > 0;
            return (
              <div
                key={id}
                onClick={() => tocarProduto(p)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  borderRadius: 10,
                  border: selecionado ? '2px solid #2d6a4f' : '1px solid #d6ddd0',
                  background: selecionado ? '#f0f7f1' : '#ffffff',
                  padding: 8,
                }}
              >
                {selecionado && (
                  <div style={{ position: 'absolute', top: 4, right: 4, background: '#2d6a4f', color: '#fff', borderRadius: 10, padding: '0 8px', fontSize: 11, fontWeight: 700 }}>
                    {qtd}
                  </div>
                )}
                <FotoProduto foto={p.foto} alt={p.nome} height={64} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1b1f1c', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.nome}
                </div>
                {p.descricao ? (
                  <div style={{ fontSize: 10, color: '#6b706c', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.descricao}
                  </div>
                ) : null}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2d5e3a', marginTop: 2 }}>
                  {fmtMoeda(precoDe(p))}
                </div>
                {temOpcoes && (
                  <div style={{ fontSize: 9, color: '#2d6a4f', fontWeight: 600, marginTop: 2 }}>
                    Personalizável
                  </div>
                )}
                {selecionado && (
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {qtd > 1 && (
                      <button
                        className="row-btn"
                        style={{ position: 'static', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9f0ea', color: '#2d5e3a', fontSize: 20, fontWeight: 700, lineHeight: 1 }}
                        onClick={() => diminuirProduto(id)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                    )}
                    <button
                      className="row-btn"
                      style={{ position: 'static', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2d5e3a', color: '#ffffff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}
                      onClick={() => aumentarProduto(id)}
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {produtosLoading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: 12 }}>
              Carregando produtos...
            </div>
          )}
          {produtos.length === 0 && !produtosLoading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: 12 }}>
              Nenhum produto disponível
            </div>
          )}
        </div>

        <div className="compra-sub-row compra-hdr" style={{ position: 'static', margin: '0 4px', padding: 0 }}>
          <span className="col-produto">Produto</span>
          <span className="col-qtd">Qtd</span>
          <span className="col-unit">Valor Un.</span>
          <span className="col-total">Total</span>
        </div>

        {itens.length === 0 ? (
          <div style={{ margin: '0 4px', textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: '10px 0' }}>
            Nenhum item adicionado
          </div>
        ) : (
          itens.map((item, idx) => (
            <div key={`${item.produto_fabricado_id}-${idx}`} style={{ display: 'flex', alignItems: 'center', margin: '0 4px' }}>
              <div className="compra-sub-row compra-item" style={{ position: 'static', padding: 0, flex: 1 }}>
                <span className="col-produto">
                  {item.produto_nome || `ID ${item.produto_fabricado_id}`}
                  {personalizado(item) && (
                    <span style={{ marginLeft: 4, display: 'inline-block', background: '#e8f0ea', color: '#2d6a4f', borderRadius: 8, padding: '0 6px', fontSize: 9, fontWeight: 700 }}>
                      Personalizado
                    </span>
                  )}
                </span>
                <span className="col-qtd">{numeroParaDecimal(item.quantidade, QTD_CASAS)}</span>
                <span className="col-unit">{numeroParaDecimal(item.valor_unitario, QTD_CASAS)}</span>
                <span className="col-total">{numeroParaDecimal(item.valor_total, QTD_CASAS)}</span>
              </div>
              {personalizado(item) && (
                <button
                  className="row-btn"
                  style={{ position: 'static', color: '#2d6a4f', fontSize: 13, height: 20, textAlign: 'center' }}
                  onClick={() => {
                    const prod = produtos.find((p) => (p.id ?? 0) === item.produto_fabricado_id);
                    if (prod) abrirPersonalizacao(prod);
                  }}
                  aria-label="Editar personalização"
                >
                  ✎
                </button>
              )}
              <button
                className="row-btn"
                style={{ position: 'static', color: '#dc2626', fontSize: 12, height: 20, textAlign: 'center' }}
                onClick={() => setItens(itens.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))
        )}

        <div style={{ margin: '8px 4px 4px', fontSize: 12, fontWeight: 700, color: '#1b1f1c' }}>
          Total: {formatarMoeda(totalEncomenda)}
        </div>

        {erro && (
          <div className="modal-erro" style={{ position: 'static', margin: '0 4px 8px', textAlign: 'center', width: 'auto' }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={sairVoltar} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Encomenda'}
          </button>
        </div>
      </div>

      {personalizando && (
        <PersonalizarModal
          produto={personalizando}
          ingredientes={ingredientesDoProduto(personalizando)}
          adicionais={adicionaisDoProduto(personalizando)}
          removidos={removidosSel}
          extras={extrasSel}
          onRemovidosChange={setRemovidosSel}
          onAumentarExtra={aumentarExtras}
          onDiminuirExtra={diminuirExtras}
          onConfirmar={confirmarPersonalizacao}
          onFechar={() => setPersonalizando(null)}
        />
      )}

      {encomendaCriada && (
        <CupomModal
          empresa={empresa}
          cliente={cliente}
          encomenda={encomendaCriada}
          onClose={() => {
            setEncomendaCriada(null);
            navigate('/minhas-encomendas');
          }}
        />
      )}
    </div>
  );
}

interface PersonalizarModalProps {
  produto: ProdutoFabricado;
  ingredientes: IngredientePublico[];
  adicionais: AdicionalPublico[];
  removidos: string[];
  extras: ExtraSelecionado[];
  onRemovidosChange: (v: string[]) => void;
  onAumentarExtra: (adicionalId: number) => void;
  onDiminuirExtra: (adicionalId: number) => void;
  onConfirmar: () => void;
  onFechar: () => void;
}

function PersonalizarModal({
  produto,
  ingredientes,
  adicionais,
  removidos,
  extras,
  onRemovidosChange,
  onAumentarExtra,
  onDiminuirExtra,
  onConfirmar,
  onFechar,
}: PersonalizarModalProps) {
  const precoBase = Number(produto.preco) || 0;
  const valorExtras = subtotalExtras(extras);
  const valorFinal = Math.round((precoBase + valorExtras) * 100) / 100;
  const temRemovidos = ingredientes.length > 0;
  const temAdicionais = adicionais.length > 0;

  const toggleRemovido = (nome: string) => {
    onRemovidosChange(
      removidos.includes(nome) ? removidos.filter((r) => r !== nome) : [...removidos, nome],
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 60,
        justifyContent: 'center',
      }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: 480,
          maxHeight: '88%',
          overflowY: 'auto',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: '18px 18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1b1f1c', flex: 1 }}>
            Personalizar {produto.nome}
          </div>
          <button
            className="row-btn"
            style={{ position: 'static', color: '#9ca09d', fontSize: 14, height: 22 }}
            onClick={onFechar}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#6b706c', marginBottom: 12 }}>
          Remova ingredientes da receita ou acrescente adicionais ao produto.
        </div>

        {temRemovidos && (
          <div className="modal-label" style={{ position: 'static', margin: '0 0 4px', fontWeight: 700, fontSize: 12 }}>
            Ingredientes da Receita
          </div>
        )}
        {temRemovidos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {ingredientes.map((ing) => {
              const removido = removidos.includes(ing.nome);
              return (
                <label
                  key={`${ing.id ?? ing.insumo_id ?? ''}-${ing.nome}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid #d6ddd0',
                    background: removido ? '#fdf0ef' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={removido}
                    onChange={() => toggleRemovido(ing.nome)}
                    style={{ width: 16, height: 16, accentColor: '#b84a4a' }}
                  />
                  <span style={{ fontSize: 12, color: '#1b1f1c', textDecoration: removido ? 'line-through' : 'none', flex: 1 }}>
                    {ing.nome}
                  </span>
                  {removido && (
                    <span style={{ fontSize: 9, color: '#b84a4a', fontWeight: 700, background: '#f8dedc', borderRadius: 8, padding: '1px 6px' }}>
                      Remover
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {temAdicionais && (
          <div className="modal-label" style={{ position: 'static', margin: '0 0 4px', fontWeight: 700, fontSize: 12 }}>
            Adicionais
          </div>
        )}
        {temAdicionais && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {adicionais.map((ad) => {
              const extra = extras.find((e) => e.adicional_id === ad.adicional_id);
              const qtd = extra?.qtd ?? 0;
              return (
                <div
                  key={ad.adicional_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid #d6ddd0',
                    background: qtd > 0 ? '#f0f7f1' : '#ffffff',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1b1f1c' }}>{ad.nome}</div>
                    {ad.descricao ? (
                      <div style={{ fontSize: 10, color: '#6b706c' }}>{ad.descricao}</div>
                    ) : null}
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2d5e3a' }}>{fmtMoeda(ad.preco)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {qtd > 0 && (
                      <button
                        className="row-btn"
                        style={{ position: 'static', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9f0ea', color: '#2d5e3a', fontSize: 16, fontWeight: 700, lineHeight: 1 }}
                        onClick={() => onDiminuirExtra(ad.adicional_id)}
                        aria-label={`Diminuir ${ad.nome}`}
                      >
                        −
                      </button>
                    )}
                    {qtd > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1b1f1c', minWidth: 16, textAlign: 'center' }}>
                        {qtd}
                      </span>
                    )}
                    <button
                      className="row-btn"
                      style={{ position: 'static', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2d5e3a', color: '#ffffff', fontSize: 16, fontWeight: 700, lineHeight: 1 }}
                      onClick={() => onAumentarExtra(ad.adicional_id)}
                      aria-label={`Aumentar ${ad.nome}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 2px 12px' }}>
          <span style={{ fontSize: 12, color: '#6b706c' }}>
            {precoBase > 0 ? `Base: ${fmtMoeda(precoBase)}` : ''}
            {valorExtras > 0 ? ` + Adicionais: ${fmtMoeda(valorExtras)}` : ''}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#2d5e3a' }}>Total: {fmtMoeda(valorFinal)}</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="modal-btn cancel"
            style={{ position: 'static', top: 0, flex: 1 }}
            onClick={onFechar}
          >
            Cancelar
          </button>
          <button
            className="modal-btn save"
            style={{ position: 'static', top: 0, flex: 1 }}
            onClick={onConfirmar}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}