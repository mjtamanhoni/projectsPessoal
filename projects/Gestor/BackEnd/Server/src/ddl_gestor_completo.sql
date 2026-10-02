-- ============================================================
-- DDL COMPLETO - Banco de Dados: gestor
-- Sistema: Gestor Financeiro / Produção / Serviços
-- Versão: 2.0 (Multi-Empresa + Auditoria + Soft Delete)
-- ============================================================

CREATE DATABASE gestor
    WITH ENCODING 'UTF8'
    LC_COLLATE 'Portuguese_Brazil.1252'
    LC_CTYPE 'Portuguese_Brazil.1252';

\c gestor;

-- ============================================================
-- SCHEMAS
-- ============================================================

CREATE SCHEMA gestor;
COMMENT ON SCHEMA gestor IS 'Modulo Financeiro - Contas a Pagar/Receber e Categorias';

CREATE SCHEMA producao;
COMMENT ON SCHEMA producao IS 'Modulo de Producao - Insumos, Fabricacao, Estoque e Vendas';

CREATE SCHEMA servicos;
COMMENT ON SCHEMA servicos IS 'Modulo de Servicos - Controle de Horas Trabalhadas';

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- FUNCAO: Atualizar timestamp updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCAO: Registrar log de auditoria para contas_pagar
-- ============================================================

CREATE OR REPLACE FUNCTION gestor.fn_contas_pagar_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao TEXT;
    v_campo TEXT;
    v_valor_anterior TEXT;
    v_valor_novo TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operacao := 'INSERT';
        INSERT INTO gestor.contas_pagar_log (
            empresa_id, registro_id, usuario_id, operacao, campo_alterado,
            valor_anterior, valor_novo
        )
        SELECT
            NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0),
            v_operacao, 'REGISTRO',
            NULL, row_to_json(NEW)::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacao := 'UPDATE';
        -- Comparar cada campo
        IF OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'fornecedor_id', OLD.fornecedor_id::TEXT, NEW.fornecedor_id::TEXT);
        END IF;
        IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'descricao', OLD.descricao, NEW.descricao);
        END IF;
        IF OLD.valor IS DISTINCT FROM NEW.valor THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'valor', OLD.valor::TEXT, NEW.valor::TEXT);
        END IF;
        IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT);
        END IF;
        IF OLD.id_categoria IS DISTINCT FROM NEW.id_categoria THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'id_categoria', OLD.id_categoria::TEXT, NEW.id_categoria::TEXT);
        END IF;
        IF OLD.pago IS DISTINCT FROM NEW.pago THEN
            v_operacao := CASE WHEN NEW.pago = true THEN 'PAGAR' ELSE 'ESTORNAR' END;
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'pago', OLD.pago::TEXT, NEW.pago::TEXT);
        END IF;
        IF OLD.data_pagamento IS DISTINCT FROM NEW.data_pagamento THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'data_pagamento', OLD.data_pagamento::TEXT, NEW.data_pagamento::TEXT);
        END IF;
        IF OLD.valor_baixa IS DISTINCT FROM NEW.valor_baixa THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'valor_baixa', OLD.valor_baixa::TEXT, NEW.valor_baixa::TEXT);
        END IF;
        IF OLD.desconto IS DISTINCT FROM NEW.desconto THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'desconto', OLD.desconto::TEXT, NEW.desconto::TEXT);
        END IF;
        IF OLD.acrescimo IS DISTINCT FROM NEW.acrescimo THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'acrescimo', OLD.acrescimo::TEXT, NEW.acrescimo::TEXT);
        END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO gestor.contas_pagar_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'status', OLD.status::TEXT, NEW.status::TEXT);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_operacao := 'DELETE';
        INSERT INTO gestor.contas_pagar_log (
            empresa_id, registro_id, usuario_id, operacao, campo_alterado,
            valor_anterior, valor_novo
        )
        VALUES (
            OLD.empresa_id, OLD.id, COALESCE(OLD.usuario_id, 0),
            v_operacao, 'REGISTRO',
            row_to_json(OLD)::TEXT, NULL
        );
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCAO: Registrar log de auditoria para contas_receber
-- ============================================================

CREATE OR REPLACE FUNCTION gestor.fn_contas_receber_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_operacao TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operacao := 'INSERT';
        INSERT INTO gestor.contas_receber_log (
            empresa_id, registro_id, usuario_id, operacao, campo_alterado,
            valor_anterior, valor_novo
        )
        SELECT
            NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0),
            v_operacao, 'REGISTRO',
            NULL, row_to_json(NEW)::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacao := 'UPDATE';
        IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'cliente_id', OLD.cliente_id::TEXT, NEW.cliente_id::TEXT);
        END IF;
        IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'descricao', OLD.descricao, NEW.descricao);
        END IF;
        IF OLD.valor IS DISTINCT FROM NEW.valor THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'valor', OLD.valor::TEXT, NEW.valor::TEXT);
        END IF;
        IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT);
        END IF;
        IF OLD.id_categoria IS DISTINCT FROM NEW.id_categoria THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'id_categoria', OLD.id_categoria::TEXT, NEW.id_categoria::TEXT);
        END IF;
        IF OLD.recebido IS DISTINCT FROM NEW.recebido THEN
            v_operacao := CASE WHEN NEW.recebido = true THEN 'RECEBER' ELSE 'ESTORNAR' END;
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'recebido', OLD.recebido::TEXT, NEW.recebido::TEXT);
        END IF;
        IF OLD.data_recebimento IS DISTINCT FROM NEW.data_recebimento THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'data_recebimento', OLD.data_recebimento::TEXT, NEW.data_recebimento::TEXT);
        END IF;
        IF OLD.valor_baixa IS DISTINCT FROM NEW.valor_baixa THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'valor_baixa', OLD.valor_baixa::TEXT, NEW.valor_baixa::TEXT);
        END IF;
        IF OLD.desconto IS DISTINCT FROM NEW.desconto THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'desconto', OLD.desconto::TEXT, NEW.desconto::TEXT);
        END IF;
        IF OLD.acrescimo IS DISTINCT FROM NEW.acrescimo THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'acrescimo', OLD.acrescimo::TEXT, NEW.acrescimo::TEXT);
        END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO gestor.contas_receber_log (empresa_id, registro_id, usuario_id, operacao, campo_alterado, valor_anterior, valor_novo)
            VALUES (NEW.empresa_id, NEW.id, COALESCE(NEW.usuario_id, 0), v_operacao, 'status', OLD.status::TEXT, NEW.status::TEXT);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_operacao := 'DELETE';
        INSERT INTO gestor.contas_receber_log (
            empresa_id, registro_id, usuario_id, operacao, campo_alterado,
            valor_anterior, valor_novo
        )
        VALUES (
            OLD.empresa_id, OLD.id, COALESCE(OLD.usuario_id, 0),
            v_operacao, 'REGISTRO',
            row_to_json(OLD)::TEXT, NULL
        );
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELAS GLOBAIS (public)
-- ============================================================

