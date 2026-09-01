import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  atualizarFormaPagamentoEncomendaPublica,
  criarEncomendaPublica,
  extrairErro,
  listarProdutosFabricadosPublico,
  listarProdutosVendaPublico,
  salvarEnderecoEntregaPublico,
  type AdicionalItemPedido,
  type Encomenda,
  type EncomendaItem,
  type EnderecoEntrega,
  type FormaPagamentoPublica,
  type ProdutoFabricado,
  type ProdutoVendaPublico,
} from '../api';
import { useSessao } from '../auth';
import BackButton from '../components/BackButton';
import CupomModal from '../components/CupomModal';
import EnderecoEntregaModal from '../components/EnderecoEntregaModal';
import FormaPagamentoModal from '../components/FormaPagamentoModal';
import FotoProduto from '../components/FotoProduto';
import PersonalizarModal from '../components/PersonalizarModal';
import {
  montarCatalogo,
  chaveDeItem,
  somaAdicionaisItem,
  descricaoPersonalizacao,
  type CatalogoItem,
} from '../components/catalogo';
import { dataHojeISO, formatarMoeda, numeroParaDecimal } from '../format';

const QTD_CASAS = 2;

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Pedido() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [itens, setItens] = useState<EncomendaItem[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [produtosVenda, setProdutosVenda] = useState<ProdutoVendaPublico[]>([]);
  const [produtosCarregados, setProdutosCarregados] = useState(false);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [encomendaCriada, setEncomendaCriada] = useState<Encomenda | null>(null);

  const [customizandoIdx, setCustomizandoIdx] = useState<number | null>(null);
  const [mostrarFormaPagamento, setMostrarFormaPagamento] = useState(false);
  const [encomendaParaPagamento, setEncomendaParaPagamento] = useState<Encomenda | null>(null);
  const [mostrarEnderecoEntrega, setMostrarEnderecoEntrega] = useState(false);
  const [encomendaParaEndereco, setEncomendaParaEndereco] = useState<Encomenda | null>(null);

  const totalEncomenda = itens.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0);

  const catalogo = useMemo<CatalogoItem[]>(
    () => montarCatalogo(produtos, produtosVenda),
    [produtos, produtosVenda],
  );

  useEffect(() => {
    if (!empresa || produtosCarregados) return;
    let cancelado = false;
    setProdutosLoading(true);
    Promise.all([listarProdutosFabricadosPublico(empresa.id), listarProdutosVendaPublico(empresa.id)])
      .then(([fabs, vds]) => {
        if (cancelado) return;
        setProdutos(fabs.filter((p) => Number(p.preco) > 0));
        setProdutosVenda(vds.filter((p) => Number(p.preco) > 0));
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
    (chave: string) =>
      itens.filter((i) => chaveDeItem(i) === chave).reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0),
    [itens],
  );

  const novaLinha = (cat: CatalogoItem, quantidade = 1): EncomendaItem =>
    cat.tipo === 'venda'
      ? { produto_venda_id: cat.id, produto_nome: cat.nome, quantidade, valor_unitario: cat.preco, valor_total: Math.round(quantidade * cat.preco * 100) / 100 }
      : { produto_fabricado_id: cat.id, produto_nome: cat.nome, quantidade, valor_unitario: cat.preco, valor_total: Math.round(quantidade * cat.preco * 100) / 100 };

  const tocarProduto = (cat: CatalogoItem) => {
    if (!cat.id) return;
    const qtd = qtdDe(cat.chave);
    if (qtd === 0) {
      setItens([...itens, novaLinha(cat)]);
      return;
    }
    setItens(itens.filter((i) => chaveDeItem(i) !== cat.chave));
  };

  const confirmarPersonalizacao = (removidos: string[], adicionais: AdicionalItemPedido[]) => {
    if (customizandoIdx === null) return;
    const alvo = itens[customizandoIdx];
    if (!alvo) {
      setCustomizandoIdx(null);
      return;
    }
    const valorAdicionais = adicionais.reduce((acc, a) => acc + a.quantidade * a.valor_unitario, 0);
    const valorTotal = Math.round((alvo.quantidade * alvo.valor_unitario + valorAdicionais) * 100) / 100;
    setItens((prev) =>
      prev.map((it, i) =>
        i === customizandoIdx
          ? {
              ...it,
              removidos: removidos.length > 0 ? removidos : undefined,
              adicionais: adicionais.length > 0 ? adicionais : undefined,
              valor_total: valorTotal,
            }
          : it,
      ),
    );
    setCustomizandoIdx(null);
  };

  const aumentarProduto = (cat: CatalogoItem) => {
    if (cat.tipo === 'venda') {
      setItens([...itens, novaLinha(cat)]);
      return;
    }
    setItens((prev) =>
      prev.map((i) =>
        chaveDeItem(i) === cat.chave
          ? {
              ...i,
              quantidade: i.quantidade + 1,
              valor_total: Math.round(((i.quantidade + 1) * i.valor_unitario + somaAdicionaisItem(i)) * 100) / 100,
            }
          : i,
      ),
    );
  };

  const diminuirProduto = (cat: CatalogoItem) => {
    if (cat.tipo === 'venda') {
      const alvos = itens.filter((i) => chaveDeItem(i) === cat.chave);
      const ultima = alvos[alvos.length - 1];
      if (ultima) {
        setItens(itens.filter((i) => i !== ultima));
      }
      return;
    }
    setItens((prev) =>
      prev.map((i) =>
        chaveDeItem(i) === cat.chave
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
      setEncomendaParaEndereco(completa);
      setMostrarEnderecoEntrega(true);
      setItens([]);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarFormaPagamento = async (forma: FormaPagamentoPublica, trocoPara?: number) => {
    if (!encomendaParaPagamento || !empresa) return;
    const documento = (cliente?.cnpj_cpf || '').replace(/\D/g, '');
    try {
      await atualizarFormaPagamentoEncomendaPublica(empresa.id, {
        id: encomendaParaPagamento.id ?? 0,
        cliente_id: cliente?.id,
        documento,
        forma_pagamento_id: forma.id,
        forma_pagamento_nome: forma.descricao,
        troco_para: trocoPara,
      });
    } catch {
      /* forma de pagamento salva localmente mesmo se o server falhar */
    }
    const atualizada: Encomenda = {
      ...encomendaParaPagamento,
      forma_pagamento_id: forma.id,
      forma_pagamento_nome: forma.descricao,
      forma_pagamento_classificacao: forma.classificacao,
      troco_para: trocoPara,
    };
    setEncomendaCriada(atualizada);
    setMostrarFormaPagamento(false);
    setEncomendaParaPagamento(null);
  };

  const fecharFormaPagamento = () => {
    setMostrarFormaPagamento(false);
    const atualizada: Encomenda = {
      ...encomendaParaPagamento!,
      forma_pagamento_nome: 'Não informada',
    };
    setEncomendaCriada(atualizada);
    setEncomendaParaPagamento(null);
  };

  const confirmarEnderecoEntrega = async (endereco: EnderecoEntrega) => {
    if (!encomendaParaEndereco || !empresa) return;
    const documento = (cliente?.cnpj_cpf || '').replace(/\D/g, '');
    try {
      await salvarEnderecoEntregaPublico(empresa.id, {
        id: encomendaParaEndereco.id ?? 0,
        cliente_id: cliente?.id,
        documento,
        cep: endereco.cep,
        endereco: endereco.endereco,
        nr: endereco.nr,
        complemento: endereco.complemento,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        uf: endereco.uf,
        retira_estabelecimento: endereco.retira_estabelecimento,
        latitude: endereco.latitude,
        longitude: endereco.longitude,
        place_id: endereco.place_id,
      });
    } catch {
      /* endereco salvo localmente mesmo se o server falhar */
    }
    const comEndereco: Encomenda = {
      ...encomendaParaEndereco,
      endereco_entrega: endereco,
    };
    setEncomendaParaPagamento(comEndereco);
    setMostrarEnderecoEntrega(false);
    setEncomendaParaEndereco(null);
    setMostrarFormaPagamento(true);
  };

  const fecharEnderecoEntrega = () => {
    setMostrarEnderecoEntrega(false);
    setEncomendaParaPagamento(encomendaParaEndereco);
    setEncomendaParaEndereco(null);
    setMostrarFormaPagamento(true);
  };

  const itemCustomizando = customizandoIdx !== null ? itens[customizandoIdx] : undefined;
  const catCustomizando = itemCustomizando
    ? catalogo.find((c) => c.chave === chaveDeItem(itemCustomizando))
    : undefined;

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
          Toque no produto para adicionar e use + / − para ajustar a quantidade (produtos de venda somam 1 unidade por vez). Depois personalize cada item da lista pelo ✎.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 0 8px' }}>
          {catalogo.map((cat) => {
            const qtd = qtdDe(cat.chave);
            const selecionado = qtd > 0;
            const temOpcoes = cat.removiveis.length > 0 || cat.extras.length > 0;
            return (
              <div
                key={cat.chave}
                onClick={() => tocarProduto(cat)}
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
                <FotoProduto foto={cat.foto} alt={cat.nome} height={64} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1b1f1c', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {cat.nome}
                </div>
                {cat.descricao ? (
                  <div style={{ fontSize: 10, color: '#6b706c', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {cat.descricao}
                  </div>
                ) : null}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2d5e3a', marginTop: 2 }}>
                  {fmtMoeda(cat.preco)}
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
                        style={{ position: 'static', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9f0ea', color: '#2d5e3a', fontSize: 20, fontWeight: 700, lineHeight: 1 }}
                        onClick={() => diminuirProduto(cat)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                    )}
                    <button
                      className="row-btn"
                      style={{ position: 'static', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2d5e3a', color: '#ffffff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}
                      onClick={() => aumentarProduto(cat)}
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
          <span className="col-unit">Un.</span>
          <span className="col-total">Total</span>
          <span style={{ width: 96, flexShrink: 0 }} />
        </div>

        {itens.length === 0 ? (
          <div style={{ margin: '0 4px', textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: '10px 0' }}>
            Nenhum item adicionado
          </div>
        ) : (
          itens.map((item, idx) => (
            <div
              key={`${chaveDeItem(item)}-${idx}`}
              style={{ margin: '0 4px 10px', padding: '6px 0', borderBottom: '1px solid #e4eae3' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div className="compra-sub-row compra-item" style={{ position: 'static', padding: 0, flex: 1, minWidth: 0 }}>
                  <span className="col-produto">
                    {item.produto_nome || `ID ${item.produto_venda_id ?? item.produto_fabricado_id ?? '?'}`}
                  </span>
                  <span className="col-qtd">{numeroParaDecimal(item.quantidade, QTD_CASAS)}</span>
                  <span className="col-unit">{numeroParaDecimal(item.valor_unitario, QTD_CASAS)}</span>
                  <span className="col-total">{numeroParaDecimal(item.valor_total, QTD_CASAS)}</span>
                </div>
                <button
                  className="row-btn"
                  style={{ position: 'static', width: 44, height: 44, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eaf3ee', border: '1.5px solid #2d6a4f', color: '#2d6a4f', fontSize: 20, textAlign: 'center' }}
                  onClick={() => setCustomizandoIdx(idx)}
                  aria-label="Personalizar item"
                >
                  ✎
                </button>
                <button
                  className="row-btn"
                  style={{ position: 'static', width: 44, height: 44, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdeeee', border: '1.5px solid #dc2626', color: '#dc2626', fontSize: 18, textAlign: 'center' }}
                  onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                  aria-label="Remover item"
                >
                  ✕
                </button>
              </div>
              {descricaoPersonalizacao(item) && (
                <div style={{ padding: '3px 4px 0', fontSize: 10, color: '#6b706c', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                  {descricaoPersonalizacao(item)}
                </div>
              )}
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

      {itemCustomizando && (
        <PersonalizarModal
          titulo={`Personalizar ${itemCustomizando.produto_nome || 'Produto'}`}
          removiveis={catCustomizando?.removiveis ?? []}
          adicionais={catCustomizando?.extras ?? []}
          iniciaisRemovidos={itemCustomizando.removidos ?? []}
          iniciaisAdicionais={itemCustomizando.adicionais ?? []}
          onConfirmar={confirmarPersonalizacao}
          onFechar={() => setCustomizandoIdx(null)}
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

      {mostrarFormaPagamento && encomendaParaPagamento && (
        <FormaPagamentoModal
          empresa={empresa}
          encomenda={encomendaParaPagamento}
          onConfirmar={confirmarFormaPagamento}
          onFechar={fecharFormaPagamento}
        />
      )}

      {mostrarEnderecoEntrega && encomendaParaEndereco && cliente && (
        <EnderecoEntregaModal
          cliente={cliente}
          enderecoAtual={encomendaParaEndereco.endereco_entrega}
          onConfirmar={confirmarEnderecoEntrega}
          onFechar={fecharEnderecoEntrega}
        />
      )}
    </div>
  );
}
