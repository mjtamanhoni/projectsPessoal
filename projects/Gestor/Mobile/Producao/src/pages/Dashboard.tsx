import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extrairErro, fetchDashboard, type DashboardData } from '../api';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatCompact(v: number): string {
  const abs = Math.abs(v);
  const sinal = v < 0 ? '-' : '';
  const n = (x: number) =>
    x.toFixed(1).replace('.', ',').replace(/,\d(?=\D|$)/, (m) => (m[1] === '0' ? '' : m)).replace(',0', '');
  if (abs >= 1_000_000) return `${sinal}R$ ${n(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sinal}R$ ${n(abs / 1_000)}k`;
  return `${sinal}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro('');
    fetchDashboard(ano, mes)
      .then((d) => {
        if (ativo) setData(d);
      })
      .catch((e) => {
        if (ativo) setErro(extrairErro(e));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [ano, mes]);

  const navegar = (delta: number) => {
    let m = mes + delta;
    let a = ano;
    if (m < 1) {
      m = 12;
      a -= 1;
    }
    if (m > 12) {
      m = 1;
      a += 1;
    }
    setMes(m);
    setAno(a);
  };

  const k = data?.kpis;

  const mensalVendas = data?.mensal_vendas ?? [];
  const mensalFabricacao = data?.mensal_fabricacao ?? [];
  const vendasMensal: number[] = [];
  const custoMensal: number[] = [];
  for (let i = 1; i <= 12; i++) {
    vendasMensal.push(mensalVendas.find((v) => v.mes === i)?.valor ?? 0);
    custoMensal.push(mensalFabricacao.find((v) => v.mes === i)?.custo_total ?? 0);
  }
  const maxMensal = Math.max(...vendasMensal, ...custoMensal, 1);

  const diarioVendas = (data?.diario_vendas ?? []).map((d) => ({
    dia: new Date(d.dia).getDate(),
    valor: d.valor,
  }));
  const maxDiario = Math.max(...diarioVendas.map((d) => d.valor), 1);

  const hBarra = (v: number, max: number, area: number) => (v > 0 ? Math.max(3, (v / max) * area) : 0);

  return (
    <div className="screen">
      <div className="dashboard-header" />
      <button className="dashboard-hamburger" onClick={() => navigate('/menu')}>
        ☰
      </button>
      <div className="dashboard-title">Dashboard Produção</div>
      <div className="dashboard-subtitle">Compras, fabricação e vendas</div>

      <div className="filter-bar">
        <button className="arrow" onClick={() => navegar(-1)}>
          &lt;
        </button>
        <span className="filter-label">
          {MESES[mes - 1]} {ano}
        </span>
        <button className="arrow" onClick={() => navegar(1)}>
          &gt;
        </button>
      </div>

      {loading && (
        <div style={{ position: 'absolute', left: 0, top: 400, width: 390, textAlign: 'center', fontSize: 12, color: '#6b706c' }}>
          Carregando...
        </div>
      )}
      {!loading && erro && (
        <div style={{ position: 'absolute', left: 0, top: 400, width: 390, textAlign: 'center', fontSize: 12, color: '#c0392b' }}>
          {erro}
        </div>
      )}

      {k && (
        <>
          <div className="kpi-row" style={{ top: 118, width: 362 }}>
            {[
              { icon: '💰', bg: '#22c55e', label: 'Vendas', value: formatCompact(k.total_vendas), sub: `${k.qtd_vendas} vendas` },
              { icon: '🛒', bg: '#f97316', label: 'Compras', value: formatCompact(k.total_compras), sub: `${k.qtd_compras} compras` },
              { icon: '📦', bg: '#3b82f6', label: 'Fabricado', value: `${k.qtd_fabricada.toLocaleString('pt-BR')} un`, sub: `${k.qtd_fabricacoes} fab.` },
            ].map((item) => (
              <div key={item.label} className="kpi-card" style={{ width: 115 }}>
                <div className="kpi-top">
                  <div className="kpi-icon" style={{ background: item.bg }}>
                    {item.icon}
                  </div>
                  <div className="kpi-label">{item.label}</div>
                </div>
                <div className="kpi-value">{item.value}</div>
                <div className="kpi-sub">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="kpi-row" style={{ top: 204, width: 362 }}>
            {[
              { icon: '📉', bg: '#a855f7', label: 'Lucro Bruto', value: formatCompact(k.lucro_bruto), sub: 'Vendas - Custo' },
              { icon: '💰', bg: '#6366f1', label: 'Lucro Líquido', value: formatCompact(k.lucro_liquido), sub: 'V-(Compras+Custo)' },
            ].map((item) => (
              <div key={item.label} className="kpi-card" style={{ width: 177 }}>
                <div className="kpi-top">
                  <div className="kpi-icon" style={{ background: item.bg }}>
                    {item.icon}
                  </div>
                  <div className="kpi-label">{item.label}</div>
                </div>
                <div className="kpi-value">{item.value}</div>
                <div className="kpi-sub">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="chart-card" style={{ top: 298, width: 362, height: 220 }}>
            <div className="chart-title">📊&nbsp;&nbsp;Vendas vs Custo</div>
            <div className="chart-bg" style={{ height: 170 }}>
              {vendasMensal.map((v, i) => {
                const hV = hBarra(v, maxMensal, 150);
                const hC = hBarra(custoMensal[i], maxMensal, 150);
                return (
                  <div key={i}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 16 + i * 26,
                        bottom: 0,
                        width: 11,
                        height: hV,
                        background: '#2d5e3a',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 27 + i * 26,
                        bottom: 0,
                        width: 11,
                        height: hC,
                        background: '#c47a5a',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="chart-card" style={{ top: 534, width: 362, height: 200 }}>
            <div className="chart-title">📈&nbsp;&nbsp;Vendas por Dia — {MESES[mes - 1]}</div>
            <div className="chart-bg" style={{ height: 150 }}>
              {diarioVendas.map((d, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 8 + i * 10,
                    bottom: 0,
                    width: 8,
                    height: hBarra(d.valor, maxDiario, 130),
                    background: '#2d5e3a',
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="version" style={{ top: 810 }}>
        Oficina de Sabores v1.5
      </div>
    </div>
  );
}
