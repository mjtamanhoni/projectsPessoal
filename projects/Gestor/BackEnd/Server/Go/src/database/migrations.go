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
	Nome      string `json:"nome"`
	Aplicada  bool   `json:"aplicada"`
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
}

func InitMigracoes(pool *pgxpool.Pool) error {
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS _migrations (
			nome VARCHAR(200) NOT NULL PRIMARY KEY,
			aplicada_em TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`)
	return err
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
