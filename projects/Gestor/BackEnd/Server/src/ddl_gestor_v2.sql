-- ============================================================
-- DDL COMPLETO - Banco: gestor (v2)
-- Todos os dados no schema public, controle por empresa_id
-- Tabelas globais: SERIAL auto-increment
-- Tabelas por empresa: empresa_sequences
--
-- Para criar o banco:
--   1. CREATE DATABASE gestor WITH ENCODING 'UTF8'
--        LC_COLLATE 'Portuguese_Brazil.1252'
--        LC_CTYPE 'Portuguese_Brazil.1252';
--   2. \c gestor;
--   3. Executar este script
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- FUNCAO: Registrar log de auditoria para contas_pagar
-- ============================================================
CREATE OR REPLACE FUNCTION fn_contas_pagar_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_novo)
        SELECT NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'INSERT', 'REGISTRO', row_to_json(NEW)::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'fornecedor_id', OLD.fornecedor_id::TEXT, NEW.fornecedor_id::TEXT);
        END IF;
        IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'descricao', OLD.descricao, NEW.descricao);
        END IF;
        IF OLD.valor IS DISTINCT FROM NEW.valor THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'valor', OLD.valor::TEXT, NEW.valor::TEXT);
        END IF;
        IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT);
        END IF;
        IF OLD.id_categoria IS DISTINCT FROM NEW.id_categoria THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'id_categoria', OLD.id_categoria::TEXT, NEW.id_categoria::TEXT);
        END IF;
        IF OLD.pago IS DISTINCT FROM NEW.pago THEN
            v_operacao := CASE WHEN NEW.pago THEN 'PAGAR' ELSE 'ESTORNAR' END;
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'pago', OLD.pago::TEXT, NEW.pago::TEXT);
        END IF;
        IF OLD.data_pagamento IS DISTINCT FROM NEW.data_pagamento THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'data_pagamento', OLD.data_pagamento::TEXT, NEW.data_pagamento::TEXT);
        END IF;
        IF OLD.valor_baixa IS DISTINCT FROM NEW.valor_baixa THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'valor_baixa', OLD.valor_baixa::TEXT, NEW.valor_baixa::TEXT);
        END IF;
        IF OLD.desconto IS DISTINCT FROM NEW.desconto THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'desconto', OLD.desconto::TEXT, NEW.desconto::TEXT);
        END IF;
        IF OLD.acrescimo IS DISTINCT FROM NEW.acrescimo THEN
            INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'acrescimo', OLD.acrescimo::TEXT, NEW.acrescimo::TEXT);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior)
        VALUES (OLD.empresa_id, OLD.id, COALESCE(OLD.usuario_id, 0), 'DELETE', 'REGISTRO', row_to_json(OLD)::TEXT);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCAO: Registrar log de auditoria para contas_receber
-- ============================================================
CREATE OR REPLACE FUNCTION fn_contas_receber_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_novo)
        SELECT NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'INSERT', 'REGISTRO', row_to_json(NEW)::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'cliente_id', OLD.cliente_id::TEXT, NEW.cliente_id::TEXT);
        END IF;
        IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'descricao', OLD.descricao, NEW.descricao);
        END IF;
        IF OLD.valor IS DISTINCT FROM NEW.valor THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'valor', OLD.valor::TEXT, NEW.valor::TEXT);
        END IF;
        IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT);
        END IF;
        IF OLD.id_categoria IS DISTINCT FROM NEW.id_categoria THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), 'UPDATE', 'id_categoria', OLD.id_categoria::TEXT, NEW.id_categoria::TEXT);
        END IF;
        IF OLD.recebido IS DISTINCT FROM NEW.recebido THEN
            v_operacao := CASE WHEN NEW.recebido THEN 'RECEBER' ELSE 'ESTORNAR' END;
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'recebido', OLD.recebido::TEXT, NEW.recebido::TEXT);
        END IF;
        IF OLD.data_recebimento IS DISTINCT FROM NEW.data_recebimento THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'data_recebimento', OLD.data_recebimento::TEXT, NEW.data_recebimento::TEXT);
        END IF;
        IF OLD.valor_baixa IS DISTINCT FROM NEW.valor_baixa THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'valor_baixa', OLD.valor_baixa::TEXT, NEW.valor_baixa::TEXT);
        END IF;
        IF OLD.desconto IS DISTINCT FROM NEW.desconto THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'desconto', OLD.desconto::TEXT, NEW.desconto::TEXT);
        END IF;
        IF OLD.acrescimo IS DISTINCT FROM NEW.acrescimo THEN
            INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'acrescimo', OLD.acrescimo::TEXT, NEW.acrescimo::TEXT);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior)
        VALUES (OLD.empresa_id, OLD.id, COALESCE(OLD.usuario_id, 0), 'DELETE', 'REGISTRO', row_to_json(OLD)::TEXT);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELAS GLOBAIS (auto-incremento SERIAL)
