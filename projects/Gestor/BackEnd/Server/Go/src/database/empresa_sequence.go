package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func GerarID(ctx context.Context, tx pgx.Tx, empresaID int, tabela string) (int, error) {
	var nextID int
	err := tx.QueryRow(ctx, `
		INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
		VALUES ($1, $2, 0)
		ON CONFLICT (empresa_id, tabela) DO UPDATE
		SET last_id = public.empresa_sequences.last_id + 1
		RETURNING last_id
	`, empresaID, tabela).Scan(&nextID)
	if err != nil {
		return 0, err
	}
	if nextID == 0 {
		err = tx.QueryRow(ctx,
			fmt.Sprintf("SELECT COALESCE((SELECT id FROM %s WHERE empresa_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE), 0)", tabela),
			empresaID).Scan(&nextID)
		if err != nil {
			return 0, err
		}
		nextID++
		_, err = tx.Exec(ctx, `
			UPDATE public.empresa_sequences
			SET last_id = $3
			WHERE empresa_id = $1 AND tabela = $2
		`, empresaID, tabela, nextID)
		if err != nil {
			return 0, err
		}
	}
	return nextID, nil
}

func GerarIDGlobal(ctx context.Context, tx pgx.Tx, tabela string) (int, error) {
	var nextID int
	err := tx.QueryRow(ctx, `
		INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
		VALUES (0, $1, 0)
		ON CONFLICT (empresa_id, tabela) DO UPDATE
		SET last_id = public.empresa_sequences.last_id + 1
		RETURNING last_id
	`, tabela).Scan(&nextID)
	if err != nil {
		return 0, err
	}
	if nextID == 0 {
		err = tx.QueryRow(ctx,
			fmt.Sprintf("SELECT COALESCE((SELECT id FROM %s ORDER BY id DESC LIMIT 1 FOR UPDATE), 0)", tabela)).Scan(&nextID)
		if err != nil {
			return 0, err
		}
		nextID++
		_, err = tx.Exec(ctx, `
			UPDATE public.empresa_sequences
			SET last_id = $2
			WHERE empresa_id = 0 AND tabela = $1
		`, tabela, nextID)
		if err != nil {
			return 0, err
		}
	}
	return nextID, nil
}
