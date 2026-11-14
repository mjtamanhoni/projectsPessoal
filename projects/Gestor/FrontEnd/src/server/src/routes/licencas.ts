import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.use((req: AuthRequest, res: Response, next) => {
  if (!req.isSuperadmin) {
    res.status(403).json({ error: 'Acesso restrito a superadmin' });
    return;
  }
  next();
});

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarLicencasTitulosPagar();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { cliente, cnpj, device, plano, validade, observacoes } = req.body ?? {};
    if (!cliente || String(cliente).trim() === '') {
      res.status(400).json({ error: 'Informe o cliente' });
      return;
    }
    const result = await horseApi.gerarLicencaTitulosPagar({
      cliente,
      cnpj,
      device,
      plano,
      validade,
      observacoes,
    });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/revogar', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.body?.id);
    if (!id || id <= 0) {
      res.status(400).json({ error: 'Informe o id da licença' });
      return;
    }
    const result = await horseApi.revogarLicencaTitulosPagar(id, req.body?.motivo);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/solicitacoes', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarSolicitacoesTitulosPagar();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.get('/solicitacoes/comprovante', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id || id <= 0) {
      res.status(400).json({ error: 'Informe o id da solicitação' });
      return;
    }
    const result = await horseApi.obterComprovanteSolicitacaoTitulosPagar(id);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/solicitacoes/pix', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.body?.id);
    if (!id || id <= 0) {
      res.status(400).json({ error: 'Informe o id da solicitação' });
      return;
    }
    const pixChave = String(req.body?.pix_chave ?? '').trim();
    if (!pixChave) {
      res.status(400).json({ error: 'Informe a chave PIX' });
      return;
    }
    const valorCentavos = Number(req.body?.valor_centavos);
    const result = await horseApi.enviarPixSolicitacaoTitulosPagar({
      id,
      pix_chave: pixChave,
      valor_centavos: Number.isFinite(valorCentavos) && valorCentavos > 0 ? valorCentavos : undefined,
    });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/solicitacoes/liberar', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.body?.id);
    if (!id || id <= 0) {
      res.status(400).json({ error: 'Informe o id da solicitação' });
      return;
    }
    const result = await horseApi.liberarSolicitacaoTitulosPagar({
      id,
      cliente: req.body?.cliente,
      cnpj: req.body?.cnpj,
      validade: req.body?.validade,
      observacoes: req.body?.observacoes,
    });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/solicitacoes/revogar', async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.body?.id);
    if (!id || id <= 0) {
      res.status(400).json({ error: 'Informe o id da solicitação' });
      return;
    }
    const result = await horseApi.revogarSolicitacaoTitulosPagar(id);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
