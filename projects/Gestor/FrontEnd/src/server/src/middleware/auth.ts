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
    if (!decoded.id || (decoded.empresa === undefined || decoded.empresa === null)) {
      res.status(401).json({ error: 'Token inválido: claims ausentes' });
      return;
    }
    // Superadmin pode ter empresa = 0 (tokens antigos, acesso global de leitura)
    req.usuarioId = decoded.id;
    req.empresaId = decoded.empresa;
    req.isSuperadmin = decoded.is_superadmin ?? false;
    // Garante que empresa_id do token seja passado nas query params para o Go backend.
    // - Para superadmin, o filtro so e aplicado se o cliente NAO tiver enviado
    //   empresa_id explicito (permite filtrar/ver todas as empresas com ?empresa_id=0).
    if (decoded.empresa > 0) {
      const clienteDefiniu = req.query.empresa_id !== undefined;
      if (!(req.isSuperadmin && clienteDefiniu)) {
        req.query = { ...req.query, empresa_id: String(decoded.empresa) };
      }
    }
    horseApi.runWithToken(token, () => next());
    return;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
