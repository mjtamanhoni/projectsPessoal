import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extrairErro, listarProdutosFabricados, type ProdutoFabricado } from '../api';
import BackButton from '../components/BackButton';
import ShareButton from '../components/ShareButton';
import { buildPDF, autoTable } from '../lib/pdf';
import { compartilharPDF, nomeArquivo, sanitizeNome } from '../lib/share';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toLocaleString('pt-BR')}%`;
}

export default function RelatorioProdutosFabricados() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const p = await listarProdutosFabricados();
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

  const gerarPDF = async () => {
    if (produtos.length === 0) return;
    setBusy(true);
    setErro('');
    try {
      const doc = buildPDF(
        { title: 'Relatório de Produtos Fabricados', emissionDate: new Date().toLocaleDateString('pt-BR'), filters: `${produtos.length} produto(s)` },
        (d, drawPageHeader) => {
          if (drawPageHeader) drawPageHeader(d);
          const body = produtos.map((p) => [
            String(p.id),
            p.nome,
            p.unidade_medida ?? '—',
            p.custo_unitario != null ? fmtMoeda(p.custo_unitario) : '—',
            fmtPct(p.margem_lucro),
            p.valor_venda_sugerido != null ? fmtMoeda(p.valor_venda_sugerido) : '—',
            p.ativo ? 'Sim' : 'Não',
          ]);
          autoTable(d, {
            head: [['#', 'Produto', 'Unid.', 'Custo Unit.', 'Margem %', 'V. Venda Sugerido', 'Ativo']],
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
      await compartilharPDF(doc, nomeArquivo(`relatorio-produtos-fabricados-${sanitizeNome('produtos')}`), 'Relatório de Produtos Fabricados');
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
        Relatório Produtos
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        {loading ? 'Carregando...' : `${produtos.length} produto(s)`}
      </div>

      <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && produtos.length === 0 && (
          <div className="list-empty">Nenhum produto cadastrado</div>
        )}
        {!loading && !erro && produtos.length > 0 && (
          <div className="list-scroll">
            {produtos.map((p) => (
              <div key={p.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{p.id}</div>
                  <div className="insumo-nome">{p.nome}</div>
                  <div className="insumo-det">
                    {p.unidade_medida || '—'} &nbsp;•&nbsp; Custo {fmtMoeda(p.custo_unitario)} &nbsp;•&nbsp; Margem {fmtPct(p.margem_lucro)}
                  </div>
                  <div className="insumo-det">
                    Sugerido {fmtMoeda(p.valor_venda_sugerido)} &nbsp;•&nbsp;{' '}
                    <span style={{ color: p.ativo ? '#2d5e3a' : '#c0392b' }}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      <ShareButton onShare={gerarPDF} busy={busy} disabled={produtos.length === 0 || loading} />
      <div className="version" style={{ top: 806 }}>
        Compartilhar abre WhatsApp, E-mail, Discord, Teams e outros apps instalados
      </div>
    </div>
  );
}