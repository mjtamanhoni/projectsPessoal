import { Router, Response } from 'express';
import { horseApi, type RelatorioIAMensagem } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { gerarRelatorioIA, type ResultadoConsulta } from '../services/llm';
import { config } from '../config';

const router = Router();

// Empresa alvo da operacao: usuario comum sempre a propria; superadmin pode
// informar empresa_id (a tela de configuracao permite escolher a empresa).
function empresaAlvo(req: AuthRequest, solicitada?: unknown): number {
  const alvo = Number(solicitada);
  if (req.isSuperadmin && Number.isInteger(alvo) && alvo > 0) return alvo;
  return Number(req.empresaId) || 0;
}

interface ConfigEfetivaIA {
  empresaId: number;
  modelo: string;
  quotaDiaria: number;
  configurado: boolean;
  origemChave: 'empresa' | 'global' | 'nenhuma';
  origemModelo: 'empresa' | 'global';
}

async function configEfetivaIA(empresaId: number): Promise<ConfigEfetivaIA> {
  const empresaCfg = await horseApi.relatorioIaLlmConfig(empresaId).catch(() => null);
  const modeloEmpresa = (empresaCfg?.modelo ?? '').trim();
  const quotaEmpresa = empresaCfg?.quota_diaria ?? 0;
  const temChaveEmpresa = empresaCfg?.configurado === true;

  return {
    empresaId,
    modelo: modeloEmpresa || config.llm.model,
    quotaDiaria: quotaEmpresa > 0 ? quotaEmpresa : config.llm.quotaDiaria,
    configurado: temChaveEmpresa || !!config.llm.apiKey,
    origemChave: temChaveEmpresa ? 'empresa' : config.llm.apiKey ? 'global' : 'nenhuma',
    origemModelo: modeloEmpresa ? 'empresa' : 'global',
  };
}

async function configParaGerar(empresaId: number) {
  const empresaKey = await horseApi.relatorioIaLlmKey(empresaId).catch(() => null);
  const apiKey = (empresaKey?.api_key ?? '').trim() || config.llm.apiKey;
  const baseUrl = ((empresaKey?.base_url ?? '').trim() || config.llm.baseUrl).replace(/\/+$/, '');
  const model = (empresaKey?.modelo ?? '').trim() || config.llm.model;
  const quotaDiaria =
    empresaKey?.quota_diaria && empresaKey.quota_diaria > 0
      ? empresaKey.quota_diaria
      : config.llm.quotaDiaria;

  return {
    empresaId,
    apiKey,
    baseUrl,
    model,
    quotaDiaria,
    origemChave: (empresaKey?.api_key ?? '').trim() ? ('empresa' as const) : ('global' as const),
  };
}

