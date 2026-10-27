import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Valores sensíveis NÃO devem ter fallback - devem ser obrigatórios via variáveis de ambiente
const horseJwtSecret = process.env.HORSE_JWT_SECRET;
if (!horseJwtSecret) {
  console.error('ERRO: Variável de ambiente HORSE_JWT_SECRET é obrigatória. Configure o arquivo .env');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  horseApi: {
    baseUrl: (process.env.HORSE_API_BASE_URL || 'http://localhost:9000').trim(),
    jwtSecret: horseJwtSecret.trim(),
  },
  // Configuracoes do modelo de IA (Relatorio IA).
  // A chave NUNCA chega ao browser: apenas o BFF fala com o provedor.
  llm: {
    apiKey: (process.env.LLM_API_KEY || '').trim(),
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, ''),
    model: (process.env.LLM_MODEL || 'gpt-4o-mini').trim(),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
    quotaDiaria: parseInt(process.env.LLM_QUOTA_DIARIA || '20', 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10),
  },
};
