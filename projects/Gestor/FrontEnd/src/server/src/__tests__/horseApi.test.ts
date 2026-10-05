import { describe, it, expect, vi } from 'vitest';

// O segredo vem SEMPRE do ambiente (.env). Nunca hardcode segredos em testes:
// este arquivo é versionado e o repositório é público.
if (!process.env.HORSE_JWT_SECRET) {
  process.env.HORSE_JWT_SECRET = 'segredo-de-teste-local';
}

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
    const token = jwt.sign({ id: 1, empresa: 1 }, process.env.HORSE_JWT_SECRET as string, { expiresIn: '1h' });

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
