import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import type { Encomenda, EncomendaItem, Cliente } from '@/types';
import { CheckCircle, XCircle, Printer, RefreshCw, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, parseItemCustomizacao } from '@/lib/utils';
import { getEncomendasRefreshSegundos, getCachedSettings } from '@/lib/settings';
import { gerarTextoCupomEncomenda, imprimirCupomEncomendaSerial, type CupomEncomendaData } from '@/lib/cupom-encomenda';
import api from '@/lib/api';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<Encomenda>();

const ETAPAS_ENCOMENDA: Record<number, { label: string; badge: string }> = {
  0: { label: 'Aguardando', badge: 'bg-yellow-100 text-yellow-800' },
  1: { label: 'Em producao', badge: 'bg-blue-100 text-blue-800' },
  2: { label: 'Finalizado', badge: 'bg-green-100 text-green-800' },
  3: { label: 'Saiu p/ Entrega', badge: 'bg-purple-100 text-purple-800' },
  4: { label: 'Entregue', badge: 'bg-emerald-100 text-emerald-800' },
  5: { label: 'Cancelada', badge: 'bg-red-100 text-red-800' },
};

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatData(d?: string): string {
  if (!d) return '-';
  const date = new Date(`${d.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('pt-BR');
}

function formatDescricaoCustomizacao(item: EncomendaItem): string {
  const partes: string[] = [];
  const rems = Array.isArray(item.removidos) ? item.removidos : [];
  const nomesRem = (rems as unknown[])
    .map((r) => (typeof r === 'string' ? r : String((r as { nome?: unknown })?.nome ?? '')))
    .filter(Boolean);
  if (nomesRem.length > 0) partes.push(`Sem: ${nomesRem.join(', ')}`);
  const adds = Array.isArray(item.adicionais) ? item.adicionais : [];
  if (adds.length > 0) {
    partes.push(
      `+ ${adds
        .map((a) => `${a.nome}${Number(a.quantidade) > 1 ? ` x${Number(a.quantidade)}` : ''}`)
        .join(', ')}`,
    );
  }
  return partes.join(' • ');
}

export function AcompanharEncomendas() {
  const { data: encomendas, loading, error, refetch } = useApi<Encomenda>('/encomendas');
  const { empresa, pausarTimerInatividade, retomarTimerInatividade } = useAuth();
  const { addToast } = useToast();

  const [dataFiltro, setDataFiltro] = useState<string>(hoje());
  const [refreshSeg, setRefreshSeg] = useState<number>(() => getEncomendasRefreshSegundos());
  const [loadedItens, setLoadedItens] = useState<Record<number, EncomendaItem[]>>({});
  const [loadedEnderecos, setLoadedEnderecos] = useState<Record<number, { endereco?: string; nr?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string; retira_estabelecimento?: number; latitude?: number; longitude?: number; place_id?: string }>>({});
  const [viewEncomenda, setViewEncomenda] = useState<Encomenda | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const impressosRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    pausarTimerInatividade();
    return () => retomarTimerInatividade();
  }, [pausarTimerInatividade, retomarTimerInatividade]);

  useEffect(() => {
    const onSaved = () => setRefreshSeg(getEncomendasRefreshSegundos());
    window.addEventListener('settings:saved', onSaved);
    return () => window.removeEventListener('settings:saved', onSaved);
  }, []);

  useEffect(() => {
    if (!refreshSeg || refreshSeg <= 0) return;
    const id = setInterval(() => { void refetch(); }, refreshSeg * 1000);
    return () => clearInterval(id);
  }, [refreshSeg, refetch]);

  useEffect(() => {
    api.get('/clientes').then((r) => setClientes(r.data as Cliente[])).catch(() => {});
  }, []);

  const encomendasDia = useMemo(() => {
    return (encomendas ?? []).filter((e) => {
      const d = e.data_encomenda?.slice(0, 10);
      return d === dataFiltro;
    });
  }, [encomendas, dataFiltro]);

  const totalDia = encomendasDia.length;
  const canceladasDia = encomendasDia.filter((e) => (e.status ?? 0) === 5).length;

  const fetchItens = useCallback(async (encomendaId: number) => {
    try {
      const response = await api.get('/encomendas', { params: { id: encomendaId } });
      const rows = response.data as any[];
      const itens = rows.map((row: any) => ({
        item_id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        produto_venda_id: row.produto_venda_id,
        produto_venda_nome: row.produto_venda_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
        ...parseItemCustomizacao(row),
      }));
      setLoadedItens((prev) => ({ ...prev, [encomendaId]: itens }));
      if (rows.length > 0) {
        const first = rows[0];
        if (first.eee_endereco || first.eee_cep || first.eee_retira_estabelecimento) {
          setLoadedEnderecos((prev) => ({
            ...prev,
            [encomendaId]: {
              endereco: first.eee_endereco,
              nr: first.eee_nr,
              complemento: first.eee_complemento,
              bairro: first.eee_bairro,
              cidade: first.eee_cidade,
              uf: first.eee_uf,
              retira_estabelecimento: first.eee_retira_estabelecimento,
              latitude: first.eee_latitude != null ? Number(first.eee_latitude) : undefined,
              longitude: first.eee_longitude != null ? Number(first.eee_longitude) : undefined,
              place_id: first.eee_place_id,
            },
          }));
        }
      }
    } catch {
      setLoadedItens((prev) => ({ ...prev, [encomendaId]: [] }));
    }
  }, []);

  const handleAlterarStatus = async (encomenda: Encomenda, novoStatus: number) => {
    try {
      await api.post('/encomendas/status', {
        id: encomenda.id,
        status: novoStatus,
      });
      await refetch();
      addToast('success', `Encomenda movida para "${ETAPAS_ENCOMENDA[novoStatus].label}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status';
      addToast('error', msg);
    }
  };

  const handleReimprimir = useCallback(async (encomenda: Encomenda) => {
    try {
      const response = await api.get('/encomendas', { params: { id: encomenda.id } });
      const rows = response.data as any[];
      if (!rows || rows.length === 0) {
        addToast('error', 'Encomenda nao encontrada');
        return;
      }
      const itens: EncomendaItem[] = rows.map((row: any) => ({
        item_id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        produto_venda_id: row.produto_venda_id,
        produto_venda_nome: row.produto_venda_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
        ...parseItemCustomizacao(row),
      }));

      const cliente = clientes.find((c) => c.id === encomenda.cliente_id) || null;

      const dados: CupomEncomendaData = {
        empresaNome: empresa?.fantasia || empresa?.razao_social || '',
        empresaCnpj: empresa?.cnpj_cpf || '',
        empresaEndereco: empresa?.endereco || '',
        empresaTelefone: empresa?.telefone || empresa?.celular || '',
        empresaEmail: empresa?.email || '',
        encomenda: { ...encomenda, itens },
        cliente,
      };

      const texto = gerarTextoCupomEncomenda(dados);
      const settings = getCachedSettings();
      if (!settings?.printer?.porta) {
        addToast('error', 'Configure a impressora termica nas Configuracoes');
        return;
      }

      const textoSerial = imprimirCupomEncomendaSerial(texto);
      await api.post('/print/cupom', {
        texto: textoSerial,
        modelo: settings.printer.modelo,
        porta: settings.printer.porta,
        deviceParams: settings.printer.deviceParams,
        colunas: settings.printer.colunas,
        cortarPapel: settings.printer.cortarPapel,
        espacoEntreLinhas: settings.printer.espacoEntreLinhas,
        linhasBuffer: settings.printer.linhasBuffer,
        linhasPular: settings.printer.linhasPular,
      });
      addToast('success', 'Cupom enviado para impressao');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao imprimir';
      addToast('error', msg);
    }
  }, [clientes, empresa, addToast]);

  const handleAutoPrint = useCallback(async (encomenda: Encomenda) => {
    if (!encomenda.id) return;
    if (impressosRef.current.has(encomenda.id)) return;

    try {
      const response = await api.get('/encomendas', { params: { id: encomenda.id } });
      const rows = response.data as any[];
      if (!rows || rows.length === 0) return;

      const encomendaImpresso = rows[0]?.impresso ?? 0;
      if (encomendaImpresso !== 0) return;

      const itens: EncomendaItem[] = rows.map((row: any) => ({
        item_id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        produto_venda_id: row.produto_venda_id,
        produto_venda_nome: row.produto_venda_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
        ...parseItemCustomizacao(row),
      }));

      const cliente = clientes.find((c) => c.id === encomenda.cliente_id) || null;
      const settings = getCachedSettings();
      if (!settings?.printer?.porta) return;

      const dados: CupomEncomendaData = {
        empresaNome: empresa?.fantasia || empresa?.razao_social || '',
        empresaCnpj: empresa?.cnpj_cpf || '',
        empresaEndereco: empresa?.endereco || '',
        empresaTelefone: empresa?.telefone || empresa?.celular || '',
        empresaEmail: empresa?.email || '',
        encomenda: { ...encomenda, itens },
        cliente,
      };

      const texto = gerarTextoCupomEncomenda(dados);
      const textoSerial = imprimirCupomEncomendaSerial(texto);
      await api.post('/print/cupom', {
        texto: textoSerial,
        modelo: settings.printer.modelo,
        porta: settings.printer.porta,
        deviceParams: settings.printer.deviceParams,
        colunas: settings.printer.colunas,
        cortarPapel: settings.printer.cortarPapel,
        espacoEntreLinhas: settings.printer.espacoEntreLinhas,
        linhasBuffer: settings.printer.linhasBuffer,
        linhasPular: settings.printer.linhasPular,
      });

      impressosRef.current.add(encomenda.id);
      await api.post('/encomendas/status', { id: encomenda.id, impresso: 1 });
      addToast('success', `Pedido #${encomenda.codigo ?? encomenda.id} impresso automaticamente`);
    } catch {
      // impressao automatica falhou silenciosamente
    }
  }, [clientes, empresa, addToast]);

  useEffect(() => {
    const naoImpressos = encomendasDia.filter(
      (e) => (e.impresso ?? 0) === 0 && e.id != null && !impressosRef.current.has(e.id),
    );
    for (const e of naoImpressos) {
      void handleAutoPrint(e);
    }
  }, [encomendasDia, handleAutoPrint]);

  const columns = useMemo(
    () => [
      columnHelper.display({ id: 'expand', size: 40 }),
      columnHelper.accessor('cliente_nome', { header: 'Cliente', size: 200 }),
      columnHelper.accessor('data_encomenda', {
        header: 'Data',
        size: 100,
        cell: (info) => formatData(info.getValue()),
      }),
      columnHelper.accessor('qtd_itens', { header: 'Qtd.', size: 60 }),
      columnHelper.accessor('valor_total', {
        header: 'Valor Total',
        size: 110,
        cell: (info) => formatCurrency(Number(info.getValue())),
      }),
      columnHelper.accessor('forma_pagamento_nome', {
        header: 'Pagamento',
        size: 140,
        cell: (info) => {
          const valor = info.getValue();
          const classificacao = info.row.original.forma_pagamento_classificacao;
          if (!valor) return '-';
          if (classificacao === 'C' || classificacao === 'D') {
            return (
              <span className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                {valor}
              </span>
            );
          }
          return valor;
        },
      }),
      columnHelper.display({
        id: 'acoes',
        header: '',
        size: 120,
        cell: (info) => {
          const row = info.row.original;
          const status = row.status ?? 0;
          const id = row.id;
          const finalizado = status === 4 || status === 5;
          return (
            <div className="flex items-center gap-1">
              {!finalizado && (
                <>
                  <button
                    className="p-1.5 rounded-md hover:bg-green-100 text-green-600 transition-colors"
                    title="Marcar como entregue"
                    onClick={() => id && handleAlterarStatus(row, 4)}
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                    title="Cancelar encomenda"
                    onClick={() => id && handleAlterarStatus(row, 5)}
                  >
                    <XCircle size={16} />
                  </button>
                </>
              )}
              <button
                className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 transition-colors"
                title="Reimprimir documento"
                onClick={() => handleReimprimir(row)}
              >
                <Printer size={16} />
              </button>
            </div>
          );
        },
      }),
    ],
    [handleAlterarStatus, handleReimprimir],
  );

  const renderSubComponent = useCallback((row: Encomenda): JSX.Element => {
    const id = row.id!;
    const itens = loadedItens[id] ?? [];
    const endereco = loadedEnderecos[id];

    return (
      <div className="p-4 space-y-4 text-sm">
        {endereco && (
          <Card>
            <div className="flex items-start gap-2 mb-2">
              <MapPin size={16} className="text-accent-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-text-primary">Endereco de Entrega</div>
                <div className="text-text-secondary">
                  {endereco.retira_estabelecimento ? 'Retirada no estabelecimento' : (
                    <>
                      {endereco.endereco}{endereco.nr ? `, ${endereco.nr}` : ''}{endereco.complemento ? ` - ${endereco.complemento}` : ''}
                      {endereco.bairro ? ` - ${endereco.bairro}` : ''}
                      {endereco.cidade ? ` - ${endereco.cidade}` : ''}{endereco.uf ? `/${endereco.uf}` : ''}
                    </>
                  )}
                </div>
                {endereco.latitude && endereco.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${endereco.latitude},${endereco.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:underline text-xs mt-1 inline-block"
                  >
                    Ver no mapa
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

        {itens.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-1.5 font-semibold text-text-primary">Produto</th>
                <th className="text-center py-1.5 font-semibold text-text-primary w-14">Qtd</th>
                <th className="text-right py-1.5 font-semibold text-text-primary w-20">Vl.Unit.</th>
                <th className="text-right py-1.5 font-semibold text-text-primary w-20">Vl.Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const desc = formatDescricaoCustomizacao(item);
                return (
                  <tr key={idx} className="border-b border-border-subtle/50">
                    <td className="py-1.5 text-text-primary">
                      {item.produto_nome || item.produto_venda_nome || '-'}
                      {desc && <div className="text-[10px] text-text-muted mt-0.5">{desc}</div>}
                    </td>
                    <td className="text-center py-1.5 text-text-secondary">{item.quantidade}</td>
                    <td className="text-right py-1.5 text-text-secondary">{formatCurrency(Number(item.valor_unitario))}</td>
                    <td className="text-right py-1.5 text-text-primary font-medium">{formatCurrency(Number(item.valor_total))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-text-muted text-xs">Carregando itens...</p>
        )}
      </div>
    );
  }, [loadedItens, loadedEnderecos]);

  return (
    <Layout>
      <PageHeader title="Acompanhar Encomendas" subtitle="Painel de acompanhamento de pedidos do dia" />

      <Card>
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Data</label>
            <input
              type="date"
              className="input-field"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={() => void refetch()}>
            <RefreshCw size={14} className="mr-1" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-border-subtle bg-bg-muted p-3 text-center">
            <div className="text-2xl font-bold text-text-primary">{totalDia}</div>
            <div className="text-xs text-text-muted">Pedidos do Dia</div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-muted p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{canceladasDia}</div>
            <div className="text-xs text-text-muted">Cancelados</div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={encomendasDia}
          loading={loading}
          error={error}
          emptyMessage="Nenhuma encomenda para esta data"
          renderSubComponent={renderSubComponent}
          onExpand={(row) => { if (row.id) fetchItens(row.id); }}
        />
      </Card>

      <Modal isOpen={viewEncomenda !== null} onClose={() => setViewEncomenda(null)} title="Detalhes da Encomenda" maxWidth="max-w-2xl">
        {viewEncomenda && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-text-muted">Pedido:</span>{' '}
                <span className="font-medium text-text-primary">#{viewEncomenda.codigo ?? viewEncomenda.id}</span>
              </div>
              <div>
                <span className="text-text-muted">Status:</span>{' '}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ETAPAS_ENCOMENDA[viewEncomenda.status ?? 0]?.badge ?? ''}`}>
                  {ETAPAS_ENCOMENDA[viewEncomenda.status ?? 0]?.label ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Cliente:</span>{' '}
                <span className="font-medium text-text-primary">{viewEncomenda.cliente_nome || '-'}</span>
              </div>
              <div>
                <span className="text-text-muted">Data:</span>{' '}
                <span className="text-text-primary">{formatData(viewEncomenda.data_encomenda)}</span>
              </div>
              <div>
                <span className="text-text-muted">Entrega:</span>{' '}
                <span className="text-text-primary">{formatData(viewEncomenda.data_entrega)}</span>
              </div>
              <div>
                <span className="text-text-muted">Pagamento:</span>{' '}
                <span className="text-text-primary">{viewEncomenda.forma_pagamento_nome || '-'}</span>
              </div>
              <div>
                <span className="text-text-muted">Valor Total:</span>{' '}
                <span className="font-semibold text-text-primary">{formatCurrency(Number(viewEncomenda.valor_total))}</span>
              </div>
            </div>
            {viewEncomenda.observacao && (
              <div>
                <span className="text-text-muted">Observacao:</span>{' '}
                <span className="text-text-primary">{viewEncomenda.observacao}</span>
              </div>
            )}
            {viewLoading ? (
              <p className="text-text-muted text-xs">Carregando itens...</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-1.5 font-semibold text-text-primary">Produto</th>
                    <th className="text-center py-1.5 font-semibold text-text-primary w-14">Qtd</th>
                    <th className="text-right py-1.5 font-semibold text-text-primary w-20">Vl.Unit.</th>
                    <th className="text-right py-1.5 font-semibold text-text-primary w-20">Vl.Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(loadedItens[viewEncomenda.id!] ?? []).map((item, idx) => (
                    <tr key={idx} className="border-b border-border-subtle/50">
                      <td className="py-1.5 text-text-primary">
                        {item.produto_nome || item.produto_venda_nome || '-'}
                        {formatDescricaoCustomizacao(item) && (
                          <div className="text-[10px] text-text-muted mt-0.5">{formatDescricaoCustomizacao(item)}</div>
                        )}
                      </td>
                      <td className="text-center py-1.5 text-text-secondary">{item.quantidade}</td>
                      <td className="text-right py-1.5 text-text-secondary">{formatCurrency(Number(item.valor_unitario))}</td>
                      <td className="text-right py-1.5 text-text-primary font-medium">{formatCurrency(Number(item.valor_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
