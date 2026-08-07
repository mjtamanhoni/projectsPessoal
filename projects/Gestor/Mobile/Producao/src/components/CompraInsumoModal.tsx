import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { CompraInsumo, CompraInsumoItem, Fornecedor, Insumo, Marca } from '../api';
import SeletorRegistro, { CampoSeletor } from './SeletorRegistro';

const QTD_CASAS = 4;
const VALOR_CASAS = 2;

interface Props {
  titulo: string;
  inicial: CompraInsumo | null;
  insumos: Insumo[];
  fornecedores: Fornecedor[];
  marcas: Marca[];
  onCancel: () => void;
  onSalvar: (data: CompraInsumo) => Promise<void>;
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CompraInsumoModal({ titulo, inicial, insumos, fornecedores, marcas, onCancel, onSalvar }: Props) {
  const [fornecedorId, setFornecedorId] = useState(inicial?.fornecedor_id ? String(inicial.fornecedor_id) : '');
  const [dataCompra, setDataCompra] = useState(inicial?.data_compra ?? new Date().toISOString().slice(0, 10));
  const [pago, setPago] = useState(inicial?.pago ?? true);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '');

  const [itens, setItens] = useState<CompraInsumoItem[]>(inicial?.itens ?? []);
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [itemQtd, setItemQtd] = useState('');
  const [itemTotal, setItemTotal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [picker, setPicker] = useState<'fornecedor' | 'insumo' | null>(null);

  const qtdParsed = itemQtd ? Number(itemQtd.replace(/\D/g, '')) / 10000 : 0;
  const totalParsed = itemTotal ? Number(itemTotal.replace(/\D/g, '')) / 100 : 0;
  const unitarioPreview =
    qtdParsed > 0 && totalParsed > 0 ? numeroParaDecimal(totalParsed / qtdParsed, QTD_CASAS) : '';
  const totalCompra = itens.reduce((acc, item) => acc + item.valor_total, 0);

  const marcaNome = (insumo: Insumo | undefined): string => {
    if (!insumo) return '';
    return insumo.marca_nome || marcas.find((m) => m.id === insumo.id_marca)?.nome || '';
  };

  const addItem = () => {
    const insumoId = Number(selectedInsumo);
    if (!insumoId) {
      setErro('Selecione um insumo');
      return;
    }
    if (qtdParsed <= 0 || totalParsed <= 0) {
      setErro('Informe quantidade e valor total maiores que zero');
      return;
    }
    setErro('');
    setItens([
      ...itens,
      { insumo_id: insumoId, quantidade: qtdParsed, valor_unitario: totalParsed / qtdParsed, valor_total: totalParsed },
    ]);
    setSelectedInsumo('');
    setItemQtd('');
    setItemTotal('');
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const salvar = async () => {
    setErro('');
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item à compra');
      return;
    }
    if (!dataCompra) {
      setErro('Data da compra é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        fornecedor_id: fornecedorId ? Number(fornecedorId) : undefined,
        data_compra: dataCompra,
        observacao: observacao.trim(),
        pago,
        valor_total: totalCompra,
        itens,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar compra');
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
            Fornecedor
          </div>
          <CampoSeletor
            style={{ top: 22 }}
            texto={fornecedores.find((f) => String(f.id) === fornecedorId)?.nome}
            aoAbrir={() => setPicker('fornecedor')}
          />

          <div className="modal-label" style={{ top: 62 }}>
            Data da Compra *
          </div>
          <input
            className="modal-input"
            style={{ top: 78 }}
            type="date"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
          />

          <div className="modal-check-row" style={{ top: 120 }}>
            <div className={`modal-checkbox ${pago ? 'checked' : ''}`} onClick={() => setPago(!pago)}>
              {pago && <div className="modal-check-fill" />}
            </div>
            <span className="modal-check-label">Compra já foi paga?</span>
          </div>

          <div className="modal-label" style={{ top: 152 }}>
            Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 168, height: 56 }}
            placeholder="Observações da compra"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          <div className="modal-label" style={{ top: 240, fontWeight: 700 }}>
            Itens da Compra
          </div>

          <div className="modal-label" style={{ top: 264 }}>
            Insumo
          </div>
          <CampoSeletor
            style={{ top: 280 }}
            texto={insumos.find((i) => String(i.id) === selectedInsumo)?.nome}
            aoAbrir={() => setPicker('insumo')}
          />

          <div className="modal-label" style={{ top: 324 }}>
            Quantidade
          </div>
          <input
            className="modal-input"
            style={{ top: 340, width: 140 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,0000"
            value={itemQtd}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setItemQtd(mascaraMoeda(e.target.value, QTD_CASAS))}
          />

          <div className="modal-label" style={{ top: 324, left: 176 }}>
            Valor Total
          </div>
          <input
            className="modal-input"
            style={{ top: 340, left: 176, width: 154 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={itemTotal}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setItemTotal(mascaraMoeda(e.target.value, VALOR_CASAS))}
          />

          <div className="modal-label" style={{ top: 384 }}>
            Valor Unit. (calculado)
          </div>
          <input
            className="modal-input"
            style={{ top: 400, width: 170, background: '#f9f8f6', color: '#6b706c' }}
            value={unitarioPreview}
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
            <span className="col-insumo">Insumo</span>
            <span className="col-marca">Marca</span>
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
            const insumo = insumos.find((i) => i.id === item.insumo_id);
            const mn = item.marca_nome || marcaNome(insumo) || '—';
            return (
              <div key={idx}>
<div className="compra-sub-row compra-item" style={{ position: 'absolute', left: 20, top: itemTop(idx), padding: 0 }}>
                  <span className="col-insumo">{insumo?.nome ?? item.insumo_nome ?? `ID ${item.insumo_id}`}</span>
                  <span className="col-marca compra-item-muted">{mn}</span>
                  <span className="col-qtd">{numeroParaDecimal(item.quantidade, QTD_CASAS)}</span>
                  <span className="col-unit">{numeroParaDecimal(item.valor_unitario, QTD_CASAS)}</span>
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
            Total: {fmtMoeda(totalCompra)}
          </div>

          {erro && <div style={{ position: 'absolute', left: 20, top: tabelaBottom + 26, width: 310, textAlign: 'center', fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>}

          <div style={{ position: 'absolute', left: 0, top: tabelaBottom + 48, width: 350, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Compra'}
            </button>
          </div>
        </div>
      </div>

      {picker === 'fornecedor' && (
        <SeletorRegistro<Fornecedor>
          titulo="Selecionar Fornecedor"
          placeholder="Buscar fornecedor por nome..."
          registros={fornecedores}
          rotulo={(f) => f.nome}
          aoSelecionar={(f) => {
            setFornecedorId(String(f.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}

      {picker === 'insumo' && (
        <SeletorRegistro<Insumo>
          titulo="Selecionar Insumo"
          placeholder="Buscar insumo por nome..."
          registros={insumos}
          rotulo={(i) => i.nome}
          subtitulo={(i) => {
            const extra = [i.unidade_medida, marcaNome(i)].filter(Boolean).join(' • ');
            return extra || undefined;
          }}
          aoSelecionar={(i) => {
            setSelectedInsumo(String(i.id));
            setPicker(null);
          }}
          fechar={() => setPicker(null)}
        />
      )}
    </div>
  );
}
