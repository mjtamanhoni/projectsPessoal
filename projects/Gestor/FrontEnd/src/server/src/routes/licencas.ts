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

export default router;
