package database

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TabelasEmpresa: tabelas cujo id é sequenciado por empresa (empresa_id).
var TabelasEmpresa = []string{
	"fornecedor", "cliente", "categoria_pagar", "categoria_receber",
	"servico", "usuario", "usuario_formulario", "empresa_modulo",
	"contas_pagar", "contas_receber", "horas_trabalhadas",
	"horas_abatidas", "horas_excedidas", "insumo", "produto_fabricado",
	"receita_ingrediente", "custo_adicional_tipo", "fabricacao_custo_adicional",
	"estoque_insumo", "estoque_produto_fabricado", "compra_insumo",
	"compra_insumo_item", "fabricacao", "venda_produto", "venda_produto_item",
	"usuario_formulario_permissao", "encomenda", "encomenda_item",
	"adicional", "encomenda_item_removido", "encomenda_item_adicional",
	"venda_produto_item_removido", "venda_produto_item_adicional",
	"produto_venda", "produto_venda_item", "marca",
	"perda_insumo", "perda_produto_fabricado", "uso_consumo",
	"produto_classificacao", "lancamento_automatico_config",
	"forma_pagamento", "condicao_pagamento",
}

// TabelasGlobais: tabelas com id global (empresa_id = 0).
var TabelasGlobais = []string{
	"formulario", "modulo", "modulo_formulario",
}

// GerarID gera o próximo id sequencial da tabela para a empresa.
//
// O incremento é atômico: a linha de empresa_sequences é bloqueada (row lock)
// até o commit da transação, portanto é seguro sob alta concorrência mesmo
// quando vários usuários gravam na mesma tabela ao mesmo tempo.
//
// Quando a linha ainda não existe (primeiro uso da tabela/empresa), o INSERT
// já cria a linha com MAX(id)+1 da tabela em uma única instrução atômica,
// eliminando a condição de corrida do fallback antigo (MAX(id)+1 fora do
// upsert) que podia gerar ids duplicados com requisições simultâneas.
func GerarID(ctx context.Context, tx pgx.Tx, empresaID int, tabela string) (int, error) {
	var nextID int
	err := tx.QueryRow(ctx, fmt.Sprintf(`
		INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
		VALUES ($1, $2, (SELECT COALESCE(MAX(id), 0) FROM %s WHERE empresa_id = $1) + 1)
		ON CONFLICT (empresa_id, tabela) DO UPDATE
		SET last_id = public.empresa_sequences.last_id + 1
		RETURNING last_id
	`, tabela), empresaID, tabela).Scan(&nextID)
	if err != nil {
		return 0, fmt.Errorf("gerar id para %s (empresa %d): %w", tabela, empresaID, err)
	}
	return nextID, nil
}

// GerarIDGlobal gera o próximo id sequencial de tabela global (empresa_id = 0).
func GerarIDGlobal(ctx context.Context, tx pgx.Tx, tabela string) (int, error) {
	var nextID int
	err := tx.QueryRow(ctx, fmt.Sprintf(`
		INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
		VALUES (0, $1, (SELECT COALESCE(MAX(id), 0) FROM %s) + 1)
		ON CONFLICT (empresa_id, tabela) DO UPDATE
		SET last_id = public.empresa_sequences.last_id + 1
		RETURNING last_id
	`, tabela), tabela).Scan(&nextID)
	if err != nil {
		return 0, fmt.Errorf("gerar id global para %s: %w", tabela, err)
	}
	return nextID, nil
}

// SeedSequences popula a tabela empresa_sequences com o MAX(id) atual de cada
// tabela, por empresa. Não diminui valores existentes (GREATEST). É chamada na
// inicialização do servidor para garantir que todas as tabelas/empresas
// estejam registradas antes do primeiro uso.
func SeedSequences(pool *pgxpool.Pool) {
	ctx := context.Background()

	empresaIDs := listEmpresaIDs(pool, ctx)
	if len(empresaIDs) == 0 {
		empresaIDs = []int{1}
	}

	seedEmpresa := func(eid int, tabela string) {
		_, err := pool.Exec(ctx, fmt.Sprintf(`
			INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
			VALUES ($1, $2, (SELECT COALESCE(MAX(id), 0) FROM %s WHERE empresa_id = $1))
			ON CONFLICT (empresa_id, tabela) DO UPDATE
			SET last_id = GREATEST(public.empresa_sequences.last_id, EXCLUDED.last_id)
		`, tabela), eid, tabela)
		if err != nil {
			log.Printf("[SeedSequences] empresa=%d tabela=%s: %v", eid, tabela, err)
		}
	}

	seedGlobal := func(tabela string) {
		_, err := pool.Exec(ctx, fmt.Sprintf(`
			INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
			VALUES (0, $1, (SELECT COALESCE(MAX(id), 0) FROM %s))
			ON CONFLICT (empresa_id, tabela) DO UPDATE
			SET last_id = GREATEST(public.empresa_sequences.last_id, EXCLUDED.last_id)
		`, tabela), tabela)
		if err != nil {
			log.Printf("[SeedSequences] tabela global %s: %v", tabela, err)
		}
	}

	for _, eid := range empresaIDs {
		for _, tabela := range TabelasEmpresa {
			seedEmpresa(eid, tabela)
		}
	}
	for _, tabela := range TabelasGlobais {
		seedGlobal(tabela)
	}
	log.Printf("[SeedSequences] %d tabela(s) x %d empresa(s) verificadas", len(TabelasEmpresa), len(empresaIDs))
}

func listEmpresaIDs(pool *pgxpool.Pool, ctx context.Context) []int {
	seen := map[int]bool{}
	var ids []int
	add := func(eid int) {
		if eid > 0 && !seen[eid] {
			seen[eid] = true
			ids = append(ids, eid)
		}
	}

	rows, err := pool.Query(ctx, `SELECT id FROM public.empresa ORDER BY id`)
	if err != nil {
		log.Printf("[SeedSequences] erro ao listar empresas: %v", err)
	} else {
		for rows.Next() {
			var eid int
			if err := rows.Scan(&eid); err == nil {
				add(eid)
			}
		}
		rows.Close()
	}

	rows, err = pool.Query(ctx, `SELECT DISTINCT empresa_id FROM public.usuario WHERE empresa_id IS NOT NULL ORDER BY empresa_id`)
	if err != nil {
		log.Printf("[SeedSequences] erro ao listar empresa_id de usuarios: %v", err)
	} else {
		for rows.Next() {
			var eid int
			if err := rows.Scan(&eid); err == nil {
				add(eid)
			}
		}
		rows.Close()
	}

	return ids
}