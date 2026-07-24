import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { ContaReceber } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { dataInicio, dataFim, status, clienteId, categoriaId, id: queryId } = req.query as Record<string, string>;
    const horseParams: Record<string, unknown> = {};
    if (queryId) horseParams.id = queryId;
    if (req.empresaId) horseParams.empresa_id = req.empresaId;
    const result = await horseApi.listarContasReceber(horseParams);
    let contas = result as ContaReceber[];

    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;
    contas = contas.filter((c) => {
      const v = new Date(c.dataVencimento);
      if (inicio && v < inicio) return false;
      if (fim && v > fim) return false;
      if (status === 'recebido') return c.recebido;
      if (status === 'aberto') return !c.recebido;
      if (clienteId && c.clienteId != null && Number(c.clienteId) !== Number(clienteId)) return false;
      if (categoriaId && c.idCategoria != null && Number(c.idCategoria) !== Number(categoriaId)) return false;
      return true;
    });

    res.json(contas);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const contas = Array.isArray(body) ? body : [body];
    if (!contas.length || !contas[0].descricao) {
      res.status(400).json({ error: 'Descrição da conta é obrigatória' });
      return;
    }
    const result = await horseApi.salvarContasReceber(contas);
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
    const result = await horseApi.excluirContaReceber(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/receber', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, dataRecebimento, valor, desconto, acrescimo } = req.body;
    if (!id) {
      res.status(400).json({ error: 'ID é obrigatório' });
      return;
    }
    const result = await horseApi.receberConta({
      id,
      data_recebimento: dataRecebimento,
      valorBaixa: valor ? Number(valor) : undefined,
      desconto: desconto ? Number(desconto) : undefined,
      acrescimo: acrescimo ? Number(acrescimo) : undefined,
    });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.put('/estornar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'ID é obrigatório' });
      return;
    }
    const contaId = Number(id);
    const allContas = await horseApi.listarContasReceber() as ContaReceber[];
    const related = allContas.filter(c => c.lancamentoOrigemId === contaId);
    for (const conta of related) {
      await horseApi.excluirContaReceber(conta.id || conta.codigo!);
    }
    const result = await horseApi.estornarContaReceber(contaId);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