-- ============================================================

-- empresa: Empresas cadastradas no sistema (multi-tenant)
CREATE TABLE empresa (
    id SERIAL NOT NULL,
    razao_social VARCHAR(200) NOT NULL,
    fantasia VARCHAR(200),
    cnpj_cpf VARCHAR(20),
    inscricao_estadual_identidade VARCHAR(20),
    regime_tributario VARCHAR(50),
    endereco TEXT,
    telefone VARCHAR(20),
    celular VARCHAR(20),
    email VARCHAR(200),
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE empresa ADD CONSTRAINT empresa_pk PRIMARY KEY (id);

COMMENT ON TABLE empresa IS 'Empresas cadastradas no sistema (multi-tenant)';
COMMENT ON COLUMN empresa.razao_social IS 'Razao social ou nome completo (pessoa fisica)';
COMMENT ON COLUMN empresa.fantasia IS 'Nome fantasia / apelido';
COMMENT ON COLUMN empresa.cnpj_cpf IS 'CNPJ ou CPF da empresa';
COMMENT ON COLUMN empresa.inscricao_estadual_identidade IS 'Inscricao estadual (PJ) ou identidade (PF)';
COMMENT ON COLUMN empresa.regime_tributario IS 'Regime tributario: MEI, Simples Nacional, Lucro Presumido, etc.';
COMMENT ON COLUMN empresa.status IS '0-Inativo, 1-Ativo';

-- modulo: Modulos do sistema (GERAL, GESTOR, HORAS, PRODUCAO)
CREATE TABLE modulo (
    id SERIAL NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE modulo ADD CONSTRAINT modulo_pk PRIMARY KEY (id);
COMMENT ON TABLE modulo IS 'Modulos do sistema - tabela global';

-- formulario: Formularios/telas do sistema
CREATE TABLE formulario (
    id SERIAL NOT NULL,
    nome VARCHAR(100) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE formulario ADD CONSTRAINT formulario_pk PRIMARY KEY (id);
ALTER TABLE formulario ADD CONSTRAINT formulario_nome_unique UNIQUE (nome);
COMMENT ON TABLE formulario IS 'Formularios/telas do sistema - tabela global';

-- modulo_formulario: Associacao entre modulos e formularios
CREATE TABLE modulo_formulario (
    id SERIAL NOT NULL,
    modulo_id INTEGER NOT NULL,
    formulario_id INTEGER NOT NULL,
    abertura SMALLINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE modulo_formulario ADD CONSTRAINT modulo_formulario_pk PRIMARY KEY (id);
ALTER TABLE modulo_formulario ADD CONSTRAINT modulo_formulario_unique UNIQUE (modulo_id, formulario_id);
ALTER TABLE modulo_formulario ADD CONSTRAINT fk_mf_modulo FOREIGN KEY (modulo_id) REFERENCES modulo(id);
ALTER TABLE modulo_formulario ADD CONSTRAINT fk_mf_formulario FOREIGN KEY (formulario_id) REFERENCES formulario(id);
COMMENT ON TABLE modulo_formulario IS 'Relacionamento entre modulos e formularios (global)';

-- permissao: Permissoes do sistema
CREATE TABLE permissao (
    id SERIAL NOT NULL,
    nome VARCHAR(50) NOT NULL,
    descricao VARCHAR(200),
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE permissao ADD CONSTRAINT permissao_pk PRIMARY KEY (id);
ALTER TABLE permissao ADD CONSTRAINT permissao_nome_unique UNIQUE (nome);
COMMENT ON TABLE permissao IS 'Permissoes do sistema (Visualizar, Incluir, Editar, Excluir, Imprimir)';

-- ============================================================
-- TABELAS POR EMPRESA (ID via empresa_sequences)
-- ============================================================

-- empresa_sequences: Geracao de IDs sequenciais por empresa
CREATE TABLE empresa_sequences (
    empresa_id INTEGER NOT NULL,
    last_id INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE empresa_sequences ADD CONSTRAINT empresa_sequences_pk PRIMARY KEY (empresa_id);
ALTER TABLE empresa_sequences ADD CONSTRAINT fk_es_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
COMMENT ON TABLE empresa_sequences IS 'Controle de IDs sequenciais por empresa';

-- empresa_modulo: Modulos contratados por cada empresa
CREATE TABLE empresa_modulo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    modulo_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE empresa_modulo ADD CONSTRAINT empresa_modulo_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE empresa_modulo ADD CONSTRAINT empresa_modulo_unique UNIQUE (empresa_id, modulo_id);
ALTER TABLE empresa_modulo ADD CONSTRAINT fk_em_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE empresa_modulo ADD CONSTRAINT fk_em_modulo FOREIGN KEY (modulo_id) REFERENCES modulo(id);

-- usuario: Usuarios do sistema
CREATE TABLE usuario (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(100),
    pin VARCHAR(100),
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE usuario ADD CONSTRAINT usuario_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE usuario ADD CONSTRAINT fk_u_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE usuario ADD CONSTRAINT fk_u_created_by FOREIGN KEY (empresa_id, created_by) REFERENCES usuario(empresa_id, id);
COMMENT ON TABLE usuario IS 'Usuarios vinculados a uma empresa';
COMMENT ON COLUMN usuario.senha IS 'Senha criptografada (SHA-256)';
COMMENT ON COLUMN usuario.pin IS 'PIN criptografado (SHA-256)';
COMMENT ON COLUMN usuario.is_superadmin IS 'Acesso total a todas as empresas';

-- usuario_formulario: Acesso de usuarios a formularios
CREATE TABLE usuario_formulario (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    formulario_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE usuario_formulario ADD CONSTRAINT usuario_formulario_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE usuario_formulario ADD CONSTRAINT usuario_formulario_unique UNIQUE (empresa_id, usuario_id, formulario_id);
ALTER TABLE usuario_formulario ADD CONSTRAINT fk_uf_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE usuario_formulario ADD CONSTRAINT fk_uf_formulario FOREIGN KEY (formulario_id) REFERENCES formulario(id);

-- usuario_formulario_permissao: Permissoes de usuario para formularios
CREATE TABLE usuario_formulario_permissao (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_formulario_id INTEGER NOT NULL,
    permissao_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE usuario_formulario_permissao ADD CONSTRAINT ufp_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE usuario_formulario_permissao ADD CONSTRAINT ufp_unique UNIQUE (usuario_formulario_id, permissao_id);
ALTER TABLE usuario_formulario_permissao ADD CONSTRAINT fk_ufp_uf FOREIGN KEY (empresa_id, usuario_formulario_id) REFERENCES usuario_formulario(empresa_id, id);
ALTER TABLE usuario_formulario_permissao ADD CONSTRAINT fk_ufp_permissao FOREIGN KEY (permissao_id) REFERENCES permissao(id);
ALTER TABLE usuario_formulario_permissao ADD CONSTRAINT fk_ufp_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);

-- cliente: Clientes das empresas
CREATE TABLE cliente (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco VARCHAR(200),
    email VARCHAR(100),
    cnpj_cpf VARCHAR(20),
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE cliente ADD CONSTRAINT cliente_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE cliente ADD CONSTRAINT fk_c_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE cliente ADD CONSTRAINT fk_c_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);

-- fornecedor: Fornecedores das empresas
CREATE TABLE fornecedor (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco VARCHAR(200),
    email VARCHAR(100),
    cnpj_cpf VARCHAR(100),
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE fornecedor ADD CONSTRAINT fornecedor_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE fornecedor ADD CONSTRAINT fk_f_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE fornecedor ADD CONSTRAINT fk_f_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);

-- ============================================================
-- MODULO FINANCEIRO
-- ============================================================

-- categoria_pagar
CREATE TABLE categoria_pagar (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE categoria_pagar ADD CONSTRAINT categoria_pagar_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE categoria_pagar ADD CONSTRAINT fk_cp_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE categoria_pagar ADD CONSTRAINT fk_cp_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);

-- categoria_receber
CREATE TABLE categoria_receber (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE categoria_receber ADD CONSTRAINT categoria_receber_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE categoria_receber ADD CONSTRAINT fk_cr_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE categoria_receber ADD CONSTRAINT fk_cr_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);

-- contas_pagar
CREATE TABLE contas_pagar (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    fornecedor_id INTEGER,
    descricao VARCHAR(255),
    valor NUMERIC NOT NULL,
    data_vencimento DATE NOT NULL,
    id_categoria INTEGER,
    pago BOOLEAN NOT NULL DEFAULT FALSE,
    data_pagamento DATE,
    valor_baixa NUMERIC DEFAULT 0,
    desconto NUMERIC DEFAULT 0,
    acrescimo NUMERIC DEFAULT 0,
    lancamento_origem_id INTEGER,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE contas_pagar ADD CONSTRAINT contas_pagar_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE contas_pagar ADD CONSTRAINT fk_ctp_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE contas_pagar ADD CONSTRAINT fk_ctp_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE contas_pagar ADD CONSTRAINT fk_ctp_fornecedor FOREIGN KEY (empresa_id, fornecedor_id) REFERENCES fornecedor(empresa_id, id);
ALTER TABLE contas_pagar ADD CONSTRAINT fk_ctp_categoria FOREIGN KEY (empresa_id, id_categoria) REFERENCES categoria_pagar(empresa_id, id);

-- contas_pagar_log: Auditoria
CREATE TABLE contas_pagar_log (
    id BIGSERIAL NOT NULL,
    empresa_id INTEGER NOT NULL,
    registro_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    operacao VARCHAR(30) NOT NULL,
    campo_alterado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE contas_pagar_log ADD CONSTRAINT cplog_pk PRIMARY KEY (id);
ALTER TABLE contas_pagar_log ADD CONSTRAINT fk_cpl_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE contas_pagar_log ADD CONSTRAINT fk_cpl_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
CREATE INDEX idx_cpl_registro ON contas_pagar_log (empresa_id, registro_id);

-- contas_receber
CREATE TABLE contas_receber (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER,
    descricao VARCHAR(255),
    valor NUMERIC NOT NULL,
    data_vencimento DATE NOT NULL,
    id_categoria INTEGER,
    recebido BOOLEAN NOT NULL DEFAULT FALSE,
    data_recebimento DATE,
    valor_baixa NUMERIC DEFAULT 0,
    desconto NUMERIC DEFAULT 0,
    acrescimo NUMERIC DEFAULT 0,
    lancamento_origem_id INTEGER,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE contas_receber ADD CONSTRAINT contas_receber_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE contas_receber ADD CONSTRAINT fk_ctr_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE contas_receber ADD CONSTRAINT fk_ctr_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE contas_receber ADD CONSTRAINT fk_ctr_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES cliente(empresa_id, id);
ALTER TABLE contas_receber ADD CONSTRAINT fk_ctr_categoria FOREIGN KEY (empresa_id, id_categoria) REFERENCES categoria_receber(empresa_id, id);

-- contas_receber_log: Auditoria
CREATE TABLE contas_receber_log (
    id BIGSERIAL NOT NULL,
    empresa_id INTEGER NOT NULL,
    registro_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    operacao VARCHAR(30) NOT NULL,
    campo_alterado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE contas_receber_log ADD CONSTRAINT crlog_pk PRIMARY KEY (id);
ALTER TABLE contas_receber_log ADD CONSTRAINT fk_crl_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE contas_receber_log ADD CONSTRAINT fk_crl_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
CREATE INDEX idx_crl_registro ON contas_receber_log (empresa_id, registro_id);

-- ============================================================
-- MODULO SERVICOS
-- ============================================================

CREATE TABLE servico (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    horas_minimas INTERVAL NOT NULL,
    valor_hora NUMERIC NOT NULL,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE servico ADD CONSTRAINT servico_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE servico ADD CONSTRAINT fk_s_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE servico ADD CONSTRAINT fk_s_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);

CREATE TABLE horas_trabalhadas (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    servico_id INTEGER NOT NULL,
    valor_hora NUMERIC,
    data_servico DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_termino TIME NOT NULL,
    quantidade_horas NUMERIC NOT NULL,
    total_horas NUMERIC NOT NULL,
    observacoes TEXT,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE horas_trabalhadas ADD CONSTRAINT ht_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE horas_trabalhadas ADD CONSTRAINT fk_ht_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE horas_trabalhadas ADD CONSTRAINT fk_ht_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE horas_trabalhadas ADD CONSTRAINT fk_ht_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES cliente(empresa_id, id);
ALTER TABLE horas_trabalhadas ADD CONSTRAINT fk_ht_servico FOREIGN KEY (empresa_id, servico_id) REFERENCES servico(empresa_id, id);

CREATE TABLE horas_abatidas (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    servico_id INTEGER NOT NULL,
    data_abatimento DATE NOT NULL DEFAULT CURRENT_DATE,
    valor NUMERIC NOT NULL,
    valor_hora NUMERIC NOT NULL,
    quantidade_horas NUMERIC NOT NULL,
    observacoes TEXT,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE horas_abatidas ADD CONSTRAINT ha_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE horas_abatidas ADD CONSTRAINT fk_ha_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE horas_abatidas ADD CONSTRAINT fk_ha_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE horas_abatidas ADD CONSTRAINT fk_ha_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES cliente(empresa_id, id);
ALTER TABLE horas_abatidas ADD CONSTRAINT fk_ha_servico FOREIGN KEY (empresa_id, servico_id) REFERENCES servico(empresa_id, id);

CREATE TABLE horas_excedidas (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    servico_id INTEGER NOT NULL,
    mes_origem INTEGER NOT NULL,
    ano_origem INTEGER NOT NULL,
    delta_horas NUMERIC NOT NULL,
    data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE horas_excedidas ADD CONSTRAINT he_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE horas_excedidas ADD CONSTRAINT he_unique UNIQUE (empresa_id, usuario_id, cliente_id, servico_id, mes_origem, ano_origem);
ALTER TABLE horas_excedidas ADD CONSTRAINT fk_he_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE horas_excedidas ADD CONSTRAINT fk_he_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE horas_excedidas ADD CONSTRAINT fk_he_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES cliente(empresa_id, id);
ALTER TABLE horas_excedidas ADD CONSTRAINT fk_he_servico FOREIGN KEY (empresa_id, servico_id) REFERENCES servico(empresa_id, id);

-- ============================================================
-- MODULO PRODUCAO
-- ============================================================

CREATE TABLE insumo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    unidade_medida VARCHAR(5) NOT NULL,
    custo_medio NUMERIC DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE insumo ADD CONSTRAINT insumo_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE insumo ADD CONSTRAINT fk_i_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);

CREATE TABLE compra_insumo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL,
    valor_total NUMERIC NOT NULL,
    valor_unitario NUMERIC NOT NULL,
    data_compra DATE NOT NULL,
    observacao VARCHAR(255),
    fornecedor_id INTEGER,
    categoria_pagar_id INTEGER,
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE compra_insumo ADD CONSTRAINT ci_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE compra_insumo ADD CONSTRAINT fk_ci_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE compra_insumo ADD CONSTRAINT fk_ci_insumo FOREIGN KEY (empresa_id, insumo_id) REFERENCES insumo(empresa_id, id);
ALTER TABLE compra_insumo ADD CONSTRAINT fk_ci_fornecedor FOREIGN KEY (empresa_id, fornecedor_id) REFERENCES fornecedor(empresa_id, id);

CREATE TABLE produto_fabricado (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    rendimento NUMERIC,
    unidade_medida VARCHAR(5) DEFAULT 'un',
    custo_unitario NUMERIC DEFAULT 0,
    margem_lucro NUMERIC DEFAULT 0,
    valor_venda_sugerido NUMERIC DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE produto_fabricado ADD CONSTRAINT pf_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE produto_fabricado ADD CONSTRAINT fk_pf_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);

CREATE TABLE receita_ingrediente (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    produto_fabricado_id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE receita_ingrediente ADD CONSTRAINT ri_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE receita_ingrediente ADD CONSTRAINT fk_ri_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE receita_ingrediente ADD CONSTRAINT fk_ri_produto FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES produto_fabricado(empresa_id, id);
ALTER TABLE receita_ingrediente ADD CONSTRAINT fk_ri_insumo FOREIGN KEY (empresa_id, insumo_id) REFERENCES insumo(empresa_id, id);

CREATE TABLE custo_adicional_tipo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE custo_adicional_tipo ADD CONSTRAINT cat_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE custo_adicional_tipo ADD CONSTRAINT fk_cat_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);

CREATE TABLE fabricacao (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    produto_fabricado_id INTEGER NOT NULL,
    quantidade_produzida NUMERIC NOT NULL,
    data_fabricacao DATE NOT NULL,
    custo_insumos NUMERIC DEFAULT 0,
    custo_adicional_total NUMERIC DEFAULT 0,
    custo_total NUMERIC DEFAULT 0,
    custo_unitario NUMERIC DEFAULT 0,
    observacao VARCHAR(255),
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE fabricacao ADD CONSTRAINT fab_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE fabricacao ADD CONSTRAINT fk_fab_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE fabricacao ADD CONSTRAINT fk_fab_produto FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES produto_fabricado(empresa_id, id);

CREATE TABLE fabricacao_custo_adicional (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    fabricacao_id INTEGER NOT NULL,
    custo_adicional_tipo_id INTEGER NOT NULL,
    valor NUMERIC NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE fabricacao_custo_adicional ADD CONSTRAINT fca_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE fabricacao_custo_adicional ADD CONSTRAINT fk_fca_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE fabricacao_custo_adicional ADD CONSTRAINT fk_fca_fabricacao FOREIGN KEY (empresa_id, fabricacao_id) REFERENCES fabricacao(empresa_id, id);
ALTER TABLE fabricacao_custo_adicional ADD CONSTRAINT fk_fca_tipo FOREIGN KEY (empresa_id, custo_adicional_tipo_id) REFERENCES custo_adicional_tipo(empresa_id, id);

CREATE TABLE venda_produto (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    produto_fabricado_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL,
    valor_unitario NUMERIC NOT NULL,
    valor_total NUMERIC NOT NULL,
    data_venda DATE NOT NULL,
    contas_receber_id INTEGER,
    categoria_receber_id INTEGER,
    observacao VARCHAR(255),
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE venda_produto ADD CONSTRAINT vp_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE venda_produto ADD CONSTRAINT fk_vp_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE venda_produto ADD CONSTRAINT fk_vp_produto FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES produto_fabricado(empresa_id, id);
ALTER TABLE venda_produto ADD CONSTRAINT fk_vp_cliente FOREIGN KEY (empresa_id, cliente_id) REFERENCES cliente(empresa_id, id);
ALTER TABLE venda_produto ADD CONSTRAINT fk_vp_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES usuario(empresa_id, id);
ALTER TABLE venda_produto ADD CONSTRAINT fk_vp_cta_receber FOREIGN KEY (empresa_id, contas_receber_id) REFERENCES contas_receber(empresa_id, id);

CREATE TABLE lancamento_automatico_config (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    tipo_origem VARCHAR(50) NOT NULL,
    tipo_lancamento VARCHAR(10) NOT NULL,
    categoria_id INTEGER NOT NULL,
    dias_vencimento INTEGER DEFAULT 30,
    descricao_template TEXT,
    usuario_id INTEGER,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE lancamento_automatico_config ADD CONSTRAINT lac_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE lancamento_automatico_config ADD CONSTRAINT fk_lac_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);

CREATE TABLE estoque_insumo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    data_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE estoque_insumo ADD CONSTRAINT ei_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE estoque_insumo ADD CONSTRAINT uq_estoque_insumo UNIQUE (empresa_id, insumo_id);
ALTER TABLE estoque_insumo ADD CONSTRAINT fk_ei_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE estoque_insumo ADD CONSTRAINT fk_ei_insumo FOREIGN KEY (empresa_id, insumo_id) REFERENCES insumo(empresa_id, id);
CREATE INDEX idx_ei_insumo ON estoque_insumo (empresa_id, insumo_id);

CREATE TABLE estoque_produto_fabricado (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    produto_fabricado_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    data_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
ALTER TABLE estoque_produto_fabricado ADD CONSTRAINT epf_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE estoque_produto_fabricado ADD CONSTRAINT uq_estoque_produto_fabricado UNIQUE (empresa_id, produto_fabricado_id);
ALTER TABLE estoque_produto_fabricado ADD CONSTRAINT fk_epf_empresa FOREIGN KEY (empresa_id) REFERENCES empresa(id);
ALTER TABLE estoque_produto_fabricado ADD CONSTRAINT fk_epf_produto FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES produto_fabricado(empresa_id, id);
CREATE INDEX idx_epf_produto ON estoque_produto_fabricado (empresa_id, produto_fabricado_id);

-- ============================================================
-- VIEW v_saldo_horas
-- ============================================================
CREATE OR REPLACE VIEW v_saldo_horas AS
SELECT
    h.empresa_id, h.usuario_id, u.nome AS usuario_nome,
    s.nome AS servico_nome, s.horas_minimas, s.valor_hora,
    c.nome AS cliente_nome,
    COALESCE(SUM(h.quantidade_horas), 0) AS horas_trabalhadas,
    COALESCE(SUM(h.total_horas), 0) AS valor_trabalhado,
    COALESCE(a.horas_abatidas, 0) AS horas_abatidas,
    COALESCE(a.valor_abatido, 0) AS valor_abatido,
    COALESCE(SUM(h.quantidade_horas), 0) - COALESCE(a.horas_abatidas, 0) AS saldo_horas,
    COALESCE(SUM(h.total_horas), 0) - COALESCE(a.valor_abatido, 0) AS saldo_valor
FROM horas_trabalhadas h
JOIN usuario u ON u.empresa_id = h.empresa_id AND u.id = h.usuario_id
JOIN servico s ON s.empresa_id = h.empresa_id AND s.id = h.servico_id
JOIN cliente c ON c.empresa_id = h.empresa_id AND c.id = h.cliente_id
LEFT JOIN (
    SELECT empresa_id, usuario_id,
        SUM(quantidade_horas) AS horas_abatidas,
        SUM(valor) AS valor_abatido
    FROM horas_abatidas GROUP BY empresa_id, usuario_id
) a ON a.empresa_id = h.empresa_id AND a.usuario_id = h.usuario_id
GROUP BY h.empresa_id, h.usuario_id, u.nome, s.nome, s.horas_minimas, s.valor_hora, c.nome, a.horas_abatidas, a.valor_abatido;

-- ============================================================
-- TRIGGERS DE AUDITORIA
-- ============================================================
CREATE TRIGGER trg_ctp_audit AFTER INSERT OR UPDATE OR DELETE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION fn_contas_pagar_audit();
CREATE TRIGGER trg_ctr_audit AFTER INSERT OR UPDATE OR DELETE ON contas_receber FOR EACH ROW EXECUTE FUNCTION fn_contas_receber_audit();

-- ============================================================
-- SEED DATA
-- ============================================================

-- 1. Empresa SISTEMA
INSERT INTO empresa (razao_social, fantasia, cnpj_cpf,
    inscricao_estadual_identidade, regime_tributario, endereco, email)
VALUES (
    '56.134.688 MARCOS JOSE TAMANHONI',
    'MJTSystems Solucoes',
    '56134688000157',
    'ISENTO',
    'MEI',
    'Rua Joao Tozzi, 14 - Carlos Germano Naumann - Colatina - ES',
    'mjtamanhoni@gmail.com'
);

INSERT INTO empresa_sequences (empresa_id, last_id) VALUES (1, 500);

-- 2. Modulos
INSERT INTO modulo (nome, descricao) VALUES
('GERAL', 'Modulo responsavel por centralizar as tabelas e funcionalidades comuns a todo o sistema.'),
('GESTOR', 'Modulo voltado para o controle financeiro.'),
('HORAS TRABALHADAS', 'Modulo de controle de tempo e servicos prestados.'),
('PRODUCAO', 'Modulo de acompanhamento da producao e venda de produtos fabricados.');

-- 3. Formularios
INSERT INTO formulario (nome) VALUES
('Dashboard'), ('Contas a Receber'), ('Contas a Pagar'),
('Clientes'), ('Fornecedores'), ('Categorias'),
('Servicos'), ('Formularios'), ('Usuario x Formulario'),
('Usuarios'), ('Horas Trabalhadas'), ('Horas Excedidas'),
('Abatimentos'), ('Relatorio Financeiro'),
('Relatorio Clientes'), ('Relatorio Fornecedores'),
('Relatorio Categorias'), ('Relatorio Usuarios'),
('Relatorio Formularios'), ('Configuracoes'),
('Permissoes'), ('Empresas'), ('Modulos'),
('Modulo x Formulario'), ('Empresa x Modulo'),
('Insumos'), ('Compras Insumo'), ('Produtos Fabricados'),
('Receitas Ingredientes'), ('Custos Adicionais'),
('Custos Fab.'), ('Fabricacoes'), ('Vendas Produto'),
('Estoque Insumo'), ('Estoque Produto Fabricado'),
('Relatorio Insumos'), ('Relatorio Produtos Fabricados'),
('Relatorio Fabricacoes'), ('Relatorio Vendas Produto');

-- 4. Modulo x Formulario (GERAL)
INSERT INTO modulo_formulario (modulo_id, formulario_id, abertura) VALUES
(1,1,0), (1,4,1), (1,5,2), (1,10,3), (1,9,4),
(1,23,5), (1,8,6), (1,24,7), (1,25,8), (1,21,9),
(1,22,10), (1,20,11), (1,15,12), (1,16,13),
(1,18,14), (1,19,15);
-- Modulo x Formulario (GESTOR)
INSERT INTO modulo_formulario (modulo_id, formulario_id, abertura) VALUES
(2,2,1), (2,3,2), (2,6,3), (2,14,4), (2,17,5);
-- Modulo x Formulario (HORAS)
INSERT INTO modulo_formulario (modulo_id, formulario_id, abertura) VALUES
(3,7,1), (3,11,2), (3,13,3), (3,12,4);
-- Modulo x Formulario (PRODUCAO)
INSERT INTO modulo_formulario (modulo_id, formulario_id, abertura) VALUES
(4,26,1), (4,27,2), (4,28,3), (4,29,4), (4,30,5),
(4,32,6), (4,31,7), (4,33,8), (4,34,9), (4,35,10),
(4,36,11), (4,37,12), (4,38,13), (4,39,14);

-- 5. Empresa x Modulo
INSERT INTO empresa_modulo (empresa_id, id, modulo_id) VALUES
(1, 1, 1), (1, 2, 2), (1, 3, 3), (1, 4, 4);

-- 6. Permissoes
INSERT INTO permissao (nome, descricao) VALUES
('Visualizar', 'Permite visualizar registros'),
('Incluir', 'Permite incluir novos registros'),
('Editar', 'Permite editar registros existentes'),
('Excluir', 'Permite excluir registros'),
('Imprimir', 'Permite imprimir relatorios');

-- 7. Usuario Superadmin
-- Senha SHA-256 de "M74E25@Ta" = 7225e07012b40586d3c86bd2d74a0b99f2b389355717b0a68c23059d5fe7fd9f
-- PIN SHA-256 de "1118" = 63ecbfa3a1ad34a1fdd5e3dd3aeaec31456d1d676552c654d5ecf7dab0b2f4f8
INSERT INTO usuario (empresa_id, id, nome, email, senha, pin, is_superadmin)
VALUES (1, 1, 'Marcos Jose Tamanhoni', 'mjtamanhoni@gmail.com',
    '7225e07012b40586d3c86bd2d74a0b99f2b389355717b0a68c23059d5fe7fd9f',
    '63ecbfa3a1ad34a1fdd5e3dd3aeaec31456d1d676552c654d5ecf7dab0b2f4f8',
    TRUE);

-- Atualizar created_by do proprio usuario
UPDATE usuario SET created_by = 1 WHERE empresa_id = 1 AND id = 1;

-- 8. Vincular superadmin a todos formularios com permissoes
INSERT INTO usuario_formulario (empresa_id, id, usuario_id, formulario_id)
SELECT 1, f.id, 1, f.id FROM formulario f;

INSERT INTO usuario_formulario_permissao (empresa_id, id, usuario_formulario_id, permissao_id, usuario_id)
SELECT 1, row_number() OVER (ORDER BY uf.id, p.id) + 500, uf.id, p.id, 1
FROM usuario_formulario uf CROSS JOIN permissao p
WHERE uf.empresa_id = 1 AND uf.usuario_id = 1;
