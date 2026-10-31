import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, tituloId } = req.query as Record<string, string>;
    const horseParams: Record<string, unknown> = {};
    if (id) horseParams.id = id;
    if (tituloId) horseParams.titulo_id = tituloId;
    if (req.empresaId) horseParams.empresa_id = req.empresaId;
    const result = await horseApi.listarPagamentosEfetuados(horseParams);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { tituloId, dataPagamento, valorPago, formaPagamento, observacao } = req.body;
    if (!tituloId) {
      res.status(400).json({ error: 'ID do título é obrigatório' });
      return;
    }
    if (!valorPago || Number(valorPago) <= 0) {
      res.status(400).json({ error: 'Valor do pagamento deve ser maior que zero' });
      return;
    }
    const result = await horseApi.salvarPagamentoEfetuado({
      tituloId: Number(tituloId),
      dataPagamento,
      valorPago: Number(valorPago),
      formaPagamento,
      observacao,
    });
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
      res.status(400).json({ error: 'ID é obrigatório' });
      return;
    }
    const result = await horseApi.excluirPagamentoEfetuado(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
