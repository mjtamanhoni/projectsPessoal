package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/config"
)

var Pool *pgxpool.Pool

func Connect(cfg *config.Config) error {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName,
	)

	var err error
	Pool, err = NewPoolWithTracer(dsn)
	if err != nil {
		return fmt.Errorf("unable to connect to database: %w", err)
	}

	if err := Pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %w", err)
	}

	Pool.Exec(context.Background(), `DROP TABLE IF EXISTS public.empresa_sequences`)
	_, err = Pool.Exec(context.Background(), `
		CREATE TABLE public.empresa_sequences (
			empresa_id INTEGER NOT NULL,
			tabela VARCHAR(100) NOT NULL,
			last_id INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (empresa_id, tabela)
		)
	`)
	if err != nil {
		return fmt.Errorf("unable to create empresa_sequences table: %w", err)
	}

	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
	}
}
