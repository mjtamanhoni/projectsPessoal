import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  horseApi: {
    baseUrl: process.env.HORSE_API_BASE_URL || 'http://localhost:9000',
    jwtSecret: process.env.HORSE_JWT_SECRET || 'c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d',
  },
};
