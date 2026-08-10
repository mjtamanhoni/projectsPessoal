import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extrairErro, listarVendasProduto, type VendaProduto } from '../api';
import BackButton from '../components/BackButton';
import ShareButton from '../components/ShareButton';
import { buildPDF, autoTable } from '../lib/pdf';
import { compartilharPDF, nomeArquivo, sanitizeNome } from '../lib/share';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(`${d.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function qtdItensItens(v: VendaProduto): number {
  return v.qtd_itens ?? v.itens?.length ?? 0;
}

export default function RelatorioVendasProduto() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<VendaProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const v = await listarVendasProduto();
      setVendas(v);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalGeral = vendas.reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0);
  const totalRecebidas = vendas.filter((v) => v.recebido).reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0);

  const gerarPDF = async () => {
    if (vendas.length === 0) return;
    setBusy(true);
    setErro('');
    try {
      const doc = buildPDF(
        {
          title: 'Relatório de Vendas de Produtos',
          emissionDate: new Date().toLocaleDateString('pt-BR'),
          filters: `${vendas.length} venda(s) | Total: ${fmtMoeda(totalGeral)}\nRecebidas: ${fmtMoeda(totalRecebidas)}`,
        },
        (d, drawPageHeader) => {
          if (drawPageHeader) drawPageHeader(d);
          const body = vendas.map((v) => [
            String(v.id ?? v.codigo ?? ''),
            fmtData(v.data_venda),
            v.cliente_nome || `Cliente ${v.cliente_id ?? ''}`,
            fmtMoeda(Number(v.valor_total) || 0),
            v.recebido ? 'Sim' : 'Não',
            String(qtdItensItens(v)),
          ]);
          body.push(['', '', 'Total Geral', fmtMoeda(totalGeral), '', '']);
          autoTable(d, {
            head: [['#', 'Data', 'Cliente', 'Valor Total', 'Recebida', 'Itens']],
            body,
            startY: 46,
            margin: { bottom: 15 },
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 7 },
            willDrawPage: (data: unknown) => {
              const ev = data as { pageNumber: number; cursor?: { y: number } };
              if (ev.pageNumber > 1) {
                if (drawPageHeader) drawPageHeader(d);
                if (ev.cursor) ev.cursor.y = 46;
              }
            },
          });
        }
      );
      await compartilharPDF(doc, nomeArquivo(`relatorio-vendas-produto-${sanitizeNome('vendas')}`), 'Relatório de Vendas de Produtos');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar/compartilhar PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/relatorios')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Relatório Vendas
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        {loading ? 'Carregando...' : `${vendas.length} venda(s) | Total ${fmtMoeda(totalGeral)}`}
      </div>

      <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && vendas.length === 0 && (
          <div className="list-empty">Nenhuma venda registrada</div>
        )}
        {!loading && !erro && vendas.length > 0 && (
          <div className="list-scroll">
            {vendas.map((v) => (
              <div key={v.id ?? v.codigo ?? `${v.cliente_id}-${v.data_venda}`}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{v.id ?? v.codigo}</div>
                  <div className="insumo-nome">{v.cliente_nome || '—'}</div>
                  <div className="insumo-det">
                    {fmtData(v.data_venda)} &nbsp;•&nbsp; {qtdItensItens(v)} item(ns)
                  </div>
                  <div className="insumo-det">
                    {fmtMoeda(v.valor_total)} &nbsp;•&nbsp;{' '}
                    <span style={{ color: v.recebido ? '#2d5e3a' : '#c0392b' }}>{v.recebido ? 'Recebida' : 'A receber'}</span>
                  </div>
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      <ShareButton onShare={gerarPDF} busy={busy} disabled={vendas.length === 0 || loading} />
      <div className="version" style={{ top: 806 }}>
        Compartilhar abre WhatsApp, E-mail, Discord, Teams e outros apps instalados
      </div>
    </div>
  );
}