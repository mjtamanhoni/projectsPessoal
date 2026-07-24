import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

interface DashboardChartProps {
  receitasPorMes: { mes: string; valor: number }[];
  despesasPorMes: { mes: string; valor: number }[];
  receberAberto: number;
  receberRecebido: number;
  pagarAberto: number;
  pagarPago: number;
  lucroPorMes: { mes: string; lucro: number }[];
}

const COLORS_RECEITA = ['#2D5E3A', '#A3C4A3'];
const COLORS_DESPESA = ['#B84A4A', '#E8A0A0'];
const COLORS_LUCRO_POS = '#2D5E3A';
const COLORS_LUCRO_NEG = '#B84A4A';

export function DashboardChart({
  receitasPorMes, despesasPorMes,
  receberAberto, receberRecebido,
  pagarAberto, pagarPago,
  lucroPorMes,
}: DashboardChartProps) {
  const barData = receitasPorMes.map((r, i) => ({
    name: r.mes,
    receber: r.valor,
    pagar: despesasPorMes[i]?.valor || 0,
  }));

  const receberPie = [
    { name: 'Aberto', value: receberAberto },
    { name: 'Recebido', value: receberRecebido },
  ];

  const pagarPie = [
    { name: 'Aberto', value: pagarAberto },
    { name: 'Pago', value: pagarPago },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-text-primary mb-6">Receitas vs Despesas (últimos 6 meses)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
              <XAxis dataKey="name" tick={{ fill: '#6B706C', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B706C', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
              <Bar dataKey="receber" name="A Receber" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pagar" name="A Pagar" fill="#B84A4A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Contas a Receber</h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={receberPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                {receberPie.map((_, i) => (
                  <Cell key={i} fill={COLORS_RECEITA[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Contas a Pagar</h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pagarPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                {pagarPie.map((_, i) => (
                  <Cell key={i} fill={COLORS_DESPESA[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-text-primary mb-6">Lucro / Prejuízo (ano atual)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lucroPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
              <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B706C', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="lucro"
                name="Lucro/Prejuízo"
                stroke="#2D5E3A"
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number; payload: { lucro: number } }) => {
                  if (props.cx == null || props.cy == null) return <></>;
                  const color = props.payload.lucro >= 0 ? COLORS_LUCRO_POS : COLORS_LUCRO_NEG;
                  return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
