import { useEffect, useState, type ReactNode } from 'react';
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
import BackButton from '../components/BackButton';
import CupomModal from '../components/CupomModal';
import SeletorProdutoPopup, { type ProdutoSelecionado } from '../components/SeletorProdutoPopup';
import { dataHojeISO, formatarMoeda, numeroParaDecimal } from '../format';

const QTD_CASAS = 2;

export default function Pedido() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [dataEncomenda, setDataEncomenda] = useState(dataHojeISO());
  const [dataEntrega, setDataEntrega] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<EncomendaItem[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [produtosCarregados, setProdutosCarregados] = useState(false);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [encomendaCriada, setEncomendaCriada] = useState<Encomenda | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);

  const totalEncomenda = itens.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0);
  const precoDe = (p: ProdutoFabricado) => Number(p.preco) || 0;

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

  if (!empresa || !cliente) return null;

  const sairVoltar = () => {
    sair();
    navigate('/', { replace: true });
  };

  const confirmarSelecao = (novos: ProdutoSelecionado[]) => {
    setItens(novos.map((i) => ({ ...i, valor_total: i.quantidade * i.valor_unitario })));
    setSeletorAberto(false);
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    setErro('');
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item à encomenda');
      return;
    }
    if (!dataEncomenda) {
      setErro('Data da encomenda é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      const criada = await criarEncomendaPublica(empresa.id, {
        cliente_id: cliente.id,
        data_encomenda: dataEncomenda,
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
        data_encomenda: dataEncomenda,
        data_entrega: dataEntrega,
        observacao: observacao.trim(),
        valor_total: totalEncomenda,
        status: 0,
        baixado: false,
        itens,
      };
      setEncomendaCriada(completa);
      setItens([]);
      setObservacao('');
      setDataEntrega('');
      setDataEncomenda(dataHojeISO());
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const campo = (label: string, children: ReactNode) => (
    <>
      <div className="modal-label" style={{ position: 'static', margin: '14px 4px 4px' }}>{label}</div>
      <div style={{ margin: '0 4px 8px' }}>{children}</div>
    </>
  );

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
        <div style={{ background: '#e7f5ec', border: '1px solid #cde8d6', borderRadius: 10, padding: '12px 14px', marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: '#4b5563' }}>CLIENTE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1f1c', marginTop: 2 }}>{cliente.nome}</div>
          <div style={{ fontSize: 11, color: '#4b5563' }}>{empresa.fantasia || empresa.razao_social}</div>
        </div>

        {campo('Data da Encomenda *', (
          <input
            className="modal-input"
            style={{ position: 'static', width: '100%' }}
            type="date"
            value={dataEncomenda}
            onChange={(e) => setDataEncomenda(e.target.value)}
          />
        ))}

        {campo('Data de Entrega', (
          <input
            className="modal-input"
            style={{ position: 'static', width: '100%' }}
            type="date"
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
          />
        ))}

        {campo('Observação', (
          <textarea
            className="modal-input modal-textarea"
            style={{ position: 'static', width: '100%', height: 52 }}
            placeholder="Observações da encomenda"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        ))}

        <div className="modal-label" style={{ position: 'static', margin: '14px 4px 4px', fontWeight: 700 }}>
          Itens da Encomenda
        </div>

        <button
          className="modal-btn save"
          style={{ position: 'static', top: 0, margin: '0 4px 8px', width: 'calc(100% - 8px)' }}
          onClick={() => setSeletorAberto(true)}
        >
          Selecionar Produtos ({itens.length})
        </button>

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
                <span className="col-produto">{item.produto_nome || `ID ${item.produto_fabricado_id}`}</span>
                <span className="col-qtd">{numeroParaDecimal(item.quantidade, QTD_CASAS)}</span>
                <span className="col-unit">{numeroParaDecimal(item.valor_unitario, QTD_CASAS)}</span>
                <span className="col-total">{numeroParaDecimal(item.valor_total, QTD_CASAS)}</span>
              </div>
              <button
                className="row-btn"
                style={{ position: 'static', color: '#dc2626', fontSize: 12, height: 20, textAlign: 'center' }}
                onClick={() => removeItem(idx)}
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

      {(seletorAberto || produtosLoading) && (
        <SeletorProdutoPopup
          titulo="Escolha seus produtos"
          produtos={produtosLoading ? [] : produtos}
          selecionados={itens}
          precoDe={precoDe}
          carregando={produtosLoading}
          onConfirmar={confirmarSelecao}
          fechar={() => setSeletorAberto(false)}
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