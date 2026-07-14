// Importa o middleare Morgam
import morgan from 'morgan';

// Importa configurações
import { config } from '../config';

// ====================================
// FORMATO DE LOG
// ====================================

// Escolhe o formato baseado no ambiente
// 'dev': Formato curto e colorido (desenvolvimento)
// 'combined': Formato completo (produção)
const format = config.nodeEnv === 'production' ? 'combined' : 'dev';

// ======================================
// CONFIGURAÇÃO DO MORGAN
// ======================================

//Cria o middleare de logging
export const requestLogger = morgan(format, {
  // Função para pular logging de rotas específicas
  // Não loga requisições de health check (muito frequentes)
  skip: (req) => req.url === '/health',
}); 
