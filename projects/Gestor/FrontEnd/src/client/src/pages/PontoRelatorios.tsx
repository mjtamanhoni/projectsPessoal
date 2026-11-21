import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { PrintButton } from '@/components/ui/PrintButton';
import { PontoNav } from '@/components/ponto/PontoNav';
import { useToast } from '@/context/ToastContext';
import { competenciaAtual, exportarCsv, formatHoras, labelMes } from '@/lib/ponto';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PrintColumn } from '@/lib/cadastro-pdf';
import type { PontoDashboardData, PontoLancamento, PontoResumo, Usuario, Cliente, Servico } from '@/types';
import api from '@/lib/api';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

type TipoRelatorio = 'marcacoes' | 'excedentes' | 'consolidado';

const TIPOS: Array<{ valor: TipoRelatorio; label: string }> = [
  { valor: 'marcacoes', label: 'Marcações' },
  { valor: 'excedentes', label: 'Horas Excedidas' },
  { valor: 'consolidado', label: 'Consolidado Mensal' },
];

interface Tabela {
  titulo: string;
  cabecalho: string[];
  linhas: Array<Array<string | number>>;
  total?: Array<string | number>;
}

export function PontoRelatorios() {
  const [tipo, setTipo] = useState<TipoRelatorio>('marcacoes');
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(undefined);
  const [filtroClienteId, setFiltroClienteId] = useState<number | undefined>(undefined);
  const [filtroServicoId, setFiltroServicoId] = useState<number | undefined>(undefined);
  const [marcacoes, setMarcacoes] = useState<PontoLancamento[]>([]);
  const [resumo, setResumo] = useState<PontoResumo[]>([]);
  const [dashboard, setDashboard] = useState<PontoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/usuarios'), api.get('/clientes'), api.get('/servicos')])
      .then(([u, c, s]) => {
        setUsuarios(u.data as Usuario[]);
        setClientes(c.data as Cliente[]);
        setServicos(s.data as Servico[]);
      })
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    const [ano, mes] = competencia.split('-').map(Number);
    const params: Record<string, string | number> = { ano, mes };
    if (filtroUsuarioId) params.usuario_id = filtroUsuarioId;
    if (filtroClienteId) params.cliente_id = filtroClienteId;
    if (filtroServicoId) params.servico_id = filtroServicoId;

    setLoading(true);
    try {
      if (tipo === 'marcacoes') {
        const res = await api.get('/ponto-eletronico/lancamentos', { params });
        setMarcacoes(Array.isArray(res.data) ? (res.data as PontoLancamento[]) : []);
      } else if (tipo === 'excedentes') {
        const res = await api.get('/ponto-eletronico/resumo', { params });
        setResumo(Array.isArray(res.data) ? (res.data as PontoResumo[]) : []);
      } else {
        const res = await api.get('/ponto-eletronico/dashboard', { params });
        setDashboard(res.data as PontoDashboardData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar relatorio';
      addToast('error', msg);
      setMarcacoes([]);
      setResumo([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [tipo, competencia, filtroUsuarioId, filtroClienteId, filtroServicoId, addToast]);

  useEffect(() => { carregar(); }, [carregar]);

  const [ano, mes] = competencia.split('-').map(Number);
  const periodo = `${labelMes(mes)} / ${ano}`;

  const tabela = useMemo<Tabela>(() => {
    if (tipo === 'marcacoes') {
      return {
        titulo: `Marcações de Ponto — ${periodo}`,
        cabecalho: ['Data', 'Hora', 'Usuário', 'Cliente', 'Serviço', 'Tipo', 'Observações'],
        linhas: marcacoes.map((m) => [
          formatDate(m.dataServico),
          m.horaLancamento,
          m.usuarioNome || '',
          m.clienteNome || '',
          m.servicoNome || '',
          m.tipoLancamento === 'E' ? 'Entrada' : 'Saída',
          m.observacoes || '',
        ]),
      };
    }

    if (tipo === 'excedentes') {
      const total = resumo.reduce(
        (acc, r) => ({
          base: acc.base + (r.horasBase || 0),
          trabalhadas: acc.trabalhadas + (r.horasTrabalhadas || 0),
          abatidas: acc.abatidas + (r.horasAbatidas || 0),
          manual: acc.manual + (r.horasExcedidasManual || 0),
          delta: acc.delta + (r.deltaHoras || 0),
          valor: acc.valor + (r.deltaHoras || 0) * (r.valorHora || 0),
        }),
        { base: 0, trabalhadas: 0, abatidas: 0, manual: 0, delta: 0, valor: 0 },
      );
      return {
        titulo: `Horas Excedidas — ${periodo}`,
        cabecalho: ['Usuário', 'Cliente', 'Serviço', 'Base', 'Trabalhadas', 'Abatidas', 'Ajuste', 'Excedente', 'Valor'],
        linhas: resumo.map((r) => [
          r.usuarioNome || '',
          r.clienteNome || '',
          r.servicoNome || '',
          formatHoras(r.horasBase || 0),
          formatHoras(r.horasTrabalhadas || 0),
          formatHoras(r.horasAbatidas || 0),
          formatHoras(r.horasExcedidasManual || 0),
          formatHoras(r.deltaHoras || 0),
          formatCurrency((r.deltaHoras || 0) * (r.valorHora || 0)),
        ]),
        total: ['TOTAL', '', '', formatHoras(total.base), formatHoras(total.trabalhadas), formatHoras(total.abatidas), formatHoras(total.manual), formatHoras(total.delta), formatCurrency(total.valor)],
      };
    }

    const mensal = dashboard?.mensal ?? [];
    const total = mensal.reduce(
      (acc, m) => ({
        trabalhadas: acc.trabalhadas + m.trabalhadas,
        base: acc.base + m.base,
        abatidas: acc.abatidas + m.abatidas,
        excedentes: acc.excedentes + m.excedentes,
      }),
      { trabalhadas: 0, base: 0, abatidas: 0, excedentes: 0 },
    );
    return {
      titulo: `Consolidado Mensal — ${ano}`,
      cabecalho: ['Mês', 'Trabalhadas', 'Base', 'Abatidas', 'Excedentes'],
      linhas: mensal.map((m) => [
        m.label || labelMes(m.mes),
        formatHoras(m.trabalhadas),
        formatHoras(m.base),
        formatHoras(m.abatidas),
        formatHoras(m.excedentes),
      ]),
      total: ['TOTAL', formatHoras(total.trabalhadas), formatHoras(total.base), formatHoras(total.abatidas), formatHoras(total.excedentes)],
    };
  }, [tipo, periodo, ano, marcacoes, resumo, dashboard]);

  const printData = useMemo(() => {
    const base = tabela.linhas.map((linha) => {
      const obj: Record<string, unknown> = {};
      linha.forEach((valor, idx) => { obj[`c${idx}`] = valor; });
      return obj;
    });
    if (tabela.total) {
      const obj: Record<string, unknown> = {};
      tabela.total.forEach((valor, idx) => { obj[`c${idx}`] = valor; });
      base.push(obj);
    }
    return base;
  }, [tabela]);

  const printColumns = useMemo<PrintColumn[]>(
    () => tabela.cabecalho.map((header, idx) => ({
      header,
      accessor: (row: Record<string, unknown>) => (row[`c${idx}`] as string | number) ?? '',
    })),
    [tabela],
  );

  const handleExportar = () => {
    const linhas = tabela.total ? [...tabela.linhas, tabela.total] : tabela.linhas;
    exportarCsv(`${tipo}-ponto-${competencia}.csv`, tabela.cabecalho, linhas);
    addToast('success', 'Relatorio exportado em CSV');
  };

  const colunasNumericas = ['Base', 'Trabalhadas', 'Abatidas', 'Ajuste', 'Excedente', 'Valor'];

  return (
    <Layout>
      <PageHeader
        title="Ponto Eletrônico · Relatórios"
        subtitle="Consulte, exporte e imprima as informações do ponto"
      >
        <Button variant="secondary" onClick={handleExportar} disabled={tabela.linhas.length === 0}>
          <Download size={16} /> CSV
        </Button>
        <PrintButton title={tabela.titulo} data={printData} columns={printColumns} />
      </PageHeader>

      <PontoNav />

      <Card className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-muted border border-border-subtle">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                onClick={() => setTipo(t.valor)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tipo === t.valor
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-bg-card px-3 text-sm text-text-primary"
          />
          <RegistroSelect<number>
            value={filtroUsuarioId ?? null}
            onChange={(v) => setFiltroUsuarioId(v)}
            onClear={() => setFiltroUsuarioId(undefined)}
            options={usuarios.map((u) => ({ value: (u.id ?? u.codigo)!, label: u.nome }))}
            title="Filtro por Usuario"
            placeholder="Todos os usuarios"
          />
          <RegistroSelect<number>
            value={filtroClienteId ?? null}
            onChange={(v) => setFiltroClienteId(v)}
            onClear={() => setFiltroClienteId(undefined)}
            options={clientes.map((c) => ({ value: (c.id ?? c.codigo)!, label: c.nome }))}
            title="Filtro por Cliente"
            placeholder="Todos os clientes"
          />
          <RegistroSelect<number>
            value={filtroServicoId ?? null}
            onChange={(v) => setFiltroServicoId(v)}
            onClear={() => setFiltroServicoId(undefined)}
            options={servicos.map((s) => ({ value: (s.id ?? s.codigo)!, label: s.nome }))}
            title="Filtro por Servico"
            placeholder="Todos os servicos"
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-accent-primary" />
            <h2 className="text-lg font-semibold text-text-primary">{tabela.titulo}</h2>
          </div>
          <span className="text-sm text-text-secondary">{tabela.linhas.length} registro(s)</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-accent-primary" />
          </div>
        ) : tabela.linhas.length === 0 ? (
          <div className="flex justify-center py-16">
            <p className="text-sm text-text-muted">Nenhum registro encontrado para o periodo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  {tabela.cabecalho.map((header) => (
                    <th
                      key={header}
                      className={`py-2 px-3 text-text-secondary font-medium whitespace-nowrap ${
                        colunasNumericas.includes(header) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((linha, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    {linha.map((valor, colIdx) => {
                      const numerica = colunasNumericas.includes(tabela.cabecalho[colIdx]);
                      return (
                        <td
                          key={colIdx}
                          className={`py-2 px-3 text-text-primary whitespace-nowrap ${
                            numerica ? 'text-right font-mono' : colIdx === 0 ? 'text-left font-medium' : 'text-left'
                          }`}
                        >
                          {valor}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {tabela.total && (
                  <tr className="bg-bg-muted/60 font-semibold">
                    {tabela.total.map((valor, colIdx) => {
                      const numerica = colunasNumericas.includes(tabela.cabecalho[colIdx]);
                      return (
                        <td
                          key={colIdx}
                          className={`py-2 px-3 text-text-primary whitespace-nowrap ${
                            numerica ? 'text-right font-mono' : 'text-left'
                          }`}
                        >
                          {valor}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
}
