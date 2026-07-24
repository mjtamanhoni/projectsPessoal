import { Router, Request, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { loginBodySchema } from '../schemas';

const router = Router();

router.get('/empresas', async (_req: Request, res: Response) => {
  try {
    const result = await horseApi.listarEmpresasPublic();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/login', authLimiter, validate(loginBodySchema), async (req: Request, res: Response) => {
  try {
    const { login, senha, pin, empresa } = req.body;

    if (pin) {
      const result = await horseApi.login({ pin, empresa });
      res.json({ ...result, empresaId: empresa });
      return;
    }

    const result = await horseApi.login({ login, senha, empresa });
    res.json({ ...result, empresaId: empresa });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    res.status(status).json({ error: message });
  }
});

router.get('/permissoes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = await horseApi.listarPermissoesUsuario(req.usuarioId!);
    const isSuperadmin = req.isSuperadmin ?? false;

    if (!data || !Array.isArray(data) || data.length === 0) {
      res.json({ irrestrito: true, formularios: [], isSuperadmin });
      return;
    }

    res.json({ irrestrito: false, formularios: data, isSuperadmin });
  } catch (error: unknown) {
    console.error('[permissoes] Erro ao buscar permissoes:', error);
    res.json({ irrestrito: true, formularios: [], isSuperadmin: req.isSuperadmin ?? false });
  }
});

export default router;