# Gestor Financeiro - Web

Interface web moderna para o **Gestor Financeiro**, consumindo a API REST do servidor Horse (Delphi).

## Tecnologias

### Frontend (`client/`)
- **React 18** com TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (estilização responsiva)
- **React Router v6** (navegação SPA)
- **React Hook Form** (formulários)
- **Recharts** (gráficos)
- **Lucide React** (ícones)
- **Axios** (requisições HTTP)

### Backend (`server/`)
- **Node.js** com **Express** e TypeScript
- **Axios** (comunicação com Horse API)
- **express-rate-limit** (rate limiting)
- **morgan** (logging de requisições)
- **jsonwebtoken** (validação de tokens JWT)

## Paleta de Cores

Baseada no tema do aplicativo mobile (Delphi FMX), conforme `uTheme.pas`:

| Cor | HEX | Uso |
|-----|:---:|------|
| Surface Primary | `#F5F3EE` | Fundo principal |
| Surface Secondary | `#C8DBBC` | Fundo secundário |
| Accent Primary | `#2D5E3A` | Verde - Botões, links, destques |
| Accent Red | `#B84A4A` | Vermelho - Valores negativos, perigo |
| Text Primary | `#1B1F1C` | Texto principal |
| Text Secondary | `#6B706C` | Texto secundário |
| Background Card | `#FFFFFF` | Cards e superfícies |
| Border Subtle | `#D6DDD0` | Bordas e separadores |

## Estrutura do Projeto

```
Web/src/
├── server/                    # Backend Node.js/Express (BFF)
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── config.ts          # Configurações
│   │   ├── types.ts           # Tipos TypeScript
│   │   ├── middleware/
│   │   │   ├── auth.ts        # Middleware JWT
│   │   │   ├── rateLimit.ts   # Rate limiting
│   │   │   └── logger.ts      # Logging
│   │   ├── services/
│   │   │   └── horseApi.ts    # Cliente da API Horse
│   │   └── routes/
│   │       ├── auth.ts        # Login
│   │       ├── clientes.ts    # CRUD Clientes
│   │       ├── fornecedores.ts # CRUD Fornecedores
│   │       ├── categorias.ts   # CRUD Categorias
│   │       ├── contasPagar.ts  # CRUD Contas a Pagar
│   │       └── contasReceber.ts # CRUD Contas a Receber
│   ├── package.json
│   └── tsconfig.json
│
├── client/                    # Frontend React
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Rotas
│   │   ├── index.css          # Estilos globais + Tailwind
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Contexto de autenticação
│   │   ├── hooks/
│   │   │   └── useApi.ts      # Hook genérico para API
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios config
│   │   │   └── utils.ts       # Utilitários
│   │   ├── types/
│   │   │   └── index.ts       # Interfaces
│   │   ├── components/
│   │   │   ├── ui/            # Componentes reutilizáveis
│   │   │   ├── forms/         # Formulários CRUD
│   │   │   └── charts/        # Gráficos
│   │   └── pages/             # Páginas
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
│
└── README.md                  # Esta documentação
```

## Pré-requisitos

- **Node.js** v18+
- **npm** v9+
- Servidor **Horse** rodando (porta padrão: 9000)

## Instalação e Execução

### 1. Backend (BFF Node.js)

```bash
# Entre na pasta do servidor
cd server

# Instale as dependências
npm install

# Copie o arquivo de exemplo de ambiente
cp .env.example .env
# Edite o .env se necessário (porta, URL do Horse)

# Execute em modo desenvolvimento
npm run dev
```

O servidor iniciará em `http://localhost:3001`.

### 2. Frontend (React)

```bash
# Em outro terminal, entre na pasta do client
cd client

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev
```

O frontend iniciará em `http://localhost:5173`.

Acesse `http://localhost:5173` no navegador.

### Build de Produção

```bash
# Backend
cd server
npm run build
npm start

# Frontend
cd client
npm run build
# Os arquivos estarão em client/dist/
```

## API Endpoints

### BFF (Node.js) → Proxy para Horse

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Autenticação |
| GET | `/api/clientes` | Listar clientes |
| POST | `/api/clientes` | Criar/atualizar cliente |
| DELETE | `/api/clientes?id=X` | Excluir cliente |
| GET | `/api/fornecedores` | Listar fornecedores |
| POST | `/api/fornecedores` | Criar/atualizar fornecedor |
| DELETE | `/api/fornecedores?id=X` | Excluir fornecedor |
| GET | `/api/categorias/pagar` | Listar categorias pagar |
| POST | `/api/categorias/pagar` | Criar/atualizar categoria |
| DELETE | `/api/categorias/pagar?id=X` | Excluir categoria |
| GET | `/api/categorias/receber` | Listar categorias receber |
| POST | `/api/categorias/receber` | Criar/atualizar categoria |
| DELETE | `/api/categorias/receber?id=X` | Excluir categoria |
| GET | `/api/contas-pagar` | Listar contas a pagar |
| POST | `/api/contas-pagar` | Criar/atualizar conta |
| DELETE | `/api/contas-pagar?id=X` | Excluir conta |
| PUT | `/api/contas-pagar/pagar` | Baixar pagamento |
| GET | `/api/contas-receber` | Listar contas a receber |
| POST | `/api/contas-receber` | Criar/atualizar conta |
| DELETE | `/api/contas-receber?id=X` | Excluir conta |
| PUT | `/api/contas-receber/receber` | Baixar recebimento |

## Funcionalidades

- **Autenticação JWT** com login/senha
- **Dashboard** com cards de resumo financeiro
- **CRUD completo** de Clientes, Fornecedores, Categorias
- **Contas a Pagar/Receber** com baixa (pagar/receber)
- **Relatórios** com exportação CSV
- **Design responsivo** (mobile + desktop)
- **Tema verde** consistente com o app mobile
