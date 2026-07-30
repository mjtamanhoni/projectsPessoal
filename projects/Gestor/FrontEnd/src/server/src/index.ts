import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { requestLogger } from './middleware/logger';
import { apiLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import clientesRoutes from './routes/clientes';
import fornecedoresRoutes from './routes/fornecedores';
import categoriasRoutes from './routes/categorias';
import contasPagarRoutes from './routes/contasPagar';
import contasReceberRoutes from './routes/contasReceber';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import usuariosRoutes from './routes/usuarios';
import formulariosRoutes from './routes/formularios';
import usuarioFormulariosRoutes from './routes/usuarioFormularios';
import horasTrabalhadasRoutes from './routes/horasTrabalhadas';
import horasAbatidasRoutes from './routes/horasAbatidas';
import horasExcedidasRoutes from './routes/horasExcedidas';
import horasDashboardRoutes from './routes/horasDashboard';
import producaoDashboardRoutes from './routes/producaoDashboard';
import servicosRoutes from './routes/servicos';
import permissoesRoutes from './routes/permissoes';
import insumosRoutes from './routes/insumos';
import marcasRoutes from './routes/marcas';
import migracoesRoutes from './routes/migracoes';
import perdasInsumoRoutes from './routes/perdas-insumo';
import perdasProdutoRoutes from './routes/perdas-produto';
import usoConsumoRoutes from './routes/uso-consumo';
import comprasInsumoRoutes from './routes/compras-insumo';
import produtosFabricadosRoutes from './routes/produtos-fabricados';
import receitasIngredientesRoutes from './routes/receitas-ingredientes';
import custosAdicionaisTipoRoutes from './routes/custos-adicionais-tipo';
import fabricacoesRoutes from './routes/fabricacoes';
import vendasProdutoRoutes from './routes/vendas-produto';
import fabricacaoCustosAdicionaisRoutes from './routes/fabricacao-custos-adicionais';
import estoqueInsumoRoutes from './routes/estoque-insumo';
import estoqueProdutoRoutes from './routes/estoque-produto';
import empresaRoutes from './routes/empresa';
import modulosRoutes from './routes/modulos';
import moduloFormulariosRoutes from './routes/modulo-formularios';
import empresaModulosRoutes from './routes/empresa-modulos';
import menuRoutes from './routes/menu';
import relatoriosProducaoRoutes from './routes/relatorios-producao';
import lancamentoAutomaticoConfigRoutes from './routes/lancamento-automatico-config';
import printRoutes from './routes/print';

const app = express();

const corsOrigins = config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map((s) => s.trim());
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/contas-pagar', contasPagarRoutes);
app.use('/api/contas-receber', contasReceberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/formularios', formulariosRoutes);
app.use('/api/usuario-formularios', usuarioFormulariosRoutes);
app.use('/api/horas-trabalhadas', horasTrabalhadasRoutes);
app.use('/api/horas-abatidas', horasAbatidasRoutes);
app.use('/api/horas-excedidas', horasExcedidasRoutes);
app.use('/api/horas-dashboard', horasDashboardRoutes);
app.use('/api/producao-dashboard', producaoDashboardRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/permissoes', permissoesRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/marcas', marcasRoutes);
app.use('/api/migracoes', migracoesRoutes);
app.use('/api/compras-insumo', comprasInsumoRoutes);
app.use('/api/produtos-fabricados', produtosFabricadosRoutes);
app.use('/api/receitas-ingredientes', receitasIngredientesRoutes);
app.use('/api/custos-adicionais-tipo', custosAdicionaisTipoRoutes);
app.use('/api/fabricacoes', fabricacoesRoutes);
app.use('/api/vendas-produto', vendasProdutoRoutes);
app.use('/api/fabricacao-custos-adicionais', fabricacaoCustosAdicionaisRoutes);
app.use('/api/estoque-insumo', estoqueInsumoRoutes);
app.use('/api/estoque-produto', estoqueProdutoRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/modulo-formularios', moduloFormulariosRoutes);
app.use('/api/empresa-modulos', empresaModulosRoutes);
app.use('/api/auth/menu', menuRoutes);
app.use('/api/relatorios-producao', relatoriosProducaoRoutes);
app.use('/api/lancamento-automatico-config', lancamentoAutomaticoConfigRoutes);
app.use('/api/print', printRoutes);
app.use('/api/perdas-insumo', perdasInsumoRoutes);
app.use('/api/perdas-produto', perdasProdutoRoutes);
app.use('/api/uso-consumo', usoConsumoRoutes);

const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro interno:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(config.port, () => {
  console.log(`\n  🚀 Servidor BFF rodando em http://localhost:${config.port}`);
  console.log(`  🔗 Conectado ao Horse API: ${config.horseApi.baseUrl}`);
  console.log(`  🌍 Ambiente: ${config.nodeEnv}\n`);
});
