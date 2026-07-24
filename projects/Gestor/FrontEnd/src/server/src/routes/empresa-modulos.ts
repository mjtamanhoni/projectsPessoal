import { Router, Response } from 'express';
import axios from 'axios';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { empresaModuloBodySchema } from '../schemas';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarEmpresaModulos(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { empresa_id, modulo_id } = req.query;
  if (!empresa_id || !modulo_id) {
    res.status(400).json({ error: 'Informe empresa_id e modulo_id como query params' });
    return;
  }
  try {
    const result = await horseApi.testEmpresaModulo(Number(empresa_id), Number(modulo_id));
    res.json(result);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      res.status(500).json({
        erro_go: error.response?.data,
        status_go: error.response?.status,
        mensagem: error.message,
      });
    } else {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      res.status(500).json({ error: err.message });
    }
  }
});

router.post('/', authMiddleware, validate(empresaModuloBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.salvarEmpresaModulos(req.body);
    res.json(result);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('[empresa-modulos POST] AxiosError:', error.config?.url, error.response?.status, error.response?.data);
      const data = error.response?.data;
      const msg = data && typeof data === 'object' ? ((data as Record<string, unknown>).erro || (data as Record<string, unknown>).mensagem || 'Erro interno') : 'Erro interno';
      res.status(error.response?.status || 500).json({ error: msg, detalhe: data });
    } else {
      const err = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error('[empresa-modulos POST] Erro:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirEmpresaModulo(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
