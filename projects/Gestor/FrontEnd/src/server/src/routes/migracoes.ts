import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isSuperadmin) {
      res.status(403).json({ error: 'Acesso restrito a superadmin' });
      return;
    }
    const result = await horseApi.listarMigracoes();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/aplicar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isSuperadmin) {
      res.status(403).json({ error: 'Acesso restrito a superadmin' });
      return;
    }
    const { nome } = req.body;
    if (!nome) {
      res.status(400).json({ error: 'nome e obrigatorio' });
      return;
    }
    const result = await horseApi.aplicarMigracao(nome);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
