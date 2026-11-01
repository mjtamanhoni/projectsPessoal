import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { saldoDoTitulo, statusDoTitulo, tituloAtrasado } from '@/lib/titulosPagar';
import api from '@/lib/api';
import type { PagamentoEfetuado, TituloPagar } from '@/types';
import {
  AlertTriangle,
  CircleDollarSign,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, downloadPDF } from '@/lib/pdf';

type StatusFiltro = 'todos' | 'abertos' | 'atrasados' | 'baixados' | 'cancelados';

const STATUS_OPTIONS: { value: StatusFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'abertos', label: 'Em aberto' },
  { value: 'atrasados', label: 'Atrasados' },
  { value: 'baixados', label: 'Baixados' },
  { value: 'cancelados', label: 'Cancelados' },
];

interface RelatorioTitulosPagarProps {
  titulos: TituloPagar[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

function statusLabel(status: StatusFiltro): string {
  switch (status) {
    case 'abertos':
      return 'Em aberto';
    case 'atrasados':
      return 'Atrasados';
    case 'baixados':
      return 'Baixados';
    case 'cancelados':
      return 'Cancelados';
    default:
      return 'Todos';
  }
}

export function RelatorioTitulosPagar({ titulos, loading, error, onRefresh }: RelatorioTitulosPagarProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('todos');
  const [busca, setBusca] = useState('');
  const [pagamentos, setPagamentos] = useState<PagamentoEfetuado[]>([]);
  const [pagamentosLoading, setPagamentosLoading] = useState(true);
  const [pagamentosError, setPagamentosError] = useState<string | null>(null);

  const fetchPagamentos = useCallback(async () => {
    setPagamentosLoading(true);
    setPagamentosError(null);
    try {
      const response = await api.get('/pagamentos-efetuados');
      setPagamentos(response.data as PagamentoEfetuado[]);
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      setPagamentosError(errorData.response?.data?.error || errorData.message || 'Erro ao carregar pagamentos');
      setPagamentos([]);
    } finally {
      setPagamentosLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPagamentos(); }, [fetchPagamentos]);

  const pagamentosPorTitulo = useMemo(() => {
    const map = new Map<number, PagamentoEfetuado[]>();

    for (const pagamento of pagamentos) {
      const lista = map.get(pagamento.tituloId);
      if (lista) lista.push(pagamento);
      else map.set(pagamento.tituloId, [pagamento]);
    }

    for (const lista of map.values()) {
      lista.sort((a, b) => {
        const porData = String(b.dataPagamento ?? '').localeCompare(String(a.dataPagamento ?? ''));
        return porData !== 0 ? porData : Number(b.id ?? 0) - Number(a.id ?? 0);
      });
    }

    return map;
  }, [pagamentos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return titulos.filter((titulo) => {
      const vencimento = String(titulo.dataVencimento ?? '').slice(0, 10);
      if (dataInicio && vencimento < dataInicio) return false;
      if (dataFim && vencimento > dataFim) return false;

      const statusTitulo = (titulo.status || '').toUpperCase();
      if (status === 'abertos' && (statusTitulo === 'QUITADO' || statusTitulo === 'CANCELADO')) return false;
      if (status === 'baixados' && statusTitulo !== 'QUITADO') return false;
      if (status === 'cancelados' && statusTitulo !== 'CANCELADO') return false;
      if (status === 'atrasados' && !tituloAtrasado(titulo)) return false;

      if (!termo) return true;
      return [titulo.credor, titulo.descricao, titulo.numeroDocumento]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
    });
  }, [titulos, dataInicio, dataFim, status, busca]);

  const pagamentosFiltrados = useMemo(() => {
    const rows: { titulo: TituloPagar; pagamento: PagamentoEfetuado }[] = [];

    for (const titulo of filtrados) {
      if (!titulo.id) continue;
      for (const pagamento of pagamentosPorTitulo.get(titulo.id) ?? []) {
        rows.push({ titulo, pagamento });
      }
    }

    return rows;
  }, [filtrados, pagamentosPorTitulo]);

  const totais = useMemo(() => {
    const total = filtrados.reduce((acc, titulo) => acc + Number(titulo.valorTotal ?? 0), 0);
    const pago = filtrados.reduce((acc, titulo) => acc + Number(titulo.totalPago ?? 0), 0);
    const saldo = filtrados.reduce((acc, titulo) => acc + saldoDoTitulo(titulo), 0);
    const atrasados = filtrados.filter(tituloAtrasado);
    const totalAtrasado = atrasados.reduce((acc, titulo) => acc + saldoDoTitulo(titulo), 0);

    return {
      total,
      pago,
      saldo,
      totalAtrasado,
      qtd: filtrados.length,
      qtdAtrasados: atrasados.length,
    };
  }, [filtrados]);

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setStatus('todos');
    setBusca('');
  };

  const atualizar = () => {
    onRefresh?.();
    void fetchPagamentos();
  };

  const handleExport = () => {
    if (filtrados.length === 0) return;

    const filename = `relatorio-titulos-a-pagar-${new Date().toISOString().split('T')[0]}.pdf`;
    const filtros: string[] = [];

    if (dataInicio || dataFim) {
      filtros.push(`Vencimento: ${dataInicio ? formatDate(dataInicio) : 'início'} a ${dataFim ? formatDate(dataFim) : 'fim'}`);
    } else {
      filtros.push('Vencimento: Todos');
    }
    filtros.push(`Status: ${statusLabel(status)}`);
    if (busca.trim()) filtros.push(`Busca: ${busca.trim()}`);

    const doc = buildPDFWithHeader(
      {
        title: 'Relatório de Títulos a Pagar',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
        filters: filtros,
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);

        autoTable(d, {
          head: [['Indicador', 'Valor']],
          body: [
            ['Total dos Títulos', formatCurrency(totais.total)],
            ['Total Pago', formatCurrency(totais.pago)],
            ['Saldo', formatCurrency(totais.saldo)],
            ['Em Atraso', formatCurrency(totais.totalAtrasado)],
            ['Títulos', `${totais.qtd} (${totais.qtdAtrasados} atrasado(s))`],
          ],
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
          columnStyles: { 1: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 1) {
              data.cell.styles.halign = 'right';
            }
          },
        });

        const finalY = (d as any).lastAutoTable.finalY;
        d.setFontSize(12);
        d.setFont('helvetica', 'bold');
        d.text('Relação de Títulos', 14, finalY + 10);

        autoTable(d, {
          head: [['Credor', 'Documento', 'Vencimento', 'Total', 'Pago', 'Saldo', 'Status']],
          body: filtrados.map((titulo) => [
            titulo.credor,
            titulo.numeroDocumento || '-',
            formatDate(titulo.dataVencimento),
            formatCurrency(Number(titulo.valorTotal ?? 0)),
            formatCurrency(Number(titulo.totalPago ?? 0)),
            formatCurrency(saldoDoTitulo(titulo)),
            statusDoTitulo(titulo).label,
          ]),
          startY: finalY + 15,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 7 },
          columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && [3, 4, 5].includes(data.column.index)) {
              data.cell.styles.halign = 'right';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 42;
            }
          },
        });

