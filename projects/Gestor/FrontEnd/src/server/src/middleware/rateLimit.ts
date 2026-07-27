import rateLimit from 'express-rate-limit';
import { getSettings } from '../services/settings';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => getSettings().rateLimit?.max ?? 1000,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
