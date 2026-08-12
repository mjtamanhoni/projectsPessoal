import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  criarEncomendaPublica,
  extrairErro,
  listarProdutosFabricadosPublico,
  type Encomenda,
  type EncomendaItem,
  type ProdutoFabricado,
} from '../api';
import { useSessao } from '../auth';
import CupomModal from '../components/CupomModal';
import SeletorProdutoPopup, { type ProdutoSelecionado } from '../components/SeletorProdutoPopup';
import { dataHojeISO, formatarMoeda } from '../format';

export default function Pedido() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [itens, setItens] = useState<EncomendaItem[]>([]);
  const [observacao, setObservacao] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [produtosCarregados, setProdutosCarregados] = useState(false);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [encomendaCriada, setEncomendaCriada] = useState<Encomenda | null>(null);
  const [popupAberto, setPopupAberto] = useState(false);

  const total = useMemo(() => itens.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0), [itens]);
  const precoDe = (p: ProdutoFabricado) => Number(p.preco) || 0;

  useEffect(() => {
    if (!popupAberto || !empresa || produtos.length > 0 || produtosCarregados) return;
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
  }, [popupAberto, empresa]);

  if (!empresa || !cliente) return null;

  const confirmarItens = (novos: ProdutoSelecionado[]) => {
    setItens(
      novos.map((i) => ({
        ...i,
        valor_total: i.valor_total ?? i.quantidade * i.valor_unitario,
        produto_nome: i.produto_nome,
      })),
    );
    setPopupAberto(false);
  };

  const confirmarPedido = async () => {
    setErro('');
    if (itens.length === 0) {
      setErro('Adicione ao menos um produto');
      return;
    }
    setEnviando(true);
    try {
      const criada = await criarEncomendaPublica(empresa.id, {
        cliente_id: cliente.id,
        data_encomenda: dataHojeISO(),
        data_entrega: dataEntrega,
        observacao: observacao.trim(),
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
        data_encomenda: dataHojeISO(),
        data_entrega: dataEntrega,
        observacao: observacao.trim(),
        valor_total: itens.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0),
        status: 0,
        baixado: false,
        itens,
      };
      setEncomendaCriada(completa);
      setItens([]);
      setObservacao('');
      setDataEntrega('');
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const alterarQuantidade = (produtoId: number, delta: number) => {
    setItens((atual) =>
      atual
        .map((i) => {
          if (i.produto_fabricado_id !== produtoId) return i;
          const quantidade = Math.max(0, (Number(i.quantidade) || 0) + delta);
          return { ...i, quantidade, valor_total: (Number(i.valor_unitario) || 0) * quantidade };
        })
        .filter((i) => (Number(i.quantidade) || 0) > 0),
    );
  };

  return (
    <div className="screen">
      <div className="screen-topbar">
        <div className="dashboard-title" style={{ maxWidth: '60%' }}>
          <button className="menu-back" onClick={() => navigate('/minhas-encomendas')} style={{ marginRight: 6 }}>
            ‹
          </button>
          <span style={{ display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
            Fazer Pedido
          </span>
        </div>
        <button
          className="menu-back"
          onClick={() => {
            sair();
            navigate('/', { replace: true });
          }}
        >
          Sair
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1b1f1c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cliente.nome}
          </div>
          <div style={{ fontSize: 11, color: '#6b706c' }}>{empresa.fantasia || empresa.razao_social}</div>
        </div>
        <button
          className="confirm-btn save"
          style={{ marginLeft: 'auto', height: 32, padding: '0 12px', fontSize: 12 }}
          onClick={() => setPopupAberto(true)}
        >
          + Produtos
        </button>
      </div>

      <div style={{ padding: '14px 16px 4px' }}>
        {itens.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9ca09d', textAlign: 'center', padding: '28px 0', border: '1px dashed #d6ddd0', borderRadius: 10 }}>
            Toque em "+ Produtos" e escolha o que você quer
          </div>
        ) : (
          <div>
            {itens.map((i) => (
              <div
                key={i.produto_fabricado_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  marginBottom: 8,
                  background: '#f4f6f4',
                  borderRadius: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1b1f1c' }}>{i.produto_nome}</div>
                  <div style={{ fontSize: 11, color: '#6b706c' }}>
                    {formatarMoeda(Number(i.valor_unitario) || 0)} × {i.quantidade} ={' '}
                    <b style={{ color: '#1b1f1c' }}>{formatarMoeda(Number(i.valor_total) || 0)}</b>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="confirm-btn cancel"
                    style={{ height: 28, minWidth: 30, padding: 0, fontSize: 15 }}
                    onClick={() => alterarQuantidade(i.produto_fabricado_id, -1)}
                  >
                    −
                  </button>
                  <div style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{i.quantidade}</div>
                  <button
                    className="confirm-btn save"
                    style={{ height: 28, minWidth: 30, padding: 0, fontSize: 15 }}
                    onClick={() => alterarQuantidade(i.produto_fabricado_id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          className="field-input"
          style={{ position: 'static', marginTop: 12, width: '100%' }}
          placeholder="Observações (ex.: sem cebola)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <div style={{ fontSize: 12, fontWeight: 600, color: '#1b1f1c', marginTop: 12 }}>
          Data de entrega (opcional)
        </div>
        <input
          className="field-input"
          style={{ position: 'static', marginTop: 6, width: '100%' }}
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#1b1f1c' }}>
            Total: {formatarMoeda(total)}
          </div>
          <button
            className="confirm-btn save"
            style={{ height: 36, padding: '0 18px' }}
            onClick={confirmarPedido}
            disabled={enviando || itens.length === 0}
          >
            {enviando ? 'Enviando...' : 'Confirmar Pedido'}
          </button>
        </div>

        {erro && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 8 }}>{erro}</div>}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div className="link-button" onClick={() => navigate('/minhas-encomendas')}>
            Minhas Encomendas ›
          </div>
        </div>
      </div>

      {(popupAberto || produtosLoading) && (
        <SeletorProdutoPopup
          titulo="Escolha seus produtos"
          produtos={produtosLoading ? [] : produtos}
          selecionados={itens}
          precoDe={precoDe}
          carregando={produtosLoading}
          onConfirmar={confirmarItens}
          fechar={() => setPopupAberto(false)}
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