-- ----------------------------------------------------------
-- empresa: Cadastro de empresas (clientes do sistema)
-- ----------------------------------------------------------
CREATE SEQUENCE public.empresa_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE public.empresa (
    id INTEGER NOT NULL DEFAULT nextval('public.empresa_id_seq'),
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY public.empresa ADD CONSTRAINT empresa_pk PRIMARY KEY (id);

COMMENT ON TABLE public.empresa IS 'Empresas cadastradas no sistema (multi-tenant)';
COMMENT ON COLUMN public.empresa.id IS 'Identificador unico da empresa';
COMMENT ON COLUMN public.empresa.razao_social IS 'Razao social ou nome completo (pessoa fisica)';
COMMENT ON COLUMN public.empresa.fantasia IS 'Nome fantasia / apelido';
COMMENT ON COLUMN public.empresa.cnpj_cpf IS 'CNPJ ou CPF da empresa';
COMMENT ON COLUMN public.empresa.inscricao_estadual_identidade IS 'Inscricao estadual (pessoa juridica) ou identidade (pessoa fisica)';
COMMENT ON COLUMN public.empresa.regime_tributario IS 'Regime tributario: MEI, Simples Nacional, Lucro Presumido, etc.';
COMMENT ON COLUMN public.empresa.status IS '0-Inativo, 1-Ativo';

-- ----------------------------------------------------------
-- modulo: Modulos do sistema (GERAL, GESTOR, HORAS, PRODUCAO)
-- ----------------------------------------------------------
CREATE TABLE public.modulo (
    id INTEGER NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY public.modulo ADD CONSTRAINT modulo_pk PRIMARY KEY (id);

COMMENT ON TABLE public.modulo IS 'Modulos do sistema - tabela global (nao vinculada a empresa)';
COMMENT ON COLUMN public.modulo.id IS 'Identificador unico do modulo';
COMMENT ON COLUMN public.modulo.nome IS 'Nome do modulo (GERAL, GESTOR, HORAS TRABALHADAS, PRODUCAO)';
COMMENT ON COLUMN public.modulo.descricao IS 'Descricao detalhada do modulo';

-- ----------------------------------------------------------
-- formulario: Formularios/telas do sistema
-- ----------------------------------------------------------
CREATE TABLE public.formulario (
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY public.formulario ADD CONSTRAINT formulario_pk PRIMARY KEY (id);
ALTER TABLE ONLY public.formulario ADD CONSTRAINT formulario_nome_unique UNIQUE (nome);

COMMENT ON TABLE public.formulario IS 'Formularios/telas do sistema - tabela global';
COMMENT ON COLUMN public.formulario.id IS 'Identificador unico do formulario';
COMMENT ON COLUMN public.formulario.nome IS 'Nome do formulario/tela';

-- ----------------------------------------------------------
-- modulo_formulario: Associacao entre modulos e formularios
-- ----------------------------------------------------------
CREATE TABLE public.modulo_formulario (
    id INTEGER NOT NULL,
    modulo_id INTEGER NOT NULL,
    formulario_id INTEGER NOT NULL,
    abertura SMALLINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY public.modulo_formulario ADD CONSTRAINT modulo_formulario_pk PRIMARY KEY (id);
ALTER TABLE ONLY public.modulo_formulario ADD CONSTRAINT modulo_formulario_unique UNIQUE (modulo_id, formulario_id);

ALTER TABLE ONLY public.modulo_formulario ADD CONSTRAINT fk_modulo_formulario_modulo
    FOREIGN KEY (modulo_id) REFERENCES public.modulo(id);
ALTER TABLE ONLY public.modulo_formulario ADD CONSTRAINT fk_modulo_formulario_formulario
    FOREIGN KEY (formulario_id) REFERENCES public.formulario(id);

COMMENT ON TABLE public.modulo_formulario IS 'Relacionamento entre modulos e formularios (global)';
COMMENT ON COLUMN public.modulo_formulario.abertura IS 'Ordem/prioridade de abertura do formulario no menu (0=padrao)';

-- ----------------------------------------------------------
-- permissao: Permissoes do sistema (Visualizar, Incluir, Editar, Excluir, Imprimir)
-- ----------------------------------------------------------
CREATE TABLE public.permissao (
    id INTEGER NOT NULL,
    nome VARCHAR(50) NOT NULL,
    descricao VARCHAR(200),
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY public.permissao ADD CONSTRAINT permissao_pk PRIMARY KEY (id);
ALTER TABLE ONLY public.permissao ADD CONSTRAINT permissao_nome_unique UNIQUE (nome);

COMMENT ON TABLE public.permissao IS 'Permissoes do sistema - tabela global';
COMMENT ON COLUMN public.permissao.id IS 'Identificador unico da permissao';
COMMENT ON COLUMN public.permissao.nome IS 'Nome da permissao (Visualizar, Incluir, Editar, Excluir, Imprimir)';
COMMENT ON COLUMN public.permissao.descricao IS 'Descricao da permissao';

-- ============================================================
-- TABELAS POR EMPRESA (public)
-- ============================================================

-- ----------------------------------------------------------
-- empresa_modulo: Modulos contratados por cada empresa
-- ----------------------------------------------------------
CREATE TABLE public.empresa_modulo (
    id INTEGER NOT NULL,
    empresa_id INTEGER NOT NULL,
    modulo_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY public.empresa_modulo ADD CONSTRAINT empresa_modulo_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE ONLY public.empresa_modulo ADD CONSTRAINT empresa_modulo_unique UNIQUE (empresa_id, modulo_id);

ALTER TABLE ONLY public.empresa_modulo ADD CONSTRAINT fk_empresa_modulo_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY public.empresa_modulo ADD CONSTRAINT fk_empresa_modulo_modulo
    FOREIGN KEY (modulo_id) REFERENCES public.modulo(id);

COMMENT ON TABLE public.empresa_modulo IS 'Modulos disponiveis para cada empresa';
COMMENT ON COLUMN public.empresa_modulo.id IS 'Identificador unico do vinculo';
COMMENT ON COLUMN public.empresa_modulo.empresa_id IS 'Referencia a empresa';
COMMENT ON COLUMN public.empresa_modulo.modulo_id IS 'Referencia ao modulo';

-- ----------------------------------------------------------
-- empresa_sequences: Geracao de IDs sequenciais por empresa
-- ----------------------------------------------------------
CREATE TABLE public.empresa_sequences (
    empresa_id INTEGER NOT NULL,
    last_id INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE ONLY public.empresa_sequences ADD CONSTRAINT empresa_sequences_pk PRIMARY KEY (empresa_id);

ALTER TABLE ONLY public.empresa_sequences ADD CONSTRAINT fk_empresa_sequences_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);

COMMENT ON TABLE public.empresa_sequences IS 'Controle de IDs sequenciais por empresa';
COMMENT ON COLUMN public.empresa_sequences.empresa_id IS 'Referencia a empresa';
COMMENT ON COLUMN public.empresa_sequences.last_id IS 'Ultimo ID utilizado';

-- ----------------------------------------------------------
-- usuario: Usuarios do sistema
-- ----------------------------------------------------------
CREATE TABLE public.usuario (
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
ALTER TABLE ONLY public.usuario ADD CONSTRAINT usuario_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY public.usuario ADD CONSTRAINT fk_usuario_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY public.usuario ADD CONSTRAINT fk_usuario_created_by
    FOREIGN KEY (empresa_id, created_by) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE public.usuario IS 'Usuarios do sistema vinculados a uma empresa';
COMMENT ON COLUMN public.usuario.empresa_id IS 'Empresa a qual o usuario pertence';
COMMENT ON COLUMN public.usuario.id IS 'Identificador unico do usuario (por empresa)';
COMMENT ON COLUMN public.usuario.nome IS 'Nome completo do usuario';
COMMENT ON COLUMN public.usuario.email IS 'E-mail do usuario (usado como login)';
COMMENT ON COLUMN public.usuario.senha IS 'Senha criptografada (SHA-256)';
COMMENT ON COLUMN public.usuario.pin IS 'PIN criptografado (SHA-256) para acesso rapido';
COMMENT ON COLUMN public.usuario.is_superadmin IS 'Indica se e usuario administrador do sistema (acesso total a todas as empresas)';
COMMENT ON COLUMN public.usuario.status IS '0-Inativo, 1-Ativo';
COMMENT ON COLUMN public.usuario.created_by IS 'Usuario que criou este registro (NULL para usuario inicial)';

-- ----------------------------------------------------------
-- usuario_formulario: Acesso de usuarios a formularios
-- ----------------------------------------------------------
CREATE TABLE public.usuario_formulario (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    formulario_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY public.usuario_formulario ADD CONSTRAINT usuario_formulario_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE ONLY public.usuario_formulario ADD CONSTRAINT usuario_formulario_unique UNIQUE (empresa_id, usuario_id, formulario_id);

ALTER TABLE ONLY public.usuario_formulario ADD CONSTRAINT fk_usuario_formulario_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY public.usuario_formulario ADD CONSTRAINT fk_usuario_formulario_formulario
    FOREIGN KEY (formulario_id) REFERENCES public.formulario(id);

COMMENT ON TABLE public.usuario_formulario IS 'Vinculo de acesso de usuarios a formularios';
COMMENT ON COLUMN public.usuario_formulario.empresa_id IS 'Empresa do vinculo';

-- ----------------------------------------------------------
-- usuario_formulario_permissao: Permissoes especificas de usuario para formularios
-- ----------------------------------------------------------
CREATE TABLE public.usuario_formulario_permissao (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_formulario_id INTEGER NOT NULL,
    permissao_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE ONLY public.usuario_formulario_permissao ADD CONSTRAINT usuario_formulario_permissao_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE ONLY public.usuario_formulario_permissao ADD CONSTRAINT ufp_unique UNIQUE (usuario_formulario_id, permissao_id);

ALTER TABLE ONLY public.usuario_formulario_permissao ADD CONSTRAINT fk_ufp_usuario_formulario
    FOREIGN KEY (empresa_id, usuario_formulario_id) REFERENCES public.usuario_formulario(empresa_id, id);
ALTER TABLE ONLY public.usuario_formulario_permissao ADD CONSTRAINT fk_ufp_permissao
    FOREIGN KEY (permissao_id) REFERENCES public.permissao(id);
ALTER TABLE ONLY public.usuario_formulario_permissao ADD CONSTRAINT fk_ufp_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE public.usuario_formulario_permissao IS 'Permissoes concedidas a um usuario para um formulario especifico';
COMMENT ON COLUMN public.usuario_formulario_permissao.usuario_formulario_id IS 'Referencia ao vinculo usuario x formulario';
COMMENT ON COLUMN public.usuario_formulario_permissao.permissao_id IS 'Referencia a permissao concedida';
COMMENT ON COLUMN public.usuario_formulario_permissao.usuario_id IS 'Usuario que concedeu a permissao';

-- ----------------------------------------------------------
-- cliente: Clientes das empresas
-- ----------------------------------------------------------
CREATE TABLE public.cliente (
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY public.cliente ADD CONSTRAINT cliente_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY public.cliente ADD CONSTRAINT fk_cliente_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY public.cliente ADD CONSTRAINT fk_cliente_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE public.cliente IS 'Clientes cadastrados por empresa';
COMMENT ON COLUMN public.cliente.status IS '0-Inativo, 1-Ativo';

-- ----------------------------------------------------------
-- fornecedor: Fornecedores das empresas
-- ----------------------------------------------------------
CREATE TABLE public.fornecedor (
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY public.fornecedor ADD CONSTRAINT fornecedor_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY public.fornecedor ADD CONSTRAINT fk_fornecedor_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY public.fornecedor ADD CONSTRAINT fk_fornecedor_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE public.fornecedor IS 'Fornecedores cadastrados por empresa';
COMMENT ON COLUMN public.fornecedor.status IS '0-Inativo, 1-Ativo';

-- ============================================================
-- TABELAS DO MODULO GESTOR (gestor)
-- ============================================================

-- ----------------------------------------------------------
-- categoria_pagar: Categorias de contas a pagar
-- ----------------------------------------------------------
CREATE TABLE gestor.categoria_pagar (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY gestor.categoria_pagar ADD CONSTRAINT categoria_pagar_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY gestor.categoria_pagar ADD CONSTRAINT fk_categoria_pagar_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY gestor.categoria_pagar ADD CONSTRAINT fk_categoria_pagar_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE gestor.categoria_pagar IS 'Categorias para classificacao de contas a pagar';
COMMENT ON COLUMN gestor.categoria_pagar.ativo IS 'Indica se a categoria esta ativa para uso';
COMMENT ON COLUMN gestor.categoria_pagar.status IS '0-Inativo, 1-Ativo (soft delete)';

-- ----------------------------------------------------------
-- categoria_receber: Categorias de contas a receber
-- ----------------------------------------------------------
CREATE TABLE gestor.categoria_receber (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY gestor.categoria_receber ADD CONSTRAINT categoria_receber_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY gestor.categoria_receber ADD CONSTRAINT fk_categoria_receber_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY gestor.categoria_receber ADD CONSTRAINT fk_categoria_receber_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE gestor.categoria_receber IS 'Categorias para classificacao de contas a receber';
COMMENT ON COLUMN gestor.categoria_receber.ativo IS 'Indica se a categoria esta ativa para uso';
COMMENT ON COLUMN gestor.categoria_receber.status IS '0-Inativo, 1-Ativo (soft delete)';

-- ----------------------------------------------------------
-- contas_pagar: Contas a pagar (financeiro)
-- ----------------------------------------------------------
CREATE TABLE gestor.contas_pagar (
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY gestor.contas_pagar ADD CONSTRAINT contas_pagar_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY gestor.contas_pagar ADD CONSTRAINT fk_contas_pagar_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY gestor.contas_pagar ADD CONSTRAINT fk_contas_pagar_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY gestor.contas_pagar ADD CONSTRAINT fk_contas_pagar_fornecedor
    FOREIGN KEY (empresa_id, fornecedor_id) REFERENCES public.fornecedor(empresa_id, id);
ALTER TABLE ONLY gestor.contas_pagar ADD CONSTRAINT fk_contas_pagar_categoria
    FOREIGN KEY (empresa_id, id_categoria) REFERENCES gestor.categoria_pagar(empresa_id, id);

COMMENT ON TABLE gestor.contas_pagar IS 'Contas a pagar - principal tabela financeira do modulo Gestor';
COMMENT ON COLUMN gestor.contas_pagar.id IS 'Identificador unico da conta (por empresa)';
COMMENT ON COLUMN gestor.contas_pagar.usuario_id IS 'Usuario responsavel pelo registro';
COMMENT ON COLUMN gestor.contas_pagar.fornecedor_id IS 'Fornecedor vinculado a conta';
COMMENT ON COLUMN gestor.contas_pagar.descricao IS 'Descricao da conta a pagar';
COMMENT ON COLUMN gestor.contas_pagar.valor IS 'Valor original da conta';
COMMENT ON COLUMN gestor.contas_pagar.data_vencimento IS 'Data de vencimento da conta';
COMMENT ON COLUMN gestor.contas_pagar.id_categoria IS 'Categoria da conta';
COMMENT ON COLUMN gestor.contas_pagar.pago IS 'Indica se a conta foi paga (true=sim, false=nao)';
COMMENT ON COLUMN gestor.contas_pagar.data_pagamento IS 'Data em que o pagamento foi realizado';
COMMENT ON COLUMN gestor.contas_pagar.valor_baixa IS 'Valor efetivamente pago (baixa)';
COMMENT ON COLUMN gestor.contas_pagar.desconto IS 'Valor do desconto obtido no pagamento';
COMMENT ON COLUMN gestor.contas_pagar.acrescimo IS 'Valor do acrescimo/juros no pagamento';
COMMENT ON COLUMN gestor.contas_pagar.lancamento_origem_id IS 'ID do lancamento de origem (ex: compra_insumo)';
COMMENT ON COLUMN gestor.contas_pagar.status IS '0-Inativo, 1-Ativo';

-- ----------------------------------------------------------
-- contas_pagar_log: Auditoria de contas a pagar
-- ----------------------------------------------------------
CREATE TABLE gestor.contas_pagar_log (
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
ALTER TABLE ONLY gestor.contas_pagar_log ADD CONSTRAINT contas_pagar_log_pk PRIMARY KEY (id);

ALTER TABLE ONLY gestor.contas_pagar_log ADD CONSTRAINT fk_cpl_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY gestor.contas_pagar_log ADD CONSTRAINT fk_cpl_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

CREATE INDEX idx_cpl_registro ON gestor.contas_pagar_log (empresa_id, registro_id);
CREATE INDEX idx_cpl_data ON gestor.contas_pagar_log (created_at);

COMMENT ON TABLE gestor.contas_pagar_log IS 'Auditoria de alteracoes em contas a pagar (log imutavel)';
COMMENT ON COLUMN gestor.contas_pagar_log.id IS 'Identificador unico do log (auto-incremento)';
COMMENT ON COLUMN gestor.contas_pagar_log.empresa_id IS 'Empresa do registro auditado';
COMMENT ON COLUMN gestor.contas_pagar_log.registro_id IS 'ID do registro em contas_pagar';
COMMENT ON COLUMN gestor.contas_pagar_log.usuario_id IS 'Usuario que realizou a operacao';
COMMENT ON COLUMN gestor.contas_pagar_log.operacao IS 'Tipo de operacao: INSERT, UPDATE, DELETE, PAGAR, ESTORNAR';
COMMENT ON COLUMN gestor.contas_pagar_log.campo_alterado IS 'Nome do campo alterado (ou REGISTRO para insert/delete)';
COMMENT ON COLUMN gestor.contas_pagar_log.valor_anterior IS 'Valor anterior do campo';
COMMENT ON COLUMN gestor.contas_pagar_log.valor_novo IS 'Novo valor do campo';

-- ----------------------------------------------------------
-- contas_receber: Contas a receber (financeiro)
-- ----------------------------------------------------------
CREATE TABLE gestor.contas_receber (
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY gestor.contas_receber ADD CONSTRAINT contas_receber_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY gestor.contas_receber ADD CONSTRAINT fk_contas_receber_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY gestor.contas_receber ADD CONSTRAINT fk_contas_receber_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY gestor.contas_receber ADD CONSTRAINT fk_contas_receber_cliente
    FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id);
ALTER TABLE ONLY gestor.contas_receber ADD CONSTRAINT fk_contas_receber_categoria
    FOREIGN KEY (empresa_id, id_categoria) REFERENCES gestor.categoria_receber(empresa_id, id);

COMMENT ON TABLE gestor.contas_receber IS 'Contas a receber - receitas do modulo Gestor';
COMMENT ON COLUMN gestor.contas_receber.recebido IS 'Indica se a conta foi recebida (true=sim, false=nao)';
COMMENT ON COLUMN gestor.contas_receber.data_recebimento IS 'Data em que o recebimento foi realizado';
COMMENT ON COLUMN gestor.contas_receber.lancamento_origem_id IS 'ID do lancamento de origem (ex: venda_produto)';
COMMENT ON COLUMN gestor.contas_receber.status IS '0-Inativo, 1-Ativo';

-- ----------------------------------------------------------
-- contas_receber_log: Auditoria de contas a receber
-- ----------------------------------------------------------
CREATE TABLE gestor.contas_receber_log (
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
ALTER TABLE ONLY gestor.contas_receber_log ADD CONSTRAINT contas_receber_log_pk PRIMARY KEY (id);

ALTER TABLE ONLY gestor.contas_receber_log ADD CONSTRAINT fk_crl_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY gestor.contas_receber_log ADD CONSTRAINT fk_crl_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

CREATE INDEX idx_crl_registro ON gestor.contas_receber_log (empresa_id, registro_id);
CREATE INDEX idx_crl_data ON gestor.contas_receber_log (created_at);

COMMENT ON TABLE gestor.contas_receber_log IS 'Auditoria de alteracoes em contas a receber (log imutavel)';
COMMENT ON COLUMN gestor.contas_receber_log.id IS 'Identificador unico do log (auto-incremento)';
COMMENT ON COLUMN gestor.contas_receber_log.empresa_id IS 'Empresa do registro auditado';
COMMENT ON COLUMN gestor.contas_receber_log.registro_id IS 'ID do registro em contas_receber';
COMMENT ON COLUMN gestor.contas_receber_log.usuario_id IS 'Usuario que realizou a operacao';
COMMENT ON COLUMN gestor.contas_receber_log.operacao IS 'Tipo de operacao: INSERT, UPDATE, DELETE, RECEBER, ESTORNAR';
COMMENT ON COLUMN gestor.contas_receber_log.campo_alterado IS 'Nome do campo alterado (ou REGISTRO para insert/delete)';
COMMENT ON COLUMN gestor.contas_receber_log.valor_anterior IS 'Valor anterior do campo';
COMMENT ON COLUMN gestor.contas_receber_log.valor_novo IS 'Novo valor do campo';

-- ============================================================
-- TABELAS DO MODULO SERVICOS (servicos)
-- ============================================================

-- ----------------------------------------------------------
-- servico: Tipos de servico prestados
-- ----------------------------------------------------------
CREATE TABLE servicos.servico (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    horas_minimas INTERVAL NOT NULL,
    valor_hora NUMERIC NOT NULL,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY servicos.servico ADD CONSTRAINT servico_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY servicos.servico ADD CONSTRAINT fk_servico_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY servicos.servico ADD CONSTRAINT fk_servico_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);

COMMENT ON TABLE servicos.servico IS 'Tipos de servico prestados (ex: consultoria, desenvolvimento, suporte)';
COMMENT ON COLUMN servicos.servico.horas_minimas IS 'Quantidade minima de horas contratadas por periodo';
COMMENT ON COLUMN servicos.servico.valor_hora IS 'Valor cobrado por hora de servico';

-- ----------------------------------------------------------
-- horas_trabalhadas: Registro de horas trabalhadas
-- ----------------------------------------------------------
CREATE TABLE servicos.horas_trabalhadas (
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY servicos.horas_trabalhadas ADD CONSTRAINT horas_trabalhadas_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY servicos.horas_trabalhadas ADD CONSTRAINT fk_ht_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY servicos.horas_trabalhadas ADD CONSTRAINT fk_ht_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY servicos.horas_trabalhadas ADD CONSTRAINT fk_ht_cliente
    FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id);
ALTER TABLE ONLY servicos.horas_trabalhadas ADD CONSTRAINT fk_ht_servico
    FOREIGN KEY (empresa_id, servico_id) REFERENCES servicos.servico(empresa_id, id);

COMMENT ON TABLE servicos.horas_trabalhadas IS 'Registro de horas trabalhadas por usuario/cliente/servico';
COMMENT ON COLUMN servicos.horas_trabalhadas.hora_inicio IS 'Hora de inicio do trabalho';
COMMENT ON COLUMN servicos.horas_trabalhadas.hora_termino IS 'Hora de termino do trabalho';
COMMENT ON COLUMN servicos.horas_trabalhadas.quantidade_horas IS 'Quantidade de horas trabalhadas';
COMMENT ON COLUMN servicos.horas_trabalhadas.total_horas IS 'Valor total do servico (quantidade_horas * valor_hora)';

-- ----------------------------------------------------------
-- horas_abatidas: Abatimento de horas (consumo de banco de horas)
-- ----------------------------------------------------------
CREATE TABLE servicos.horas_abatidas (
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
    usuario_cadastro INTEGER,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY servicos.horas_abatidas ADD CONSTRAINT horas_abatidas_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY servicos.horas_abatidas ADD CONSTRAINT fk_ha_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY servicos.horas_abatidas ADD CONSTRAINT fk_ha_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY servicos.horas_abatidas ADD CONSTRAINT fk_ha_cliente
    FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id);
ALTER TABLE ONLY servicos.horas_abatidas ADD CONSTRAINT fk_ha_servico
    FOREIGN KEY (empresa_id, servico_id) REFERENCES servicos.servico(empresa_id, id);

COMMENT ON TABLE servicos.horas_abatidas IS 'Registro de abatimento de horas (consumo do banco de horas)';
COMMENT ON COLUMN servicos.horas_abatidas.data_abatimento IS 'Data em que as horas foram abatidas';
COMMENT ON COLUMN servicos.horas_abatidas.valor IS 'Valor abatido';
COMMENT ON COLUMN servicos.horas_abatidas.valor_hora IS 'Valor da hora no momento do abatimento';
COMMENT ON COLUMN servicos.horas_abatidas.quantidade_horas IS 'Quantidade de horas abatidas';

-- ----------------------------------------------------------
-- horas_excedidas: Controle de horas excedidas por periodo
-- ----------------------------------------------------------
CREATE TABLE servicos.horas_excedidas (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    servico_id INTEGER NOT NULL,
    mes_origem INTEGER NOT NULL,
    ano_origem INTEGER NOT NULL,
    delta_horas NUMERIC NOT NULL,
    data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
    usuario_cadastro INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE ONLY servicos.horas_excedidas ADD CONSTRAINT horas_excedidas_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE ONLY servicos.horas_excedidas ADD CONSTRAINT horas_excedidas_unique UNIQUE (empresa_id, usuario_id, cliente_id, servico_id, mes_origem, ano_origem);

ALTER TABLE ONLY servicos.horas_excedidas ADD CONSTRAINT fk_he_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY servicos.horas_excedidas ADD CONSTRAINT fk_he_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY servicos.horas_excedidas ADD CONSTRAINT fk_he_cliente
    FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id);
ALTER TABLE ONLY servicos.horas_excedidas ADD CONSTRAINT fk_he_servico
    FOREIGN KEY (empresa_id, servico_id) REFERENCES servicos.servico(empresa_id, id);

COMMENT ON TABLE servicos.horas_excedidas IS 'Controle de horas excedentes por usuario/cliente/servico/mes/ano';
COMMENT ON COLUMN servicos.horas_excedidas.mes_origem IS 'Mes de referencia das horas excedidas (1-12)';
COMMENT ON COLUMN servicos.horas_excedidas.ano_origem IS 'Ano de referencia das horas excedidas';
COMMENT ON COLUMN servicos.horas_excedidas.delta_horas IS 'Diferenca de horas (positiva = excedente, negativa = saldo negativo)';

-- ============================================================
-- TABELAS DO MODULO PRODUCAO (producao)
-- ============================================================

-- ----------------------------------------------------------
-- insumo: Materias-primas / insumos utilizados na producao
-- ----------------------------------------------------------
CREATE TABLE producao.insumo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    unidade_medida VARCHAR(5) NOT NULL,
    custo_medio NUMERIC DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY producao.insumo ADD CONSTRAINT insumo_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.insumo ADD CONSTRAINT fk_insumo_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);

COMMENT ON TABLE producao.insumo IS 'Insumos/materias-primas utilizadas na producao';
COMMENT ON COLUMN producao.insumo.unidade_medida IS 'Unidade de medida (kg, g, L, mL, un, cx, pc, etc.)';
COMMENT ON COLUMN producao.insumo.custo_medio IS 'Custo medio do insumo (calculado automaticamente)';
COMMENT ON COLUMN producao.insumo.ativo IS 'Indica se o insumo esta ativo para uso';

-- ----------------------------------------------------------
-- compra_insumo: Compras de insumos
-- ----------------------------------------------------------
CREATE TABLE producao.compra_insumo (
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    usuario_id INTEGER NOT NULL
);
ALTER TABLE ONLY producao.compra_insumo ADD CONSTRAINT compra_insumo_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.compra_insumo ADD CONSTRAINT fk_ci_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.compra_insumo ADD CONSTRAINT fk_ci_insumo
    FOREIGN KEY (empresa_id, insumo_id) REFERENCES producao.insumo(empresa_id, id);
ALTER TABLE ONLY producao.compra_insumo ADD CONSTRAINT fk_ci_fornecedor
    FOREIGN KEY (empresa_id, fornecedor_id) REFERENCES public.fornecedor(empresa_id, id);

COMMENT ON TABLE producao.compra_insumo IS 'Registro de compras de insumos';
COMMENT ON COLUMN producao.compra_insumo.quantidade IS 'Quantidade comprada';
COMMENT ON COLUMN producao.compra_insumo.valor_total IS 'Valor total da compra';
COMMENT ON COLUMN producao.compra_insumo.valor_unitario IS 'Valor unitario do insumo';
COMMENT ON COLUMN producao.compra_insumo.fornecedor_id IS 'Fornecedor da compra (gera contas_pagar automaticamente)';
COMMENT ON COLUMN producao.compra_insumo.categoria_pagar_id IS 'Categoria para geracao automatica de contas_pagar';

-- ----------------------------------------------------------
-- produto_fabricado: Produtos fabricados
-- ----------------------------------------------------------
CREATE TABLE producao.produto_fabricado (
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY producao.produto_fabricado ADD CONSTRAINT produto_fabricado_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.produto_fabricado ADD CONSTRAINT fk_pf_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);

COMMENT ON TABLE producao.produto_fabricado IS 'Produtos fabricados pela empresa';
COMMENT ON COLUMN producao.produto_fabricado.rendimento IS 'Rendimento esperado do produto';
COMMENT ON COLUMN producao.produto_fabricado.custo_unitario IS 'Custo unitario de producao (calculado)';
COMMENT ON COLUMN producao.produto_fabricado.margem_lucro IS 'Margem de lucro percentual';
COMMENT ON COLUMN producao.produto_fabricado.valor_venda_sugerido IS 'Valor de venda sugerido';

-- ----------------------------------------------------------
-- receita_ingrediente: Ingredientes da receita de cada produto
-- ----------------------------------------------------------
CREATE TABLE producao.receita_ingrediente (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    produto_fabricado_id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY producao.receita_ingrediente ADD CONSTRAINT receita_ingrediente_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.receita_ingrediente ADD CONSTRAINT fk_ri_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.receita_ingrediente ADD CONSTRAINT fk_ri_produto
    FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES producao.produto_fabricado(empresa_id, id);
ALTER TABLE ONLY producao.receita_ingrediente ADD CONSTRAINT fk_ri_insumo
    FOREIGN KEY (empresa_id, insumo_id) REFERENCES producao.insumo(empresa_id, id);

COMMENT ON TABLE producao.receita_ingrediente IS 'Ingredientes/insumos que compoem a receita de cada produto fabricado';
COMMENT ON COLUMN producao.receita_ingrediente.quantidade IS 'Quantidade do insumo necessaria';

-- ----------------------------------------------------------
-- custo_adicional_tipo: Tipos de custos adicionais na fabricacao
-- ----------------------------------------------------------
CREATE TABLE producao.custo_adicional_tipo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY producao.custo_adicional_tipo ADD CONSTRAINT custo_adicional_tipo_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.custo_adicional_tipo ADD CONSTRAINT fk_cat_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);

COMMENT ON TABLE producao.custo_adicional_tipo IS 'Tipos de custos adicionais na fabricacao (ex: energia, frete, embalagem)';

-- ----------------------------------------------------------
-- fabricacao: Registro de fabricacao de produtos
-- ----------------------------------------------------------
CREATE TABLE producao.fabricacao (
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
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY producao.fabricacao ADD CONSTRAINT fabricacao_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.fabricacao ADD CONSTRAINT fk_fab_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.fabricacao ADD CONSTRAINT fk_fab_produto
    FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES producao.produto_fabricado(empresa_id, id);

COMMENT ON TABLE producao.fabricacao IS 'Registro de ordens de fabricacao/producao';
COMMENT ON COLUMN producao.fabricacao.quantidade_produzida IS 'Quantidade produzida';
COMMENT ON COLUMN producao.fabricacao.custo_insumos IS 'Custo total dos insumos utilizados';
COMMENT ON COLUMN producao.fabricacao.custo_adicional_total IS 'Custo adicional total';
COMMENT ON COLUMN producao.fabricacao.custo_total IS 'Custo total da fabricacao (insumos + adicionais)';
COMMENT ON COLUMN producao.fabricacao.custo_unitario IS 'Custo unitario do produto fabricado';

-- ----------------------------------------------------------
-- fabricacao_custo_adicional: Custos adicionais de cada fabricacao
-- ----------------------------------------------------------
CREATE TABLE producao.fabricacao_custo_adicional (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    fabricacao_id INTEGER NOT NULL,
    custo_adicional_tipo_id INTEGER NOT NULL,
    valor NUMERIC NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY producao.fabricacao_custo_adicional ADD CONSTRAINT fabricacao_custo_adicional_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.fabricacao_custo_adicional ADD CONSTRAINT fk_fca_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.fabricacao_custo_adicional ADD CONSTRAINT fk_fca_fabricacao
    FOREIGN KEY (empresa_id, fabricacao_id) REFERENCES producao.fabricacao(empresa_id, id);
ALTER TABLE ONLY producao.fabricacao_custo_adicional ADD CONSTRAINT fk_fca_tipo
    FOREIGN KEY (empresa_id, custo_adicional_tipo_id) REFERENCES producao.custo_adicional_tipo(empresa_id, id);

COMMENT ON TABLE producao.fabricacao_custo_adicional IS 'Custos adicionais associados a cada fabricacao';

-- ----------------------------------------------------------
-- venda_produto: Vendas de produtos fabricados
-- ----------------------------------------------------------
CREATE TABLE producao.venda_produto (
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER
);
ALTER TABLE ONLY producao.venda_produto ADD CONSTRAINT venda_produto_pk PRIMARY KEY (empresa_id, id);

ALTER TABLE ONLY producao.venda_produto ADD CONSTRAINT fk_vp_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.venda_produto ADD CONSTRAINT fk_vp_produto
    FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES producao.produto_fabricado(empresa_id, id);
ALTER TABLE ONLY producao.venda_produto ADD CONSTRAINT fk_vp_cliente
    FOREIGN KEY (empresa_id, cliente_id) REFERENCES public.cliente(empresa_id, id);
ALTER TABLE ONLY producao.venda_produto ADD CONSTRAINT fk_vp_usuario
    FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id);
ALTER TABLE ONLY producao.venda_produto ADD CONSTRAINT fk_vp_contas_receber
    FOREIGN KEY (empresa_id, contas_receber_id) REFERENCES gestor.contas_receber(empresa_id, id);

COMMENT ON TABLE producao.venda_produto IS 'Vendas de produtos fabricados';
COMMENT ON COLUMN producao.venda_produto.contas_receber_id IS 'Conta a receber gerada automaticamente pela venda';
COMMENT ON COLUMN producao.venda_produto.categoria_receber_id IS 'Categoria para geracao automatica de contas_receber';

-- ----------------------------------------------------------
-- estoque_insumo: Estoque de insumos
-- ----------------------------------------------------------
CREATE TABLE producao.estoque_insumo (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    data_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY producao.estoque_insumo ADD CONSTRAINT estoque_insumo_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE ONLY producao.estoque_insumo ADD CONSTRAINT uq_estoque_insumo UNIQUE (empresa_id, insumo_id);

ALTER TABLE ONLY producao.estoque_insumo ADD CONSTRAINT fk_ei_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.estoque_insumo ADD CONSTRAINT fk_ei_insumo
    FOREIGN KEY (empresa_id, insumo_id) REFERENCES producao.insumo(empresa_id, id);

CREATE INDEX idx_estoque_insumo_insumo ON producao.estoque_insumo (empresa_id, insumo_id);

COMMENT ON TABLE producao.estoque_insumo IS 'Estoque de insumos/materias-primas';

-- ----------------------------------------------------------
-- estoque_produto_fabricado: Estoque de produtos fabricados
-- ----------------------------------------------------------
CREATE TABLE producao.estoque_produto_fabricado (
    empresa_id INTEGER NOT NULL,
    id INTEGER NOT NULL,
    produto_fabricado_id INTEGER NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    data_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    usuario_id INTEGER NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE ONLY producao.estoque_produto_fabricado ADD CONSTRAINT estoque_produto_fabricado_pk PRIMARY KEY (empresa_id, id);
ALTER TABLE ONLY producao.estoque_produto_fabricado ADD CONSTRAINT uq_estoque_produto_fabricado UNIQUE (empresa_id, produto_fabricado_id);

ALTER TABLE ONLY producao.estoque_produto_fabricado ADD CONSTRAINT fk_epf_empresa
    FOREIGN KEY (empresa_id) REFERENCES public.empresa(id);
ALTER TABLE ONLY producao.estoque_produto_fabricado ADD CONSTRAINT fk_epf_produto
    FOREIGN KEY (empresa_id, produto_fabricado_id) REFERENCES producao.produto_fabricado(empresa_id, id);

CREATE INDEX idx_estoque_produto_fabricado_produto ON producao.estoque_produto_fabricado (empresa_id, produto_fabricado_id);

COMMENT ON TABLE producao.estoque_produto_fabricado IS 'Estoque de produtos fabricados';

-- ============================================================
-- VIEWS
-- ============================================================

-- ----------------------------------------------------------
-- v_saldo_horas: Saldo de horas trabalhadas vs abatidas
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW gestor.v_saldo_horas AS
SELECT
    h.empresa_id,
    h.usuario_id,
    u.nome AS usuario_nome,
    s.nome AS servico_nome,
    s.horas_minimas,
    s.valor_hora,
    c.nome AS cliente_nome,
    COALESCE(SUM(h.quantidade_horas), 0) AS horas_trabalhadas,
    COALESCE(SUM(h.total_horas), 0) AS valor_trabalhado,
    COALESCE(a.horas_abatidas, 0) AS horas_abatidas,
    COALESCE(a.valor_abatido, 0) AS valor_abatido,
    COALESCE(SUM(h.quantidade_horas), 0) - COALESCE(a.horas_abatidas, 0) AS saldo_horas,
    COALESCE(SUM(h.total_horas), 0) - COALESCE(a.valor_abatido, 0) AS saldo_valor,
    (EXTRACT(HOUR FROM s.horas_minimas) + EXTRACT(MINUTE FROM s.horas_minimas) / 60.0 + EXTRACT(SECOND FROM s.horas_minimas) / 3600.0) AS horas_minimas_horas
FROM servicos.horas_trabalhadas h
JOIN public.usuario u ON u.empresa_id = h.empresa_id AND u.id = h.usuario_id
JOIN servicos.servico s ON s.empresa_id = h.empresa_id AND s.id = h.servico_id
JOIN public.cliente c ON c.empresa_id = h.empresa_id AND c.id = h.cliente_id
LEFT JOIN (
    SELECT empresa_id, usuario_id,
        SUM(quantidade_horas) AS horas_abatidas,
        SUM(valor) AS valor_abatido
    FROM servicos.horas_abatidas
    GROUP BY empresa_id, usuario_id
) a ON a.empresa_id = h.empresa_id AND a.usuario_id = h.usuario_id
GROUP BY
    h.empresa_id, h.usuario_id, u.nome, s.nome,
    s.horas_minimas, s.valor_hora, c.nome,
    a.horas_abatidas, a.valor_abatido;

COMMENT ON VIEW gestor.v_saldo_horas IS 'Saldo de horas trabalhadas vs horas abatidas por usuario';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger de auditoria para contas_pagar
CREATE TRIGGER trg_contas_pagar_audit
    AFTER INSERT OR UPDATE OR DELETE ON gestor.contas_pagar
    FOR EACH ROW EXECUTE FUNCTION gestor.fn_contas_pagar_audit();

-- Trigger de auditoria para contas_receber
CREATE TRIGGER trg_contas_receber_audit
    AFTER INSERT OR UPDATE OR DELETE ON gestor.contas_receber
    FOR EACH ROW EXECUTE FUNCTION gestor.fn_contas_receber_audit();

-- ============================================================
-- SEED DATA
-- ============================================================

-- ----------------------------------------------------------
-- 1. EMPRESA SISTEMA (ID = 1)
-- ----------------------------------------------------------
INSERT INTO public.empresa (id, razao_social, fantasia, cnpj_cpf,
    inscricao_estadual_identidade, regime_tributario, endereco,
    telefone, celular, email, status, created_by)
VALUES (
    1,
    '56.134.688 MARCOS JOSE TAMANHONI',
    'MJTSystems Solucoes',
    '56134688000157',
    'ISENTO',
    'MEI',
    'Rua Joao Tozzi, 14 - Carlos Germano Naumann - Colatina - ES',
    NULL,
    NULL,
    'mjtamanhoni@gmail.com',
    1,
    NULL
);

-- Inicializar empresa_sequences
-- Last_id comecando em 500 para evitar conflito com IDs dos seed data (1-39, 201-439)
INSERT INTO public.empresa_sequences (empresa_id, last_id) VALUES (1, 500);

-- ----------------------------------------------------------
-- 2. MODULOS DO SISTEMA
-- ----------------------------------------------------------
INSERT INTO public.modulo (id, nome, descricao, created_by) VALUES
(1, 'GERAL',
 'Modulo responsavel por centralizar as tabelas e funcionalidades comuns a todo o sistema. Inclui o gerenciamento de usuarios, perfis de acesso, permissoes, alem de cadastros basicos como clientes, fornecedores e demais entidades compartilhadas entre os outros modulos.',
 NULL);

INSERT INTO public.modulo (id, nome, descricao, created_by) VALUES
(2, 'GESTOR',
 'Modulo voltado para o controle financeiro pessoal. Permite registrar receitas, despesas, categorias de movimentacao, saldos e relatorios financeiros, oferecendo uma visao clara da saude financeira do usuario ou da empresa.',
 NULL);

INSERT INTO public.modulo (id, nome, descricao, created_by) VALUES
(3, 'HORAS TRABALHADAS',
 'Modulo destinado ao controle de tempo e servicos prestados. Permite registrar horas trabalhadas por projeto ou cliente, calcular valores de servicos, gerar relatorios de produtividade e apoiar a gestao de contratos de prestacao de servicos.',
 NULL);

INSERT INTO public.modulo (id, nome, descricao, created_by) VALUES
(4, 'PRODUCAO',
 'Modulo voltado para o acompanhamento da producao e venda de produtos fabricados. Inclui o controle de insumos, etapas de producao, estoque de produtos acabados e integracao com vendas, permitindo rastrear custos e resultados da atividade produtiva.',
 NULL);

-- ----------------------------------------------------------
-- 3. FORMULARIOS DO SISTEMA
-- ----------------------------------------------------------
INSERT INTO public.formulario (id, nome, created_by) VALUES
(1, 'Dashboard', NULL),
(2, 'Contas a Receber', NULL),
(3, 'Contas a Pagar', NULL),
(4, 'Clientes', NULL),
(5, 'Fornecedores', NULL),
(6, 'Categorias', NULL),
(7, 'Servicos', NULL),
(8, 'Formularios', NULL),
(9, 'Usuario x Formulario', NULL),
(10, 'Usuarios', NULL),
(11, 'Horas Trabalhadas', NULL),
(12, 'Horas Excedidas', NULL),
(13, 'Abatimentos', NULL),
(14, 'Relatorio Financeiro', NULL),
(15, 'Relatorio Clientes', NULL),
(16, 'Relatorio Fornecedores', NULL),
(17, 'Relatorio Categorias', NULL),
(18, 'Relatorio Usuarios', NULL),
(19, 'Relatorio Formularios', NULL),
(20, 'Configuracoes', NULL),
(21, 'Permissoes', NULL),
(22, 'Empresas', NULL),
(23, 'Modulos', NULL),
(24, 'Modulo x Formulario', NULL),
(25, 'Empresa x Modulo', NULL),
(26, 'Insumos', NULL),
(27, 'Compras Insumo', NULL),
(28, 'Produtos Fabricados', NULL),
(29, 'Receitas Ingredientes', NULL),
(30, 'Custos Adicionais', NULL),
(31, 'Custos Fab.', NULL),
(32, 'Fabricacoes', NULL),
(33, 'Vendas Produto', NULL),
(34, 'Estoque Insumo', NULL),
(35, 'Estoque Produto Fabricado', NULL),
(36, 'Relatorio Insumos', NULL),
(37, 'Relatorio Produtos Fabricados', NULL),
(38, 'Relatorio Fabricacoes', NULL),
(39, 'Relatorio Vendas Produto', NULL);

-- ----------------------------------------------------------
-- 4. MODULO x FORMULARIO
-- ----------------------------------------------------------
-- Modulo 1 - GERAL (Dashboard, Clientes, Fornecedores, Formularios, Usuarios, etc.)
INSERT INTO public.modulo_formulario (id, modulo_id, formulario_id, abertura, created_by) VALUES
(1, 1, 1, 0, NULL),    -- Dashboard
(2, 1, 4, 1, NULL),    -- Clientes
(3, 1, 5, 2, NULL),    -- Fornecedores
(4, 1, 10, 3, NULL),   -- Usuarios
(5, 1, 9, 4, NULL),    -- Usuario x Formulario
(6, 1, 23, 5, NULL),   -- Modulos
(7, 1, 8, 6, NULL),    -- Formularios
(8, 1, 24, 7, NULL),   -- Modulo x Formulario
(9, 1, 25, 8, NULL),   -- Empresa x Modulo
(10, 1, 21, 9, NULL),  -- Permissoes
(11, 1, 22, 10, NULL), -- Empresas
(12, 1, 20, 11, NULL), -- Configuracoes
(13, 1, 15, 12, NULL), -- Relatorio Clientes
(14, 1, 16, 13, NULL), -- Relatorio Fornecedores
(15, 1, 18, 14, NULL), -- Relatorio Usuarios
(16, 1, 19, 15, NULL); -- Relatorio Formularios

-- Modulo 2 - GESTOR (Contas, Categorias, Relatorios)
INSERT INTO public.modulo_formulario (id, modulo_id, formulario_id, abertura, created_by) VALUES
(17, 2, 2, 1, NULL),   -- Contas a Receber
(18, 2, 3, 2, NULL),   -- Contas a Pagar
(19, 2, 6, 3, NULL),   -- Categorias
(20, 2, 14, 4, NULL),  -- Relatorio Financeiro
(21, 2, 17, 5, NULL);  -- Relatorio Categorias

-- Modulo 3 - HORAS TRABALHADAS
INSERT INTO public.modulo_formulario (id, modulo_id, formulario_id, abertura, created_by) VALUES
(22, 3, 7, 1, NULL),   -- Servicos
(23, 3, 11, 2, NULL),  -- Horas Trabalhadas
(24, 3, 13, 3, NULL),  -- Abatimentos
(25, 3, 12, 4, NULL);  -- Horas Excedidas

-- Modulo 4 - PRODUCAO
INSERT INTO public.modulo_formulario (id, modulo_id, formulario_id, abertura, created_by) VALUES
(26, 4, 26, 1, NULL),  -- Insumos
(27, 4, 27, 2, NULL),  -- Compras Insumo
(28, 4, 28, 3, NULL),  -- Produtos Fabricados
(29, 4, 29, 4, NULL),  -- Receitas Ingredientes
(30, 4, 30, 5, NULL),  -- Custos Adicionais
(31, 4, 32, 6, NULL),  -- Fabricacoes
(32, 4, 31, 7, NULL),  -- Custos Fab.
(33, 4, 33, 8, NULL),  -- Vendas Produto
(34, 4, 34, 9, NULL),  -- Estoque Insumo
(35, 4, 35, 10, NULL), -- Estoque Produto Fabricado
(36, 4, 36, 11, NULL), -- Relatorio Insumos
(37, 4, 37, 12, NULL), -- Relatorio Produtos Fabricados
(38, 4, 38, 13, NULL), -- Relatorio Fabricacoes
(39, 4, 39, 14, NULL); -- Relatorio Vendas Produto

-- ----------------------------------------------------------
-- 5. EMPRESA x MODULO (Empresa SISTEMA tem todos os modulos)
-- ----------------------------------------------------------
INSERT INTO public.empresa_modulo (id, empresa_id, modulo_id, created_by) VALUES
(1, 1, 1, NULL),
(2, 1, 2, NULL),
(3, 1, 3, NULL),
(4, 1, 4, NULL);

-- ----------------------------------------------------------
-- 6. PERMISSOES GLOBAIS
-- ----------------------------------------------------------
INSERT INTO public.permissao (id, nome, descricao, created_by) VALUES
(1, 'Visualizar', 'Permite visualizar registros do formulario', NULL),
(2, 'Incluir', 'Permite incluir novos registros', NULL),
(3, 'Editar', 'Permite editar registros existentes', NULL),
(4, 'Excluir', 'Permite excluir registros', NULL),
(5, 'Imprimir', 'Permite imprimir relatorios', NULL);

-- ----------------------------------------------------------
-- 7. USUARIO SUPERADMIN
-- Senha: SHA-256 de "M74E25@Ta" = 7225e07012b40586d3c86bd2d74a0b99f2b389355717b0a68c23059d5fe7fd9f
-- PIN: SHA-256 de "1118" = 63ecbfa3a1ad34a1fdd5e3dd3aeaec31456d1d676552c654d5ecf7dab0b2f4f8
-- ----------------------------------------------------------
INSERT INTO public.usuario (empresa_id, id, nome, email, senha, pin, is_superadmin, status, created_by)
VALUES (
    1,
    1,
    'Marcos Jose Tamanhoni',
    'mjtamanhoni@gmail.com',
    '7225e07012b40586d3c86bd2d74a0b99f2b389355717b0a68c23059d5fe7fd9f',
    '63ecbfa3a1ad34a1fdd5e3dd3aeaec31456d1d676552c654d5ecf7dab0b2f4f8',
    TRUE,
    1,
    NULL
);

-- ----------------------------------------------------------
-- 8. VINCULAR SUPERADMIN A TODOS OS FORMULARIOS COM PERMISSOES TOTAIS
-- ----------------------------------------------------------
-- Conceder acesso a todos os formularios para o superadmin
INSERT INTO public.usuario_formulario (empresa_id, id, usuario_id, formulario_id, created_by)
SELECT 1, f.id, 1, f.id, 1
FROM public.formulario f;

-- Conceder todas as permissoes para cada vinculo (IDs a partir de 501)
INSERT INTO public.usuario_formulario_permissao (empresa_id, id, usuario_formulario_id, permissao_id, usuario_id, created_at)
SELECT
    1,
    row_number() OVER (ORDER BY uf.id, p.id) + 500,
    uf.id,
    p.id,
    1,
    NOW()
FROM public.usuario_formulario uf
CROSS JOIN public.permissao p
WHERE uf.empresa_id = 1 AND uf.usuario_id = 1;

-- ============================================================
-- FIM DO DDL
-- ============================================================
