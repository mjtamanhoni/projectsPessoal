import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function statusDoErro(error: unknown): number {
  return error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
}

function mensagemDoErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro interno';
}

router.get('/aplicados', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const empresaID = Number(req.query.empresa_id);
    if (!empresaID) {
      res.status(400).json({ error: 'empresa_id e obrigatorio' });
      return;
    }
    const result = await horseApi.listarAplicadosPadrao(empresaID);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: mensagemDoErro(error) });
  }
});

router.post('/replicar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id, pacote_id } = req.body ?? {};
    const empresaID = Number(empresa_id);
    if (!empresaID) {
      res.status(400).json({ error: 'empresa_id e obrigatorio' });
      return;
    }
    const result = await horseApi.replicarPadrao({
      empresa_id: empresaID,
      pacote_id: pacote_id ? Number(pacote_id) : undefined,
    });
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: mensagemDoErro(error) });
  }
});

router.get('/:tabela', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarPadrao(req.params.tabela, req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: mensagemDoErro(error) });
  }
});

router.post('/:tabela', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarPadrao(req.params.tabela, items);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: mensagemDoErro(error) });
  }
});

router.delete('/:tabela', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.excluirPadrao(req.params.tabela, req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: mensagemDoErro(error) });
  }
});

export default router;
