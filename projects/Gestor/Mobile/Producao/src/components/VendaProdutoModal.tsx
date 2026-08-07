import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { VendaProduto, VendaProdutoItem, Cliente, ProdutoFabricado } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';

const QTD_CASAS = 2;
const VALOR_CASAS = 2;

interface Props {
  titulo: string;
  inicial: VendaProduto | null;
  clientes: Cliente[];
  produtos: ProdutoFabricado[];
  onCancel: () => void;
  onSalvar: (data: VendaProduto) => Promise<void>;
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function VendaProdutoModal({ titulo, inicial, clientes, produtos, onCancel, onSalvar }: Props) {
  const [clienteId, setClienteId] = useState(inicial?.cliente_id ? String(inicial.cliente_id) : '');
  const [dataVenda, setDataVenda] = useState(inicial?.data_venda ?? new Date().toISOString().slice(0, 10));
  const [recebido, setRecebido] = useState(inicial?.recebido ?? true);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '');

  const [itens, setItens] = useState<VendaProdutoItem[]>(inicial?.itens ?? []);
  const [selectedProduto, setSelectedProduto] = useState('');
  const [itemQtd, setItemQtd] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [picker, setPicker] = useState<'cliente' | 'produto' | null>(null);

  const qtdParsed = itemQtd ? Number(itemQtd.replace(/\D/g, '')) / 100 : 0;
  const unitParsed = itemUnit ? Number(itemUnit.replace(/\D/g, '')) / 100 : 0;
  const totalPreview =
    qtdParsed > 0 && unitParsed > 0 ? numeroParaDecimal(qtdParsed * unitParsed, VALOR_CASAS) : '';
  const totalVenda = itens.reduce((acc, item) => acc + item.valor_total, 0);

  const addItem = () => {
    const produtoId = Number(selectedProduto);
    if (!produtoId) {
      setErro('Selecione um produto');
      return;
    }
    if (qtdParsed <= 0 || unitParsed <= 0) {
      setErro('Informe quantidade e valor unitário maiores que zero');
      return;
    }
    setErro('');
    const produto = produtos.find((p) => (p.id) === produtoId);
    setItens([
      ...itens,
      { produto_fabricado_id: produtoId, produto_nome: produto?.nome, quantidade: qtdParsed, valor_unitario: unitParsed, valor_total: qtdParsed * unitParsed },
    ]);
    setSelectedProduto('');
    setItemQtd('');
    setItemUnit('');
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    setErro('');
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item à venda');
      return;
    }
    if (!dataVenda) {
      setErro('Data da venda é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        cliente_id: clienteId ? Number(clienteId) : undefined,
        data_venda: dataVenda,
        observacao: observacao.trim(),
        recebido,
        valor_total: totalVenda,
        itens,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar venda');
      setSalvando(false);
    }
  };

  const itemTop = (idx: number) => 494 + idx * 22;
  const tabelaBottom = 478 + (itens.length === 0 ? 40 : itens.length * 22);

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
          <div className="modal-label" style={{ top: 6 }}>
            Cliente
          </div>
          <CampoSeletor
            style={{ top: 22 }}
            texto={clientes.find((c) => c.id === Number(clienteId))?.nome}
            aoAbrir={() => setPicker('cliente')}
          />

          <div className="modal-label" style={{ top: 62 }}>
            Data da Venda *
          </div>
          <input
            className="modal-input"
            style={{ top: 78 }}
            type="date"
            value={dataVenda}
            onChange={(e) => setDataVenda(e.target.value)}
          />

          <div className="modal-check-row" style={{ top: 120 }}>
            <div className={`modal-checkbox ${recebido ? 'checked' : ''}`} onClick={() => setRecebido(!recebido)}>
              {recebido && <div className="modal-check-fill" />}
            </div>
            <span className="modal-check-label">Venda já foi recebida?</span>
          </div>

