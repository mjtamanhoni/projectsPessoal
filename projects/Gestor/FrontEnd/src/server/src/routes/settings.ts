import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getSettings, saveSettings, getEmpresaSettings, saveEmpresaSettings, DEFAULT_EMPRESA } from '../services/settings';

const router = Router();

router.get('/', authMiddleware, (req: Request, res: Response) => {
  const file = getSettings();
  const authReq = req as AuthRequest;
  const empresaId = authReq.empresaId;
  const empresaSettings = empresaId ? getEmpresaSettings(empresaId) : DEFAULT_EMPRESA;
  res.json({ horseApi: file.horseApi, rateLimit: file.rateLimit, ...empresaSettings });
});

router.put('/', authMiddleware, (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const empresaId = authReq.empresaId;
  const body = req.body;

  if (body.horseApi) {
    saveSettings(body);
  }

  if (empresaId) {
    const { horseApi: _, ...empresaData } = body;
    saveEmpresaSettings(empresaId, empresaData);
  }

  const file = getSettings();
  const empresaSettings = empresaId ? getEmpresaSettings(empresaId) : DEFAULT_EMPRESA;
  res.json({ horseApi: file.horseApi, ...empresaSettings });
});

export default router;