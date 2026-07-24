import morgan from 'morgan';
import { config } from '../config';

const format = config.nodeEnv === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(format, {
  skip: (req) => req.url === '/health',
});
