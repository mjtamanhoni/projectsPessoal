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
};
