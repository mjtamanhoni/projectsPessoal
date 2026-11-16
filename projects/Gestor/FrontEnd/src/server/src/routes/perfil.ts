import { Router, Request, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { perfilBodySchema, perfilAvatarBodySchema } from '../schemas';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await horseApi.obterPerfil();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/', validate(perfilBodySchema), async (req: Request, res: Response) => {
  try {
    const { nome, email, senhaAtual, novaSenha, novoPin } = req.body;
    const result = await horseApi.atualizarPerfil({ nome, email, senhaAtual, novaSenha, novoPin });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/avatar', validate(perfilAvatarBodySchema), async (req: Request, res: Response) => {
  try {
    const result = await horseApi.salvarAvatarPerfil(String(req.body.avatar ?? ''));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
