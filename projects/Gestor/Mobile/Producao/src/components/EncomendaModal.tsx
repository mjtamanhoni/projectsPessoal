import { useState } from 'react';
import { numeroParaDecimal } from '../format';
import type { Encomenda, EncomendaItem, Cliente, ProdutoFabricado } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';
import SeletorProdutoPopup from './SeletorProdutoPopup';

const QTD_CASAS = 2;

interface Props {
  titulo: string;
  inicial: Encomenda | null;
  clientes: Cliente[];
  produtos: ProdutoFabricado[];
  onCancel: () => void;
  onSalvar: (data: Encomenda) => Promise<void>;
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EncomendaModal({ titulo, inicial, clientes, produtos, onCancel, onSalvar }: Props) {
  const [clienteId, setClienteId] = useState(inicial?.cliente_id ? String(inicial.cliente_id) : '');
  const [dataEncomenda, setDataEncomenda] = useState(inicial?.data_encomenda ?? new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '');

  const [itens, setItens] = useState<EncomendaItem[]>(inicial?.itens ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [picker, setPicker] = useState<'cliente' | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);

  const totalEncomenda = itens.reduce((acc, item) => acc + item.valor_total, 0);

  const precoProduto = (p: ProdutoFabricado) => p.preco ?? p.valor_venda_sugerido ?? 0;

  const confirmarSelecao = (novos: {
    produto_fabricado_id: number;
    produto_nome?: string;
    quantidade: number;
    valor_unitario: number;
  }[]) => {
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
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        cliente_id: clienteId ? Number(clienteId) : undefined,
        data_encomenda: dataEncomenda,
        observacao: observacao.trim(),
        itens,
        valor_total: totalEncomenda,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar encomenda');
      setSalvando(false);
    }
  };

  const campo = (label: string, children: React.ReactNode) => (
    <>
      <div className="modal-label" style={{ position: 'static', margin: '12px 4px 4px' }}>{label}</div>
      <div style={{ margin: '0 4px 8px' }}>{children}</div>
    </>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {campo('Cliente', (
            <CampoSeletor
              style={{ position: 'static', width: '100%' }}
              texto={clientes.find((c) => c.id === Number(clienteId))?.nome}
              aoAbrir={() => setPicker('cliente')}
            />
          ))}

          {campo('Data da Encomenda *', (
            <input
              className="modal-input"
              style={{ position: 'static', width: '100%' }}
              type="date"
              value={dataEncomenda}
              onChange={(e) => setDataEncomenda(e.target.value)}
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

          <div className="modal-label" style={{ position: 'static', margin: '12px 4px 4px', fontWeight: 700 }}>
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
            itens.map((item, idx) => {
              const produto = produtos.find((p) => (p.id) === item.produto_fabricado_id);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', margin: '0 4px' }}>
                  <div className="compra-sub-row compra-item" style={{ position: 'static', padding: 0, flex: 1 }}>
                    <span className="col-produto">{produto?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}</span>
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
              );
            })
          )}

          <div style={{ margin: '8px 4px', fontSize: 12, fontWeight: 700, color: '#1b1f1c' }}>
            Total: {fmtMoeda(totalEncomenda)}
          </div>

          {erro && <div className="modal-erro" style={{ position: 'static', marginBottom: 8 }}>{erro}</div>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Encomenda'}
            </button>
          </div>
        </div>
      </div>

      {picker === 'cliente' && (
        <SeletorRegistro<Cliente>
          titulo="Selecionar Cliente"
          placeholder="Buscar cliente por nome..."
          registros={clientes}
          rotulo={(c) => c.nome}
          aoSelecionar={(c) => {
            setClienteId(String(c.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}

      {seletorAberto && (
        <SeletorProdutoPopup
          titulo="Selecionar Produtos"
          produtos={produtos}
          selecionados={itens}
          precoDe={precoProduto}
          onConfirmar={confirmarSelecao}
          fechar={() => setSeletorAberto(false)}
        />
      )}
    </div>
  );
}