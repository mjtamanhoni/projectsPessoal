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
