import { Router, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.all('*', authMiddleware, async (req: AuthRequest, res: Response) => {
  const path = req.originalUrl.replace(/^\/api\/erp/, '').split('?')[0];
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else if (value !== undefined) {
      params.append(key, String(value));
    }
  }
  const query = params.toString();
  const url = `${config.horseApi.baseUrl}/erp${path}${query ? `?${query}` : ''}`;

  try {
    const upstream = await axios.request({
      url,
      method: req.method,
      data: req.method === 'GET' ? undefined : req.body,
      headers: {
        Authorization: String(req.headers.authorization ?? ''),
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      validateStatus: () => true,
    });
    const data = upstream.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const body = data as Record<string, unknown>;
      if (body.erro !== undefined && body.error === undefined) {
        body.error = body.erro;
      }
    }
    res.status(upstream.status).json(data);
  } catch (error) {
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 502) : 502;
    let message = 'Erro ao consultar ERP';
    if (axios.isAxiosError(error)) {
      const upstream = error.response?.data as { erro?: string; error?: string } | undefined;
      message = upstream?.erro ?? upstream?.error ?? error.message;
    }
    res.status(status).json({ error: message });
  }
});

export default router;
