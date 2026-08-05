import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { Encomenda, EncomendaItem, Cliente, ProdutoFabricado } from '../api';

const QTD_CASAS = 2;
const VALOR_CASAS = 2;

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
  const [selectedProduto, setSelectedProduto] = useState('');
  const [itemQtd, setItemQtd] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdParsed = itemQtd ? Number(itemQtd.replace(/\D/g, '')) / 100 : 0;
  const unitParsed = itemUnit ? Number(itemUnit.replace(/\D/g, '')) / 100 : 0;
  const totalPreview =
    qtdParsed > 0 && unitParsed > 0 ? numeroParaDecimal(qtdParsed * unitParsed, VALOR_CASAS) : '';
  const totalEncomenda = itens.reduce((acc, item) => acc + item.valor_total, 0);

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
        valor_total: totalEncomenda,
        itens,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar encomenda');
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
          <select
            className="modal-input modal-select"
            style={{ top: 22 }}
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <div className="modal-label" style={{ top: 62 }}>
            Data da Encomenda *
          </div>
          <input
            className="modal-input"
            style={{ top: 78 }}
            type="date"
            value={dataEncomenda}
            onChange={(e) => setDataEncomenda(e.target.value)}
          />

          <div className="modal-label" style={{ top: 120 }}>
            Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 136, height: 56 }}
            placeholder="Observações da encomenda"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          <div className="modal-label" style={{ top: 208, fontWeight: 700 }}>
            Itens da Encomenda
          </div>

          <div className="modal-label" style={{ top: 232 }}>
            Produto
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 248 }}
            value={selectedProduto}
            onChange={(e) => setSelectedProduto(e.target.value)}
          >
            <option value="">Selecione...</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <div className="modal-label" style={{ top: 292 }}>
            Quantidade
          </div>
          <input
            className="modal-input"
            style={{ top: 308, width: 140 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={itemQtd}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setItemQtd(mascaraMoeda(e.target.value, QTD_CASAS))}
          />

          <div className="modal-label" style={{ top: 292, left: 176 }}>
            Valor Unitário
          </div>
          <input
            className="modal-input"
            style={{ top: 308, left: 176, width: 154 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={itemUnit}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setItemUnit(mascaraMoeda(e.target.value, VALOR_CASAS))}
          />

          <div className="modal-label" style={{ top: 352 }}>
            Valor Total
          </div>
          <input
            className="modal-input"
            style={{ top: 368, width: 170, background: '#f9f8f6', color: '#6b706c' }}
            placeholder="0,00"
            value={totalPreview}
            readOnly
            tabIndex={-1}
          />
          <button
            className="modal-btn save"
            style={{ top: 360, left: 196, width: 134, height: 36 }}
            onClick={addItem}
          >
            + Adicionar
          </button>

          <div className="compra-sub-row compra-hdr" style={{ position: 'absolute', left: 20, top: 416, padding: 0 }}>
            <span className="col-produto">Produto</span>
            <span className="col-qtd">Qtd</span>
            <span className="col-unit">Valor Un.</span>
            <span className="col-total">Total</span>
          </div>
          <div style={{ position: 'absolute', left: 20, top: 436, width: 302, height: 1, background: '#e8efea' }} />

          {itens.length === 0 && (
            <div
              style={{
                position: 'absolute',
                left: 20,
                top: 446,
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
            Total: {fmtMoeda(totalEncomenda)}
          </div>

          {erro && <div style={{ position: 'absolute', left: 20, top: tabelaBottom + 26, width: 310, textAlign: 'center', fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>}

          <div style={{ position: 'absolute', left: 0, top: tabelaBottom + 48, width: 350, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Encomenda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
