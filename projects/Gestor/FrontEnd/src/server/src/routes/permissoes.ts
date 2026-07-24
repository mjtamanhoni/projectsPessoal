import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarPermissoes();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/formulario/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarPermissoesPorFormulario(Number(req.params.id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/formulario/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { permissoes } = req.body;
    const result = await horseApi.salvarPermissoesFormulario(Number(req.params.id), permissoes);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
