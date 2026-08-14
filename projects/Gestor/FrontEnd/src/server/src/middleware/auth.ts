import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { horseApi } from '../services/horseApi';

export interface AuthRequest extends Request {
  usuarioId?: number;
  empresaId?: number;
  isSuperadmin?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.horseApi.jwtSecret) as { id: number; empresa: number; is_superadmin?: boolean };
    if (!decoded.id || !decoded.empresa) {
      res.status(401).json({ error: 'Token inválido: claims ausentes' });
      return;
    }
    req.usuarioId = decoded.id;
    req.empresaId = decoded.empresa;
    req.isSuperadmin = decoded.is_superadmin ?? false;
    const query = (req.query ?? {}) as Record<string, unknown>;
    if (!query.empresa_id) {
      query.empresa_id = decoded.empresa;
    }
    horseApi.runWithToken(token, () => next());
    return;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
