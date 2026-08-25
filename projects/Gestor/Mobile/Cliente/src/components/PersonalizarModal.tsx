import { useState } from 'react';
import type { AdicionalItemPedido, AdicionalPublico } from '../api';

interface ExtraSel {
  adicional_id: number;
  nome: string;
  preco: number;
  qtd: number;
}

interface PersonalizarModalProps {
  titulo: string;
  removiveis: string[];
  adicionais: AdicionalPublico[];
  iniciaisRemovidos: string[];
  iniciaisAdicionais: AdicionalItemPedido[];
  onConfirmar: (removidos: string[], adicionais: AdicionalItemPedido[]) => void;
  onFechar: () => void;
}

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const BTN_MENOS = { position: 'static' as const, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9f0ea', color: '#2d5e3a', fontSize: 24, fontWeight: 700, lineHeight: 1 };
const BTN_MAIS = { position: 'static' as const, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2d5e3a', color: '#ffffff', fontSize: 24, fontWeight: 700, lineHeight: 1 };

export default function PersonalizarModal({
  titulo,
  removiveis,
  adicionais,
  iniciaisRemovidos,
  iniciaisAdicionais,
  onConfirmar,
  onFechar,
}: PersonalizarModalProps) {
  const [removidos, setRemovidos] = useState<string[]>(iniciaisRemovidos);
  const [extras, setExtras] = useState<ExtraSel[]>(
    iniciaisAdicionais.map((a) => ({
      adicional_id: a.adicional_id ?? 0,
      nome: a.nome,
      preco: a.valor_unitario,
      qtd: a.quantidade,
    })),
  );

  const temRemovidos = removiveis.length > 0;
  const temAdicionais = adicionais.length > 0;
  const valorExtras = extras.reduce((acc, e) => acc + e.qtd * e.preco, 0);

  const toggleRemovido = (nome: string) => {
    setRemovidos((prev) =>
      prev.includes(nome) ? prev.filter((r) => r !== nome) : [...prev, nome],
    );
  };

  const mudarExtra = (adicionalId: number, delta: number) => {
    setExtras((prev) => {
      const atual = prev.find((e) => e.adicional_id === adicionalId);
      const novaQtd = Math.max(0, (atual?.qtd ?? 0) + delta);
      if (novaQtd === 0) {
        return prev.filter((e) => e.adicional_id !== adicionalId);
      }
      if (atual) {
        return prev.map((e) =>
          e.adicional_id === adicionalId ? { ...e, qtd: novaQtd } : e,
        );
      }
      if (delta < 0) return prev;
      const info = adicionais.find((a) => a.adicional_id === adicionalId);
      if (!info) return prev;
      return [
        ...prev,
        { adicional_id: adicionalId, nome: info.nome, preco: Number(info.preco) || 0, qtd: novaQtd },
      ];
    });
  };

  const confirmar = () => {
    const adicionaisFinal: AdicionalItemPedido[] = extras
      .filter((e) => e.qtd > 0)
      .map((e) => ({
        adicional_id: e.adicional_id,
        nome: e.nome,
        quantidade: e.qtd,
        valor_unitario: e.preco,
        valor_total: Math.round(e.qtd * e.preco * 100) / 100,
      }));
    onConfirmar(removidos, adicionaisFinal);
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
            {titulo}
          </div>
          <button
            className="row-btn"
            style={{ position: 'static', color: '#9ca09d', fontSize: 16, width: 36, height: 36 }}
            onClick={onFechar}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#6b706c', marginBottom: 12 }}>
          {temRemovidos
            ? 'Remova itens da receita ou acrescente adicionais.'
            : 'Acrescente adicionais ao produto.'}
        </div>

        {temRemovidos && (
          <>
            <div className="modal-label" style={{ position: 'static', margin: '0 0 4px', fontWeight: 700, fontSize: 12 }}>
              Itens da Receita
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {removiveis.map((nome) => {
                const removido = removidos.includes(nome);
                return (
                  <label
                    key={nome}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #d6ddd0',
                      background: removido ? '#fdf0ef' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={removido}
                      onChange={() => toggleRemovido(nome)}
                      style={{ width: 20, height: 20, accentColor: '#b84a4a' }}
                    />
                    <span style={{ fontSize: 13, color: '#1b1f1c', textDecoration: removido ? 'line-through' : 'none', flex: 1 }}>
                      {nome}
                    </span>
                    {removido && (
                      <span style={{ fontSize: 9, color: '#b84a4a', fontWeight: 700, background: '#f8dedc', borderRadius: 8, padding: '2px 8px' }}>
                        Remover
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </>
        )}

        {temAdicionais && (
          <>
            <div className="modal-label" style={{ position: 'static', margin: '0 0 4px', fontWeight: 700, fontSize: 12 }}>
              Adicionais
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
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
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #d6ddd0',
                      background: qtd > 0 ? '#f0f7f1' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1b1f1c' }}>{ad.nome}</div>
                      {ad.descricao ? (
                        <div style={{ fontSize: 10, color: '#6b706c' }}>{ad.descricao}</div>
                      ) : null}
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#2d5e3a' }}>{fmtMoeda(ad.preco)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {qtd > 0 && (
                        <button
                          className="row-btn"
                          style={BTN_MENOS}
                          onClick={() => mudarExtra(ad.adicional_id, -1)}
                          aria-label={`Remover ${ad.nome}`}
                        >
                          −
                        </button>
                      )}
                      {qtd > 0 && (
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1b1f1c', minWidth: 20, textAlign: 'center' }}>
                          {qtd}
                        </span>
                      )}
                      <button
                        className="row-btn"
                        style={BTN_MAIS}
                        onClick={() => mudarExtra(ad.adicional_id, 1)}
                        aria-label={`Adicionar ${ad.nome}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!temRemovidos && !temAdicionais && (
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca09d', padding: '16px 0' }}>
            Este produto não possui opções de personalização.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 2px 12px' }}>
          <span style={{ fontSize: 12, color: '#6b706c' }}>Valor dos adicionais</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#2d5e3a' }}>{fmtMoeda(valorExtras)}</span>
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
            onClick={confirmar}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