        const finalTitulosY = (d as any).lastAutoTable.finalY;
        d.setFontSize(12);
        d.setFont('helvetica', 'bold');
        d.text('Pagamentos Efetivados', 14, finalTitulosY + 10);

        if (pagamentosFiltrados.length === 0) {
          d.setFontSize(9);
          d.setFont('helvetica', 'normal');
          d.text('Nenhum pagamento efetivado para os títulos filtrados.', 14, finalTitulosY + 17);
          return;
        }

        autoTable(d, {
          head: [['Credor', 'Documento', 'Data', 'Valor Pago', 'Forma', 'Observação', 'Usuário']],
          body: pagamentosFiltrados.map(({ titulo, pagamento }) => [
            titulo.credor,
            titulo.numeroDocumento || '-',
            formatDate(pagamento.dataPagamento),
            formatCurrency(Number(pagamento.valorPago)),
            pagamento.formaPagamento || '-',
            pagamento.observacao || '-',
            pagamento.usuarioNome || '-',
          ]),
          startY: finalTitulosY + 15,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 7 },
          columnStyles: { 3: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 3) {
              data.cell.styles.halign = 'right';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 42;
            }
          },
        });
      }
    );

    downloadPDF(doc, filename);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Total dos Títulos</p>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-red">{formatCurrency(totais.total)}</p>
          <p className="text-xs text-text-muted mt-1">{totais.qtd} título(s)</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Total Pago</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <CircleDollarSign size={20} className="text-accent-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-primary">{formatCurrency(totais.pago)}</p>
          <p className="text-xs text-text-muted mt-1">Pagamentos efetivados</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Saldo a Pagar</p>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet size={20} className="text-purple-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${totais.saldo > 0 ? 'text-accent-red' : 'text-accent-primary'}`}>
            {formatCurrency(totais.saldo)}
          </p>
          <p className="text-xs text-text-muted mt-1">Soma dos saldos devedores</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Em Atraso</p>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-red">{formatCurrency(totais.totalAtrasado)}</p>
          <p className="text-xs text-text-muted mt-1">{totais.qtdAtrasados} título(s) atrasado(s)</p>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Vencimento de</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Vencimento até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFiltro)}
              className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[240px] flex-1">
            <label className="block text-sm text-text-secondary mb-1">Buscar</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Credor, descrição ou documento"
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
            />
          </div>
          <button
            type="button"
            onClick={limparFiltros}
            className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors"
          >
            Limpar
          </button>
          <div className="ml-auto flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={atualizar}
                disabled={loading || pagamentosLoading}
                className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors disabled:opacity-50"
                title="Atualizar"
              >
                <RefreshCw size={18} className={`text-text-secondary ${loading || pagamentosLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={filtrados.length === 0 || pagamentosLoading}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} /> Exportar PDF
            </button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-accent-red mb-3">{error}</p>
            {onRefresh && (
              <button type="button" onClick={atualizar} className="btn-secondary text-sm">
                Tentar novamente
              </button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Relação de Títulos</h2>
            <div className="flex items-center gap-3">
              {pagamentosLoading && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Loader2 size={14} className="animate-spin" /> Pagamentos...
                </span>
              )}
              <span className="text-sm text-text-secondary">{filtrados.length} registro(s)</span>
            </div>
          </div>

          {pagamentosError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-accent-red">
              {pagamentosError}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-accent-primary" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Nenhum título encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left font-medium text-text-secondary py-3 px-3">Credor</th>
                    <th className="text-left font-medium text-text-secondary py-3 px-3">Documento</th>
                    <th className="text-left font-medium text-text-secondary py-3 px-3">Vencimento</th>
                    <th className="text-right font-medium text-text-secondary py-3 px-3">Total</th>
                    <th className="text-right font-medium text-text-secondary py-3 px-3">Pago</th>
                    <th className="text-right font-medium text-text-secondary py-3 px-3">Saldo</th>
                    <th className="text-left font-medium text-text-secondary py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtrados.map((titulo, index) => {
                    const statusTitulo = statusDoTitulo(titulo);
                    const pagamentosTitulo = titulo.id ? pagamentosPorTitulo.get(titulo.id) ?? [] : [];
                    const totalPagoTitulo = pagamentosTitulo.reduce(
                      (acc, pagamento) => acc + Number(pagamento.valorPago ?? 0),
                      0
                    );

                    return (
                      <Fragment key={titulo.id ?? index}>
                        <tr className="hover:bg-bg-muted/50 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-medium text-text-primary">{titulo.credor}</p>
                            {titulo.descricao && (
                              <p className="text-xs text-text-secondary">{titulo.descricao}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-text-secondary">{titulo.numeroDocumento || '-'}</td>
                          <td className="py-3 px-3 text-text-secondary">{formatDate(titulo.dataVencimento)}</td>
                          <td className="py-3 px-3 text-right font-mono text-text-primary">
                            {formatCurrency(Number(titulo.valorTotal ?? 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-accent-primary">
                            {formatCurrency(Number(titulo.totalPago ?? 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-accent-red">
                            {formatCurrency(saldoDoTitulo(titulo))}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`status-badge ${statusTitulo.className}`}>{statusTitulo.label}</span>
                          </td>
                        </tr>

                        {pagamentosTitulo.length > 0 && (
                          <tr className="bg-bg-muted/30">
                            <td colSpan={7} className="px-3 pb-3">
                              <div className="overflow-hidden rounded-lg border border-border-primary bg-bg-card">
                                <div className="flex flex-wrap items-center justify-between gap-2 bg-bg-muted/50 px-3 py-2">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Pagamentos efetivados
                                  </span>
                                  <span className="text-xs text-text-secondary">
                                    {pagamentosTitulo.length} pagamento(s) · Total:{' '}
                                    <strong className="text-accent-primary">{formatCurrency(totalPagoTitulo)}</strong>
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border-subtle text-text-secondary">
                                        <th className="px-3 py-2 text-left font-medium">Data</th>
                                        <th className="px-3 py-2 text-right font-medium">Valor</th>
                                        <th className="px-3 py-2 text-left font-medium">Forma</th>
                                        <th className="px-3 py-2 text-left font-medium">Observação</th>
                                        <th className="px-3 py-2 text-left font-medium">Usuário</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                      {pagamentosTitulo.map((pagamento) => (
                                        <tr
                                          key={pagamento.id ?? `${pagamento.tituloId}-${pagamento.dataPagamento}-${pagamento.valorPago}`}
                                        >
                                          <td className="px-3 py-2 text-text-primary">
                                            {formatDate(pagamento.dataPagamento)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-accent-primary">
                                            {formatCurrency(Number(pagamento.valorPago))}
                                          </td>
                                          <td className="px-3 py-2 text-text-secondary">{pagamento.formaPagamento || '-'}</td>
                                          <td className="px-3 py-2 text-text-secondary">{pagamento.observacao || '-'}</td>
                                          <td className="px-3 py-2 text-text-secondary">{pagamento.usuarioNome || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-primary font-semibold">
                    <td className="py-3 px-3 text-text-primary" colSpan={3}>Totais ({filtrados.length})</td>
                    <td className="py-3 px-3 text-right font-mono text-text-primary">{formatCurrency(totais.total)}</td>
                    <td className="py-3 px-3 text-right font-mono text-accent-primary">{formatCurrency(totais.pago)}</td>
                    <td className="py-3 px-3 text-right font-mono text-accent-red">{formatCurrency(totais.saldo)}</td>
                    <td className="py-3 px-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
