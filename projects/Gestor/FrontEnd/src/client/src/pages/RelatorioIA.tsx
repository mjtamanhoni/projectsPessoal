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
  Settings2,
  Save,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { MontarRelatorio } from './MontarRelatorio';
import { useAuth } from '@/context/AuthContext';
import { ACAO } from '@/lib/permissions';

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

interface ConfigEfetiva {
  empresaId: number;
  modelo: string;
  quotaDiaria: number;
  configurado: boolean;
  origemChave: 'empresa' | 'global' | 'nenhuma';
  origemModelo: 'empresa' | 'global';
}

interface ConfigEmpresa {
  empresa_id: number;
  api_key_mascarada: string;
  configurado: boolean;
  base_url: string;
  modelo: string;
  quota_diaria: number;
}

interface EmpresaOpcao {
  id?: number;
  codigo?: number;
  razao_social: string;
  fantasia?: string;
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
  const { isSuperadmin, temPermissao, empresa: empresaAtual } = useAuth();
  const [aba, setAba] = useState<'ia' | 'montar' | 'config'>('ia');
  const [cfg, setCfg] = useState<ConfigEfetiva | null>(null);
  const [cfgEmpresa, setCfgEmpresa] = useState<ConfigEmpresa | null>(null);
  const [quota, setQuota] = useState({ usadas: 0, limite: 20 });
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [empresas, setEmpresas] = useState<EmpresaOpcao[]>([]);
  const [empresaSel, setEmpresaSel] = useState<number | null>(null);
  const [chaveInput, setChaveInput] = useState('');
  const [modeloInput, setModeloInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [quotaInput, setQuotaInput] = useState(20);
  const [removerChave, setRemoverChave] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [avisoConfig, setAvisoConfig] = useState('');
  const podeEditarConfig = isSuperadmin || temPermissao('/relatorio-ia', ACAO.EDITAR);

  const carregarConversas = useCallback(async () => {
    try {
      const r = await api.get<Conversa[]>('/relatorio-ia/conversas');
      setConversas(Array.isArray(r.data) ? r.data : []);
    } catch {
      // historico vazio ou erro pontual
    }
  }, []);

  const carregarQuota = useCallback(async (empresaId?: number | null) => {
    try {
      const r = await api.get<{ usadas: number; limite: number }>('/relatorio-ia/quota', {
        params: empresaId ? { empresa_id: empresaId } : undefined,
      });
      setQuota(r.data);
    } catch {
      // mantem valor padrao
    }
  }, []);

  const carregarConfig = useCallback(async (empresaId?: number | null) => {
    const params = empresaId ? { empresa_id: empresaId } : undefined;
    const [efetiva, armazenada] = await Promise.allSettled([
      api.get<ConfigEfetiva>('/relatorio-ia/config', { params }),
      api.get<ConfigEmpresa>('/relatorio-ia/llm-config', { params }),
    ]);
    if (efetiva.status === 'fulfilled') {
      setCfg(efetiva.value.data);
    }
    if (armazenada.status === 'fulfilled') {
      setCfgEmpresa(armazenada.value.data);
      setModeloInput(armazenada.value.data.modelo ?? '');
      setBaseUrlInput(armazenada.value.data.base_url ?? '');
      setQuotaInput(armazenada.value.data.quota_diaria || 20);
      setChaveInput('');
      setRemoverChave(false);
    } else {
      setErro(getErrorMsg(armazenada.reason));
    }
  }, []);

  useEffect(() => {
    carregarConfig();
    carregarConversas();
    carregarQuota();
  }, [carregarConfig, carregarConversas, carregarQuota]);

  useEffect(() => {
    if (!isSuperadmin) return;
    api
      .get<EmpresaOpcao[]>('/auth/empresas')
      .then((r) => setEmpresas(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [isSuperadmin]);

  useEffect(() => {
    if (!isSuperadmin || empresaSel !== null) return;
    const id = empresaAtual?.id ?? cfg?.empresaId ?? null;
    if (id) setEmpresaSel(id);
  }, [isSuperadmin, empresaAtual?.id, cfg?.empresaId, empresaSel]);

  const trocarEmpresaConfig = async (id: number) => {
    setEmpresaSel(id);
    setErro('');
    setAvisoConfig('');
    await carregarConfig(id);
    await carregarQuota(id);
  };

  const salvarConfig = async () => {
    if (!podeEditarConfig) return;
    setSalvandoConfig(true);
    setErro('');
    setAvisoConfig('');
    try {
      const payload: {
        empresa_id?: number;
        api_key?: string;
        base_url?: string;
        modelo?: string;
        quota_diaria?: number;
        remover_chave?: boolean;
      } = {
        modelo: modeloInput.trim(),
        base_url: baseUrlInput.trim(),
        quota_diaria: Number(quotaInput) || 20,
        remover_chave: removerChave,
      };
      if (isSuperadmin && empresaSel) payload.empresa_id = empresaSel;
      if (chaveInput.trim()) payload.api_key = chaveInput.trim();

      await api.put('/relatorio-ia/llm-config', payload);
      setAvisoConfig('Configuracao da IA salva com sucesso.');
      await carregarConfig(empresaSel);
      await carregarQuota(empresaSel);
    } catch (e) {
      setErro(getErrorMsg(e));
    } finally {
      setSalvandoConfig(false);
    }
  };

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
              ['config', 'Configuracao'],
            ] as Array<['ia' | 'montar' | 'config', string]>
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
        ) : aba === 'config' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-5">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 size={18} /> Configuracao da IA
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Cada empresa pode usar a propria chave, modelo e cota diaria. Sem chave da
                  empresa, o sistema usa a chave global configurada no servidor.
                </p>
              </div>

              {isSuperadmin && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Empresa
                  </label>
                  <div className="relative">
                    <Building2
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <select
                      value={empresaSel ?? ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) void trocarEmpresaConfig(id);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border-subtle bg-bg-muted/40 text-sm text-text-primary outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione uma empresa...</option>
                      {empresas.map((e) => {
                        const id = e.id ?? e.codigo ?? 0;
                        return (
                          <option key={id} value={id}>
                            {e.fantasia || e.razao_social}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Chave da API (Google AI Studio / OpenAI / Groq)
                  </label>
                  <input
                    type="password"
                    value={chaveInput}
                    onChange={(e) => {
                      setChaveInput(e.target.value);
                      if (e.target.value) setRemoverChave(false);
                    }}
                    autoComplete="off"
                    placeholder={
                      cfgEmpresa?.api_key_mascarada
                        ? `Configurada: ${cfgEmpresa.api_key_mascarada} (deixe em branco para manter)`
                        : 'Cole aqui a chave gerada para esta empresa'
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-bg-muted/40 text-sm text-text-primary outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-text-muted mt-1.5">
                    A chave fica salva no banco e nunca volta ao navegador em texto puro (apenas
                    mascarada). Cada empresa precisa de uma chave/projeto proprio no provedor para
                    ter cota separada.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Modelo (opcional)
                  </label>
                  <input
                    value={modeloInput}
                    onChange={(e) => setModeloInput(e.target.value)}
                    placeholder={cfg?.modelo ?? 'gpt-4o-mini'}
                    className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-bg-muted/40 text-sm text-text-primary outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    URL base (opcional)
                  </label>
                  <input
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-bg-muted/40 text-sm text-text-primary outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Cota diaria da empresa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-bg-muted/40 text-sm text-text-primary outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <div className="w-full rounded-lg border border-border-subtle bg-bg-muted/40 px-3 py-2.5 text-xs text-text-secondary">
                    <div>
                      Efetivo: <span className="text-text-primary">{cfg?.modelo ?? '-'}</span>
                    </div>
                    <div>
                      Cota: <span className="text-text-primary">{cfg?.quotaDiaria ?? '-'}</span>/dia
                    </div>
                    <div>
                      Chave:{' '}
                      <span className="text-text-primary">
                        {cfg?.origemChave === 'empresa'
                          ? 'da empresa'
                          : cfg?.origemChave === 'global'
                            ? 'global do servidor'
                            : 'nao configurada'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={salvarConfig}
                  disabled={!podeEditarConfig || salvandoConfig}
                  className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {salvandoConfig ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Salvar configuracao
                </button>
                <button
                  onClick={() => {
                    setRemoverChave(true);
                    setChaveInput('');
                    setAvisoConfig('A chave da empresa sera removida ao salvar.');
                  }}
                  disabled={!podeEditarConfig || !cfgEmpresa?.configurado}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Remover chave da empresa
                </button>
                {removerChave && (
                  <span className="text-[11px] text-amber-400">
                    Remocao marcada: salve para voltar a usar a chave global.
                  </span>
                )}
              </div>

              {!podeEditarConfig && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  <AlertCircle size={16} className="flex-none mt-0.5" />
                  Voce nao tem a permissao Editar no Relatorio IA; pode visualizar a configuracao,
                  mas nao salvar.
                </div>
              )}

              {avisoConfig && (
                <div className="flex items-start gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                  <CheckCircle2 size={16} className="flex-none mt-0.5" /> {avisoConfig}
                </div>
              )}
            </div>
          </div>
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
              <span>Consultas da empresa hoje</span>
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
                {cfg.origemChave === 'empresa'
                  ? ' — chave da empresa'
                  : cfg.origemChave === 'global'
                    ? ' — chave global'
                    : ' — IA nao configurada'}
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
