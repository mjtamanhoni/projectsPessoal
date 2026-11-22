import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { pontoLancamentoBodySchema, pontoExcedenteBodySchema } from '../schemas';
import type { PontoExcedenteInput } from '../types';

const router = Router();

router.get('/lancamentos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarPontoLancamentos(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/lancamentos', authMiddleware, validate(pontoLancamentoBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const lancamentos = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarPontoLancamentos(lancamentos);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/lancamentos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirPontoLancamento(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/proximo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.obterPontoProximo(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/resumo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.obterPontoResumo(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/excedentes', authMiddleware, validate(pontoExcedenteBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.salvarPontoExcedente(req.body as PontoExcedenteInput);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/excedentes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirPontoExcedente(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.obterPontoDashboard(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
