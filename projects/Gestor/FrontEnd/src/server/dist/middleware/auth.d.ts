import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    usuarioId?: number;
    empresaId?: number;
}
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map