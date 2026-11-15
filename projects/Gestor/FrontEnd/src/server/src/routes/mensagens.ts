import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

function statusDoErro(error: unknown): number {
  return error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
}

const MODULOS = new Set(['gestor', 'chego', 'titulos_online', 'titulos_offline']);
const TIPOS = new Set(['info', 'alerta', 'sucesso', 'solicitacao', 'sistema']);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const modulo = typeof req.query.modulo === 'string' ? req.query.modulo.trim() : undefined;
    if (modulo && !MODULOS.has(modulo)) {
      res.status(400).json({ error: 'Modulo invalido' });
      return;
    }
    const limiteNum = Number(req.query.limite);
    const limite = Number.isFinite(limiteNum) && limiteNum > 0 ? Math.min(limiteNum, 200) : undefined;
    const result = await horseApi.listarMensagens({ modulo, limite });
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const modulo = String(req.body?.modulo ?? '').trim();
    if (!MODULOS.has(modulo)) {
      res.status(400).json({ error: 'Informe um modulo valido' });
      return;
    }
    const titulo = String(req.body?.titulo ?? '').trim();
    if (!titulo) {
      res.status(400).json({ error: 'Informe o titulo' });
      return;
    }
    const tipo = String(req.body?.tipo ?? 'info').trim();
    if (!TIPOS.has(tipo)) {
      res.status(400).json({ error: 'Tipo de mensagem invalido' });
      return;
    }
    const acaoRota = String(req.body?.acao_rota ?? '').trim();
    if (acaoRota && (!acaoRota.startsWith('/') || acaoRota.length > 200)) {
      res.status(400).json({ error: 'Rota de acao invalida' });
      return;
    }
    const prioridadeNum = Number(req.body?.prioridade);
    const prioridade = Number.isFinite(prioridadeNum)
      ? Math.max(0, Math.min(9, Math.trunc(prioridadeNum)))
      : 0;

    const payload: Record<string, unknown> = {
      modulo,
      tipo,
      titulo,
      corpo: String(req.body?.corpo ?? ''),
      acao_rota: acaoRota,
      prioridade,
    };

    if (req.isSuperadmin && req.body?.empresa_id !== undefined) {
      const empresaId = Number(req.body.empresa_id);
      if (!Number.isFinite(empresaId) || empresaId < 0) {
        res.status(400).json({ error: 'Empresa invalida' });
        return;
      }
      payload.empresa_id = Math.trunc(empresaId);
    }

    const result = await horseApi.criarMensagem(payload);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/lidas', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.marcarMensagensLidas();
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/:id/lida', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'Informe o id da mensagem' });
      return;
    }
    const result = await horseApi.marcarMensagemLida(Math.trunc(id));
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
