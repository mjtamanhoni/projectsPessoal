import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extrairErro, listarFabricacoes, listarProdutosFabricados, type Fabricacao, type ProdutoFabricado } from '../api';
import BackButton from '../components/BackButton';
import ShareButton from '../components/ShareButton';
import { buildPDF, autoTable } from '../lib/pdf';
import { compartilharPDF, nomeArquivo, sanitizeNome } from '../lib/share';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtQtd(v: number): string {
  return (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtData(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(`${d.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export default function RelatorioFabricacoes() {
  const navigate = useNavigate();
  const [fabricacoes, setFabricacoes] = useState<Fabricacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [f, p] = await Promise.all([listarFabricacoes(), listarProdutosFabricados()]);
      setFabricacoes(f);
      setProdutos(p);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalGeral = fabricacoes.reduce((acc, f) => acc + (Number(f.custo_total) || 0), 0);

  const gerarPDF = async () => {
    if (fabricacoes.length === 0) return;
    setBusy(true);
    setErro('');
    try {
      const doc = buildPDF(
        { title: 'Relatório de Fabricações', emissionDate: new Date().toLocaleDateString('pt-BR'), filters: `${fabricacoes.length} fabricação(ões) | Total: ${fmtMoeda(totalGeral)}` },
        (d, drawPageHeader) => {
          if (drawPageHeader) drawPageHeader(d);
          const nomeProduto = (id: number): string => produtos.find((p) => p.id === id)?.nome ?? `ID ${id}`;
          const body = fabricacoes.map((f) => [
            String(f.id),
            fmtData(f.data_fabricacao),
            f.produto_nome ?? nomeProduto(f.produto_fabricado_id),
            fmtQtd(f.quantidade_produzida),
            f.custo_insumos != null ? fmtMoeda(Number(f.custo_insumos)) : '—',
            f.custo_adicional_total != null ? fmtMoeda(Number(f.custo_adicional_total)) : '—',
            f.custo_total != null ? fmtMoeda(Number(f.custo_total)) : '—',
            f.custo_unitario != null ? fmtMoeda(Number(f.custo_unitario)) : '—',
          ]);
          body.push(['', '', 'Total Geral', '', '', '', fmtMoeda(totalGeral), '']);
          autoTable(d, {
            head: [['#', 'Data', 'Produto', 'Qtd Produzida', 'Custo Insumos', 'Custo Adic.', 'Custo Total', 'Custo Unit.']],
            body,
            startY: 42,
            margin: { bottom: 15 },
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 7 },
            willDrawPage: (data: unknown) => {
              const ev = data as { pageNumber: number; cursor?: { y: number } };
              if (ev.pageNumber > 1) {
                if (drawPageHeader) drawPageHeader(d);
                if (ev.cursor) ev.cursor.y = 42;
              }
            },
          });
        }
      );
      await compartilharPDF(doc, nomeArquivo(`relatorio-fabricacoes-${sanitizeNome('fabricacoes')}`), 'Relatório de Fabricações');
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
        Relatório Fabricações
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        {loading ? 'Carregando...' : `${fabricacoes.length} fabricação(ões) | Total ${fmtMoeda(totalGeral)}`}
      </div>

      <div className="list-card" style={{ top: 80, height: 650 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && fabricacoes.length === 0 && (
          <div className="list-empty">Nenhuma fabricação registrada</div>
        )}
        {!loading && !erro && fabricacoes.length > 0 && (
          <div className="list-scroll">
            {fabricacoes.map((f) => {
              const nome = f.produto_nome ?? produtos.find((p) => p.id === f.produto_fabricado_id)?.nome ?? `ID ${f.produto_fabricado_id}`;
              return (
                <div key={f.id}>
                  <div className="insumo-row">
                    <div className="insumo-cod">#{f.id}</div>
                    <div className="insumo-nome">{nome}</div>
                    <div className="insumo-det">
                      {fmtData(f.data_fabricacao)} &nbsp;•&nbsp; {fmtQtd(f.quantidade_produzida)} produzida(s)
                    </div>
                    <div className="insumo-det">
                      Custo total {fmtMoeda(f.custo_total)} &nbsp;•&nbsp; Unit. {fmtMoeda(f.custo_unitario)}
                    </div>
                  </div>
                  <div className="row-sep" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ShareButton onShare={gerarPDF} busy={busy} disabled={fabricacoes.length === 0 || loading} />
      <div className="version" style={{ top: 806 }}>
        Compartilhar abre WhatsApp, E-mail, Discord, Teams e outros apps instalados
      </div>
    </div>
  );
}