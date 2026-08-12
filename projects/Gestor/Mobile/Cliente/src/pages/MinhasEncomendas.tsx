import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cancelarEncomendaPublica,
  extrairErro,
  listarEncomendasPublicas,
  type Encomenda,
} from '../api';
import { useSessao } from '../auth';
import CupomModal from '../components/CupomModal';
import { formatarDataBR, formatarMoeda } from '../format';

const ETAPAS: Record<number, { label: string; cor: string; fundo: string }> = {
  0: { label: 'Aguardando', cor: '#92400e', fundo: '#fef3c7' },
  1: { label: 'Em produção', cor: '#1e40af', fundo: '#dbeafe' },
  2: { label: 'Finalizado', cor: '#166534', fundo: '#dcfce7' },
  3: { label: 'Entregue', cor: '#065f46', fundo: '#d1fae5' },
  4: { label: 'Cancelada', cor: '#991b1b', fundo: '#fee2e2' },
};

const CHIPS_FILTRO: { valor: number; label: string }[] = [
  { valor: 0, label: 'Aguardando' },
  { valor: 1, label: 'Em produção' },
  { valor: 2, label: 'Finalizado' },
  { valor: 3, label: 'Entregue' },
  { valor: 4, label: 'Cancelada' },
];

export default function MinhasEncomendas() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [expandida, setExpandida] = useState<number | null>(null);
  const [cupomDe, setCupomDe] = useState<Encomenda | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<number[]>(CHIPS_FILTRO.map((c) => c.valor));
  const [cancelarDe, setCancelarDe] = useState<Encomenda | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const documento = (cliente?.cnpj_cpf || '').replace(/\D/g, '');

  const carregar = async () => {
    if (!empresa || !documento) return;
    setCarregando(true);
    setErro('');
    try {
      setEncomendas(await listarEncomendasPublicas(empresa.id, documento));
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(
    () =>
      encomendas.filter(
        (e) => filtroStatus.length === 0 || filtroStatus.includes(Number(e.status ?? 0)),
      ),
    [encomendas, filtroStatus],
  );

  const podeCancelar = (e: Encomenda) => Number(e.status ?? 0) < 2;

  const confirmarCancelamento = async () => {
    if (!cancelarDe || !empresa) return;
    setCancelando(true);
    setErro('');
    try {
      await cancelarEncomendaPublica(empresa.id, {
        id: cancelarDe.id ?? 0,
        cliente_id: cliente?.id,
        documento,
      });
      setCancelarDe(null);
      await carregar();
    } catch (e) {
      setCancelarDe(null);
      setErro(extrairErro(e));
    } finally {
      setCancelando(false);
    }
  };

  if (!empresa || !cliente) return null;

  return (
    <div className="screen">
      <div className="screen-topbar">
        <div className="dashboard-title" style={{ maxWidth: '60%' }}>
          <span style={{ display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
            Acompanhar Encomendas
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

      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#e7f5ec',
            border: '1px solid #cde8d6',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1b1f1c' }}>{cliente.nome}</div>
            <div style={{ fontSize: 11, color: '#4b5563' }}>{empresa.fantasia || empresa.razao_social}</div>
            <div style={{ fontSize: 11, color: '#4b5563' }}>{cliente.celular}</div>
          </div>
          <button
            className="confirm-btn save"
            style={{ height: 34, padding: '0 14px', fontSize: 12 }}
            onClick={() => navigate('/pedido')}
          >
            + Novo pedido
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {CHIPS_FILTRO.map((chip) => {
            const ativo = filtroStatus.includes(chip.valor);
            return (
              <button
                key={chip.valor}
                onClick={() =>
                  setFiltroStatus((prev) =>
                    ativo ? prev.filter((v) => v !== chip.valor) : [...prev, chip.valor],
                  )
                }
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: ativo ? '1px solid #2d5e3a' : '1px solid #d6ddd0',
                  background: ativo ? '#2d5e3a' : '#ffffff',
                  color: ativo ? '#ffffff' : '#6b706c',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {erro && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 8 }}>{erro}</div>}

        {!carregando && filtradas.length === 0 && !erro && (
          <div style={{ fontSize: 12, color: '#9ca09d', textAlign: 'center', padding: '28px 0', border: '1px dashed #d6ddd0', borderRadius: 10 }}>
            Nenhuma encomenda para os filtros selecionados
          </div>
        )}

        {filtradas.map((e) => {
          const status = Number(e.status ?? 0);
          const etapa = ETAPAS[status] ?? ETAPAS[0];
          return (
            <div
              key={e.id}
              style={{
                background: '#f4f6f4',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 8,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setExpandida(expandida === e.id ? null : (e.id ?? null))}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1b1f1c' }}>
                    Encomenda #{e.codigo ?? e.id}
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        color: etapa.cor,
                        background: etapa.fundo,
                      }}
                    >
                      {etapa.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b706c' }}>
                    {formatarDataBR(e.data_encomenda)} · {formatarMoeda(Number(e.valor_total) || 0)}
                    {e.data_entrega ? ` · Entrega: ${formatarDataBR(e.data_entrega)}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#9ca09d' }}>{expandida === e.id ? '˄' : '˅'}</span>
              </div>

              {expandida === e.id && (
                <div style={{ marginTop: 8, borderTop: '1px solid #dfe4dd', paddingTop: 8 }}>
                  {(e.itens ?? []).map((i, idx) => (
                    <div key={i.id ?? idx} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#1b1f1c', padding: '2px 0' }}>
                      <div style={{ flex: 1 }}>{i.produto_nome || `Produto #${i.produto_fabricado_id}`}</div>
                      <div style={{ color: '#6b706c' }}>
                        {i.quantidade} × {formatarMoeda(Number(i.valor_unitario) || 0)}
                      </div>
                      <div style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                        {formatarMoeda(Number(i.valor_total) || 0)}
                      </div>
                    </div>
                  ))}
                  {e.observacao && (
                    <div style={{ fontSize: 11, color: '#6b706c', marginTop: 6 }}>
                      Obs.: {e.observacao}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    {status >= 2 && (
                      <button
                        className="confirm-btn save"
                        style={{ height: 30, padding: '0 14px', fontSize: 12 }}
                        onClick={() => setCupomDe(e)}
                      >
                        Ver cupom
                      </button>
                    )}
                    {podeCancelar(e) && (
                      <button
                        className="confirm-btn cancel"
                        style={{ height: 30, padding: '0 14px', fontSize: 12 }}
                        onClick={() => setCancelarDe(e)}
                      >
                        Cancelar encomenda
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <div className="link-button" onClick={carregar}>
            Atualizar
          </div>
        </div>
      </div>

      {cancelarDe && (
        <div className="modal-overlay" style={{ zIndex: 55 }}>
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Cancelar Encomenda</div>
              <button className="modal-close" onClick={() => setCancelarDe(null)} disabled={cancelando}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: '#6b706c', lineHeight: 1.5, margin: '0 4px 16px', padding: 8, background: '#f4f6f4', borderRadius: 6 }}>
                Deseja cancelar a encomenda #{cancelarDe.codigo ?? cancelarDe.id}? Esta ação não pode ser desfeita.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  className="modal-btn cancel"
                  style={{ position: 'static', top: 0 }}
                  onClick={() => setCancelarDe(null)}
                  disabled={cancelando}
                >
                  Voltar
                </button>
                <button
                  className="modal-btn save"
                  style={{ position: 'static', top: 0 }}
                  onClick={confirmarCancelamento}
                  disabled={cancelando}
                >
                  {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cupomDe && (
        <CupomModal
          empresa={empresa}
          cliente={cliente}
          encomenda={cupomDe}
          onClose={() => setCupomDe(null)}
        />
      )}
    </div>
  );
}
