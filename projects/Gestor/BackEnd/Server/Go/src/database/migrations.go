package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Migracao struct {
	Nome  string
	SQLUp string
}

type MigracaoStatus struct {
	Nome       string `json:"nome"`
	Aplicada   bool   `json:"aplicada"`
	AplicadaEm string `json:"aplicada_em,omitempty"`
}

var Migracoes = []Migracao{
	{
		Nome: "001_criar_marca",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS marca (
				empresa_id INTEGER NOT NULL,
				id INTEGER NOT NULL,
				nome VARCHAR(200) NOT NULL,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				PRIMARY KEY (empresa_id, id)
			);
		`,
	},
	{
		Nome: "002_insumo_add_fornecedor_marca",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insumo' AND column_name='id_fornecedor') THEN
					ALTER TABLE insumo ADD COLUMN id_fornecedor INTEGER;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insumo' AND column_name='id_marca') THEN
					ALTER TABLE insumo ADD COLUMN id_marca INTEGER;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "003_restruturar_compra_insumo",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='compra_insumo_item') THEN
					ALTER TABLE compra_insumo RENAME TO compra_insumo_old;

					CREATE TABLE compra_insumo (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						fornecedor_id INTEGER,
						data_compra DATE NOT NULL,
						valor_total NUMERIC NOT NULL DEFAULT 0,
						observacao TEXT,
						usuario_id INTEGER NOT NULL,
						status SMALLINT NOT NULL DEFAULT 1,
						created_at TIMESTAMP NOT NULL DEFAULT NOW(),
						PRIMARY KEY (empresa_id, id)
					);

					CREATE TABLE compra_insumo_item (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						compra_id INTEGER NOT NULL,
						insumo_id INTEGER NOT NULL,
						fornecedor_id INTEGER,
						quantidade NUMERIC NOT NULL,
						valor_unitario NUMERIC NOT NULL,
						valor_total NUMERIC NOT NULL,
						PRIMARY KEY (empresa_id, id)
					);

					CREATE TABLE compra_insumo_pagamento (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						compra_id INTEGER NOT NULL,
						forma VARCHAR(50) NOT NULL,
						valor NUMERIC NOT NULL,
						parcelas INTEGER NOT NULL DEFAULT 1,
						PRIMARY KEY (empresa_id, id)
					);

					INSERT INTO compra_insumo (empresa_id, id, fornecedor_id, data_compra, valor_total, observacao, usuario_id, created_at)
						SELECT empresa_id, id, fornecedor_id, data_compra, valor_total, observacao, usuario_id, created_at
						FROM compra_insumo_old;

					INSERT INTO compra_insumo_item (empresa_id, id, compra_id, insumo_id, fornecedor_id, quantidade, valor_unitario, valor_total)
						SELECT empresa_id, id, id, insumo_id, fornecedor_id, quantidade, valor_unitario, valor_total
						FROM compra_insumo_old;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "005_criar_perda_consumo",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='perda_insumo') THEN
					CREATE TABLE perda_insumo (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						insumo_id INTEGER NOT NULL,
						quantidade NUMERIC NOT NULL,
						data_perda DATE NOT NULL,
						motivo TEXT,
						usuario_id INTEGER NOT NULL,
						created_at TIMESTAMP NOT NULL DEFAULT NOW(),
						PRIMARY KEY (empresa_id, id)
					);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='perda_produto_fabricado') THEN
					CREATE TABLE perda_produto_fabricado (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						produto_fabricado_id INTEGER NOT NULL,
						quantidade NUMERIC NOT NULL,
						data_perda DATE NOT NULL,
						motivo TEXT,
						usuario_id INTEGER NOT NULL,
						created_at TIMESTAMP NOT NULL DEFAULT NOW(),
						PRIMARY KEY (empresa_id, id)
					);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='uso_consumo') THEN
					CREATE TABLE uso_consumo (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						produto_fabricado_id INTEGER NOT NULL,
						quantidade NUMERIC NOT NULL,
						data_uso DATE NOT NULL,
						motivo TEXT,
						usuario_id INTEGER NOT NULL,
						created_at TIMESTAMP NOT NULL DEFAULT NOW(),
						PRIMARY KEY (empresa_id, id)
					);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "006_criar_encomenda",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='encomenda') THEN
					CREATE TABLE encomenda (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						cliente_id INTEGER NOT NULL,
						data_encomenda DATE NOT NULL,
						valor_total NUMERIC NOT NULL DEFAULT 0,
						observacao TEXT,
						usuario_id INTEGER NOT NULL,
						status SMALLINT NOT NULL DEFAULT 1,
						created_at TIMESTAMP NOT NULL DEFAULT NOW(),
						PRIMARY KEY (empresa_id, id)
					);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='encomenda_item') THEN
					CREATE TABLE encomenda_item (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						encomenda_id INTEGER NOT NULL,
						produto_fabricado_id INTEGER NOT NULL,
						cliente_id INTEGER,
						quantidade NUMERIC NOT NULL,
						valor_unitario NUMERIC NOT NULL,
						valor_total NUMERIC NOT NULL,
						PRIMARY KEY (empresa_id, id)
					);
					ALTER TABLE encomenda_item ADD CONSTRAINT encomenda_item_encomenda_fk
						FOREIGN KEY (empresa_id, encomenda_id) REFERENCES encomenda(empresa_id, id) ON DELETE CASCADE;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda' AND column_name='venda_id') THEN
					ALTER TABLE encomenda ADD COLUMN venda_id INTEGER;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "007_produto_fabricado_foto_preco",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_fabricado' AND column_name='foto') THEN
					ALTER TABLE produto_fabricado ADD COLUMN foto VARCHAR(255);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_fabricado' AND column_name='preco') THEN
					ALTER TABLE produto_fabricado ADD COLUMN preco NUMERIC(12,2);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "008_empresa_chave_pix",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='chave_pix') THEN
					ALTER TABLE public.empresa ADD COLUMN chave_pix VARCHAR(255);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "009_encomenda_data_entrega_status",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda' AND column_name='data_entrega') THEN
					ALTER TABLE encomenda ADD COLUMN data_entrega DATE;
				END IF;
				-- Migra os status antigos: 1 (A Baixar) -> 0 (Aguardando); 2 (Baixado) -> 2 (Finalizado)
				UPDATE encomenda SET status = 0 WHERE status = 1;
			END $$;
		`,
	},
	{
		Nome: "004_restruturar_venda_produto",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='venda_produto_item') THEN
					ALTER TABLE venda_produto RENAME TO venda_produto_old;

					CREATE TABLE venda_produto (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						cliente_id INTEGER NOT NULL,
						data_venda DATE NOT NULL,
						valor_total NUMERIC NOT NULL DEFAULT 0,
						observacao TEXT,
						usuario_id INTEGER NOT NULL,
						status SMALLINT NOT NULL DEFAULT 1,
						created_at TIMESTAMP NOT NULL DEFAULT NOW(),
						PRIMARY KEY (empresa_id, id)
					);

					CREATE TABLE venda_produto_item (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						venda_id INTEGER NOT NULL,
						produto_fabricado_id INTEGER NOT NULL,
						cliente_id INTEGER,
						quantidade NUMERIC NOT NULL,
						valor_unitario NUMERIC NOT NULL,
						valor_total NUMERIC NOT NULL,
						PRIMARY KEY (empresa_id, id)
					);

					CREATE TABLE venda_pagamento (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						venda_id INTEGER NOT NULL,
						forma VARCHAR(50) NOT NULL,
						valor NUMERIC NOT NULL,
						parcelas INTEGER NOT NULL DEFAULT 1,
						PRIMARY KEY (empresa_id, id)
					);

					INSERT INTO venda_produto (empresa_id, id, cliente_id, data_venda, valor_total, observacao, usuario_id, created_at)
						SELECT empresa_id, id, cliente_id, data_venda, valor_total, observacao, usuario_id, created_at
						FROM venda_produto_old;

					INSERT INTO venda_produto_item (empresa_id, id, venda_id, produto_fabricado_id, cliente_id, quantidade, valor_unitario, valor_total)
						SELECT empresa_id, id, id, produto_fabricado_id, cliente_id, quantidade, valor_unitario, valor_total
						FROM venda_produto_old;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "011_empresa_logomarca",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='logomarca') THEN
					ALTER TABLE public.empresa ADD COLUMN logomarca VARCHAR(255);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "012_empresa_logomarcas_multiplas",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='logomarca_paginas') THEN
					ALTER TABLE public.empresa ADD COLUMN logomarca_paginas VARCHAR(255);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='logomarca_relatorios') THEN
					ALTER TABLE public.empresa ADD COLUMN logomarca_relatorios VARCHAR(255);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='logomarca_fiscal') THEN
					ALTER TABLE public.empresa ADD COLUMN logomarca_fiscal VARCHAR(255);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "013_empresa_delivery",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='delivery') THEN
					ALTER TABLE public.empresa ADD COLUMN delivery INTEGER DEFAULT 0;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "013_customizacao_produto",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='adicional') THEN
					CREATE TABLE adicional (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						nome VARCHAR(200) NOT NULL,
						descricao VARCHAR(500),
						preco NUMERIC(12,2) NOT NULL DEFAULT 0,
						ativo BOOLEAN NOT NULL DEFAULT TRUE,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;

				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='produto_adicional') THEN
					CREATE TABLE produto_adicional (
						empresa_id INTEGER NOT NULL,
						produto_fabricado_id INTEGER NOT NULL,
						adicional_id INTEGER NOT NULL,
						PRIMARY KEY (empresa_id, produto_fabricado_id, adicional_id)
					);
				END IF;

				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='encomenda_item_removido') THEN
					CREATE TABLE encomenda_item_removido (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						encomenda_item_id INTEGER NOT NULL,
						nome VARCHAR(200) NOT NULL,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;

				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='encomenda_item_adicional') THEN
					CREATE TABLE encomenda_item_adicional (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						encomenda_item_id INTEGER NOT NULL,
						adicional_id INTEGER,
						nome VARCHAR(200) NOT NULL,
						quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
						valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
						valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;

				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='venda_produto_item_removido') THEN
					CREATE TABLE venda_produto_item_removido (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						venda_produto_item_id INTEGER NOT NULL,
						nome VARCHAR(200) NOT NULL,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;

				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='venda_produto_item_adicional') THEN
					CREATE TABLE venda_produto_item_adicional (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						venda_produto_item_id INTEGER NOT NULL,
						adicional_id INTEGER,
						nome VARCHAR(200) NOT NULL,
						quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
						valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
						valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "014_produto_venda",
		SQLUp: `
			DO $$
			BEGIN
				-- Produto de Venda: produto comercializavel (encomenda/venda),
				-- pode derivar de um produto fabricado.
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='produto_venda') THEN
					CREATE TABLE produto_venda (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						nome VARCHAR(200) NOT NULL,
						descricao TEXT,
						preco NUMERIC(12,2) NOT NULL DEFAULT 0,
						produto_fabricado_id INTEGER,
						foto TEXT,
						ativo BOOLEAN NOT NULL DEFAULT TRUE,
						usuario_id INTEGER,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;

				-- Itens que compoem o produto de venda (receita comercial).
				-- Cada item indica se pode ser removido e/ou adicionado na encomenda,
				-- e o preco cobrado quando adicionado.
				IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='produto_venda_item') THEN
					CREATE TABLE produto_venda_item (
						empresa_id INTEGER NOT NULL,
						id INTEGER NOT NULL,
						produto_venda_id INTEGER NOT NULL,
						nome VARCHAR(200) NOT NULL,
						pode_remover BOOLEAN NOT NULL DEFAULT FALSE,
						pode_adicionar BOOLEAN NOT NULL DEFAULT FALSE,
						preco_adicional NUMERIC(12,2) NOT NULL DEFAULT 0,
						ordem INTEGER NOT NULL DEFAULT 0,
						ativo BOOLEAN NOT NULL DEFAULT TRUE,
						PRIMARY KEY (empresa_id, id)
					);
				END IF;

				-- Referencia opcional ao produto de venda nos itens de encomenda/venda
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda_item' AND column_name='produto_venda_id') THEN
					ALTER TABLE public.encomenda_item ADD COLUMN produto_venda_id INTEGER;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='venda_produto_item' AND column_name='produto_venda_id') THEN
					ALTER TABLE public.venda_produto_item ADD COLUMN produto_venda_id INTEGER;
				END IF;

				-- Referencia opcional ao item do produto de venda nas customizacoes
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda_item_removido' AND column_name='produto_venda_item_id') THEN
					ALTER TABLE public.encomenda_item_removido ADD COLUMN produto_venda_item_id INTEGER;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda_item_adicional' AND column_name='produto_venda_item_id') THEN
					ALTER TABLE public.encomenda_item_adicional ADD COLUMN produto_venda_item_id INTEGER;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='venda_produto_item_removido' AND column_name='produto_venda_item_id') THEN
					ALTER TABLE public.venda_produto_item_removido ADD COLUMN produto_venda_item_id INTEGER;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='venda_produto_item_adicional' AND column_name='produto_venda_item_id') THEN
					ALTER TABLE public.venda_produto_item_adicional ADD COLUMN produto_venda_item_id INTEGER;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "015_produto_venda_item_adicional",
		SQLUp: `
			DO $$
			BEGIN
				-- Item da receita comercial referencia um adicional (preco vem da tabela adicional)
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_venda_item' AND column_name='adicional_id') THEN
					ALTER TABLE public.produto_venda_item ADD COLUMN adicional_id INTEGER;
				END IF;
				-- O preco de adicionar deixa de ser cadastrado no item: vem do adicional vinculado
				IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_venda_item' AND column_name='preco_adicional') THEN
					ALTER TABLE public.produto_venda_item DROP COLUMN preco_adicional;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "016_criar_produto_classificacao",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.produto_classificacao (
				empresa_id INTEGER NOT NULL,
				id INTEGER NOT NULL,
				nome VARCHAR(100) NOT NULL,
				status INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				PRIMARY KEY (empresa_id, id)
			);
		`,
	},
	{
		Nome: "017_produto_venda_classificacao",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produto_venda' AND column_name='produto_classificacao_id') THEN
					ALTER TABLE public.produto_venda ADD COLUMN produto_classificacao_id INTEGER;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "018_criar_adicional_produto_classificacao",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.adicional_produto_classificacao (
				empresa_id INTEGER NOT NULL,
				adicional_id INTEGER NOT NULL,
				produto_classificacao_id INTEGER NOT NULL,
				status INTEGER NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (empresa_id, adicional_id, produto_classificacao_id)
			);
		`,
	},
	{
		Nome: "019_forma_condicao_pagamento",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_classificacao_pagamento') THEN
					CREATE TYPE public.enum_classificacao_pagamento AS ENUM ('DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CHEQUE', 'OUTROS');
				END IF;
			END $$;

			CREATE TABLE IF NOT EXISTS public.forma_pagamento (
				empresa_id INTEGER NOT NULL,
				id INTEGER NOT NULL,
				descricao VARCHAR(100) NOT NULL,
				classificacao public.enum_classificacao_pagamento NOT NULL DEFAULT 'OUTROS',
				status SMALLINT NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT forma_pagamento_status_check CHECK ((status = ANY (ARRAY[0, 1]))),
				CONSTRAINT pk_forma_pagamento PRIMARY KEY (empresa_id, id)
			);

			CREATE TABLE IF NOT EXISTS public.condicao_pagamento (
				empresa_id INTEGER NOT NULL,
				id INTEGER NOT NULL,
				descricao VARCHAR(100) NOT NULL,
				qtd_parcelas INTEGER NOT NULL DEFAULT 1,
				dias_primeiro_vencimento INTEGER NOT NULL DEFAULT 0,
				dias_intervalo INTEGER NOT NULL DEFAULT 30,
				status SMALLINT NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				parcelamento_fixo SMALLINT NOT NULL DEFAULT 0,
				dia_vencimento_fixo INTEGER,
				a_vista SMALLINT NOT NULL DEFAULT 0,
				CONSTRAINT ck_dia_vencimento_fixo CHECK (((parcelamento_fixo = 0) OR ((parcelamento_fixo = 1) AND ((dia_vencimento_fixo >= 1) AND (dia_vencimento_fixo <= 31))))),
				CONSTRAINT condicao_pagamento_fixo_check CHECK ((parcelamento_fixo = ANY (ARRAY[0, 1]))),
				CONSTRAINT condicao_pagamento_status_check CHECK ((status = ANY (ARRAY[0, 1]))),
				CONSTRAINT condicao_pagamento_a_vista_check CHECK ((a_vista = ANY (ARRAY[0, 1]))),
				CONSTRAINT pk_condicao_pagamento PRIMARY KEY (empresa_id, id)
			);

			CREATE TABLE IF NOT EXISTS public.forma_pagamento_condicao (
				empresa_id INTEGER NOT NULL,
				forma_pagamento_id INTEGER NOT NULL,
				condicao_pagamento_id INTEGER NOT NULL,
				status SMALLINT NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT forma_pagamento_condicao_status_check CHECK ((status = ANY (ARRAY[0, 1]))),
				CONSTRAINT pk_forma_pagamento_condicao PRIMARY KEY (empresa_id, forma_pagamento_id, condicao_pagamento_id),
				CONSTRAINT fk_fpc_forma_pagamento FOREIGN KEY (empresa_id, forma_pagamento_id) REFERENCES public.forma_pagamento(empresa_id, id) ON DELETE CASCADE,
				CONSTRAINT fk_fpc_condicao_pagamento FOREIGN KEY (empresa_id, condicao_pagamento_id) REFERENCES public.condicao_pagamento(empresa_id, id) ON DELETE CASCADE
			);
		`,
	},
	{
		Nome: "020_condicao_pagamento_add_a_vista",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condicao_pagamento' AND column_name='a_vista') THEN
					ALTER TABLE public.condicao_pagamento ADD COLUMN a_vista SMALLINT NOT NULL DEFAULT 0;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "021_encomenda_forma_pagamento",
		SQLUp: `
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda' AND column_name='forma_pagamento_id') THEN
					ALTER TABLE public.encomenda ADD COLUMN forma_pagamento_id INTEGER;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda' AND column_name='forma_pagamento_nome') THEN
					ALTER TABLE public.encomenda ADD COLUMN forma_pagamento_nome VARCHAR(100);
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomenda' AND column_name='troco_para') THEN
					ALTER TABLE public.encomenda ADD COLUMN troco_para NUMERIC;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "022_encomenda_endereco_entrega",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.encomenda_endereco_entrega (
				empresa_id INTEGER NOT NULL,
				encomenda_id INTEGER NOT NULL,
				cep VARCHAR(9),
				endereco VARCHAR(200),
				nr VARCHAR(10),
				complemento VARCHAR(500),
				bairro VARCHAR(100),
				cidade VARCHAR(100),
				uf CHAR(2),
				retira_estabelecimento SMALLINT NOT NULL DEFAULT 0,
				latitude NUMERIC(10, 8),
				longitude NUMERIC(11, 8),
				place_id VARCHAR(255),
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP,
				CONSTRAINT encomenda_endereco_entrega_pkey PRIMARY KEY (empresa_id, encomenda_id),
				CONSTRAINT fk_eee_encomenda FOREIGN KEY (empresa_id, encomenda_id)
					REFERENCES public.encomenda(empresa_id, id) ON DELETE CASCADE,
				CONSTRAINT encomenda_endereco_retira_check CHECK ((retira_estabelecimento = ANY (ARRAY[0, 1])))
			);
			CREATE INDEX IF NOT EXISTS encomenda_endereco_empresa_cidade_idx
				ON public.encomenda_endereco_entrega USING btree (empresa_id, cidade);
			CREATE INDEX IF NOT EXISTS encomenda_endereco_lat_long_idx
				ON public.encomenda_endereco_entrega USING btree (empresa_id, latitude, longitude);
		`,
	},
	{
		Nome: "023_usuario_padrao_sistema",
		SQLUp: `
			DO $$
			DECLARE
				eid INTEGER;
			BEGIN
				FOR eid IN SELECT DISTINCT empresa_id FROM public.cliente WHERE empresa_id IS NOT NULL
				LOOP
					IF NOT EXISTS (SELECT 1 FROM public.usuario WHERE empresa_id = eid) THEN
						INSERT INTO public.usuario (empresa_id, nome, email, is_superadmin)
						VALUES (eid, 'Sistema', 'sistema@empresa' || eid || '.local', false);
					END IF;
				END LOOP;
			END $$;
		`,
	},
	{
		Nome: "024_encomenda_pagamento_multiplo",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.encomenda_pagamento (
				empresa_id INTEGER NOT NULL,
				encomenda_id INTEGER NOT NULL,
				id SERIAL NOT NULL,
				forma_pagamento_id INTEGER,
				forma_pagamento_nome VARCHAR(100),
				bandeira_cartao_id INTEGER,
				bandeira_cartao_nome VARCHAR(100),
				valor NUMERIC NOT NULL DEFAULT 0,
				troco_para NUMERIC,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				PRIMARY KEY (empresa_id, encomenda_id, id)
			);

			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.table_constraints
					WHERE table_name = 'encomenda_pagamento' AND constraint_name = 'fk_encomenda_pagamento_encomenda'
				) THEN
					ALTER TABLE public.encomenda_pagamento
						ADD CONSTRAINT fk_encomenda_pagamento_encomenda
						FOREIGN KEY (empresa_id, encomenda_id)
						REFERENCES public.encomenda(empresa_id, id) ON DELETE CASCADE;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "025_encomenda_avaliacao",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.encomenda_avaliacao (
				empresa_id      INTEGER NOT NULL,
				id              INTEGER NOT NULL,
				encomenda_id    INTEGER NOT NULL,
				cliente_id      INTEGER NOT NULL,
				nota            SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
				justificativa   TEXT,
				created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
				PRIMARY KEY (empresa_id, id),
				UNIQUE (empresa_id, encomenda_id)
			);

			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.table_constraints
					WHERE table_name = 'encomenda_avaliacao' AND constraint_name = 'fk_encomenda_avaliacao_encomenda'
				) THEN
					ALTER TABLE public.encomenda_avaliacao
						ADD CONSTRAINT fk_encomenda_avaliacao_encomenda
						FOREIGN KEY (empresa_id, encomenda_id)
						REFERENCES public.encomenda(empresa_id, id) ON DELETE CASCADE;
				END IF;
			END $$;

			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM information_schema.table_constraints
					WHERE table_name = 'encomenda_avaliacao' AND constraint_name = 'fk_encomenda_avaliacao_cliente'
				) THEN
					ALTER TABLE public.encomenda_avaliacao
						ADD CONSTRAINT fk_encomenda_avaliacao_cliente
						FOREIGN KEY (empresa_id, cliente_id)
						REFERENCES public.cliente(empresa_id, id) ON DELETE CASCADE;
				END IF;
			END $$;
		`,
	},
	{
		Nome: "026_relatorio_ia",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.relatorio_ia_conversa (
				empresa_id    INTEGER NOT NULL,
				id            INTEGER NOT NULL,
				usuario_id    INTEGER NOT NULL,
				titulo        VARCHAR(200) NOT NULL,
				criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
				atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
				PRIMARY KEY (empresa_id, id)
			);

			CREATE TABLE IF NOT EXISTS public.relatorio_ia_mensagem (
				empresa_id   INTEGER NOT NULL,
				conversa_id  INTEGER NOT NULL,
				id           INTEGER NOT NULL,
				papel        VARCHAR(10) NOT NULL,
				conteudo     TEXT NOT NULL,
				sql_gerado   TEXT,
				dados        JSONB,
				criado_em    TIMESTAMP NOT NULL DEFAULT NOW(),
				PRIMARY KEY (empresa_id, conversa_id, id)
			);

			CREATE TABLE IF NOT EXISTS public.relatorio_ia_log (
				id          BIGSERIAL PRIMARY KEY,
				empresa_id  INTEGER NOT NULL,
				usuario_id  INTEGER NOT NULL,
				sql_gerado  TEXT NOT NULL,
				linhas      INTEGER NOT NULL DEFAULT 0,
				status      VARCHAR(20) NOT NULL DEFAULT 'ok',
				mensagem    TEXT,
				criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
			);
		`,
	},
	{
		Nome: "027_empresa_llm_config",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.empresa_llm_config (
				empresa_id    INTEGER NOT NULL PRIMARY KEY,
				api_key       TEXT,
				base_url      VARCHAR(300),
				modelo        VARCHAR(100),
				quota_diaria  INTEGER NOT NULL DEFAULT 20,
				atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
				CONSTRAINT fk_empresa_llm_config_empresa
					FOREIGN KEY (empresa_id) REFERENCES public.empresa(id) ON DELETE CASCADE
			);
		`,
	},
	{
		Nome: "028_titulos_pagar_empresa",
		SQLUp: `
			-- Reconstroi titulos_pagar e pagamentos_efetuados com isolamento por empresa.
			-- As tabelas antigas estavam sem empresa_id e usavam sequencias globais.
			-- Como estavam vazias, sao recriadas com PK composta (empresa_id, id).
			-- O id passa a ser gerado por empresa via empresa_sequences/GerarID.

			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1
					FROM pg_type t
					JOIN pg_namespace n ON n.oid = t.typnamespace
					WHERE t.typname = 'status_conta' AND n.nspname = 'public'
				) THEN
					CREATE TYPE public.status_conta AS ENUM ('PENDENTE', 'PARCIAL', 'QUITADO', 'CANCELADO');
				END IF;
			END $$;

			DO $$
			DECLARE
				v_count BIGINT;
			BEGIN
				IF to_regclass('public.titulos_pagar') IS NOT NULL THEN
					EXECUTE 'SELECT COUNT(*) FROM public.titulos_pagar' INTO v_count;
					IF v_count > 0 THEN
						RAISE EXCEPTION 'Migration 028 abortada: public.titulos_pagar possui % registro(s)', v_count;
					END IF;
				END IF;
				IF to_regclass('public.pagamentos_efetuados') IS NOT NULL THEN
					EXECUTE 'SELECT COUNT(*) FROM public.pagamentos_efetuados' INTO v_count;
					IF v_count > 0 THEN
						RAISE EXCEPTION 'Migration 028 abortada: public.pagamentos_efetuados possui % registro(s)', v_count;
					END IF;
				END IF;
			END $$;

			DROP VIEW IF EXISTS public.vw_titulos_saldo;
			DROP TABLE IF EXISTS public.pagamentos_efetuados CASCADE;
			DROP TABLE IF EXISTS public.titulos_pagar CASCADE;
			DROP SEQUENCE IF EXISTS public.titulos_pagar_id_titulo_seq CASCADE;
			DROP SEQUENCE IF EXISTS public.pagamentos_efetuados_id_pagamento_seq CASCADE;

			CREATE TABLE public.titulos_pagar (
				empresa_id INTEGER NOT NULL,
				id INTEGER NOT NULL,
				usuario_id INTEGER,
				credor VARCHAR(150) NOT NULL,
				descricao TEXT,
				numero_documento VARCHAR(50),
				valor_total NUMERIC(15,2) NOT NULL,
				data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
				data_vencimento DATE NOT NULL,
				status public.status_conta NOT NULL DEFAULT 'PENDENTE',
				criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT titulos_pagar_pk PRIMARY KEY (empresa_id, id),
				CONSTRAINT fk_titulos_pagar_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(id),
				CONSTRAINT fk_titulos_pagar_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id),
				CONSTRAINT ck_titulos_pagar_valor_total CHECK (valor_total > 0),
				CONSTRAINT ck_titulos_pagar_datas CHECK (data_vencimento >= data_emissao)
			);

			CREATE TABLE public.pagamentos_efetuados (
				empresa_id INTEGER NOT NULL,
				id INTEGER NOT NULL,
				titulo_id INTEGER NOT NULL,
				usuario_id INTEGER,
				data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
				valor_pago NUMERIC(15,2) NOT NULL,
				forma_pagamento VARCHAR(50),
				observacao TEXT,
				criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT pagamentos_efetuados_pk PRIMARY KEY (empresa_id, id),
				CONSTRAINT fk_pagamentos_efetuados_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(id),
				CONSTRAINT fk_pagamentos_efetuados_titulo FOREIGN KEY (empresa_id, titulo_id) REFERENCES public.titulos_pagar(empresa_id, id) ON DELETE RESTRICT,
				CONSTRAINT fk_pagamentos_efetuados_usuario FOREIGN KEY (empresa_id, usuario_id) REFERENCES public.usuario(empresa_id, id),
				CONSTRAINT ck_pagamentos_efetuados_valor_pago CHECK (valor_pago > 0)
			);

			CREATE INDEX idx_titulos_pagar_emp_status ON public.titulos_pagar (empresa_id, status);
			CREATE INDEX idx_titulos_pagar_emp_venc ON public.titulos_pagar (empresa_id, data_vencimento);
			CREATE INDEX idx_titulos_pagar_emp_credor ON public.titulos_pagar (empresa_id, credor);
			CREATE INDEX idx_titulos_pagar_emp_doc ON public.titulos_pagar (empresa_id, numero_documento);
			CREATE INDEX idx_pagamentos_efetuados_emp_titulo ON public.pagamentos_efetuados (empresa_id, titulo_id);
			CREATE INDEX idx_pagamentos_efetuados_emp_data ON public.pagamentos_efetuados (empresa_id, data_pagamento);

			CREATE OR REPLACE FUNCTION public.fn_titulos_pagar_atualizado_em()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.atualizado_em = NOW();
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			DROP TRIGGER IF EXISTS trg_titulos_pagar_atualizado_em ON public.titulos_pagar;
			CREATE TRIGGER trg_titulos_pagar_atualizado_em
			BEFORE UPDATE ON public.titulos_pagar
			FOR EACH ROW EXECUTE FUNCTION public.fn_titulos_pagar_atualizado_em();

			CREATE OR REPLACE FUNCTION public.fn_pagamentos_efetuados_valida()
			RETURNS TRIGGER AS $$
			DECLARE
				v_total NUMERIC(15,2);
				v_pago NUMERIC(15,2);
				v_status public.status_conta;
			BEGIN
				SELECT valor_total, status INTO v_total, v_status
				FROM public.titulos_pagar
				WHERE empresa_id = NEW.empresa_id AND id = NEW.titulo_id
				FOR UPDATE;

				IF NOT FOUND THEN
					RAISE EXCEPTION 'Titulo % da empresa % nao encontrado', NEW.titulo_id, NEW.empresa_id;
				END IF;

				IF v_status = 'CANCELADO' THEN
					RAISE EXCEPTION 'Nao e possivel pagar um titulo cancelado';
				END IF;

				SELECT COALESCE(SUM(valor_pago), 0) INTO v_pago
				FROM public.pagamentos_efetuados
				WHERE empresa_id = NEW.empresa_id
				  AND titulo_id = NEW.titulo_id
				  AND (TG_OP = 'INSERT' OR id <> NEW.id);

				IF v_pago + NEW.valor_pago > v_total THEN
					RAISE EXCEPTION 'Pagamento excede o valor do titulo (total %, ja pago %, novo %)', v_total, v_pago, NEW.valor_pago;
				END IF;

				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			DROP TRIGGER IF EXISTS trg_pagamentos_efetuados_valida ON public.pagamentos_efetuados;
			CREATE TRIGGER trg_pagamentos_efetuados_valida
			BEFORE INSERT OR UPDATE ON public.pagamentos_efetuados
			FOR EACH ROW EXECUTE FUNCTION public.fn_pagamentos_efetuados_valida();

			CREATE OR REPLACE FUNCTION public.fn_recalcular_status_titulo(p_empresa_id INTEGER, p_titulo_id INTEGER)
			RETURNS VOID AS $$
			DECLARE
				v_total NUMERIC(15,2);
				v_pago NUMERIC(15,2);
				v_status public.status_conta;
			BEGIN
				SELECT valor_total, status INTO v_total, v_status
				FROM public.titulos_pagar
				WHERE empresa_id = p_empresa_id AND id = p_titulo_id
				FOR UPDATE;

				IF NOT FOUND OR v_status = 'CANCELADO' THEN
					RETURN;
				END IF;

				SELECT COALESCE(SUM(valor_pago), 0) INTO v_pago
				FROM public.pagamentos_efetuados
				WHERE empresa_id = p_empresa_id AND titulo_id = p_titulo_id;

				IF v_pago <= 0 THEN
					UPDATE public.titulos_pagar SET status = 'PENDENTE'
					WHERE empresa_id = p_empresa_id AND id = p_titulo_id;
				ELSIF v_pago < v_total THEN
					UPDATE public.titulos_pagar SET status = 'PARCIAL'
					WHERE empresa_id = p_empresa_id AND id = p_titulo_id;
				ELSE
					UPDATE public.titulos_pagar SET status = 'QUITADO'
					WHERE empresa_id = p_empresa_id AND id = p_titulo_id;
				END IF;
			END;
			$$ LANGUAGE plpgsql;

			CREATE OR REPLACE FUNCTION public.fn_pagamentos_efetuados_status()
			RETURNS TRIGGER AS $$
			BEGIN
				IF TG_OP = 'DELETE' THEN
					PERFORM public.fn_recalcular_status_titulo(OLD.empresa_id, OLD.titulo_id);
					RETURN OLD;
				END IF;

				PERFORM public.fn_recalcular_status_titulo(NEW.empresa_id, NEW.titulo_id);
				IF TG_OP = 'UPDATE' AND (OLD.empresa_id <> NEW.empresa_id OR OLD.titulo_id <> NEW.titulo_id) THEN
					PERFORM public.fn_recalcular_status_titulo(OLD.empresa_id, OLD.titulo_id);
				END IF;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			DROP TRIGGER IF EXISTS trg_pagamentos_efetuados_status ON public.pagamentos_efetuados;
			CREATE TRIGGER trg_pagamentos_efetuados_status
			AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos_efetuados
			FOR EACH ROW EXECUTE FUNCTION public.fn_pagamentos_efetuados_status();

			CREATE OR REPLACE FUNCTION public.fn_titulos_pagar_recalc()
			RETURNS TRIGGER AS $$
			BEGIN
				PERFORM public.fn_recalcular_status_titulo(NEW.empresa_id, NEW.id);
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			DROP TRIGGER IF EXISTS trg_titulos_pagar_recalc ON public.titulos_pagar;
			CREATE TRIGGER trg_titulos_pagar_recalc
			AFTER UPDATE OF valor_total ON public.titulos_pagar
			FOR EACH ROW EXECUTE FUNCTION public.fn_titulos_pagar_recalc();

			CREATE OR REPLACE VIEW public.vw_titulos_saldo AS
			SELECT
				t.empresa_id,
				t.id,
				t.usuario_id,
				t.credor,
				t.descricao,
				t.numero_documento,
				t.valor_total,
				t.data_emissao,
				t.data_vencimento,
				t.status,
				COALESCE(SUM(p.valor_pago), 0) AS total_pago,
				t.valor_total - COALESCE(SUM(p.valor_pago), 0) AS saldo_devedor,
				CASE
					WHEN t.status = 'CANCELADO' THEN NULL
					WHEN t.data_vencimento < CURRENT_DATE AND COALESCE(SUM(p.valor_pago), 0) < t.valor_total
						THEN CURRENT_DATE - t.data_vencimento
					ELSE 0
				END AS dias_atraso,
				MAX(p.data_pagamento) AS ultimo_pagamento,
				t.criado_em,
				t.atualizado_em
			FROM public.titulos_pagar t
			LEFT JOIN public.pagamentos_efetuados p
				ON p.empresa_id = t.empresa_id AND p.titulo_id = t.id
			GROUP BY t.empresa_id, t.id;
		`,
	},
	{
		Nome: "029_formulario_titulos_pagar",
		SQLUp: `
			DO $$
			DECLARE
				v_id INTEGER;
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = 'Titulos a Pagar') THEN
					SELECT COALESCE(MAX(id), 0) + 1 INTO v_id FROM public.formulario;
					INSERT INTO public.formulario (id, nome) VALUES (v_id, 'Titulos a Pagar');
					PERFORM setval(pg_get_serial_sequence('public.formulario', 'id'), v_id, true);
				END IF;
			END $$;
		`,
	},
	{
		Nome: "030_titulos_pagar_menu_e_validacao",
		SQLUp: `
			-- Sincroniza a sequence com o maior id existente (pode estar dessincronizada)
			SELECT setval(
				pg_get_serial_sequence('public.modulo_formulario', 'id')::regclass,
				COALESCE(MAX(id), 0) + 1,
				false
			) FROM public.modulo_formulario;

			-- Vincula o formulario ao modulo GESTOR para aparecer no menu
			INSERT INTO public.modulo_formulario (modulo_id, formulario_id, abertura)
			SELECT m.id, f.id, 6
			FROM public.modulo m, public.formulario f
			WHERE m.nome = 'GESTOR'
			  AND f.nome = 'Titulos a Pagar'
			  AND NOT EXISTS (
				SELECT 1 FROM public.modulo_formulario mf
				WHERE mf.modulo_id = m.id AND mf.formulario_id = f.id
			  );

			-- Impede reduzir o valor total abaixo do ja pago
			CREATE OR REPLACE FUNCTION public.fn_titulos_pagar_valida_total()
			RETURNS TRIGGER AS $$
			DECLARE
				v_pago NUMERIC(15,2);
			BEGIN
				SELECT COALESCE(SUM(valor_pago), 0) INTO v_pago
				FROM public.pagamentos_efetuados
				WHERE empresa_id = NEW.empresa_id AND titulo_id = NEW.id;

				IF NEW.valor_total < v_pago THEN
					RAISE EXCEPTION 'Valor total (%) nao pode ser menor que o total ja pago (%)', NEW.valor_total, v_pago;
				END IF;
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			DROP TRIGGER IF EXISTS trg_titulos_pagar_valida_total ON public.titulos_pagar;
			CREATE TRIGGER trg_titulos_pagar_valida_total
			BEFORE UPDATE OF valor_total ON public.titulos_pagar
			FOR EACH ROW EXECUTE FUNCTION public.fn_titulos_pagar_valida_total();
		`,
	},
	{
		Nome: "031_titulos_pagar_chave_pix",
		SQLUp: `
			ALTER TABLE public.titulos_pagar ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(255);

			DROP VIEW IF EXISTS public.vw_titulos_saldo;
			CREATE VIEW public.vw_titulos_saldo AS
			SELECT
				t.empresa_id,
				t.id,
				t.usuario_id,
				t.credor,
				t.descricao,
				t.numero_documento,
				t.chave_pix,
				t.valor_total,
				t.data_emissao,
				t.data_vencimento,
				t.status,
				COALESCE(SUM(p.valor_pago), 0) AS total_pago,
				t.valor_total - COALESCE(SUM(p.valor_pago), 0) AS saldo_devedor,
				CASE
					WHEN t.status = 'CANCELADO' THEN NULL
					WHEN t.data_vencimento < CURRENT_DATE AND COALESCE(SUM(p.valor_pago), 0) < t.valor_total
						THEN CURRENT_DATE - t.data_vencimento
					ELSE 0
				END AS dias_atraso,
				MAX(p.data_pagamento) AS ultimo_pagamento,
				t.criado_em,
				t.atualizado_em
			FROM public.titulos_pagar t
			LEFT JOIN public.pagamentos_efetuados p
				ON p.empresa_id = t.empresa_id AND p.titulo_id = t.id
			GROUP BY t.empresa_id, t.id;
		`,
	},
	{
		Nome: "032_titulos_pagar_parcela",
		SQLUp: `
			ALTER TABLE public.titulos_pagar ADD COLUMN IF NOT EXISTS parcela INTEGER;
			UPDATE public.titulos_pagar SET parcela = 1 WHERE parcela IS NULL;
			ALTER TABLE public.titulos_pagar ALTER COLUMN parcela SET DEFAULT 1;
			ALTER TABLE public.titulos_pagar ALTER COLUMN parcela SET NOT NULL;

			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint WHERE conname = 'ck_titulos_pagar_parcela'
				) THEN
					ALTER TABLE public.titulos_pagar
						ADD CONSTRAINT ck_titulos_pagar_parcela CHECK (parcela >= 1);
				END IF;
			END;
			$$;

			DROP VIEW IF EXISTS public.vw_titulos_saldo;
			CREATE VIEW public.vw_titulos_saldo AS
			SELECT
				t.empresa_id,
				t.id,
				t.usuario_id,
				t.credor,
				t.descricao,
				t.numero_documento,
				t.chave_pix,
				t.parcela,
				t.valor_total,
				t.data_emissao,
				t.data_vencimento,
				t.status,
				COALESCE(SUM(p.valor_pago), 0) AS total_pago,
				t.valor_total - COALESCE(SUM(p.valor_pago), 0) AS saldo_devedor,
				CASE
					WHEN t.status = 'CANCELADO' THEN NULL
					WHEN t.data_vencimento < CURRENT_DATE AND COALESCE(SUM(p.valor_pago), 0) < t.valor_total
						THEN CURRENT_DATE - t.data_vencimento
					ELSE 0
				END AS dias_atraso,
				MAX(p.data_pagamento) AS ultimo_pagamento,
				t.criado_em,
				t.atualizado_em
			FROM public.titulos_pagar t
			LEFT JOIN public.pagamentos_efetuados p
				ON p.empresa_id = t.empresa_id AND p.titulo_id = t.id
			GROUP BY t.empresa_id, t.id;
		`,
	},
	{
		Nome: "033_empresa_ativacao_e_token",
		SQLUp: `
			-- Ciclo de vida da empresa:
			--   0 = Inativa
			--   1 = Ativa
			--   2 = Pendente de ativacao (aguardando token de primeiro acesso)
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='status') THEN
					ALTER TABLE public.empresa ADD COLUMN status SMALLINT NOT NULL DEFAULT 1;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='ativada_em') THEN
					ALTER TABLE public.empresa ADD COLUMN ativada_em TIMESTAMP;
				END IF;
				IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresa' AND column_name='ativada_por') THEN
					ALTER TABLE public.empresa ADD COLUMN ativada_por INTEGER;
				END IF;
			END $$;

			-- Garante a empresa principal (superadmin) sempre ativa.
			UPDATE public.empresa
				SET status = 1,
					ativada_em = COALESCE(ativada_em, created_at, NOW())
				WHERE id = 1;

			-- Empresas antigas que ja existiam passam a ser consideradas ativas.
			UPDATE public.empresa
				SET ativada_em = COALESCE(ativada_em, created_at, NOW())
				WHERE status = 1 AND ativada_em IS NULL;

			CREATE TABLE IF NOT EXISTS public.empresa_token_acesso (
				id SERIAL NOT NULL,
				empresa_id INTEGER NOT NULL,
				token_hash VARCHAR(64) NOT NULL,
				expira_em TIMESTAMP NOT NULL,
				usado_em TIMESTAMP,
				revogado_em TIMESTAMP,
				criado_por INTEGER,
				criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
				CONSTRAINT empresa_token_acesso_pk PRIMARY KEY (id),
				CONSTRAINT fk_empresa_token_acesso_empresa
					FOREIGN KEY (empresa_id) REFERENCES public.empresa(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_empresa_token_acesso_empresa
				ON public.empresa_token_acesso (empresa_id);
			CREATE INDEX IF NOT EXISTS idx_empresa_token_acesso_hash
				ON public.empresa_token_acesso (token_hash);
		`,
	},
	{
		Nome: "034_criar_schema_padrao",
		SQLUp: `
			-- ==================================================
			-- Schema padrao: catalogo de dados replicaveis
			-- As tabelas daqui NAO possuem empresa_id: sao a
			-- matriz (template) usada para popular empresas.
			-- O vinculo do que ja foi aplicado fica em
			-- padrao.empresa_item.
			-- ==================================================
			CREATE SCHEMA IF NOT EXISTS padrao;

			CREATE OR REPLACE FUNCTION padrao.tocar_updated_at() RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = NOW();
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;

			-- ---------- marcas ----------
			CREATE TABLE IF NOT EXISTS padrao.marca (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(200) NOT NULL,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);

			-- ---------- classificacao de produtos de venda ----------
			CREATE TABLE IF NOT EXISTS padrao.produto_classificacao (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(100) NOT NULL,
				status INTEGER NOT NULL DEFAULT 1,
				ordem INTEGER NOT NULL DEFAULT 0,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);

			-- ---------- insumos (materias-primas) ----------
			CREATE TABLE IF NOT EXISTS padrao.insumo (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(100) NOT NULL,
				unidade_medida VARCHAR(5) NOT NULL,
				custo_medio NUMERIC(12,4) NOT NULL DEFAULT 0,
				marca_id INTEGER REFERENCES padrao.marca(id) ON DELETE SET NULL,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				status SMALLINT NOT NULL DEFAULT 1,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_insumo_marca ON padrao.insumo (marca_id);

			-- ---------- adicionais ----------
			CREATE TABLE IF NOT EXISTS padrao.adicional (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(200) NOT NULL,
				descricao VARCHAR(500),
				preco NUMERIC(12,2) NOT NULL DEFAULT 0,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);

			-- Quais adicionais podem ser usados em cada classificacao
			CREATE TABLE IF NOT EXISTS padrao.adicional_produto_classificacao (
				adicional_id INTEGER NOT NULL REFERENCES padrao.adicional(id) ON DELETE CASCADE,
				produto_classificacao_id INTEGER NOT NULL REFERENCES padrao.produto_classificacao(id) ON DELETE CASCADE,
				status INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				PRIMARY KEY (adicional_id, produto_classificacao_id)
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_apc_classificacao
				ON padrao.adicional_produto_classificacao (produto_classificacao_id);

			-- ---------- tipos de custo adicional de fabricacao ----------
			CREATE TABLE IF NOT EXISTS padrao.custo_adicional_tipo (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(100) NOT NULL,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				status SMALLINT NOT NULL DEFAULT 1,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);

			-- ---------- produto fabricado + receita ----------
			CREATE TABLE IF NOT EXISTS padrao.produto_fabricado (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(100) NOT NULL,
				descricao VARCHAR(255),
				rendimento NUMERIC(12,4),
				unidade_medida VARCHAR(5) NOT NULL DEFAULT 'un',
				custo_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
				margem_lucro NUMERIC(9,2) NOT NULL DEFAULT 0,
				valor_venda_sugerido NUMERIC(12,2) NOT NULL DEFAULT 0,
				preco NUMERIC(12,2),
				foto VARCHAR(255),
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				status SMALLINT NOT NULL DEFAULT 1,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS padrao.receita_ingrediente (
				id SERIAL PRIMARY KEY,
				produto_fabricado_id INTEGER NOT NULL REFERENCES padrao.produto_fabricado(id) ON DELETE CASCADE,
				insumo_id INTEGER NOT NULL REFERENCES padrao.insumo(id) ON DELETE RESTRICT,
				quantidade NUMERIC(12,4) NOT NULL,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				UNIQUE (produto_fabricado_id, insumo_id)
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_ri_insumo ON padrao.receita_ingrediente (insumo_id);

			-- Compatibilidade com o modelo legado produto x adicional
			CREATE TABLE IF NOT EXISTS padrao.produto_adicional (
				produto_fabricado_id INTEGER NOT NULL REFERENCES padrao.produto_fabricado(id) ON DELETE CASCADE,
				adicional_id INTEGER NOT NULL REFERENCES padrao.adicional(id) ON DELETE CASCADE,
				PRIMARY KEY (produto_fabricado_id, adicional_id)
			);

			-- ---------- produto de venda ----------
			CREATE TABLE IF NOT EXISTS padrao.produto_venda (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(200) NOT NULL,
				descricao TEXT,
				preco NUMERIC(12,2) NOT NULL DEFAULT 0,
				produto_fabricado_id INTEGER REFERENCES padrao.produto_fabricado(id) ON DELETE SET NULL,
				produto_classificacao_id INTEGER REFERENCES padrao.produto_classificacao(id) ON DELETE SET NULL,
				foto TEXT,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_pv_fabricado ON padrao.produto_venda (produto_fabricado_id);
			CREATE INDEX IF NOT EXISTS idx_padrao_pv_classificacao ON padrao.produto_venda (produto_classificacao_id);

			CREATE TABLE IF NOT EXISTS padrao.produto_venda_item (
				id SERIAL PRIMARY KEY,
				produto_venda_id INTEGER NOT NULL REFERENCES padrao.produto_venda(id) ON DELETE CASCADE,
				nome VARCHAR(200) NOT NULL,
				pode_remover BOOLEAN NOT NULL DEFAULT FALSE,
				pode_adicionar BOOLEAN NOT NULL DEFAULT FALSE,
				adicional_id INTEGER REFERENCES padrao.adicional(id) ON DELETE SET NULL,
				ordem INTEGER NOT NULL DEFAULT 0,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				UNIQUE (produto_venda_id, nome)
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_pvi_adicional ON padrao.produto_venda_item (adicional_id);

			-- ---------- pacotes (ex.: Lanchonete, Pizzaria) ----------
			CREATE TABLE IF NOT EXISTS padrao.pacote (
				id SERIAL PRIMARY KEY,
				codigo VARCHAR(80) NOT NULL UNIQUE,
				nome VARCHAR(200) NOT NULL,
				descricao TEXT,
				ativo BOOLEAN NOT NULL DEFAULT TRUE,
				versao INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP
			);

			-- Itens genericos de um pacote: tipo identifica a tabela padrao
			CREATE TABLE IF NOT EXISTS padrao.pacote_item (
				pacote_id INTEGER NOT NULL REFERENCES padrao.pacote(id) ON DELETE CASCADE,
				tipo VARCHAR(40) NOT NULL,
				padrao_id INTEGER NOT NULL,
				ordem INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (pacote_id, tipo, padrao_id)
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_pacote_item_ref ON padrao.pacote_item (tipo, padrao_id);

			-- ---------- controle de replicacao por empresa ----------
			-- tipo = nome da tabela padrao (ex.: 'produto_venda')
			-- padrao_id = id na tabela padrao
			-- registro_id = id gerado na tabela da empresa
			CREATE TABLE IF NOT EXISTS padrao.empresa_item (
				id BIGSERIAL PRIMARY KEY,
				empresa_id INTEGER NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
				tipo VARCHAR(40) NOT NULL,
				padrao_id INTEGER NOT NULL,
				registro_id INTEGER NOT NULL,
				versao_aplicada INTEGER NOT NULL DEFAULT 1,
				aplicado_em TIMESTAMP NOT NULL DEFAULT NOW(),
				UNIQUE (empresa_id, tipo, padrao_id)
			);
			CREATE INDEX IF NOT EXISTS idx_padrao_empresa_item_empresa ON padrao.empresa_item (empresa_id);
			CREATE INDEX IF NOT EXISTS idx_padrao_empresa_item_ref ON padrao.empresa_item (tipo, padrao_id);

			-- ---------- triggers de updated_at ----------
			DROP TRIGGER IF EXISTS trg_padrao_marca_updated ON padrao.marca;
			CREATE TRIGGER trg_padrao_marca_updated BEFORE UPDATE ON padrao.marca
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_classificacao_updated ON padrao.produto_classificacao;
			CREATE TRIGGER trg_padrao_classificacao_updated BEFORE UPDATE ON padrao.produto_classificacao
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_insumo_updated ON padrao.insumo;
			CREATE TRIGGER trg_padrao_insumo_updated BEFORE UPDATE ON padrao.insumo
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_adicional_updated ON padrao.adicional;
			CREATE TRIGGER trg_padrao_adicional_updated BEFORE UPDATE ON padrao.adicional
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_custo_tipo_updated ON padrao.custo_adicional_tipo;
			CREATE TRIGGER trg_padrao_custo_tipo_updated BEFORE UPDATE ON padrao.custo_adicional_tipo
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_produto_fabricado_updated ON padrao.produto_fabricado;
			CREATE TRIGGER trg_padrao_produto_fabricado_updated BEFORE UPDATE ON padrao.produto_fabricado
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_produto_venda_updated ON padrao.produto_venda;
			CREATE TRIGGER trg_padrao_produto_venda_updated BEFORE UPDATE ON padrao.produto_venda
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();

			DROP TRIGGER IF EXISTS trg_padrao_pacote_updated ON padrao.pacote;
			CREATE TRIGGER trg_padrao_pacote_updated BEFORE UPDATE ON padrao.pacote
				FOR EACH ROW EXECUTE FUNCTION padrao.tocar_updated_at();
		`,
	},
	{
		Nome: "035_seed_padrao_lanchonete",
		SQLUp: `
			-- ==================================================
			-- Catalogo padrao: pacote Lanchonete
			-- Idempotente: usa ON CONFLICT nas chaves naturais.
			-- Nao cria modulo: o usuario cria "Cadastros Padrao"
			-- e associa os formularios pela interface.
			-- ==================================================

			-- ---------- formularios ----------
			DO $$
			DECLARE
				v_nome TEXT;
				v_id INTEGER;
			BEGIN
				FOREACH v_nome IN ARRAY ARRAY[
					'Marcas Padrao',
					'Classificacoes Padrao',
					'Insumos Padrao',
					'Adicionais Padrao',
					'Adicionais x Classificacao Padrao',
					'Custos Adicionais Padrao',
					'Produtos Fabricados Padrao',
					'Receitas Padrao',
					'Produtos x Adicionais Padrao',
					'Produtos Venda Padrao',
					'Itens Produto Venda Padrao',
					'Pacotes Padrao',
					'Itens Pacote Padrao',
					'Replicar Cadastros Padrao'
				] LOOP
					IF NOT EXISTS (SELECT 1 FROM public.formulario WHERE nome = v_nome) THEN
						SELECT COALESCE(MAX(id), 0) + 1 INTO v_id FROM public.formulario;
						INSERT INTO public.formulario (id, nome) VALUES (v_id, v_nome);
					END IF;
				END LOOP;

				SELECT setval(pg_get_serial_sequence('public.formulario', 'id'), COALESCE(MAX(id), 1))
					INTO v_id FROM public.formulario;
			END $$;

			-- ---------- marcas ----------
			INSERT INTO padrao.marca (codigo, nome) VALUES
				('MARCA_PROPRIA', 'Marca Propria'),
				('SEARA', 'Seara'),
				('PERDIGAO', 'Perdigao'),
				('PIACENTINI', 'Piacentini'),
				('HELLMANNS', 'Hellmanns'),
				('COCA_COLA', 'Coca-Cola'),
				('GUARANA_ANTARCTICA', 'Guarana Antarctica'),
				('FANTA', 'Fanta')
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- classificacoes de produto de venda ----------
			INSERT INTO padrao.produto_classificacao (codigo, nome, ordem) VALUES
				('LANCHE', 'Lanches', 1),
				('PORCAO', 'Porcoes', 2),
				('BEBIDA', 'Bebidas', 3),
				('SOBREMESA', 'Sobremesas', 4),
				('COMBO', 'Combos', 5)
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- insumos ----------
			INSERT INTO padrao.insumo (codigo, nome, unidade_medida, custo_medio, marca_id)
			SELECT v.codigo, v.nome, v.un, v.custo, m.id
			FROM (VALUES
				('IN_PAO_BURGER', 'Pao de Hamburguer', 'un', 1.20, 'MARCA_PROPRIA'),
				('IN_PAO_HOTDOG', 'Pao de Hot Dog', 'un', 0.90, 'MARCA_PROPRIA'),
				('IN_CARNE_BOVINA', 'Carne Bovina Moida', 'kg', 38.00, 'SEARA'),
				('IN_CARNE_FRANGO', 'Peito de Frango', 'kg', 22.00, 'SEARA'),
				('IN_QUEIJO_MUSSARELA', 'Queijo Mussarela', 'kg', 45.00, 'PIACENTINI'),
				('IN_QUEIJO_CHEDDAR', 'Queijo Cheddar', 'kg', 48.00, 'PIACENTINI'),
				('IN_PRESUNTO', 'Presunto', 'kg', 32.00, 'PERDIGAO'),
				('IN_BACON', 'Bacon', 'kg', 42.00, 'SEARA'),
				('IN_ALFACE', 'Alface', 'un', 2.50, 'MARCA_PROPRIA'),
				('IN_TOMATE', 'Tomate', 'kg', 8.00, 'MARCA_PROPRIA'),
				('IN_CEBOLA', 'Cebola', 'kg', 6.00, 'MARCA_PROPRIA'),
				('IN_BATATA', 'Batata Pre-Frita', 'kg', 18.00, 'MARCA_PROPRIA'),
				('IN_OLEO', 'Oleo de Soja', 'L', 8.00, 'MARCA_PROPRIA'),
				('IN_MAIONESE', 'Maionese', 'kg', 14.00, 'HELLMANNS'),
				('IN_KETCHUP', 'Ketchup', 'kg', 12.00, 'HELLMANNS'),
				('IN_MOSTARDA', 'Mostarda', 'kg', 11.00, 'HELLMANNS'),
				('IN_SAL', 'Sal Refinado', 'kg', 3.00, 'MARCA_PROPRIA'),
				('IN_OVO', 'Ovo', 'un', 0.80, 'MARCA_PROPRIA'),
				('IN_REFRIG_LATA', 'Refrigerante Lata 350ml', 'un', 3.50, 'COCA_COLA'),
				('IN_AGUA', 'Agua Mineral 500ml', 'un', 1.20, 'MARCA_PROPRIA'),
				('IN_EMBALAGEM', 'Embalagem para Lanche', 'un', 0.60, 'MARCA_PROPRIA'),
				('IN_EMBALAGEM_BATATA', 'Embalagem para Batata', 'un', 0.40, 'MARCA_PROPRIA'),
				('IN_GUARDANAPO', 'Guardanapo', 'un', 0.05, 'MARCA_PROPRIA')
			) AS v(codigo, nome, un, custo, marca)
			LEFT JOIN padrao.marca m ON m.codigo = v.marca
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- adicionais ----------
			INSERT INTO padrao.adicional (codigo, nome, descricao, preco) VALUES
				('AD_BACON', 'Bacon Extra', 'Fatias de bacon crocante', 6.00),
				('AD_CHEDDAR', 'Cheddar Extra', 'Queijo cheddar derretido', 5.00),
				('AD_CATUPIRY', 'Catupiry', 'Requeijao cremoso', 5.00),
				('AD_OVO', 'Ovo Frito', 'Ovo frito', 3.00),
				('AD_PRESUNTO', 'Presunto Extra', 'Fatias de presunto', 4.00),
				('AD_QUEIJO', 'Queijo Extra', 'Fatia extra de mussarela', 4.00),
				('AD_CARNE', 'Carne Extra', 'Hamburguer extra', 8.00),
				('AD_BATATA_PALHA', 'Batata Palha', 'Porcao de batata palha', 3.50),
				('AD_ONION', 'Cebola Caramelizada', 'Cebola caramelizada', 4.00)
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- adicionais x classificacoes ----------
			INSERT INTO padrao.adicional_produto_classificacao (adicional_id, produto_classificacao_id, status)
			SELECT a.id, c.id, 1
			FROM (VALUES
				('AD_BACON', 'LANCHE'), ('AD_CHEDDAR', 'LANCHE'), ('AD_CATUPIRY', 'LANCHE'),
				('AD_OVO', 'LANCHE'), ('AD_PRESUNTO', 'LANCHE'), ('AD_QUEIJO', 'LANCHE'),
				('AD_CARNE', 'LANCHE'), ('AD_ONION', 'LANCHE'),
				('AD_BACON', 'COMBO'), ('AD_CHEDDAR', 'COMBO'), ('AD_QUEIJO', 'COMBO'), ('AD_CARNE', 'COMBO'),
				('AD_BATATA_PALHA', 'PORCAO')
			) AS v(ad, class)
			JOIN padrao.adicional a ON a.codigo = v.ad
			JOIN padrao.produto_classificacao c ON c.codigo = v.class
			ON CONFLICT DO NOTHING;

			-- ---------- tipos de custo adicional ----------
			INSERT INTO padrao.custo_adicional_tipo (codigo, nome) VALUES
				('CUSTO_ENERGIA', 'Energia'),
				('CUSTO_GAS', 'Gas'),
				('CUSTO_EMBALAGEM', 'Embalagem'),
				('CUSTO_FRETE', 'Frete'),
				('CUSTO_MAO_OBRA', 'Mao de Obra')
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- produtos fabricados ----------
			INSERT INTO padrao.produto_fabricado
				(codigo, nome, descricao, rendimento, unidade_medida, custo_unitario, margem_lucro, valor_venda_sugerido, preco)
			VALUES
				('PF_HAMBURGUER', 'Hamburguer Artesanal', 'Hamburguer bovino 180g', 1.000, 'un', 12.00, 60.00, 19.20, 19.20),
				('PF_FRANGO', 'Frango Empanado', 'File de frango empanado', 1.000, 'un', 8.00, 60.00, 12.80, 12.80),
				('PF_MOLHO', 'Molho Especial', 'Molho da casa', 1.000, 'L', 15.00, 50.00, 22.50, 22.50),
				('PF_CHEDDAR', 'Cheddar Cremoso', 'Cheddar derretido', 1.000, 'kg', 35.00, 60.00, 56.00, 56.00),
				('PF_BATATA', 'Batata Frita', 'Porcao de batata frita', 1.000, 'un', 6.00, 80.00, 10.80, 10.80)
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- receitas ----------
			INSERT INTO padrao.receita_ingrediente (produto_fabricado_id, insumo_id, quantidade)
			SELECT pf.id, i.id, v.qtd
			FROM (VALUES
				('PF_HAMBURGUER', 'IN_CARNE_BOVINA', 0.180),
				('PF_HAMBURGUER', 'IN_SAL', 0.002),
				('PF_HAMBURGUER', 'IN_CEBOLA', 0.010),
				('PF_FRANGO', 'IN_CARNE_FRANGO', 0.120),
				('PF_FRANGO', 'IN_SAL', 0.002),
				('PF_MOLHO', 'IN_MAIONESE', 0.500),
				('PF_MOLHO', 'IN_KETCHUP', 0.200),
				('PF_MOLHO', 'IN_MOSTARDA', 0.100),
				('PF_CHEDDAR', 'IN_QUEIJO_CHEDDAR', 1.000),
				('PF_BATATA', 'IN_BATATA', 0.300),
				('PF_BATATA', 'IN_OLEO', 0.050),
				('PF_BATATA', 'IN_SAL', 0.002)
			) AS v(pf, ins, qtd)
			JOIN padrao.produto_fabricado pf ON pf.codigo = v.pf
			JOIN padrao.insumo i ON i.codigo = v.ins
			ON CONFLICT (produto_fabricado_id, insumo_id) DO NOTHING;

			-- ---------- produtos fabricados x adicionais ----------
			INSERT INTO padrao.produto_adicional (produto_fabricado_id, adicional_id)
			SELECT pf.id, a.id
			FROM (VALUES
				('PF_HAMBURGUER', 'AD_BACON'), ('PF_HAMBURGUER', 'AD_CHEDDAR'),
				('PF_HAMBURGUER', 'AD_QUEIJO'), ('PF_HAMBURGUER', 'AD_CARNE'),
				('PF_HAMBURGUER', 'AD_OVO'), ('PF_HAMBURGUER', 'AD_ONION'),
				('PF_FRANGO', 'AD_BACON'), ('PF_FRANGO', 'AD_CHEDDAR'), ('PF_FRANGO', 'AD_QUEIJO'),
				('PF_BATATA', 'AD_CHEDDAR'), ('PF_BATATA', 'AD_BACON'), ('PF_BATATA', 'AD_BATATA_PALHA')
			) AS v(pf, ad)
			JOIN padrao.produto_fabricado pf ON pf.codigo = v.pf
			JOIN padrao.adicional a ON a.codigo = v.ad
			ON CONFLICT DO NOTHING;

			-- ---------- produtos de venda ----------
			INSERT INTO padrao.produto_venda
				(codigo, nome, descricao, preco, produto_fabricado_id, produto_classificacao_id, ativo)
			SELECT v.codigo, v.nome, v.descricao, v.preco, pf.id, c.id, TRUE
			FROM (VALUES
				('PV_XBURGER', 'X-Burger', 'Pao, hamburguer, queijo e molho especial', 18.90, 'PF_HAMBURGUER', 'LANCHE'),
				('PV_XSALADA', 'X-Salada', 'Pao, hamburguer, queijo, alface e tomate', 21.90, 'PF_HAMBURGUER', 'LANCHE'),
				('PV_XBACON', 'X-Bacon', 'Pao, hamburguer, queijo, bacon e molho', 24.90, 'PF_HAMBURGUER', 'LANCHE'),
				('PV_XTUDO', 'X-Tudo', 'Pao, hamburguer, queijo, presunto, ovo e bacon', 29.90, 'PF_HAMBURGUER', 'LANCHE'),
				('PV_XFRANGO', 'X-Frango', 'Pao, frango empanado, queijo e molho', 22.90, 'PF_FRANGO', 'LANCHE'),
				('PV_BATATA', 'Batata Frita', 'Porcao de batata frita', 14.90, 'PF_BATATA', 'PORCAO'),
				('PV_BATATA_CHEDDAR', 'Batata Cheddar e Bacon', 'Batata com cheddar e bacon', 22.90, 'PF_BATATA', 'PORCAO'),
				('PV_REFRIG', 'Refrigerante Lata', 'Refrigerante lata 350ml', 5.00, NULL, 'BEBIDA'),
				('PV_AGUA', 'Agua Mineral', 'Agua mineral 500ml', 3.00, NULL, 'BEBIDA'),
				('PV_COMBO_XBURGER', 'Combo X-Burger', 'X-Burger + batata + refrigerante', 27.90, 'PF_HAMBURGUER', 'COMBO'),
				('PV_MILKSHAKE', 'Milkshake', 'Milkshake 400ml', 12.00, NULL, 'SOBREMESA')
			) AS v(codigo, nome, descricao, preco, pf, class)
			LEFT JOIN padrao.produto_fabricado pf ON pf.codigo = v.pf
			LEFT JOIN padrao.produto_classificacao c ON c.codigo = v.class
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- itens dos produtos de venda ----------
			INSERT INTO padrao.produto_venda_item
				(produto_venda_id, nome, pode_remover, pode_adicionar, adicional_id, ordem, ativo)
			SELECT pv.id, v.nome, v.remover, v.adicionar, a.id, v.ordem, TRUE
			FROM (VALUES
				('PV_XBURGER', 'Pao', TRUE, FALSE, NULL::text, 1),
				('PV_XBURGER', 'Hamburguer', TRUE, TRUE, 'AD_CARNE', 2),
				('PV_XBURGER', 'Queijo Mussarela', TRUE, TRUE, 'AD_QUEIJO', 3),
				('PV_XBURGER', 'Molho Especial', TRUE, FALSE, NULL::text, 4),
				('PV_XSALADA', 'Pao', TRUE, FALSE, NULL::text, 1),
				('PV_XSALADA', 'Hamburguer', TRUE, TRUE, 'AD_CARNE', 2),
				('PV_XSALADA', 'Queijo Mussarela', TRUE, TRUE, 'AD_QUEIJO', 3),
				('PV_XSALADA', 'Alface', TRUE, FALSE, NULL::text, 4),
				('PV_XSALADA', 'Tomate', TRUE, FALSE, NULL::text, 5),
				('PV_XSALADA', 'Molho Especial', TRUE, FALSE, NULL::text, 6),
				('PV_XBACON', 'Pao', TRUE, FALSE, NULL::text, 1),
				('PV_XBACON', 'Hamburguer', TRUE, TRUE, 'AD_CARNE', 2),
				('PV_XBACON', 'Queijo Mussarela', TRUE, TRUE, 'AD_QUEIJO', 3),
				('PV_XBACON', 'Bacon', TRUE, TRUE, 'AD_BACON', 4),
				('PV_XBACON', 'Molho Especial', TRUE, FALSE, NULL::text, 5),
				('PV_XTUDO', 'Pao', TRUE, FALSE, NULL::text, 1),
				('PV_XTUDO', 'Hamburguer', TRUE, TRUE, 'AD_CARNE', 2),
				('PV_XTUDO', 'Queijo Mussarela', TRUE, TRUE, 'AD_QUEIJO', 3),
				('PV_XTUDO', 'Presunto', TRUE, TRUE, 'AD_PRESUNTO', 4),
				('PV_XTUDO', 'Ovo', TRUE, TRUE, 'AD_OVO', 5),
				('PV_XTUDO', 'Bacon', TRUE, TRUE, 'AD_BACON', 6),
				('PV_XTUDO', 'Molho Especial', TRUE, FALSE, NULL::text, 7),
				('PV_XFRANGO', 'Pao', TRUE, FALSE, NULL::text, 1),
				('PV_XFRANGO', 'Frango Empanado', TRUE, TRUE, NULL::text, 2),
				('PV_XFRANGO', 'Queijo Mussarela', TRUE, TRUE, 'AD_QUEIJO', 3),
				('PV_XFRANGO', 'Molho Especial', TRUE, FALSE, NULL::text, 4),
				('PV_BATATA', 'Batata Frita', FALSE, TRUE, NULL::text, 1),
				('PV_BATATA_CHEDDAR', 'Batata Frita', FALSE, TRUE, NULL::text, 1),
				('PV_BATATA_CHEDDAR', 'Cheddar Cremoso', FALSE, TRUE, 'AD_CHEDDAR', 2),
				('PV_BATATA_CHEDDAR', 'Bacon', FALSE, TRUE, 'AD_BACON', 3),
				('PV_REFRIG', 'Refrigerante Lata', FALSE, FALSE, NULL::text, 1),
				('PV_AGUA', 'Agua Mineral', FALSE, FALSE, NULL::text, 1),
				('PV_COMBO_XBURGER', 'X-Burger', TRUE, FALSE, NULL::text, 1),
				('PV_COMBO_XBURGER', 'Batata Frita', TRUE, FALSE, NULL::text, 2),
				('PV_COMBO_XBURGER', 'Refrigerante Lata', TRUE, FALSE, NULL::text, 3),
				('PV_MILKSHAKE', 'Milkshake', FALSE, FALSE, NULL::text, 1)
			) AS v(pv, nome, remover, adicionar, ad, ordem)
			JOIN padrao.produto_venda pv ON pv.codigo = v.pv
			LEFT JOIN padrao.adicional a ON a.codigo = v.ad
			ON CONFLICT (produto_venda_id, nome) DO NOTHING;

			-- ---------- pacote ----------
			INSERT INTO padrao.pacote (codigo, nome, descricao) VALUES
				('PAC_LANCHONETE', 'Lanchonete', 'Cadastros base para lanchonetes')
			ON CONFLICT (codigo) DO NOTHING;

			-- ---------- itens do pacote ----------
			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'marca', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.marca x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'produto_classificacao', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.produto_classificacao x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'insumo', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.insumo x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'adicional', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.adicional x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'custo_adicional_tipo', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.custo_adicional_tipo x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'produto_fabricado', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.produto_fabricado x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'receita_ingrediente', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.receita_ingrediente x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'produto_venda', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.produto_venda x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;

			INSERT INTO padrao.pacote_item (pacote_id, tipo, padrao_id, ordem)
			SELECT p.id, 'produto_venda_item', x.id, ROW_NUMBER() OVER (ORDER BY x.id)
			FROM padrao.pacote p CROSS JOIN padrao.produto_venda_item x
			WHERE p.codigo = 'PAC_LANCHONETE'
			ON CONFLICT DO NOTHING;
		`,
	},
	{
		Nome: "036_licenca_titulos_pagar_offline",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.licenca_titulos_pagar (
				id SERIAL PRIMARY KEY,
				empresa_id INTEGER NOT NULL DEFAULT 1,
				cliente VARCHAR(200) NOT NULL,
				cnpj VARCHAR(20),
				device VARCHAR(20),
				plano VARCHAR(30) NOT NULL DEFAULT 'full',
				key_id VARCHAR(40),
				token TEXT NOT NULL UNIQUE,
				emitido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				expira_em TIMESTAMPTZ,
				observacoes TEXT,
				revogado_em TIMESTAMPTZ,
				revogado_por INTEGER,
				motivo_revogacao TEXT,
				criado_por INTEGER,
				criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);

			CREATE INDEX IF NOT EXISTS idx_licenca_titulos_pagar_device
				ON public.licenca_titulos_pagar (device);
			CREATE INDEX IF NOT EXISTS idx_licenca_titulos_pagar_cnpj
				ON public.licenca_titulos_pagar (cnpj);
		`,
	},
	{
		Nome: "037_licenca_titulos_pagar_solicitacoes",
		SQLUp: `
			CREATE TABLE IF NOT EXISTS public.licenca_titulos_pagar_solicitacao (
				id SERIAL PRIMARY KEY,
				device VARCHAR(20) NOT NULL UNIQUE,
				segredo_hash VARCHAR(64) NOT NULL,
				cliente VARCHAR(200),
				cnpj VARCHAR(20),
				app_versao VARCHAR(40),
				plataforma VARCHAR(30),
				status VARCHAR(20) NOT NULL DEFAULT 'pendente'
					CHECK (status IN ('pendente', 'liberada', 'revogada')),
				token TEXT,
				licenca_id INTEGER REFERENCES public.licenca_titulos_pagar (id) ON DELETE SET NULL,
				observacoes TEXT,
				criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				ultimo_contato_em TIMESTAMPTZ,
				liberado_em TIMESTAMPTZ,
				liberado_por INTEGER,
				entregue_em TIMESTAMPTZ
			);

			CREATE INDEX IF NOT EXISTS idx_licenca_titulos_pagar_solicitacao_status
				ON public.licenca_titulos_pagar_solicitacao (status, ultimo_contato_em DESC);
		`,
	},
	{
		Nome: "038_licenca_titulos_pagar_solicitacao_pagamento",
		SQLUp: `
			ALTER TABLE public.licenca_titulos_pagar_solicitacao
				ADD COLUMN IF NOT EXISTS pix_chave VARCHAR(255),
				ADD COLUMN IF NOT EXISTS valor_centavos BIGINT,
				ADD COLUMN IF NOT EXISTS mensagem TEXT,
				ADD COLUMN IF NOT EXISTS comprovante_base64 TEXT,
				ADD COLUMN IF NOT EXISTS comprovante_nome VARCHAR(200),
				ADD COLUMN IF NOT EXISTS comprovante_tipo VARCHAR(60),
				ADD COLUMN IF NOT EXISTS comprovante_em TIMESTAMPTZ;
		`,
	},
}

func InitMigracoes(pool *pgxpool.Pool) error {
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS _migrations (
			nome VARCHAR(200) NOT NULL PRIMARY KEY,
			aplicada_em TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	aplicadas := make(map[string]bool)
	rows, err := pool.Query(context.Background(), "SELECT nome FROM _migrations")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var nome string
			if rows.Scan(&nome) == nil {
				aplicadas[nome] = true
			}
		}
	}

	for _, m := range Migracoes {
		if aplicadas[m.Nome] {
			continue
		}
		fmt.Printf("  ⏳ Aplicando migration: %s\n", m.Nome)
		if err := AplicarMigracao(pool, m.Nome); err != nil {
			fmt.Printf("  ⚠️  Erro ao aplicar migration %s: %v\n", m.Nome, err)
		} else {
			fmt.Printf("  ✅ Migration %s aplicada com sucesso\n", m.Nome)
		}
	}

	return nil
}

func MigracoesStatus(pool *pgxpool.Pool) ([]MigracaoStatus, error) {
	rows, err := pool.Query(context.Background(), "SELECT nome, aplicada_em FROM _migrations ORDER BY nome")
	if err != nil {
		return nil, fmt.Errorf("erro ao ler migrations: %w", err)
	}
	defer rows.Close()

	aplicadas := make(map[string]string)
	for rows.Next() {
		var nome string
		var aplicadaEm time.Time
		if err := rows.Scan(&nome, &aplicadaEm); err != nil {
			return nil, err
		}
		aplicadas[nome] = aplicadaEm.Format("02/01/2006 15:04:05")
	}

	result := make([]MigracaoStatus, len(Migracoes))
	for i, m := range Migracoes {
		result[i] = MigracaoStatus{Nome: m.Nome, Aplicada: false}
		if em, ok := aplicadas[m.Nome]; ok {
			result[i].Aplicada = true
			result[i].AplicadaEm = em
		}
	}
	return result, nil
}

func AplicarMigracao(pool *pgxpool.Pool, nome string) error {
	var m *Migracao
	for i := range Migracoes {
		if Migracoes[i].Nome == nome {
			m = &Migracoes[i]
			break
		}
	}
	if m == nil {
		return fmt.Errorf("migracao '%s' nao encontrada", nome)
	}

	tx, err := pool.Begin(context.Background())
	if err != nil {
		return fmt.Errorf("erro ao iniciar transacao: %w", err)
	}
	defer tx.Rollback(context.Background())

	if _, err := tx.Exec(context.Background(), m.SQLUp); err != nil {
		return fmt.Errorf("erro ao executar SQL: %w", err)
	}

	if _, err := tx.Exec(context.Background(), "INSERT INTO _migrations (nome) VALUES ($1)", nome); err != nil {
		return fmt.Errorf("erro ao registrar migracao: %w", err)
	}

	return tx.Commit(context.Background())
}