// Configuracoes visiveis da IA (sem segredos): modelo e cota efetivos.
router.get('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = empresaAlvo(req, req.query.empresa_id);
    if (!empresaId) {
      res.status(400).json({ error: 'Empresa nao identificada' });
      return;
    }
    res.json(await configEfetivaIA(empresaId));
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Configuracao armazenada da empresa (chave mascarada) para a aba Config.
router.get('/llm-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = empresaAlvo(req, req.query.empresa_id);
    if (!empresaId) {
      res.status(400).json({ error: 'Empresa nao identificada' });
      return;
    }
    res.json(await horseApi.relatorioIaLlmConfig(empresaId));
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Salva a configuracao da empresa. Usuario comum so edita a propria empresa.
router.put('/llm-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as {
      empresa_id?: number;
      api_key?: string;
      base_url?: string;
      modelo?: string;
      quota_diaria?: number;
      remover_chave?: boolean;
    };
    const empresaId = empresaAlvo(req, body.empresa_id);
    if (!empresaId) {
      res.status(400).json({ error: 'Empresa nao identificada' });
      return;
    }
    res.json(await horseApi.relatorioIaSalvarLlmConfig({ ...body, empresa_id: empresaId }));
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Cota da empresa hoje (todos os usuarios somam).
router.get('/quota', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaId = empresaAlvo(req, req.query.empresa_id);
    if (!empresaId) {
      res.status(400).json({ error: 'Empresa nao identificada' });
      return;
    }
    const [quota, cfg] = await Promise.all([
      horseApi.relatorioIaQuota(empresaId),
      configEfetivaIA(empresaId),
    ]);
    res.json({
      usadas: quota.usadas,
      limite: cfg.quotaDiaria,
      empresaId,
      origemChave: cfg.origemChave,
    });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Esquema do banco (tabelas/colunas/FKs) para o montador de relatorios.
router.get('/schema', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(await horseApi.relatorioIaSchema());
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Executa um SQL montado pelo frontend no montador de relatorios
// (mesma validacao somente-leitura do Go).
router.post('/executar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sql } = req.body as { sql?: string };
    const texto = (sql ?? '').trim();
    if (!texto) {
      res.status(400).json({ error: 'SQL obrigatorio' });
      return;
    }
    res.json(await horseApi.relatorioIaConsulta(texto));
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Historico de conversas do usuario.
router.get('/conversas', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(await horseApi.relatorioIaListarConversas());
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Mensagens de uma conversa.
router.get('/conversas/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID invalido' });
      return;
    }
    const mensagens: RelatorioIAMensagem[] = await horseApi.relatorioIaMensagens(id);
    res.json(mensagens);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Excluir conversa.
router.delete('/conversas/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID invalido' });
      return;
    }
    res.json(await horseApi.relatorioIaExcluirConversa(id));
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Gera um relatorio: valida cota, salva as mensagens, chama a IA
// (que executa consultas somente-leitura via Go) e devolve resposta + dados.
router.post('/gerar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { mensagem, conversaId, empresa_id } = req.body as {
      mensagem?: string;
      conversaId?: number;
      empresa_id?: number;
    };
    const texto = (mensagem ?? '').trim();
    if (!texto) {
      res.status(400).json({ error: 'Mensagem obrigatoria' });
      return;
    }

    const empresaId = empresaAlvo(req, empresa_id ?? req.query.empresa_id);
    if (!empresaId) {
      res.status(400).json({ error: 'Empresa nao identificada' });
      return;
    }
    const cfg = await configParaGerar(empresaId);
    if (!cfg.apiKey) {
      res.status(503).json({
        error:
          'IA nao configurada: cadastre a chave da empresa na aba Config do Relatorio IA ou defina LLM_API_KEY no .env do BFF.',
      });
      return;
    }

    const quota = await horseApi.relatorioIaQuota(empresaId);
    if (quota.usadas >= cfg.quotaDiaria) {
      res.status(429).json({
        error: `Cota diaria de ${cfg.quotaDiaria} consultas da empresa atingida. Aguarde amanha ou aumente a cota na aba Config.`,
      });
      return;
    }

    // Conversa: usa a informada ou cria uma nova com o titulo da primeira pergunta.
    let cid = Number(conversaId) || 0;
    if (!cid) {
      const titulo = texto.length > 80 ? `${texto.slice(0, 80)}...` : texto;
      const conversa = await horseApi.relatorioIaCriarConversa(titulo);
      cid = conversa.id;
    }

    await horseApi.relatorioIaSalvarMensagem({
      conversa_id: cid,
      papel: 'usuario',
      conteudo: texto,
    });

    const historico = await horseApi.relatorioIaMensagens(cid);

    let consulta: ResultadoConsulta | null = null;
    try {
      const saida = await gerarRelatorioIA({
        historico: historico.map((m) => ({ papel: m.papel, conteudo: m.conteudo })),
        executarConsulta: async (sql) => {
          consulta = await horseApi.relatorioIaConsulta(sql);
          return consulta;
        },
        llm: { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model },
      });

      await horseApi.relatorioIaSalvarMensagem({
        conversa_id: cid,
        papel: 'ia',
        conteudo: saida.resposta,
        ...(saida.consulta ? { sql_gerado: saida.consulta.sql, dados: saida.consulta } : {}),
      });

      res.json({
        conversaId: cid,
        resposta: saida.resposta,
        consulta: saida.consulta ?? null,
      });
    } catch (erroIa) {
      // Salva o erro como mensagem da IA para o historico nao ficar "mudo".
      const msgErro = erroIa instanceof Error ? erroIa.message : 'Falha ao gerar relatorio';
      try {
        await horseApi.relatorioIaSalvarMensagem({
          conversa_id: cid,
          papel: 'ia',
          conteudo: `Nao consegui gerar o relatorio: ${msgErro}`,
        });
      } catch {
        // ignora falha de persistencia do erro
      }
      const status = erroIa instanceof Error && 'status' in erroIa ? (erroIa as { status: number }).status : 502;
      res.status(status).json({ error: msgErro, conversaId: cid });
    }
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    console.error('[RelatorioIA] Erro no /gerar:', status, error instanceof Error ? error.message : error);
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
