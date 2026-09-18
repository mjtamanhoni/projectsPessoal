import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { encomendaBodySchema, encomendaBaixaSchema, encomendaStatusSchema } from '../schemas';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarEncomendas(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(encomendaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarEncomendas(items, req.empresaId);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/gerar-venda', authMiddleware, validate(encomendaBaixaSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, id_encomenda, data_venda, recebido, categoria_receber_id } = req.body as {
      id?: number;
      id_encomenda?: number;
      data_venda: string;
      recebido?: boolean;
      categoria_receber_id?: number;
    };
    const result = await horseApi.gerarVendaDeEncomenda({
      id: id ?? id_encomenda ?? 0,
      data_venda,
      recebido,
      categoria_receber_id,
    });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/status', authMiddleware, validate(encomendaStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.alterarStatusEncomenda(req.body);
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
    const result = await horseApi.excluirEncomenda(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/pagamentos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const encomendaId = Number(req.query.encomenda_id);
    if (!encomendaId) {
      res.status(400).json({ error: 'encomenda_id e obrigatorio' });
      return;
    }
    const result = await horseApi.listarEncomendaPagamentos(encomendaId);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/pagamentos', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { encomenda_id, pagamentos } = req.body as { encomenda_id: number; pagamentos: unknown[] };
    if (!encomenda_id) {
      res.status(400).json({ error: 'encomenda_id e obrigatorio' });
      return;
    }
    const result = await horseApi.salvarEncomendaPagamentos(encomenda_id, pagamentos ?? []);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
