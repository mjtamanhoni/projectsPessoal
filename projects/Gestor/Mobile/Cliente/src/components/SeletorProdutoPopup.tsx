import { useMemo, useRef, useState } from 'react';
import { mascaraMoeda, numeroParaDecimal, decimalParaNumero } from '../format';
import FotoProduto from './FotoProduto';
import { normalizar } from './SeletorRegistro';
import type { ProdutoFabricado } from '../api';

const QTD_CASAS = 2;

export interface ProdutoSelecionado {
  produto_fabricado_id: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
}

interface Props {
  titulo: string;
  produtos: ProdutoFabricado[];
  selecionados: ProdutoSelecionado[];
  precoDe: (p: ProdutoFabricado) => number;
  onConfirmar: (itens: ProdutoSelecionado[]) => void;
  fechar: () => void;
  carregando?: boolean;
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SeletorProdutoPopup({ titulo, produtos, selecionados, precoDe, onConfirmar, fechar, carregando }: Props) {
  const [busca, setBusca] = useState('');
  const [cart, setCart] = useState<ProdutoSelecionado[]>(selecionados);
  const [qtdPopup, setQtdPopup] = useState<ProdutoFabricado | null>(null);
  const [qtdPopupValor, setQtdPopupValor] = useState('');
  const longPressTimer = useRef<number | null>(null);
  const longPressFlag = useRef(false);

  const gridMaxHeight = useMemo(() => {
    const h = window.innerHeight;
    return Math.max(280, Math.min(560, Math.round(h * 0.62)));
  }, []);

  const filtrados = useMemo(() => {
    const t = normalizar(busca.trim());
    if (!t) return produtos;
    return produtos.filter(
      (p) => normalizar(p.nome).includes(t) || normalizar(p.descricao ?? '').includes(t),
    );
  }, [produtos, busca]);

  const qtdDe = (id: number) => cart.find((i) => i.produto_fabricado_id === id)?.quantidade ?? 0;

  const toggleProduto = (p: ProdutoFabricado) => {
    const id = p.id ?? 0;
    if (!id) return;
    const existe = cart.some((i) => i.produto_fabricado_id === id);
    if (existe) {
      setCart(cart.filter((i) => i.produto_fabricado_id !== id));
      return;
    }
    const vr = precoDe(p);
    setCart([...cart, { produto_fabricado_id: id, produto_nome: p.nome, quantidade: 1, valor_unitario: vr }]);
  };

  const abrirPopupQtd = (p: ProdutoFabricado) => {
    setQtdPopupValor(numeroParaDecimal(qtdDe(p.id ?? 0) || 1, QTD_CASAS));
    setQtdPopup(p);
  };

  const confirmarQtd = () => {
    if (!qtdPopup) return;
    const q = decimalParaNumero(qtdPopupValor);
    if (q == null || q <= 0) return;
    const id = qtdPopup.id ?? 0;
    const existe = cart.some((i) => i.produto_fabricado_id === id);
    const vr = precoDe(qtdPopup);
    setCart(
      existe
        ? cart.map((i) => (i.produto_fabricado_id === id ? { ...i, quantidade: q } : i))
        : [...cart, { produto_fabricado_id: id, produto_nome: qtdPopup.nome, quantidade: q, valor_unitario: vr }],
    );
    setQtdPopup(null);
  };

  const iniciarPressionar = (p: ProdutoFabricado) => {
    longPressFlag.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFlag.current = true;
      abrirPopupQtd(p);
    }, 2000);
  };

  const finalizarPressionar = () => {
    if (longPressTimer.current != null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const tocarCard = (p: ProdutoFabricado) => {
    if (longPressFlag.current) {
      longPressFlag.current = false;
      return;
    }
    toggleProduto(p);
  };

  const totalSelecionados = cart.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-card" style={{ maxWidth: 420, width: 'min(94vw, 420px)' }}>
        <div className="modal-head">
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={fechar}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: 11, color: '#6b706c', margin: '0 4px 8px' }}>
            Toque no card: adiciona/remove com quantidade 1. Toque longo (segure ~2s): informar a quantidade.
          </div>

          <input
            className="modal-input"
            style={{ position: 'static', width: '100%', margin: '0 4px 8px' }}
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: gridMaxHeight, overflowY: 'auto', margin: '0 4px 8px' }}>
            {filtrados.map((p) => {
              const id = p.id ?? 0;
              const qtd = qtdDe(id);
              const selecionado = qtd > 0;
              return (
                <div
                  key={id}
                  onTouchStart={() => iniciarPressionar(p)}
                  onTouchEnd={finalizarPressionar}
                  onClick={() => tocarCard(p)}
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
                      {numeroParaDecimal(qtd, QTD_CASAS)}
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
                </div>
              );
            })}
            {carregando && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: 12 }}>
                Carregando produtos...
              </div>
            )}
            {filtrados.length === 0 && !carregando && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: 12 }}>
                Nenhum produto encontrado
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={fechar}>
              Cancelar
            </button>
            <button
              className="modal-btn save"
              style={{ position: 'static', top: 0 }}
              onClick={() => {
                const itens = cart.map((i) => ({ ...i, valor_total: i.quantidade * i.valor_unitario }));
                onConfirmar(itens);
              }}
              disabled={cart.length === 0}
            >
              Confirmar ({totalSelecionados})
            </button>
          </div>
        </div>
      </div>

      {qtdPopup && (
        <div className="modal-overlay" style={{ zIndex: 70 }}>
          <div style={{ width: 300, background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #d6ddd0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#1b1f1c' }}>
              Quantidade — {qtdPopup.nome}
            </div>
            <input
              className="modal-input"
              style={{ position: 'static', width: '100%', marginBottom: 12 }}
              type="tel"
              inputMode="decimal"
              placeholder="0,00"
              value={qtdPopupValor}
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setQtdPopupValor(mascaraMoeda(e.target.value, QTD_CASAS))}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="modal-btn cancel" style={{ position: 'static' }} onClick={() => setQtdPopup(null)}>
                Cancelar
              </button>
              <button className="modal-btn save" style={{ position: 'static' }} onClick={confirmarQtd}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}