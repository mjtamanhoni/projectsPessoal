import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { usuarioBodySchema, usuarioSenhaBodySchema, usuarioPinBodySchema } from '../schemas';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarUsuarios(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(usuarioBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const isNew = !body.codigo && !body.id;
    const usuarios = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarUsuarios(usuarios);

    if (isNew && body.senha && body.pin) {
      const codigoResp = (result as Record<string, unknown>)?.codigo;
      const userId = Number(codigoResp ?? 0);
      if (userId > 0) {
        await Promise.all([
          horseApi.alterarSenhaUsuario(userId, body.senha),
          horseApi.alterarPinUsuario(userId, body.pin),
        ]);
      }
    }

    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirUsuario(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/senha', authMiddleware, validate(usuarioSenhaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, novaSenha } = req.body;
    const result = await horseApi.alterarSenhaUsuario(id, novaSenha);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/pin', authMiddleware, validate(usuarioPinBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, novoPin } = req.body;
    const result = await horseApi.alterarPinUsuario(id, novoPin);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;