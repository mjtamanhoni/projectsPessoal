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

    // A senha e PIN já são definidos no UsuarioAtualizar do Go durante a criação
    // Não é necessário chamar alterarSenhaUsuario/alterarPinUsuario novamente

    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, empresa_id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    // Superadmin pode excluir usuario de outra empresa informando empresa_id
    const empresaId = req.isSuperadmin && empresa_id ? Number(empresa_id) : undefined;
    const result = await horseApi.excluirUsuario(Number(id), empresaId);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/senha', authMiddleware, validate(usuarioSenhaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, senhaAtual, novaSenha, empresa_id } = req.body;
    const empresaId = empresa_id ?? (req.isSuperadmin ? undefined : req.empresaId);
    if ((!empresaId || empresaId === 0) && !req.isSuperadmin) {
      res.status(400).json({ error: 'empresa_id é obrigatório' });
      return;
    }
    const result = await horseApi.alterarSenhaUsuario(id, senhaAtual, novaSenha, empresaId);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/pin', authMiddleware, validate(usuarioPinBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, novoPin, empresa_id } = req.body;
    const empresaId = empresa_id ?? (req.isSuperadmin ? undefined : req.empresaId);
    if ((!empresaId || empresaId === 0) && !req.isSuperadmin) {
      res.status(400).json({ error: 'empresa_id é obrigatório' });
      return;
    }
    const result = await horseApi.alterarPinUsuario(id, novoPin, empresaId);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/admin/senha', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isSuperadmin) {
      res.status(403).json({ error: 'Apenas o superadmin pode redefinir senhas de outros usuarios' });
      return;
    }
    const { id, novaSenha, empresa_id } = req.body;
    if (!id || !novaSenha) {
      res.status(400).json({ error: 'ID e nova senha sao obrigatorios' });
      return;
    }
    const result = await horseApi.adminRedefinirSenha(id, novaSenha, empresa_id ? Number(empresa_id) : undefined);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/admin/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.isSuperadmin) {
      res.status(403).json({ error: 'Apenas o superadmin pode redefinir PINs de outros usuarios' });
      return;
    }
    const { id, novoPin, empresa_id } = req.body;
    if (!id || !novoPin) {
      res.status(400).json({ error: 'ID e novo PIN sao obrigatorios' });
      return;
    }
    const result = await horseApi.adminRedefinirPin(id, novoPin, empresa_id ? Number(empresa_id) : undefined);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;