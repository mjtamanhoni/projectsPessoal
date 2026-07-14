// Importa o dotenv para carregar variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env localizado na raiz do projeto
// path.resolve garante que o caminho funcione em qualquer sistema operacional 
dotenv.config({ path: path.resolve(__dirname, '..','.env') });

// Exporta as configurações centralizadas
export const config = {
  //Porta do servior (Converte string para number, padrão: 3001) 
  port: parseInt(process.env.PORT || '3001', 10),

  //Ambiente de execução (Desenvolvimento, Produção, Teste)
  nodeEnv: process.env.NODE_ENV || 'development',

  //Origens permitidas pelo CORS
  // '*' PERMITE TODAS AS ORIGENS (aPENAS PARA DESENVOLVIMENTO, NÃO USAR EM PRODUÇÃO)
  corsOrigins: process.env.CORS_ORIGINS || '*',

  //Configuraçõe da API Horse (backend Delphi)
  horseApi: {
      //URL base da API Horse (ex: http://localhost:9000)
      baseUrl: process.env.HORSE_API_BASE_URL || 'http://localhost:9000',

      //Chave secreta HWT (deve ser a mesma do Horse)
      secretKey: process.env.HORSE_API_SECRET_KEY || 'c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d',
    },
  };