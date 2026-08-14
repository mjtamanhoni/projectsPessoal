import { describe, it, expect, vi } from 'vitest';

describe('Auth Middleware', () => {
  it('deve rejeitar requisição sem token', async () => {
    const { authMiddleware } = await import('../middleware/auth');

    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token de autenticação não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('deve chamar next() com token válido', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ id: 1, empresa: 1 }, 'c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d', { expiresIn: '1h' });

    const { authMiddleware } = await import('../middleware/auth');

    const req = { headers: { authorization: `Bearer ${token}` }, query: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.usuarioId).toBe(1);
    expect(req.empresaId).toBe(1);
  });
});
