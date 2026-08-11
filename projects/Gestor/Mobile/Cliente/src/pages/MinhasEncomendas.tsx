import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extrairErro, listarEncomendasPublicas, type Encomenda } from '../api';
import { useSessao } from '../auth';
import CupomModal from '../components/CupomModal';
import { formatarDataBR, formatarMoeda } from '../format';

export default function MinhasEncomendas() {
  const navigate = useNavigate();
  const { empresa, cliente, sair } = useSessao();

  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [expandida, setExpandida] = useState<number | null>(null);
  const [cupomDe, setCupomDe] = useState<Encomenda | null>(null);

  const carregar = async () => {
    if (!empresa || !cliente) return;
    setCarregando(true);
    setErro('');
    try {
      setEncomendas(await listarEncomendasPublicas(empresa.id, cliente.cnpj_cpf || ''));
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

  if (!empresa || !cliente) {
    navigate('/', { replace: true });
    return null;
  }

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
          </div>
          <button
            className="confirm-btn save"
            style={{ height: 34, padding: '0 14px', fontSize: 12 }}
            onClick={() => navigate('/pedido')}
          >
            + Novo pedido
          </button>
        </div>

        {erro && <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 8 }}>{erro}</div>}

        {!carregando && encomendas.length === 0 && !erro && (
          <div style={{ fontSize: 12, color: '#9ca09d', textAlign: 'center', padding: '28px 0', border: '1px dashed #d6ddd0', borderRadius: 10 }}>
            Nenhuma encomenda encontrada para este documento
          </div>
        )}

        {encomendas.map((e) => (
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
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 20,
                      color: e.baixado ? '#0a7a3d' : '#b45309',
                      background: e.baixado ? '#e7f5ec' : '#fdf0dd',
                    }}
                  >
                    {e.baixado ? 'Baixada' : 'Aberta'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6b706c' }}>
                  {formatarDataBR(e.data_encomenda)} · {formatarMoeda(Number(e.valor_total) || 0)}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    className="confirm-btn save"
                    style={{ height: 30, padding: '0 14px', fontSize: 12 }}
                    onClick={() => setCupomDe(e)}
                  >
                    Ver cupom
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <div className="link-button" onClick={carregar}>
            Atualizar
          </div>
        </div>
      </div>

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