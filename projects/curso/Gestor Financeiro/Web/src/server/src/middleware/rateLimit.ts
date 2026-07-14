// Importa a biblioteca de rate limiting
import rateLimt from 'express-rate-limit';

// ============================================================================
// RATE LIMITER GERARL (200 requisições por 15 minutos)
// ============================================================================

// Aplicado a todas as rotas da API
//Protege contra abuso geral
export const apiLimiter = rateLimt({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Limite de 200 requisições por IP
  message: {erro: 'Muitas requisições feitas a partir deste IP, por favor tente novamente em 15 minutos'},
  standardHeaders: true, // Retorna informações de limite de taxa no cabeçalho RateLimit
  legacyHeaders: false, // Desativa os cabeçalhos X-RateLimit
});

// =============================================================================
// RATE LIMITER PARA AUTH (20 tentativas por 15 minutos)
// =============================================================================

// Aplicado apenas na rota de Login
// Mais restritivo para prevenir brute force
export const authLimiter = rateLimt({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Limite de 20 requisições por IP
  message: {erro: 'Muitas tentativas de login feitas a partir deste IP, por favor tente novamente em 15 minutos.'},
  standardHeaders: true, // Retorna informações de limite de taxa no cabeçalho RateLimit
  legacyHeaders: false, // Desativa os cabeçalhos X-RateLimit
})