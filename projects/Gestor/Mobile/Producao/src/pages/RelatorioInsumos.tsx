import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  extrairErro,
  listarFornecedores,
  listarInsumos,
  listarMarcas,
  type Fornecedor,
  type Insumo,
  type Marca,
} from '../api';
import BackButton from '../components/BackButton';
import ShareButton from '../components/ShareButton';
import { buildPDF, autoTable } from '../lib/pdf';
import { compartilharPDF, nomeArquivo, sanitizeNome } from '../lib/share';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RelatorioInsumos() {
  const navigate = useNavigate();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [i, f, m] = await Promise.all([listarInsumos(), listarFornecedores(), listarMarcas()]);
      setInsumos(i);
      setFornecedores(f);
      setMarcas(m);
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
    if (insumos.length === 0) return;
    setBusy(true);
    setErro('');
    try {
      const forn = new Map(fornecedores.map((f) => [f.id, f.nome]));
      const marc = new Map(marcas.map((m) => [m.id, m.nome]));
      const doc = buildPDF(
        { title: 'Relatório de Insumos', emissionDate: new Date().toLocaleDateString('pt-BR'), filters: `${insumos.length} insumo(s)` },
        (d, drawPageHeader) => {
          if (drawPageHeader) drawPageHeader(d);
          const body = insumos.map((i) => [
            String(i.id),
            i.nome,
            i.unidade_medida ?? '—',
            i.custo_medio != null ? fmtMoeda(i.custo_medio) : '—',
            forn.get(i.id_fornecedor ?? 0) ?? '—',
            marc.get(i.id_marca ?? 0) ?? '—',
          ]);
          autoTable(d, {
            head: [['#', 'Insumo', 'Unid.', 'Custo Médio', 'Fornecedor', 'Marca']],
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
      await compartilharPDF(doc, nomeArquivo(`relatorio-insumos-${sanitizeNome('insumos')}`), 'Relatório de Insumos');
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
        Relatório Insumos
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        {loading ? 'Carregando...' : `${insumos.length} insumo(s)`}
      </div>

      <div className="list-card" style={{ top: 80, height: 650 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && insumos.length === 0 && (
          <div className="list-empty">Nenhum insumo cadastrado</div>
        )}
        {!loading && !erro && insumos.length > 0 && (
          <div className="list-scroll">
            {insumos.map((i) => (
              <div key={i.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{i.id}</div>
                  <div className="insumo-nome">{i.nome}</div>
                  <div className="insumo-det">
                    {i.unidade_medida || '—'} &nbsp;•&nbsp; {fmtMoeda(i.custo_medio)} &nbsp;•&nbsp;{' '}
                    {fornecedores.find((f) => f.id === i.id_fornecedor)?.nome ?? '—'}
                  </div>
                  <div className="insumo-det">
                    {marcas.find((m) => m.id === i.id_marca)?.nome ?? '—'}
                  </div>
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      <ShareButton onShare={gerarPDF} busy={busy} disabled={insumos.length === 0 || loading} />
      <div className="version" style={{ top: 806 }}>
        Compartilhar abre WhatsApp, E-mail, Discord, Teams e outros apps instalados
      </div>
    </div>
  );
}