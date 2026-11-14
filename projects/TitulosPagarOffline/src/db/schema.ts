export const SCHEMA_VERSION = 1;

function valorEnv(valor: string | undefined, padrao = ''): string {
  const texto = (valor ?? '').trim();
  return (texto || padrao).replace(/'/g, "''");
}

const INTEGRACAO_URL_PADRAO = valorEnv(
  import.meta.env.VITE_INTEGRACAO_URL,
  'mjtsystems-gestor.duckdns.org'
);
const INTEGRACAO_PORTA_PADRAO = Number(import.meta.env.VITE_INTEGRACAO_PORTA) || 3001;
const INTEGRACAO_PIX_PADRAO = valorEnv(import.meta.env.VITE_INTEGRACAO_PIX);

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nome TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',
  chave_pix TEXT NOT NULL DEFAULT '',
  pin_hash TEXT,
  pin_salt TEXT,
  pin_iter INTEGER NOT NULL DEFAULT 120000,
  pin_len INTEGER NOT NULL DEFAULT 4,
  biometria INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_config (id) VALUES (1);

CREATE TABLE IF NOT EXISTS titulo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credor TEXT NOT NULL,
  descricao TEXT,
  numero_documento TEXT,
  chave_pix TEXT,
  parcela INTEGER NOT NULL DEFAULT 1 CHECK (parcela >= 1),
  valor_total_centavos INTEGER NOT NULL CHECK (valor_total_centavos > 0),
  data_emissao TEXT NOT NULL,
  data_vencimento TEXT NOT NULL,
  cancelado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (data_vencimento >= data_emissao)
);

CREATE INDEX IF NOT EXISTS idx_titulo_vencimento ON titulo (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_titulo_credor ON titulo (credor);

CREATE TABLE IF NOT EXISTS pagamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo_id INTEGER NOT NULL REFERENCES titulo (id) ON DELETE CASCADE,
  data_pagamento TEXT NOT NULL,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  forma TEXT NOT NULL DEFAULT 'PIX',
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pagamento_titulo ON pagamento (titulo_id);

CREATE TABLE IF NOT EXISTS dispositivo (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  codigo TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS licenca (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token TEXT NOT NULL,
  plano TEXT NOT NULL,
  cliente TEXT,
  cnpj TEXT,
  device TEXT,
  key_id TEXT,
  emitido_em TEXT,
  expira_em TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS integracao (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  url TEXT NOT NULL DEFAULT '',
  porta INTEGER NOT NULL DEFAULT 3001,
  chave_pix TEXT NOT NULL DEFAULT '',
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO integracao (id, url, porta, chave_pix)
VALUES (1, '${INTEGRACAO_URL_PADRAO}', ${INTEGRACAO_PORTA_PADRAO}, '${INTEGRACAO_PIX_PADRAO}');

CREATE TABLE IF NOT EXISTS solicitacao (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  segredo TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nenhuma',
  mensagem TEXT,
  valor_centavos INTEGER,
  comprovante_nome TEXT,
  enviado_em TEXT,
  verificado_em TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO solicitacao (id) VALUES (1);
`;
