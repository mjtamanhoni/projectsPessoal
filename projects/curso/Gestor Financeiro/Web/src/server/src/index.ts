// Importa o framewordk Epress
import express from 'express';
// Importa middleware de CORS para permitir requisições cross-origin
import cors from 'cors';
// Importa as configurações centralizadas
import { config } from './config';

// Imorta middlewares (serão criados na próxima aula)
import { requestLogger } from './middleware/logger';
import { apiLimiter } from './middleware/rateLimit';

// Importa as rotas da API (Serão criadas em aulas futuras)
import authRoutes from './routes/auth';
import clientesRoutes from './routes/clientes';
import fornecedoresRoutes from './routes/fornecedores';
import categoriasRoutes from './routes/categorias';
import contasPagarRoutes from './routes/contasPagar';
import contasReceberRoutes from './routes/contasReceber';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';

// =========================================================================
// Cria a aplicação Express
// =========================================================================
const app = express();

// =========================================================================
// MIDDLEWARES GLOBAIS
// =========================================================================

// Configura CORS para permitir requisições de origens do fronten
// Permite todas as origens (*) ou origens específicas
const corsOrigins = config.corsOrigins === '*' 
  ? '*' 
  : config.corsOrigins.split(',').map((s) => s.trim());

app.use(cors({ origin: corsOrigins }));

// Habilita parsing de JSON no corpo das requisições
// LImite de 10MB para evitar abuso de memória
app.use(express.json({ limit: '10mb' }));

//MIddleware de logging de requisições (exx: "GET /api/clientes 200")
app.use(requestLogger);

//Middleware de rate limiting (limite de 200 requisições por 15 minutos)
app.use(apiLimiter);

// =========================================================================
// ROTAS PÚBLICAS
// =========================================================================

// Rota de health check (verifica se o servidor está ativo)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// ROTAS DA API
// =========================================================================
  
// Cada rota é prefixada com /api e usa o respectivo router
app.use('/api/auth', authRoutes); // Rota de autenticação (login, logout, refresh token)
app.use('/api/clientes', clientesRoutes); // Rota de clientes (CRUD de clientes)
app.use('/api/fornecedores', fornecedoresRoutes); // Rota de fornecedores (CRUD de fornecedores)
app.use('/api/categorias', categoriasRoutes); // Rota de categorias (CRUD de categorias)
app.use('/api/contas-pagar', contasPagarRoutes); // Rota de contas a pagar (CRUD de contas a pagar)
app.use('/api/contas-receber', contasReceberRoutes); // Rota de contas a receber (CRUD de contas a receber)
app.use('/api/dashboard', dashboardRoutes); // Rota de dashboard (exibe dados resumidos e gráficos)
app.use('/api/settings', settingsRoutes); // Rota de configurações (CRUD de configurações do sistema)

// =========================================================================
// MIDDLEWARES DE ERRO
// =========================================================================

// Rota 404 - Rota não encontrada
// Se nenhuma rota anterior foi acionada, retornar erro 404
app.use((_req, res) => {
  res.status(404).json({
    error: 'A rota solicitada não foi encontrada.',
  });
});

// Handler de erros globais
// Captura qualquer erro não tratado nas rotas
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// =========================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =========================================================================

// Inicia o servidor na porta configurada
app.listen(config.port, () => {
  console.log(`Servidor rodando em http://localhost:${config.port}`);
  console.log(`Conectado ao Horse API:: ${config.horseApi.baseUrl}`);
  console.log(`Ambiente: ${config.nodeEnv}`);
});