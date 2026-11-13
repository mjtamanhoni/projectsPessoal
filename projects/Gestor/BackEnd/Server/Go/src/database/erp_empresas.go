package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func SyncErpEmpresas(pool *pgxpool.Pool) error {
	ctx := context.Background()

	var hasErp, hasPublic bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('erp.empresa') IS NOT NULL`).Scan(&hasErp); err != nil {
		return err
	}
	if !hasErp {
		return nil
	}
	if err := pool.QueryRow(ctx, `SELECT to_regclass('public.empresa') IS NOT NULL`).Scan(&hasPublic); err != nil {
		return err
	}
	if !hasPublic {
		return nil
	}

	_, err := pool.Exec(ctx, `
		WITH src AS (
			SELECT
				p.*,
				regexp_replace(COALESCE(p.cnpj_cpf, ''), '\D', '', 'g') AS digits,
				row_number() OVER (
					PARTITION BY regexp_replace(COALESCE(p.cnpj_cpf, ''), '\D', '', 'g')
					ORDER BY p.id
				) AS doc_rank
			FROM public.empresa p
		)
		INSERT INTO erp.empresa
			(id, razao_social, nome_fantasia, tipo_documento, documento,
			 inscricao_estadual, regime_tributario, email, telefone, status)
		SELECT
			p.id,
			COALESCE(NULLIF(btrim(p.razao_social), ''), 'Empresa ' || p.id),
			p.fantasia,
			CASE
				WHEN length(p.digits) = 14 THEN 'CNPJ'
				WHEN length(p.digits) = 11 THEN 'CPF'
				ELSE 'OUTRO'
			END,
			CASE
				WHEN length(p.digits) IN (11, 14) AND p.doc_rank = 1
				 AND NOT EXISTS (
					SELECT 1 FROM erp.empresa e
					WHERE e.documento = p.digits AND e.id <> p.id
				 )
				THEN p.digits
				ELSE 'SEMDOC' || p.id
			END,
			p.inscricao_estadual_identidade,
			CASE
				WHEN lower(COALESCE(p.regime_tributario, '')) LIKE '%mei%' THEN 4
				WHEN lower(COALESCE(p.regime_tributario, '')) LIKE '%simples%' THEN 1
				ELSE 3
			END,
			p.email,
			COALESCE(NULLIF(btrim(p.celular), ''), p.telefone),
			COALESCE(p.status, 1)
		FROM src p
		ON CONFLICT (id) DO UPDATE SET
			razao_social = EXCLUDED.razao_social,
			nome_fantasia = EXCLUDED.nome_fantasia,
			tipo_documento = EXCLUDED.tipo_documento,
			documento = EXCLUDED.documento,
			inscricao_estadual = EXCLUDED.inscricao_estadual,
			regime_tributario = EXCLUDED.regime_tributario,
			email = EXCLUDED.email,
			telefone = EXCLUDED.telefone,
			status = EXCLUDED.status
	`)
	return err
}
