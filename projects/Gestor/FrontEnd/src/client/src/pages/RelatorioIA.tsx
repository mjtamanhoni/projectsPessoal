import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import api, { getErrorMsg } from '@/lib/api';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, downloadPDF, viewPDF } from '@/lib/pdf';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  FileText,
  Copy,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { MontarRelatorio } from './MontarRelatorio';

interface Conversa {
  id: number;
  titulo: string;
  criado_em: string;
  atualizado_em: string;
}

interface DadosRelatorio {
  colunas?: string[];
  linhas?: Record<string, unknown>[];
  sql?: string;
  total_linhas?: number;
}

interface Mensagem {
  id?: number;
  papel: string;
  conteudo: string;
  sql_gerado?: string | null;
  dados?: DadosRelatorio | null;
  criado_em?: string;
}

const EXEMPLOS = [
  'Horas de entrada e saida dos ultimos 5 dias, totalizando horas e valores a receber.',
  'Lista dos ultimos 4 cancelamentos de encomendas, com data, cliente, total e produtos, totalizando o valor.',
  'Lista as ultimas 10 avaliacoes, recebidas com as observacoes caso tenham.',
];

function fmtCelula(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function RelatorioIA() {
  const [aba, setAba] = useState<'ia' | 'montar'>('ia');
  const [cfg, setCfg] = useState<{ modelo: string; quotaDiaria: number; configurado: boolean } | null>(null);
  const [quota, setQuota] = useState({ usadas: 0, limite: 20 });
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const carregarConversas = useCallback(async () => {
    try {
      const r = await api.get<Conversa[]>('/relatorio-ia/conversas');
      setConversas(Array.isArray(r.data) ? r.data : []);
    } catch {
      // historico vazio ou erro pontual
    }
  }, []);

  const carregarQuota = useCallback(async () => {
    try {
      const r = await api.get<{ usadas: number; limite: number }>('/relatorio-ia/quota');
      setQuota(r.data);
    } catch {
      // mantem valor padrao
    }
  }, []);

  useEffect(() => {
    api.get('/relatorio-ia/config').then((r) => setCfg(r.data)).catch(() => {});
    carregarConversas();
    carregarQuota();
  }, [carregarConversas, carregarQuota]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, enviando]);

  const selecionarConversa = async (id: number) => {
    setErro('');
    setConversaAtiva(id);
    try {
      const r = await api.get<Mensagem[]>(`/relatorio-ia/conversas/${id}`);
      setMensagens(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErro(getErrorMsg(e));
    }
  };

  const novaConversa = () => {
    setConversaAtiva(null);
    setMensagens([]);
    setErro('');
  };

  const excluirConversa = async (id: number) => {
    try {
      await api.delete(`/relatorio-ia/conversas/${id}`);
      if (conversaAtiva === id) novaConversa();
      await carregarConversas();
    } catch (e) {
      setErro(getErrorMsg(e));
    }
  };

  const enviar = async (texto?: string) => {
    const mensagem = (texto ?? input).trim();
    if (!mensagem || enviando) return;

    setErro('');
    setInput('');
    setEnviando(true);
    setMensagens((prev) => [...prev, { papel: 'usuario', conteudo: mensagem }]);

    try {
      const r = await api.post<{
        conversaId: number;
        resposta: string;
        consulta: DadosRelatorio | null;
      }>('/relatorio-ia/gerar', { mensagem, conversaId: conversaAtiva });

      setConversaAtiva(r.data.conversaId);
      setMensagens((prev) => [
        ...prev,
        {
          papel: 'ia',
          conteudo: r.data.resposta,
          dados: r.data.consulta,
          sql_gerado: r.data.consulta?.sql ?? null,
        },
      ]);
      carregarQuota();
      carregarConversas();
    } catch (e) {
      setErro(getErrorMsg(e));
      setMensagens((prev) => [
        ...prev,
        { papel: 'ia', conteudo: 'Nao consegui processar essa solicitacao. Tente novamente.' },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  const copiarSql = async (msg: Mensagem, idx: number) => {
    const sql = msg.dados?.sql || msg.sql_gerado;
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopiado(idx);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      // clipboard indisponivel
    }
  };

  const gerarPDF = (msg: Mensagem, modo: 'ver' | 'baixar') => {
    const doc = buildPDFWithHeader(
      {
        title: 'Relatorio IA',
        emissionDate: new Date().toLocaleString('pt-BR'),
        filters: ['Gerado por consulta em linguagem natural'],
      },
      (d, drawPageHeader) => {
        let y = 42;
        if (drawPageHeader) drawPageHeader(d);

        const quebrarPagina = () => {
          d.addPage();
          if (drawPageHeader) drawPageHeader(d);
          y = 42;
        };

        const texto = (linha: string, tamanho = 10, cor = 40) => {
          d.setFontSize(tamanho);
          d.setFont('helvetica', 'normal');
          d.setTextColor(cor);
          const quebradas = d.splitTextToSize(linha, 180) as string[];
          for (const l of quebradas) {
            if (y > 270) quebrarPagina();
            d.text(l, 14, y);
            y += 5;
          }
        };

        const tabela = (cabecalho: string[], corpo: string[][]) => {
          if (!cabecalho.length || !corpo.length) return;
          autoTable(d, {
            head: [cabecalho],
            body: corpo,
            startY: y,
            margin: { bottom: 15 },
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            willDrawPage: (data: any) => {
              if (data.pageNumber > 1 && drawPageHeader) {
                drawPageHeader(d);
                if (data.cursor) data.cursor.y = 42;
              }
            },
          });
          y =
            (d as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
              ?.finalY ?? y + 40;
          y += 6;
        };

        // Renderiza o conteudo da IA: paragrafos como texto e tabelas
        // markdown (| col | col |) como tabela de verdade no PDF.
        const linhasMd = msg.conteudo.split('\n');
        const isRow = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|');
        const isSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
        const limpar = (c: string) => c.replace(/\*\*/g, '').trim();
        let temTabelaMd = false;
        let i = 0;
        while (i < linhasMd.length) {
          const linha = linhasMd[i];
          if (isRow(linha) && i + 1 < linhasMd.length && isSep(linhasMd[i + 1])) {
            const cabecalho = linha.split('|').slice(1, -1).map(limpar);
            i += 2;
            const corpo: string[][] = [];
            while (i < linhasMd.length && isRow(linhasMd[i]) && !isSep(linhasMd[i])) {
              corpo.push(linhasMd[i].split('|').slice(1, -1).map(limpar));
              i += 1;
            }
            tabela(cabecalho, corpo);
            temTabelaMd = true;
            y += 2;
          } else {
            texto(linha.replace(/\*\*/g, ''));
            i += 1;
          }
        }

        // Fallback: se a IA nao gerou tabela markdown, monta com os dados crus
        const dados = msg.dados;
        if (!temTabelaMd && dados?.colunas?.length && dados.linhas?.length) {
          y += 3;
          tabela(
            dados.colunas,
            dados.linhas.map((row) => dados.colunas!.map((c) => fmtCelula(row[c]))),
          );
        }

        const sql = dados?.sql || msg.sql_gerado;
        if (sql) {
          if (y > 250) quebrarPagina();
          texto('Consulta utilizada (somente leitura):', 7, 120);
          for (const l of (d.splitTextToSize(sql, 180) as string[]).slice(0, 6)) {
            texto(l, 7, 120);
          }
        }
      },
    );

    if (modo === 'ver') viewPDF(doc);
    else downloadPDF(doc, `relatorio-ia-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const quotaPct = quota.limite > 0 ? Math.min(100, (quota.usadas / quota.limite) * 100) : 0;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px] border border-border-subtle rounded-xl overflow-hidden bg-bg-primary">
        {/* ---------- PageControl ---------- */}
        <div className="flex border-b border-border-subtle bg-bg-muted/40">
          {(
            [
              ['ia', 'IA'],
              ['montar', 'Montar Relatorio'],
            ] as Array<['ia' | 'montar', string]>
          ).map(([id, rotulo]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                aba === id
                  ? 'border-blue-500 text-text-primary bg-bg-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {aba === 'montar' ? (
          <MontarRelatorio />
        ) : (
        <div className="flex flex-1 min-h-0">
        {/* ---------- Sidebar do historico ---------- */}
        <aside className="w-72 flex flex-col border-r border-border-subtle bg-bg-muted/40">
          <div className="p-3 border-b border-border-subtle">
            <button onClick={novaConversa} className="w-full btn-primary flex items-center justify-center gap-2 text-sm">
              <Plus size={16} /> Nova consulta
            </button>
          </div>

          <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-text-muted">Historico</div>
          <div className="flex-1 overflow-y-auto">
            {conversas.length === 0 && (
              <div className="px-4 py-6 text-xs text-text-muted">Nenhuma consulta ainda.</div>
            )}
            {conversas.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm ${
                  conversaAtiva === c.id ? 'bg-bg-muted text-text-primary' : 'text-text-secondary hover:bg-bg-muted/60'
                }`}
                onClick={() => selecionarConversa(c.id)}
              >
                <span className="flex-1 truncate">{c.titulo}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    excluirConversa(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400"
                  title="Excluir conversa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border-subtle text-xs text-text-secondary">
            <div className="flex justify-between mb-1.5">
              <span>Consultas de hoje</span>
              <span className="text-text-primary font-medium">
                {quota.usadas} de {quota.limite}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            {cfg && (
              <div className="mt-2 text-[11px] text-text-muted">
                Modelo: {cfg.modelo}
                {!cfg.configurado && ' — IA nao configurada'}
              </div>
            )}
          </div>
        </aside>

        {/* ---------- Chat ---------- */}
        <section className="flex-1 flex flex-col min-w-0">
          <div className="px-5 py-3.5 border-b border-border-subtle flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="text-sm font-semibold">Relatorio IA</div>
              <div className="text-[11px] text-text-muted">
                Pergunte em linguagem natural — a IA consulta o sistema em modo somente leitura
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {mensagens.length === 0 && !enviando && (
                <div className="text-center pt-10">
                  <span className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 items-center justify-center text-white mb-4">
                    <Sparkles size={26} />
                  </span>
                  <h2 className="text-lg font-semibold mb-1">O que voce precisa saber hoje?</h2>
                  <p className="text-sm text-text-secondary mb-5">
                    Exemplos de pedidos — clique para usar:
                  </p>
                  <div className="space-y-2 text-left max-w-xl mx-auto">
                    {EXEMPLOS.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => enviar(ex)}
                        className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-bg-muted/40 text-sm text-text-secondary hover:border-blue-500 hover:text-text-primary transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensagens.map((m, idx) =>
                m.papel === 'usuario' ? (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {m.conteudo}
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="flex gap-3">
                    <span className="w-8 h-8 flex-none rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm">
                      <Sparkles size={14} />
                    </span>
                    <div className="flex-1 min-w-0 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                      {m.conteudo}

                      {m.dados?.colunas?.length ? (
                        <div className="mt-3 rounded-xl border border-border-subtle overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-bg-muted/70">
                                  {m.dados.colunas.map((c) => (
                                    <th key={c} className="text-left font-semibold text-text-secondary px-3 py-2 whitespace-nowrap">
                                      {c}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(m.dados.linhas ?? []).map((row, i) => (
                                  <tr key={i} className="border-t border-border-subtle">
                                    {m.dados!.colunas!.map((c) => (
                                      <td key={c} className="px-3 py-2 text-text-primary whitespace-nowrap">
                                        {fmtCelula(row[c])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-3 py-1.5 bg-bg-muted/50 text-[11px] text-text-muted border-t border-border-subtle">
                            {m.dados.total_linhas ?? m.dados.linhas?.length ?? 0} linha(s)
                          </div>
                        </div>
                      ) : null}

                      {(m.dados?.sql || m.sql_gerado) && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-[11px] text-text-muted hover:text-text-secondary">
                            Consulta gerada (somente leitura)
                          </summary>
                          <pre className="mt-1.5 p-2.5 rounded-lg bg-black/30 border border-border-subtle text-[11px] text-green-400 overflow-x-auto whitespace-pre-wrap">
                            {m.dados?.sql || m.sql_gerado}
                          </pre>
                        </details>
                      )}

                      {m.papel === 'ia' && (m.dados?.colunas?.length || m.sql_gerado) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button onClick={() => gerarPDF(m, 'ver')} className="btn-primary text-xs flex items-center gap-1.5">
                            <FileText size={13} /> Gerar PDF
                          </button>
                          <button onClick={() => gerarPDF(m, 'baixar')} className="btn-secondary text-xs flex items-center gap-1.5">
                            Baixar PDF
                          </button>
                          <button onClick={() => copiarSql(m, idx)} className="btn-secondary text-xs flex items-center gap-1.5">
                            <Copy size={13} /> {copiado === idx ? 'Copiado!' : 'Copiar SQL'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}

              {enviando && (
                <div className="flex gap-3 items-center text-sm text-text-muted">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    <Sparkles size={14} />
                  </span>
                  <span className="flex items-center gap-2 italic">
                    <Loader2 size={14} className="animate-spin" /> Analisando seu pedido e montando a consulta…
                  </span>
                </div>
              )}

              {erro && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle size={16} className="flex-none mt-0.5" /> {erro}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* ---------- Input ---------- */}
          <div className="border-t border-border-subtle px-5 py-3.5">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1">
                {EXEMPLOS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => enviar(ex)}
                    disabled={enviando}
                    className="flex-none px-3 py-1.5 rounded-full border border-border-subtle bg-bg-muted/40 text-[11px] text-text-secondary hover:border-blue-500 hover:text-text-primary disabled:opacity-50"
                  >
                    {ex.length > 46 ? `${ex.slice(0, 46)}…` : ex}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 rounded-xl border border-border-subtle bg-bg-muted/40 px-3 py-2 focus-within:border-blue-500 transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  rows={2}
                  placeholder="Descreva o relatorio que voce precisa… ex.: “Lista as ultimas 10 avaliacoes, com as observacoes”"
                  className="flex-1 bg-transparent outline-none resize-none text-sm text-text-primary placeholder:text-text-muted"
                />
                <button
                  onClick={() => enviar()}
                  disabled={enviando || !input.trim()}
                  className="w-9 h-9 flex-none rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="text-[11px] text-text-muted text-center mt-1.5">
                A IA consulta os dados reais da empresa ativa em modo somente leitura. Confira os resultados antes de usar em decisao fiscal.
              </div>
            </div>
          </div>
        </section>
        </div>
        )}
      </div>
    </Layout>
  );
}
