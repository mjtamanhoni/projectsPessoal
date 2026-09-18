import { useMemo, useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import type { Encomenda, EncomendaItem, Cliente, FormaPagamento, BandeiraCartao, EncomendaPagamento } from '@/types';
import { CheckCircle, XCircle, Printer, RefreshCw, MapPin, Menu, FileText, BarChart3, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDecimals, parseItemCustomizacao } from '@/lib/utils';
import { getEncomendasRefreshSegundos, getCachedSettings } from '@/lib/settings';
import { gerarTextoCupomEncomenda, imprimirCupomEncomendaSerial, type CupomEncomendaData } from '@/lib/cupom-encomenda';
import { gerarRelatorioSintetico, gerarRelatorioAnaliticoProdutos, gerarRelatorioAnaliticoCliente, viewPDF } from '@/lib/relatorio-encomendas';
import { PagamentoMultiploModal } from '@/components/forms/PagamentoMultiploModal';
import api from '@/lib/api';
import type { JSX } from 'react';
import type jsPDF from 'jspdf';

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
  const { pausarTimerInatividade, retomarTimerInatividade } = useAuth();
  const { addToast } = useToast();

  const [dataFiltro, setDataFiltro] = useState<string>(hoje());
  const [refreshSeg, setRefreshSeg] = useState<number>(() => getEncomendasRefreshSegundos());
  const [loadedItens, setLoadedItens] = useState<Record<number, EncomendaItem[]>>({});
  const [loadedEnderecos, setLoadedEnderecos] = useState<Record<number, { endereco?: string; nr?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string; retira_estabelecimento?: number; latitude?: number; longitude?: number; place_id?: string }>>({});
  const [viewEncomenda, setViewEncomenda] = useState<Encomenda | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [menuAberto, setMenuAberto] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportDoc, setReportDoc] = useState<jsPDF | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const impressosRef = useRef<Set<number>>(new Set());

  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [bandeirasCartao, setBandeirasCartao] = useState<BandeiraCartao[]>([]);
  const [pagamentoModalAberto, setPagamentoModalAberto] = useState(false);
  const [pagamentoEncomenda, setPagamentoEncomenda] = useState<Encomenda | null>(null);
  const [pagamentosCarregados, setPagamentosCarregados] = useState<EncomendaPagamento[]>([]);

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
    api.get('/formas-pagamento').then((r) => setFormasPagamento(r.data as FormaPagamento[])).catch(() => {});
    api.get('/bandeiras-cartao').then((r) => setBandeirasCartao(r.data as BandeiraCartao[])).catch(() => {});
  }, []);

  const encomendasDia = useMemo(() => {
    const filtradas = (encomendas ?? []).filter((e) => {
      const d = e.data_encomenda?.slice(0, 10);
      return d === dataFiltro;
    });
    return filtradas.sort((a, b) => {
      const sa = a.status ?? 0;
      const sb = b.status ?? 0;
      const grupoA = sa < 4 ? 0 : sa === 4 ? 1 : 2;
      const grupoB = sb < 4 ? 0 : sb === 4 ? 1 : 2;
      if (grupoA !== grupoB) return grupoA - grupoB;
      const dataA = a.data_encomenda ?? '';
      const dataB = b.data_encomenda ?? '';
      if (dataA !== dataB) return dataA.localeCompare(dataB);
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
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
      const statusAtual = encomenda.status ?? 0;

      if (novoStatus === 4 && statusAtual < 3) {
        const passos: number[] = [];
        if (statusAtual < 2) passos.push(2);
        if (statusAtual < 3) passos.push(3);
        passos.push(4);

        for (const passo of passos) {
          const payload: Record<string, unknown> = { id: encomenda.id, status: passo };
          if (passo === 2) {
            payload.data_venda = new Date().toISOString().slice(0, 10);
          }
          await api.post('/encomendas/status', payload);
        }
      } else if (novoStatus === 4 && statusAtual === 3) {
        await api.post('/encomendas/status', { id: encomenda.id, status: 4 });
      } else {
        await api.post('/encomendas/status', { id: encomenda.id, status: novoStatus });
      }

      await refetch();
      addToast('success', `Encomenda movida para "${ETAPAS_ENCOMENDA[novoStatus].label}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status';
      addToast('error', msg);
    }
  };

  const handleAbrirPagamento = async (encomenda: Encomenda) => {
    setPagamentoEncomenda(encomenda);
    try {
      const response = await api.get('/encomendas/pagamentos', { params: { encomenda_id: encomenda.id } });
      setPagamentosCarregados(response.data as EncomendaPagamento[]);
    } catch {
      setPagamentosCarregados([]);
    }
    setPagamentoModalAberto(true);
  };

  const handleSalvarPagamento = async (pagamentos: EncomendaPagamento[]) => {
    if (!pagamentoEncomenda) return;
    try {
      await api.post('/encomendas/pagamentos', {
        encomenda_id: pagamentoEncomenda.id,
        pagamentos,
      });
      addToast('success', 'Pagamento salvo com sucesso');
      setPagamentoModalAberto(false);
      setPagamentoEncomenda(null);
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar pagamento';
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
      const settings = getCachedSettings();

      const dados: CupomEncomendaData = {
        encomenda: { ...encomenda, itens },
        cliente,
        colunas: settings?.printer?.colunas,
      };

      const texto = gerarTextoCupomEncomenda(dados);
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
        paginaCodigo: settings.printer.paginaCodigo,
      });
      addToast('success', 'Cupom enviado para impressao');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao imprimir';
      addToast('error', msg);
    }
  }, [clientes, addToast]);

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
        encomenda: { ...encomenda, itens },
        cliente,
        colunas: settings.printer.colunas,
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
        paginaCodigo: settings.printer.paginaCodigo,
      });

      impressosRef.current.add(encomenda.id);
      await api.post('/encomendas/status', { id: encomenda.id, impresso: 1 });
      addToast('success', `Pedido #${encomenda.codigo ?? encomenda.id} impresso automaticamente`);
    } catch {
      // impressao automatica falhou silenciosamente
    }
  }, [clientes, addToast]);

  useEffect(() => {
    const naoImpressos = encomendasDia.filter(
      (e) => (e.impresso ?? 0) === 0 && e.id != null && !impressosRef.current.has(e.id),
    );
    for (const e of naoImpressos) {
      void handleAutoPrint(e);
    }
  }, [encomendasDia, handleAutoPrint]);

  // ── Menu hamburguer: fechar ao clicar fora ──
  useEffect(() => {
    if (!menuAberto) return;
    const handler = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (menuPortalRef.current?.contains(alvo) || menuBtnRef.current?.contains(alvo)) return;
      setMenuAberto(false);
      setMenuPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuAberto]);

  const toggleMenu = useCallback(() => {
    if (menuAberto) {
      setMenuAberto(false);
      setMenuPos(null);
    } else {
      const btn = menuBtnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setMenuPos({ left: rect.right - 240, top: rect.bottom + 4 });
      }
      setMenuAberto(true);
    }
  }, [menuAberto]);

  // ── Carregar itens de todas as encomendas do dia para os relatórios ──
  const carregarItensRelatorio = useCallback(async (): Promise<Record<number, EncomendaItem[]>> => {
    const resultado: Record<number, EncomendaItem[]> = {};
    const promises = encomendasDia.map(async (enc) => {
      if (!enc.id) return;
      const itens = loadedItens[enc.id];
      if (itens && itens.length > 0) {
        resultado[enc.id] = itens;
        return;
      }
      try {
        const response = await api.get('/encomendas', { params: { id: enc.id } });
        const rows = response.data as any[];
        resultado[enc.id] = rows.map((row: any) => ({
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
      } catch {
        resultado[enc.id!] = [];
      }
    });
    await Promise.all(promises);
    return resultado;
  }, [encomendasDia, loadedItens]);

  // ── Gerar relatório sintético ──
  const handleRelatorioSintetico = useCallback(async () => {
    setMenuAberto(false);
    setMenuPos(null);
    const itensPorEnc = await carregarItensRelatorio();
    const doc = gerarRelatorioSintetico({
      encomendas: encomendasDia,
      itensPorEncomenda: itensPorEnc,
      dataFiltro,
    });
    setReportDoc(doc);
    setReportTitle('Relatório Sintético');
    setShowReportConfirm(true);
  }, [encomendasDia, dataFiltro, carregarItensRelatorio]);

  // ── Gerar relatório analítico por produtos ──
  const handleRelatorioProdutos = useCallback(async () => {
    setMenuAberto(false);
    setMenuPos(null);
    const itensPorEnc = await carregarItensRelatorio();
    const doc = gerarRelatorioAnaliticoProdutos({
      encomendas: encomendasDia,
      itensPorEncomenda: itensPorEnc,
      dataFiltro,
    });
    setReportDoc(doc);
    setReportTitle('Relatório Analítico por Produtos');
    setShowReportConfirm(true);
  }, [encomendasDia, dataFiltro, carregarItensRelatorio]);

  // ── Gerar relatório analítico por cliente ──
  const handleRelatorioCliente = useCallback(async () => {
    setMenuAberto(false);
    setMenuPos(null);
    const itensPorEnc = await carregarItensRelatorio();
    const doc = gerarRelatorioAnaliticoCliente({
      encomendas: encomendasDia,
      itensPorEncomenda: itensPorEnc,
      dataFiltro,
    });
    setReportDoc(doc);
    setReportTitle('Relatório Analítico por Cliente');
    setShowReportConfirm(true);
  }, [encomendasDia, dataFiltro, carregarItensRelatorio]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'expand',
        enableColumnFilter: false,
        enableSorting: false,
        meta: { expand: true } as Record<string, unknown>,
        size: 40,
      }),
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
    const itens = loadedItens[id];
    const endereco = loadedEnderecos[id];

    return (
      <div>
        {endereco && (
          <div className="mb-2 rounded-lg border border-purple-200 bg-purple-50/50 px-3 py-2 text-sm text-purple-900">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-xs uppercase tracking-wide text-purple-700">
                <MapPin size={14} className="inline mr-1 -mt-0.5" />
                Endereco de Entrega
              </div>
              {endereco.retira_estabelecimento !== 1 && (endereco.latitude && endereco.longitude) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${endereco.latitude},${endereco.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-purple-300 px-2 py-0.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  title="Abrir no Google Maps"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Maps
                </a>
              )}
            </div>
            {endereco.retira_estabelecimento === 1 ? (
              <span className="font-semibold">Retirar no estabelecimento</span>
            ) : (
              <span>
                {endereco.endereco}{endereco.nr ? `, ${endereco.nr}` : ''}
                {endereco.complemento ? ` - ${endereco.complemento}` : ''}
                {endereco.bairro ? ` - ${endereco.bairro}` : ''}
                {endereco.cidade ? ` - ${endereco.cidade}` : ''}
                {endereco.uf ? `/${endereco.uf}` : ''}
              </span>
            )}
          </div>
        )}

        {!itens ? (
          <span className="text-text-tertiary text-sm">Carregando...</span>
        ) : itens.length === 0 ? (
          <span className="text-text-tertiary text-sm">Nenhum item</span>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary text-xs uppercase tracking-wider">
                <th className="text-left px-2 py-1 font-medium">Produto</th>
                <th className="text-right px-2 py-1 font-medium">Qtd.</th>
                <th className="text-right px-2 py-1 font-medium">Valor Unit.</th>
                <th className="text-right px-2 py-1 font-medium">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => {
                const personalizacao = formatDescricaoCustomizacao(item);
                return (
                  <Fragment key={i}>
                    <tr className="border-t border-border-primary/50">
                      <td className="px-2 py-1.5">{item.produto_venda_nome ?? item.produto_nome ?? '-'}</td>
                      <td className="text-right px-2 py-1.5">{formatDecimals(item.quantidade)}</td>
                      <td className="text-right px-2 py-1.5">{formatDecimals(Number(item.valor_unitario), 4)}</td>
                      <td className="text-right px-2 py-1.5 font-medium">{formatCurrency(item.valor_total)}</td>
                    </tr>
                    {personalizacao && (
                      <tr>
                        <td colSpan={4} className="px-2 pb-1.5 pt-0 text-xs">
                          <span className="text-text-secondary">
                            <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-semibold uppercase tracking-wide">Personalizado</span>
                            {personalizacao}
                          </span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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

          {/* ── Menu Relatórios ── */}
          <div className="relative ml-auto">
            <button
              ref={menuBtnRef}
              onClick={toggleMenu}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-primary bg-bg-card hover:bg-bg-muted text-sm font-medium text-text-primary transition-colors"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Relatórios</span>
              <Menu size={14} className="text-text-muted" />
            </button>
            {menuAberto && menuPos && createPortal(
              <div
                ref={menuPortalRef}
                style={{ left: menuPos.left, top: menuPos.top, minWidth: 240 }}
                className="fixed z-[200] rounded-lg border border-border-primary bg-bg-card shadow-xl py-1"
              >
                <button
                  onClick={() => void handleRelatorioSintetico()}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-bg-muted transition-colors"
                >
                  <BarChart3 size={16} className="text-emerald-600" />
                  <div>
                    <div className="font-medium text-text-primary">Relatório Sintético</div>
                    <div className="text-xs text-text-muted">Resumo de vendas do dia</div>
                  </div>
                </button>
                <button
                  onClick={() => void handleRelatorioProdutos()}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-bg-muted transition-colors"
                >
                  <FileText size={16} className="text-blue-600" />
                  <div>
                    <div className="font-medium text-text-primary">Analítico por Produtos</div>
                    <div className="text-xs text-text-muted">Produtos vendidos no dia</div>
                  </div>
                </button>
                <button
                  onClick={() => void handleRelatorioCliente()}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-bg-muted transition-colors"
                >
                  <Users size={16} className="text-violet-600" />
                  <div>
                    <div className="font-medium text-text-primary">Analítico por Cliente</div>
                    <div className="text-xs text-text-muted">Vendas agrupadas por cliente</div>
                  </div>
                </button>
              </div>,
              document.body,
            )}
          </div>
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
          getRowClassName={(row) => (row.status ?? 0) === 5 ? 'bg-red-50/50 !text-red-600' : ''}
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
                {viewEncomenda.pagamentos && viewEncomenda.pagamentos.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {viewEncomenda.pagamentos.map((pg, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-text-primary">{pg.forma_pagamento_nome || '-'}</span>
                        <span className="text-accent-primary font-semibold">{formatCurrency(pg.valor)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-text-primary">{viewEncomenda.forma_pagamento_nome || '-'}</span>
                )}
                <button
                  onClick={() => handleAbrirPagamento(viewEncomenda)}
                  className="ml-2 text-xs text-accent-primary hover:underline"
                >
                  Editar
                </button>
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

      <PagamentoMultiploModal
        isOpen={pagamentoModalAberto}
        onFechar={() => { setPagamentoModalAberto(false); setPagamentoEncomenda(null); }}
        onConfirmar={handleSalvarPagamento}
        valorTotal={Number(pagamentoEncomenda?.valor_total ?? 0)}
        formasPagamento={formasPagamento}
        bandeirasCartao={bandeirasCartao}
        pagamentosIniciais={pagamentosCarregados}
      />

      <ConfirmDialog
        isOpen={showReportConfirm}
        onClose={() => { if (reportDoc) { const fn = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${dataFiltro}.pdf`; reportDoc.save(fn); } setShowReportConfirm(false); setReportDoc(null); }}
        onConfirm={() => { if (reportDoc) viewPDF(reportDoc); setShowReportConfirm(false); setReportDoc(null); }}
        title={reportTitle}
        message="Deseja visualizar o relatório no navegador?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </Layout>
  );
}
