import axios from 'axios';
import { config } from '../config';
import { AppError } from '../types';

// Servico de IA do Relatorio IA (Relatorio IA).
// O BFF conversa com um provedor compativel com a API da OpenAI
// (OpenAI, Azure OpenAI, Groq, DeepSeek, LM Studio/Ollama local, etc).

export interface ResultadoConsulta {
  colunas: string[];
  linhas: Record<string, unknown>[];
  sql: string;
  total_linhas: number;
}

interface MensagemChat {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

const SYSTEM_PROMPT = `Voce e o assistente de relatorios do Gestor Financeiro, um sistema de gestao para pequenas empresas (financeiro, horas trabalhadas, producao e encomendas).

Sua funcao: interpretar o pedido do usuario, gerar UMA consulta SQL (somente leitura) com a ferramenta consultar_dados, e depois responder em portugues do Brasil com um resumo curto dos resultados.

Regras obrigatorias:
1. SEMPRE use a ferramenta consultar_dados antes de responder sobre dados do sistema. Nunca invente numeros.
2. Gere apenas SELECT ou CTE (WITH). Nada de INSERT/UPDATE/DELETE/DDL.
3. Filtre SEMPRE por empresa_id quando a tabela tiver essa coluna. O sistema ja protege os dados, mas filtre tambem.
4. PERIODO: quando o pedido citar um periodo ("ultimos 5 dias", "ultima semana", "mes de marco"), filtre POR DATA no banco (ex.: WHERE data_servico >= CURRENT_DATE - INTERVAL '5 days'). NUNCA use LIMIT para simular um periodo. LIMIT serve apenas para limitar quantidade de linhas (ex.: "ultimos 10 lancamentos" = ORDER BY ... LIMIT 10).
5. Se a consulta de periodo nao retornar linhas, responda que nao ha registros no periodo solicitado. NUNQUE troque o periodo por outro sem avisar explicitamente ao usuario.
6. Se a consulta retornar erro, ajuste o SQL e tente novamente (maximo 3 tentativas).
7. Schema principal - horas_trabalhadas: empresa_id, id, usuario_id, cliente_id, servico_id, valor_hora, data_servico (date), hora_inicio (time), hora_termino (time), quantidade_horas, total_horas (valor a receber), observacoes, status, created_at.
8. Responda de forma curta e objetiva: 2 a 5 frases de resumo antes da tabela de dados. Quando fizer sentido, inclua linha de totalizacao.
9. Nao exponha SQL na resposta ao usuario; o sistema mostra a consulta automaticamente.
10. Datas no formato dd/mm/aaaa e valores em reais (R$ 1.234,56) quando fizer sentido apresentar assim.
11. Se o pedido nao for um relatorio (ex.: "bom dia"), responda educadamente que voce gerencia relatorios do sistema.`;

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'consultar_dados',
      description:
        'Executa uma consulta SQL somente leitura no banco do Gestor Financeiro e retorna as linhas encontradas. Use SELECT com filtro de empresa_id quando a tabela possuir essa coluna.',
      parameters: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description:
              "SQL SELECT completo. Ex.: SELECT data, hora_inicio, hora_termino FROM horas_trabalhadas WHERE empresa_id = 1 AND data >= CURRENT_DATE - 5 ORDER BY data DESC",
          },
        },
        required: ['sql'],
      },
    },
  },
];

// Chama o provedor com retries para falhas transitorias (503/429/timeout),
// comuns no tier gratuito de alguns provedores.
async function chamarLLM(llm: {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}, messages: MensagemChat[]): Promise<{ data: { choices?: Array<{ message?: MensagemChat & { content?: string } }> } }> {
  const url = `${llm.baseUrl}/chat/completions`;
  const payload = {
    model: llm.model,
    temperature: llm.temperature,
    max_tokens: llm.maxTokens,
    messages,
    tools: TOOLS,
    tool_choice: 'auto',
  };
  const opcoes = {
    headers: { Authorization: `Bearer ${llm.apiKey}` },
    timeout: llm.timeoutMs,
  };

  let ultimoErro: unknown = null;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      return await axios.post(url, payload, opcoes);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const transitorio = status === undefined || status === 429 || status >= 500;
      ultimoErro = err;
      if (!transitorio || tentativa === 3) throw err;
      await new Promise((res) => setTimeout(res, tentativa * 1000));
    }
  }
  throw ultimoErro;
}

export interface LLMOverride {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export async function gerarRelatorioIA(params: {
  historico: Array<{ papel: string; conteudo: string }>;
  executarConsulta: (sql: string) => Promise<ResultadoConsulta>;
  llm?: LLMOverride;
}): Promise<{ resposta: string; consulta: ResultadoConsulta | null }> {
  const llm = {
    ...config.llm,
    ...(params.llm?.apiKey ? { apiKey: params.llm.apiKey } : {}),
    ...(params.llm?.baseUrl ? { baseUrl: params.llm.baseUrl } : {}),
    ...(params.llm?.model ? { model: params.llm.model } : {}),
  };

  if (!llm.apiKey) {
    throw new AppError(
      'IA nao configurada: cadastre a chave da empresa na aba Config do Relatorio IA ou defina LLM_API_KEY no arquivo .env do servidor (BFF).',
      503,
    );
  }

  const messages: MensagemChat[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Ultimas 20 mensagens do historico, mantendo apenas o conteudo texto.
  for (const m of params.historico.slice(-20)) {
    messages.push({
      role: m.papel === 'ia' ? 'assistant' : 'user',
      content: m.conteudo,
    });
  }

  let consulta: ResultadoConsulta | null = null;

  // 7 rodadas: erro de SQL + descoberta de schema + consulta vazia + sucesso
  // ainda deixam margem para o resumo final.
  for (let rodada = 0; rodada < 7; rodada++) {
    const response = await chamarLLM(llm, messages);

    const msg = response.data?.choices?.[0]?.message;
    if (!msg) {
      throw new AppError('Provedor de IA nao retornou resposta', 502);
    }

    const toolCalls = msg.tool_calls as MensagemChat['tool_calls'] | undefined;

    if (toolCalls && toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: msg.content ?? '',
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        let argumentos: { sql?: string } = {};
        try {
          argumentos = JSON.parse(tc.function.arguments || '{}');
        } catch {
          argumentos = {};
        }

        let resultado: ResultadoConsulta | { erro: string };
        try {
          resultado = await params.executarConsulta(String(argumentos.sql ?? ''));
          consulta = resultado as ResultadoConsulta;
        } catch (err) {
          resultado = {
            erro: err instanceof Error ? err.message : 'Falha ao executar a consulta',
          };
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(resultado),
        });
      }
      continue; // Volta ao modelo com o resultado da consulta
    }

    const resposta = String(msg.content ?? '').trim();
    if (!resposta) {
      throw new AppError('Provedor de IA retornou resposta vazia', 502);
    }
    return { resposta, consulta };
  }

  throw new AppError('A IA nao conseguiu concluir a consulta. Tente reformular o pedido.', 502);
}