          <div className="modal-label" style={{ top: 152 }}>
            Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 168, height: 56 }}
            placeholder="Observações da venda"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          <div className="modal-label" style={{ top: 240, fontWeight: 700 }}>
            Itens da Venda
          </div>

          <div className="modal-label" style={{ top: 264 }}>
            Produto
          </div>
          <CampoSeletor
            style={{ top: 280 }}
            texto={produtos.find((p) => String(p.id) === selectedProduto)?.nome}
            aoAbrir={() => setPicker('produto')}
          />

          <div className="modal-label" style={{ top: 324 }}>
            Quantidade
          </div>
          <input
            className="modal-input"
            style={{ top: 340, width: 140 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={itemQtd}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setItemQtd(mascaraMoeda(e.target.value, QTD_CASAS))}
          />

          <div className="modal-label" style={{ top: 324, left: 176 }}>
            Valor Unitário
          </div>
          <input
            className="modal-input"
            style={{ top: 340, left: 176, width: 154 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={itemUnit}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setItemUnit(mascaraMoeda(e.target.value, VALOR_CASAS))}
          />

          <div className="modal-label" style={{ top: 384 }}>
            Valor Total
          </div>
          <input
            className="modal-input"
            style={{ top: 400, width: 170, background: '#f9f8f6', color: '#6b706c' }}
            placeholder="0,00"
            value={totalPreview}
            readOnly
            tabIndex={-1}
          />
          <button
            className="modal-btn save"
            style={{ top: 392, left: 196, width: 134, height: 36 }}
            onClick={addItem}
          >
            + Adicionar
          </button>

          <div className="compra-sub-row compra-hdr" style={{ position: 'absolute', left: 20, top: 448, padding: 0 }}>
            <span className="col-produto">Produto</span>
            <span className="col-qtd">Qtd</span>
            <span className="col-unit">Valor Un.</span>
            <span className="col-total">Total</span>
          </div>
          <div style={{ position: 'absolute', left: 20, top: 468, width: 302, height: 1, background: '#e8efea' }} />

          {itens.length === 0 && (
            <div
              style={{
                position: 'absolute',
                left: 20,
                top: 478,
                width: 302,
                textAlign: 'center',
                fontSize: 11,
                color: '#9ca09d',
                padding: '10px 0',
              }}
            >
              Nenhum item adicionado
            </div>
          )}
          {itens.map((item, idx) => {
            const produto = produtos.find((p) => (p.id) === item.produto_fabricado_id);
            return (
              <div key={idx}>
                <div className="compra-sub-row compra-item" style={{ position: 'absolute', left: 20, top: itemTop(idx), padding: 0 }}>
                  <span className="col-produto">{produto?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}</span>
                  <span className="col-qtd">{numeroParaDecimal(item.quantidade, QTD_CASAS)}</span>
                  <span className="col-unit">{numeroParaDecimal(item.valor_unitario, VALOR_CASAS)}</span>
                  <span className="col-total">{numeroParaDecimal(item.valor_total, VALOR_CASAS)}</span>
                </div>
                <button
                  className="row-btn"
                  style={{ position: 'absolute', right: 16, top: itemTop(idx), color: '#dc2626', fontSize: 12, height: 20, textAlign: 'center' }}
                  onClick={() => removeItem(idx)}
                >
                  ✕
                </button>
              </div>
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: 20,
              top: tabelaBottom,
              width: 302,
              fontSize: 12,
              fontWeight: 700,
              color: '#1b1f1c',
            }}
          >
            Total: {fmtMoeda(totalVenda)}
          </div>

          {erro && <div style={{ position: 'absolute', left: 20, top: tabelaBottom + 26, width: 310, textAlign: 'center', fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>}

          <div style={{ position: 'absolute', left: 0, top: tabelaBottom + 48, width: 350, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Venda'}
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

      {picker === 'produto' && (
        <SeletorRegistro<ProdutoFabricado>
          titulo="Selecionar Produto"
          placeholder="Buscar produto por nome..."
          registros={produtos}
          rotulo={(p) => p.nome}
          aoSelecionar={(p) => {
            setSelectedProduto(String(p.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}
    </div>
  );
}