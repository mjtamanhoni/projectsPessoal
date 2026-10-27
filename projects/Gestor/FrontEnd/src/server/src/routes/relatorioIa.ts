import { Router, Response } from 'express';
import { horseApi, type RelatorioIAMensagem } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { gerarRelatorioIA, type ResultadoConsulta } from '../services/llm';
import { config } from '../config';

const router = Router();

// Configuracoes visiveis da IA (sem segredos): modelo e cota diaria.
router.get('/config', authMiddleware, (_req, res: Response) => {
  res.json({
    modelo: config.llm.model,
    quotaDiaria: config.llm.quotaDiaria,
    configurado: !!config.llm.apiKey,
  });
});

// Cota do usuario logado hoje.
router.get('/quota', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const quota = await horseApi.relatorioIaQuota();
    res.json({ usadas: quota.usadas, limite: config.llm.quotaDiaria });
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
    const { mensagem, conversaId } = req.body as { mensagem?: string; conversaId?: number };
    const texto = (mensagem ?? '').trim();
    if (!texto) {
      res.status(400).json({ error: 'Mensagem obrigatoria' });
      return;
    }

    const quota = await horseApi.relatorioIaQuota();
    if (quota.usadas >= config.llm.quotaDiaria) {
      res.status(429).json({
        error: `Cota diaria de ${config.llm.quotaDiaria} consultas atingida. Aguarde amanha ou aumente LLM_QUOTA_DIARIA no .env.`,
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
