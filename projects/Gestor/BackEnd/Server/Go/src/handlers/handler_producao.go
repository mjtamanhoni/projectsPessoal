package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

type ProducaoHandler struct {
	Pool      *pgxpool.Pool
	BasicCRUD *BasicCRUD
}

// --- Insumo ---
func (h *ProducaoHandler) InsumoListar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Listar(w, r, "producao", "insumo", "", "", "")
}

func (h *ProducaoHandler) InsumoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "insumo",
		[]string{"nome", "unidade_medida", "custo_medio", "ativo", "id_fornecedor", "id_marca"})
}

func (h *ProducaoHandler) InsumoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "insumo")
}

func (h *ProducaoHandler) InsumoRecalcular(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			fmt.Printf("[PANIC] InsumoRecalcular: %v\n", rec)
			jsonError(w, fmt.Sprintf("Erro interno: %v", rec), http.StatusInternalServerError)
		}
	}()

	empresaID := middleware.GetEmpresaID(r)
	insumoID := parseInt(r.URL.Query().Get("id"), 0)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro ao iniciar transacao", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var ids []int
	if insumoID > 0 {
		var exists bool
		e := tx.QueryRow(r.Context(), `SELECT true FROM insumo WHERE id = $1 AND empresa_id = $2`, insumoID, empresaID).Scan(&exists)
		if e != nil || !exists {
			jsonError(w, "Insumo nao encontrado", http.StatusNotFound)
			return
		}
		ids = []int{insumoID}
	} else {
		rows, e := tx.Query(r.Context(), `SELECT id FROM insumo WHERE empresa_id = $1`, empresaID)
		if e != nil {
			jsonError(w, "Erro ao listar insumos: "+e.Error(), http.StatusInternalServerError)
			return
		}
		for rows.Next() {
			var id int
			rows.Scan(&id)
			ids = append(ids, id)
		}
		rows.Close()
	}

	for _, id := range ids {
		var totalComprado, totalConsumido, totalPerdido, custoMedio float64

		e := tx.QueryRow(r.Context(), `
			SELECT COALESCE(SUM(quantidade), 0) FROM compra_insumo_item
			WHERE insumo_id = $1 AND empresa_id = $2
		`, id, empresaID).Scan(&totalComprado)
		if e != nil {
			jsonError(w, "Erro ao calcular compras: "+e.Error(), http.StatusInternalServerError)
			return
		}

		e = tx.QueryRow(r.Context(), `
			SELECT COALESCE(SUM(COALESCE(ri.quantidade,0) * COALESCE(f.quantidade_produzida,0)), 0)
			FROM receita_ingrediente ri
			LEFT JOIN fabricacao f ON f.produto_fabricado_id = ri.produto_fabricado_id AND f.empresa_id = ri.empresa_id
			WHERE ri.insumo_id = $1 AND ri.empresa_id = $2
		`, id, empresaID).Scan(&totalConsumido)
		if e != nil {
			jsonError(w, "Erro ao calcular consumo: "+e.Error(), http.StatusInternalServerError)
			return
		}

		e = tx.QueryRow(r.Context(), `
			SELECT COALESCE(SUM(quantidade), 0) FROM perda_insumo
			WHERE insumo_id = $1 AND empresa_id = $2
		`, id, empresaID).Scan(&totalPerdido)
		if e != nil {
			jsonError(w, "Erro ao calcular perdas: "+e.Error(), http.StatusInternalServerError)
			return
		}

		e = tx.QueryRow(r.Context(), `
			SELECT CASE WHEN SUM(quantidade) > 0 THEN SUM(valor_unitario * quantidade) / SUM(quantidade) ELSE 0 END
			FROM compra_insumo_item
			WHERE insumo_id = $1 AND empresa_id = $2
		`, id, empresaID).Scan(&custoMedio)
		if e != nil {
			jsonError(w, "Erro ao calcular custo medio: "+e.Error(), http.StatusInternalServerError)
			return
		}

		estoque := totalComprado - totalConsumido - totalPerdido

		tag, e := tx.Exec(r.Context(), `
			UPDATE estoque_insumo SET quantidade = $1, data_atualizacao = CURRENT_DATE
			WHERE insumo_id = $2 AND empresa_id = $3
		`, estoque, id, empresaID)
		if e != nil {
			jsonError(w, "Erro ao atualizar estoque: "+e.Error(), http.StatusInternalServerError)
			return
		}
		if tag.RowsAffected() == 0 {
			estID, errGen := database.GerarID(r.Context(), tx, empresaID, "estoque_insumo")
			if errGen != nil {
				jsonError(w, "Erro ao gerar ID: "+errGen.Error(), http.StatusInternalServerError)
				return
			}
			_, e = tx.Exec(r.Context(), `
				INSERT INTO estoque_insumo (id, insumo_id, quantidade, data_atualizacao, empresa_id, usuario_id)
				VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
			`, estID, id, estoque, empresaID, middleware.GetUserID(r))
			if e != nil {
				jsonError(w, "Erro ao inserir estoque: "+e.Error(), http.StatusInternalServerError)
				return
			}
		}

		_, e = tx.Exec(r.Context(), `
			UPDATE insumo SET custo_medio = $1 WHERE id = $2 AND empresa_id = $3
		`, custoMedio, id, empresaID)
		if e != nil {
			jsonError(w, "Erro ao atualizar custo medio: "+e.Error(), http.StatusInternalServerError)
			return
		}
	}

	if cErr := tx.Commit(r.Context()); cErr != nil {
		jsonError(w, "Erro ao confirmar transacao: "+cErr.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Insumos recalculados com sucesso", "quantidade": len(ids)})
}

// --- Compra Insumo ---
func (h *ProducaoHandler) CompraInsumoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	insumoID := parseInt(r.URL.Query().Get("insumo_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	var query string
	var args []interface{}
	argN := 1

	if id > 0 {
		// Fetch all items for a specific purchase
		query = `SELECT ci.*, i.nome as insumo_nome, i.id_marca,
			f.nome as fornecedor_nome, m.nome as marca_nome,
			cii.insumo_id, cii.quantidade, cii.valor_unitario, cii.valor_total as item_valor_total,
			cii.id as item_id,
			CASE WHEN ci.status = 2 THEN true ELSE false END as pago
			FROM compra_insumo ci
			JOIN compra_insumo_item cii ON cii.compra_id = ci.id AND cii.empresa_id = ci.empresa_id
			LEFT JOIN insumo i ON i.id = cii.insumo_id AND i.empresa_id = cii.empresa_id
			LEFT JOIN fornecedor f ON f.id = ci.fornecedor_id AND f.empresa_id = ci.empresa_id
			LEFT JOIN marca m ON m.id = i.id_marca AND m.empresa_id = i.empresa_id
			WHERE 1=1`
		query += fmt.Sprintf(" AND ci.id = $%d", argN); argN++; args = append(args, id)
		query += fmt.Sprintf(" AND ci.empresa_id = $%d", argN); args = append(args, empresaID)
		query += " ORDER BY cii.id"
	} else {
		// Summary list: one row per purchase with header data and aggregates
		query = `SELECT ci.id, ci.empresa_id, ci.fornecedor_id, ci.data_compra,
			ci.valor_total, ci.observacao, ci.usuario_id, ci.status, ci.created_at,
			f.nome as fornecedor_nome,
			CASE WHEN ci.status = 2 THEN true ELSE false END as pago,
			COALESCE(agg.qtd_itens, 0) as qtd_itens
			FROM compra_insumo ci
			LEFT JOIN fornecedor f ON f.id = ci.fornecedor_id AND f.empresa_id = ci.empresa_id
			LEFT JOIN LATERAL (
				SELECT COUNT(*) as qtd_itens, SUM(ciia.valor_total) as total_valor
				FROM compra_insumo_item ciia
				WHERE ciia.compra_id = ci.id AND ciia.empresa_id = ci.empresa_id
			) agg ON true
			WHERE 1=1`
		if insumoID > 0 {
			query += ` AND EXISTS (SELECT 1 FROM compra_insumo_item cii3 WHERE cii3.compra_id = ci.id AND cii3.empresa_id = ci.empresa_id AND cii3.insumo_id = $` + fmt.Sprintf("%d", argN) + `)`
			argN++; args = append(args, insumoID)
		}
		if dataInicial != "" && dataFinal != "" {
			query += fmt.Sprintf(" AND ci.data_compra BETWEEN $%d::date AND $%d::date", argN, argN+1)
			argN += 2; args = append(args, dataInicial, dataFinal)
		}
		query += fmt.Sprintf(" AND (ci.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
		query += " ORDER BY ci.id"
	}

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) CompraInsumoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(items) == 0 {
		jsonError(w, "Dados não informados", http.StatusBadRequest)
		return
	}

	header := items[0]
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	id := getID(header)
	fornecedorID := getInt(header, "fornecedor_id")
	dataCompra := getStr(header, "data_compra")
	observacao := getStr(header, "observacao")
	pago := false
	if v, ok := header["pago"]; ok && v != nil {
		if b, ok := v.(bool); ok {
			pago = b
		}
	}
	status := 1
	if pago {
		status = 2
	}

	rawItens, ok := header["itens"]
	if !ok {
		jsonError(w, "itens não informados", http.StatusBadRequest)
		return
	}
	itensArr, ok := rawItens.([]interface{})
	if !ok {
		jsonError(w, "itens deve ser um array", http.StatusBadRequest)
		return
	}

	isNew := id == 0

	if isNew {
		id, err = database.GerarID(r.Context(), tx, empresaID, "compra_insumo")
		if err != nil {
			jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
			return
		}
		_, err = tx.Exec(r.Context(), `
			INSERT INTO compra_insumo (id, empresa_id, fornecedor_id,
				data_compra, valor_total, observacao, usuario_id, status)
			VALUES ($1,$2,$3,$4::date,0,$5,$6,$7)`,
			id, empresaID, fornecedorID, dataCompra, observacao, usuarioID, status)
	} else {
		_, err = tx.Exec(r.Context(), `
			UPDATE compra_insumo SET fornecedor_id=$1,
				data_compra=$2::date, observacao=$3, status=$4
			WHERE id=$5 AND empresa_id=$6`,
			fornecedorID, dataCompra, observacao, status, id, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Reverse old items from inventory before deleting
		oldRows, err := tx.Query(r.Context(),
			`SELECT insumo_id, quantidade FROM compra_insumo_item WHERE compra_id = $1 AND empresa_id = $2`,
			id, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		type oldItem struct {
			insumoID int
			quantidade float64
		}
		var oldItems []oldItem
		for oldRows.Next() {
			var o oldItem
			oldRows.Scan(&o.insumoID, &o.quantidade)
			oldItems = append(oldItems, o)
		}
		oldRows.Close()
		for _, o := range oldItems {
			err = atualizarEstoqueInsumo(r.Context(), tx, o.insumoID, empresaID, -o.quantidade, dataCompra, usuarioID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		_, err = tx.Exec(r.Context(),
			`DELETE FROM compra_insumo_item WHERE compra_id = $1 AND empresa_id = $2`,
			id, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	var totalValor float64
	for _, rawItem := range itensArr {
		item, ok := rawItem.(map[string]interface{})
		if !ok {
			continue
		}

		insumoID := getInt(item, "insumo_id")
		quantidade := getFloat(item, "quantidade")
		valorUnitario := getFloat(item, "valor_unitario")
		valorTotalItem := getFloat(item, "valor_total")

		itemID, err := database.GerarID(r.Context(), tx, empresaID, "compra_insumo_item")
		if err != nil {
			jsonError(w, "Erro ao gerar ID do item: "+err.Error(), http.StatusInternalServerError)
			return
		}
		_, err = tx.Exec(r.Context(), `
			INSERT INTO compra_insumo_item (id, empresa_id, compra_id, insumo_id,
				fornecedor_id, quantidade, valor_unitario, valor_total)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			itemID, empresaID, id, insumoID, fornecedorID, quantidade, valorUnitario, valorTotalItem)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		err = atualizarEstoqueInsumo(r.Context(), tx, insumoID, empresaID, quantidade, dataCompra, usuarioID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		err = recalcularCustoMedio(r.Context(), tx, insumoID, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		totalValor += valorTotalItem
	}

	// Update header's valor_total
	_, err = tx.Exec(r.Context(),
		`UPDATE compra_insumo SET valor_total = $1 WHERE id = $2 AND empresa_id = $3`,
		totalValor, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate contas_pagar for new purchases
	if isNew && fornecedorID > 0 {
		vencimento := dataCompra
		descricao := "Compra de insumos"
		var catID int
		config, errCfg := queryLancamentoConfig(r.Context(), h.Pool, empresaID, "compra_insumo")
		if errCfg == nil && config != nil {
			catID = config.CategoriaID
			descricao = buildDescricao(config.DescricaoTemplate, map[string]string{
				"{nome}": "insumos",
			})
			if dataCompra != "" && config.DiasVencimento > 0 {
				tx.QueryRow(r.Context(),
					`SELECT ($1::date + $2::integer)::text`,
					dataCompra, config.DiasVencimento).Scan(&vencimento)
			}
		}

		if catID > 0 {
			var ctID int
			ctID, err = database.GerarID(r.Context(), tx, empresaID, "contas_pagar")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO contas_pagar (id, empresa_id, usuario_id, fornecedor_id,
					descricao, valor, data_vencimento, id_categoria, pago, lancamento_origem_id)
				VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,false,$9)
				RETURNING id
			`, ctID, empresaID, usuarioID, fornecedorID,
				descricao, totalValor, vencimento, catID, id).Scan(&ctID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Compra de insumo salva com sucesso"})
}

func (h *ProducaoHandler) CompraInsumoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var insumoID int
	var quantidade float64
	var dataCompra string
	err = tx.QueryRow(r.Context(),
		`SELECT insumo_id, quantidade, data_compra FROM compra_insumo_item cii
		JOIN compra_insumo ci ON ci.id = cii.compra_id AND ci.empresa_id = cii.empresa_id
		WHERE cii.compra_id = $1 AND cii.empresa_id = $2 LIMIT 1`,
		id, empresaID).Scan(&insumoID, &quantidade, &dataCompra)
	if err != nil {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	_, err = tx.Exec(r.Context(),
		`DELETE FROM compra_insumo_item WHERE compra_id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM compra_insumo WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	usuarioID := middleware.GetUserID(r)
	err = atualizarEstoqueInsumo(r.Context(), tx, insumoID, empresaID, -quantidade, dataCompra, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = recalcularCustoMedio(r.Context(), tx, insumoID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Compra de insumo excluída com sucesso"})
}

// --- Produto Fabricado ---
func (h *ProducaoHandler) ProdutoFabricadoListar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Listar(w, r, "producao", "produto_fabricado", "", "", "")
}

func (h *ProducaoHandler) ProdutoFabricadoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "produto_fabricado",
		[]string{"nome", "descricao", "rendimento", "unidade_medida", "custo_unitario",
			"margem_lucro", "valor_venda_sugerido", "ativo"})
}

func (h *ProducaoHandler) ProdutoFabricadoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "produto_fabricado")
}

// --- Receita Ingrediente ---
func (h *ProducaoHandler) ReceitaIngredienteListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)

	query := `SELECT ri.*, i.nome as insumo_nome, i.ativo as insumo_ativo
		FROM receita_ingrediente ri
		JOIN insumo i ON i.id = ri.insumo_id AND i.empresa_id = ri.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND ri.produto_fabricado_id = $%d", argN); argN++; args = append(args, produtoFabricadoID)
	}
	query += fmt.Sprintf(" AND (ri.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY ri.id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) ReceitaIngredienteAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "receita_ingrediente",
		[]string{"produto_fabricado_id", "insumo_id", "quantidade"})
}

func (h *ProducaoHandler) ReceitaIngredienteExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "receita_ingrediente")
}

// --- Custo Adicional Tipo ---
func (h *ProducaoHandler) CustoAdicionalTipoListar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Listar(w, r, "producao", "custo_adicional_tipo", "", "", "")
}

func (h *ProducaoHandler) CustoAdicionalTipoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "custo_adicional_tipo",
		[]string{"nome", "ativo"})
}

func (h *ProducaoHandler) CustoAdicionalTipoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "custo_adicional_tipo")
}

// --- Fabricacao ---
func (h *ProducaoHandler) FabricacaoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT f.*, pf.nome as produto_nome
		FROM fabricacao f
		LEFT JOIN produto_fabricado pf ON pf.id = f.produto_fabricado_id AND pf.empresa_id = f.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND f.id = $%d", argN); argN++; args = append(args, id)
	}
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND f.produto_fabricado_id = $%d", argN); argN++; args = append(args, produtoFabricadoID)
	}
	if dataInicial != "" && dataFinal != "" {
		query += fmt.Sprintf(" AND f.data_fabricacao BETWEEN $%d::date AND $%d::date", argN, argN+1)
		argN += 2; args = append(args, dataInicial, dataFinal)
	}
	query += fmt.Sprintf(" AND f.empresa_id = $%d", argN); args = append(args, empresaID)
	query += " ORDER BY f.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) FabricacaoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		produtoFabricadoID := getInt(item, "produto_fabricado_id")
		quantidadeProduzida := getFloat(item, "quantidade_produzida")
		dataFabricacao := getStr(item, "data_fabricacao")
		observacao := getStr(item, "observacao")

		isNew := false

		// Calculate costs
		var custoInsumos float64
		err = tx.QueryRow(r.Context(), `
			SELECT COALESCE(SUM(ri.quantidade * i.custo_medio), 0)
			FROM receita_ingrediente ri
			JOIN insumo i ON i.id = ri.insumo_id AND i.empresa_id = ri.empresa_id
			WHERE ri.produto_fabricado_id = $1
			AND ri.empresa_id = $2
		`, produtoFabricadoID, empresaID).Scan(&custoInsumos)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Get custos adicionais for existing fabricacao
		var custoAdicionalTotal float64
		if id > 0 {
			tx.QueryRow(r.Context(),
				`SELECT COALESCE(SUM(valor), 0) FROM fabricacao_custo_adicional WHERE fabricacao_id = $1`,
				id).Scan(&custoAdicionalTotal)
		}

		custoTotal := custoInsumos + custoAdicionalTotal
		custoUnitario := 0.0
		if quantidadeProduzida > 0 {
			custoUnitario = custoTotal / quantidadeProduzida
		}

		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "fabricacao")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO fabricacao (id, empresa_id, produto_fabricado_id,
					quantidade_produzida, data_fabricacao, custo_insumos, custo_adicional_total,
					custo_total, custo_unitario, observacao, usuario_id)
				VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10,$11) RETURNING id`,
				id, empresaID, produtoFabricadoID, quantidadeProduzida, dataFabricacao,
				custoInsumos, custoAdicionalTotal, custoTotal, custoUnitario, observacao, usuarioID).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE fabricacao SET produto_fabricado_id=$1,
					quantidade_produzida=$2, data_fabricacao=$3::date,
					custo_insumos=$4, custo_adicional_total=$5,
					custo_total=$6, custo_unitario=$7, observacao=$8
				WHERE id=$9 AND empresa_id=$10`,
				produtoFabricadoID, quantidadeProduzida, dataFabricacao,
				custoInsumos, custoAdicionalTotal, custoTotal, custoUnitario, observacao, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if isNew {
			// Subtract ingredients from inventory
			ingRows, err := tx.Query(r.Context(),
				`SELECT ri.insumo_id, ri.quantidade
				FROM receita_ingrediente ri
				WHERE ri.produto_fabricado_id = $1
				AND ri.empresa_id = $2`, produtoFabricadoID, empresaID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}

			type ingItem struct {
				insumoID   int
				quantidade float64
			}
			var ingredientes []ingItem
			for ingRows.Next() {
				var item ingItem
				ingRows.Scan(&item.insumoID, &item.quantidade)
				ingredientes = append(ingredientes, item)
			}
			ingRows.Close()

			for _, item := range ingredientes {
				err = atualizarEstoqueInsumo(r.Context(), tx, item.insumoID, empresaID, -item.quantidade, dataFabricacao, usuarioID)
				if err != nil {
					jsonError(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}

			// Add finished product to inventory
			err = atualizarEstoqueProdutoFabricado(r.Context(), tx, produtoFabricadoID, empresaID, quantidadeProduzida, dataFabricacao, usuarioID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Fabricação salva com sucesso"})
}

func (h *ProducaoHandler) FabricacaoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "fabricacao")
}

// --- Venda Produto ---
func (h *ProducaoHandler) VendaProdutoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT vp.id, vp.empresa_id, vp.cliente_id, vp.data_venda,
			vp.observacao, vp.usuario_id, vp.status,
			vp.created_at,
			vpi.id as item_id, vpi.produto_fabricado_id,
			vpi.quantidade, vpi.valor_unitario, vpi.valor_total,
			pf.nome as produto_nome, c.nome as cliente_nome
		FROM venda_produto vp
		LEFT JOIN venda_produto_item vpi ON vpi.venda_id = vp.id AND vpi.empresa_id = vp.empresa_id
		LEFT JOIN produto_fabricado pf ON pf.id = vpi.produto_fabricado_id AND pf.empresa_id = vpi.empresa_id
		LEFT JOIN public.cliente c ON c.id = vp.cliente_id AND c.empresa_id = vp.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND vp.id = $%d", argN); argN++; args = append(args, id)
	}
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND vpi.produto_fabricado_id = $%d", argN); argN++; args = append(args, produtoFabricadoID)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND vp.cliente_id = $%d", argN); argN++; args = append(args, clienteID)
	}
	if dataInicial != "" && dataFinal != "" {
		query += fmt.Sprintf(" AND vp.data_venda BETWEEN $%d::date AND $%d::date", argN, argN+1)
		argN += 2; args = append(args, dataInicial, dataFinal)
	}
	query += fmt.Sprintf(" AND vp.empresa_id = $%d", argN); args = append(args, empresaID)
	query += " ORDER BY vp.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) VendaProdutoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		produtoFabricadoID := getInt(item, "produto_fabricado_id")
		clienteID := getInt(item, "cliente_id")
		quantidade := getFloat(item, "quantidade")
		valorUnitario := getFloat(item, "valor_unitario")
		valorTotal := getFloat(item, "valor_total")
		dataVenda := getStr(item, "data_venda")
		observacao := getStr(item, "observacao")
		categoriaReceberID := getInt(item, "categoria_receber_id")
		recebido := false
		if v, ok := item["recebido"]; ok && v != nil {
			if b, ok := v.(bool); ok {
				recebido = b
			}
		}

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, "venda_produto")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}

			_, err = tx.Exec(r.Context(), `
				INSERT INTO venda_produto (id, empresa_id, cliente_id,
					usuario_id, valor_total, data_venda, observacao)
				VALUES ($1,$2,$3,$4,$5,$6::date,$7)`,
				id, empresaID, clienteID, usuarioID,
				valorTotal, dataVenda, observacao)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}

			var itemID int
			itemID, err = database.GerarID(r.Context(), tx, empresaID, "venda_produto_item")
			if err != nil {
				jsonError(w, "Erro ao gerar ID do item: "+err.Error(), http.StatusInternalServerError)
				return
			}

			_, err = tx.Exec(r.Context(), `
				INSERT INTO venda_produto_item (id, empresa_id, venda_id,
					produto_fabricado_id, cliente_id, quantidade, valor_unitario, valor_total)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				itemID, empresaID, id, produtoFabricadoID, clienteID,
				quantidade, valorUnitario, valorTotal)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Remove from inventory
			err = atualizarEstoqueProdutoFabricado(r.Context(), tx, produtoFabricadoID, empresaID, -quantidade, dataVenda, usuarioID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Generate contas_receber
			var produtoNome string
			tx.QueryRow(r.Context(),
				`SELECT nome FROM produto_fabricado WHERE id = $1 AND empresa_id = $2`,
				produtoFabricadoID, empresaID).Scan(&produtoNome)

			vencimento := dataVenda
			descricao := fmt.Sprintf("Venda: %s x %.2f", produtoNome, quantidade)
			catID := categoriaReceberID
			config, errCfg := queryLancamentoConfig(r.Context(), h.Pool, empresaID, "venda_produto")
			if errCfg == nil && config != nil {
				catID = config.CategoriaID
				descricao = buildDescricao(config.DescricaoTemplate, map[string]string{
					"{nome}": produtoNome, "{quantidade}": fmt.Sprintf("%.2f", quantidade),
				})
				if dataVenda != "" && config.DiasVencimento > 0 {
					tx.QueryRow(r.Context(),
						`SELECT ($1::date + $2::integer)::text`,
						dataVenda, config.DiasVencimento).Scan(&vencimento)
				}
			}

			var crID int
			crID, err = database.GerarID(r.Context(), tx, empresaID, "contas_receber")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO contas_receber (id, empresa_id, usuario_id, cliente_id, descricao,
					valor, data_vencimento, recebido, lancamento_origem_id)
				VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9)
				RETURNING id
			`, crID, empresaID, usuarioID, clienteID,
				descricao, valorTotal, vencimento, recebido, id).Scan(&crID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}

			if catID > 0 {
				tx.Exec(r.Context(),
					`UPDATE contas_receber SET id_categoria = $1 WHERE id = $2`,
					catID, crID)
			}
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE venda_produto SET cliente_id=$1,
					valor_total=$2, data_venda=$3::date, observacao=$4
				WHERE id=$5 AND empresa_id=$6`,
				clienteID, valorTotal, dataVenda, observacao, id, empresaID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}

			_, err = tx.Exec(r.Context(), `
				UPDATE venda_produto_item SET produto_fabricado_id=$1,
					cliente_id=$2, quantidade=$3, valor_unitario=$4, valor_total=$5
				WHERE venda_id=$6 AND empresa_id=$7`,
				produtoFabricadoID, clienteID, quantidade, valorUnitario, valorTotal, id, empresaID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Venda salva com sucesso"})
}

func (h *ProducaoHandler) VendaProdutoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`DELETE FROM venda_produto_item WHERE venda_id = $1 AND empresa_id = $2`,
		id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM venda_produto WHERE id = $1 AND empresa_id = $2`,
		id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro excluído com sucesso"})
}

// --- Fabricacao Custo Adicional ---
func (h *ProducaoHandler) FabricacaoCustoAdicionalListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	fabricacaoID := parseInt(r.URL.Query().Get("fabricacao_id"), 0)

	query := `SELECT fca.*, cat.nome as custo_adicional_nome
		FROM fabricacao_custo_adicional fca
		JOIN custo_adicional_tipo cat ON cat.id = fca.custo_adicional_tipo_id AND cat.empresa_id = fca.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if fabricacaoID > 0 {
		query += fmt.Sprintf(" AND fca.fabricacao_id = $%d", argN); argN++; args = append(args, fabricacaoID)
	}
	query += fmt.Sprintf(" AND fca.empresa_id = $%d", argN); args = append(args, empresaID)
	query += " ORDER BY fca.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) FabricacaoCustoAdicionalAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		fabricacaoID := getInt(item, "fabricacao_id")
		custoAdicionalTipoID := getInt(item, "custo_adicional_tipo_id")
		valor := getFloat(item, "valor")

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, "fabricacao_custo_adicional")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			_, err = tx.Exec(r.Context(), `
				INSERT INTO fabricacao_custo_adicional (id, empresa_id, fabricacao_id, custo_adicional_tipo_id, valor)
				VALUES ($1,$2,$3,$4,$5)`,
				id, empresaID, fabricacaoID, custoAdicionalTipoID, valor)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE fabricacao_custo_adicional SET fabricacao_id=$1, custo_adicional_tipo_id=$2, valor=$3
				WHERE id=$4 AND empresa_id=$5`,
				fabricacaoID, custoAdicionalTipoID, valor, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		err = recalcularCustosFabricacao(r.Context(), tx, fabricacaoID, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Custo adicional salvo com sucesso"})
}

func (h *ProducaoHandler) FabricacaoCustoAdicionalExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var fabricacaoID int
	err = tx.QueryRow(r.Context(),
		`SELECT fabricacao_id FROM fabricacao_custo_adicional WHERE id = $1 AND empresa_id = $2`,
		id, empresaID).Scan(&fabricacaoID)
	if err != nil {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM fabricacao_custo_adicional WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	err = recalcularCustosFabricacao(r.Context(), tx, fabricacaoID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Custo adicional excluído com sucesso"})
}

// --- Estoque Insumo ---
func (h *ProducaoHandler) EstoqueInsumoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	query := `SELECT ei.*, i.nome as insumo_nome, i.unidade_medida
		FROM estoque_insumo ei
		JOIN insumo i ON i.id = ei.insumo_id AND i.empresa_id = ei.empresa_id
		WHERE (ei.empresa_id = $1 OR $1 = 0)
		ORDER BY ei.id`
	rows, err := h.Pool.Query(r.Context(), query, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) EstoqueInsumoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "estoque_insumo",
		[]string{"insumo_id", "quantidade", "data_atualizacao", "observacao", "usuario_id"})
}

func (h *ProducaoHandler) EstoqueInsumoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "estoque_insumo")
}

// --- Estoque Produto Fabricado ---
func (h *ProducaoHandler) EstoqueProdutoFabricadoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	query := `SELECT epf.*, pf.nome as produto_nome, pf.unidade_medida
		FROM estoque_produto_fabricado epf
		JOIN produto_fabricado pf ON pf.id = epf.produto_fabricado_id AND pf.empresa_id = epf.empresa_id
		WHERE (epf.empresa_id = $1 OR $1 = 0)
		ORDER BY epf.id`
	rows, err := h.Pool.Query(r.Context(), query, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) EstoqueProdutoFabricadoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "estoque_produto_fabricado",
		[]string{"produto_fabricado_id", "quantidade", "data_atualizacao", "observacao", "usuario_id"})
}

func (h *ProducaoHandler) EstoqueProdutoFabricadoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "estoque_produto_fabricado")
}

// --- Perda Insumo ---
func (h *ProducaoHandler) PerdaInsumoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	insumoID := parseInt(r.URL.Query().Get("insumo_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT pi.*, i.nome as insumo_nome
		FROM perda_insumo pi
		LEFT JOIN insumo i ON i.id = pi.insumo_id AND i.empresa_id = pi.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND pi.id = $%d", argN); argN++; args = append(args, id)
	}
	if insumoID > 0 {
		query += fmt.Sprintf(" AND pi.insumo_id = $%d", argN); argN++; args = append(args, insumoID)
	}
	if dataInicial != "" && dataFinal != "" {
		query += fmt.Sprintf(" AND pi.data_perda BETWEEN $%d::date AND $%d::date", argN, argN+1)
		argN += 2; args = append(args, dataInicial, dataFinal)
	}
	query += fmt.Sprintf(" AND (pi.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY pi.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) PerdaInsumoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		insumoID := getInt(item, "insumo_id")
		quantidade := getFloat(item, "quantidade")
		dataPerda := getStr(item, "data_perda")
		motivo := getStr(item, "motivo")

		isNew := false
		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "perda_insumo")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO perda_insumo (id, empresa_id, insumo_id, quantidade, data_perda, motivo, usuario_id)
				VALUES ($1,$2,$3,$4,$5::date,$6,$7) RETURNING id`,
				id, empresaID, insumoID, quantidade, dataPerda, motivo, usuarioID).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE perda_insumo SET insumo_id=$1, quantidade=$2, data_perda=$3::date, motivo=$4
				WHERE id=$5 AND empresa_id=$6`,
				insumoID, quantidade, dataPerda, motivo, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if isNew {
			err = atualizarEstoqueInsumo(r.Context(), tx, insumoID, empresaID, -quantidade, dataPerda, usuarioID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Perda de insumo salva com sucesso"})
}

func (h *ProducaoHandler) PerdaInsumoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var insumoID int
	var quantidade float64
	var dataPerda string
	err = tx.QueryRow(r.Context(),
		`SELECT insumo_id, quantidade, data_perda FROM perda_insumo WHERE id = $1 AND empresa_id = $2`,
		id, empresaID).Scan(&insumoID, &quantidade, &dataPerda)
	if err != nil {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM perda_insumo WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	usuarioID := middleware.GetUserID(r)
	err = atualizarEstoqueInsumo(r.Context(), tx, insumoID, empresaID, quantidade, dataPerda, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Perda de insumo excluída com sucesso"})
}

// --- Perda Produto Fabricado ---
func (h *ProducaoHandler) PerdaProdutoFabricadoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT ppf.*, pf.nome as produto_nome
		FROM perda_produto_fabricado ppf
		LEFT JOIN produto_fabricado pf ON pf.id = ppf.produto_fabricado_id AND pf.empresa_id = ppf.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND ppf.id = $%d", argN); argN++; args = append(args, id)
	}
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND ppf.produto_fabricado_id = $%d", argN); argN++; args = append(args, produtoFabricadoID)
	}
	if dataInicial != "" && dataFinal != "" {
		query += fmt.Sprintf(" AND ppf.data_perda BETWEEN $%d::date AND $%d::date", argN, argN+1)
		argN += 2; args = append(args, dataInicial, dataFinal)
	}
	query += fmt.Sprintf(" AND (ppf.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY ppf.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) PerdaProdutoFabricadoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		produtoFabricadoID := getInt(item, "produto_fabricado_id")
		quantidade := getFloat(item, "quantidade")
		dataPerda := getStr(item, "data_perda")
		motivo := getStr(item, "motivo")

		isNew := false
		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "perda_produto_fabricado")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO perda_produto_fabricado (id, empresa_id, produto_fabricado_id, quantidade, data_perda, motivo, usuario_id)
				VALUES ($1,$2,$3,$4,$5::date,$6,$7) RETURNING id`,
				id, empresaID, produtoFabricadoID, quantidade, dataPerda, motivo, usuarioID).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE perda_produto_fabricado SET produto_fabricado_id=$1, quantidade=$2, data_perda=$3::date, motivo=$4
				WHERE id=$5 AND empresa_id=$6`,
				produtoFabricadoID, quantidade, dataPerda, motivo, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if isNew {
			err = atualizarEstoqueProdutoFabricado(r.Context(), tx, produtoFabricadoID, empresaID, -quantidade, dataPerda, usuarioID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Perda de produto salva com sucesso"})
}

func (h *ProducaoHandler) PerdaProdutoFabricadoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var produtoFabricadoID int
	var quantidade float64
	var dataPerda string
	err = tx.QueryRow(r.Context(),
		`SELECT produto_fabricado_id, quantidade, data_perda FROM perda_produto_fabricado WHERE id = $1 AND empresa_id = $2`,
		id, empresaID).Scan(&produtoFabricadoID, &quantidade, &dataPerda)
	if err != nil {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM perda_produto_fabricado WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	usuarioID := middleware.GetUserID(r)
	err = atualizarEstoqueProdutoFabricado(r.Context(), tx, produtoFabricadoID, empresaID, quantidade, dataPerda, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Perda de produto excluída com sucesso"})
}

// --- Uso Consumo ---
func (h *ProducaoHandler) UsoConsumoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	produtoFabricadoID := parseInt(r.URL.Query().Get("produto_fabricado_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT uc.*, pf.nome as produto_nome
		FROM uso_consumo uc
		LEFT JOIN produto_fabricado pf ON pf.id = uc.produto_fabricado_id AND pf.empresa_id = uc.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND uc.id = $%d", argN); argN++; args = append(args, id)
	}
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND uc.produto_fabricado_id = $%d", argN); argN++; args = append(args, produtoFabricadoID)
	}
	if dataInicial != "" && dataFinal != "" {
		query += fmt.Sprintf(" AND uc.data_uso BETWEEN $%d::date AND $%d::date", argN, argN+1)
		argN += 2; args = append(args, dataInicial, dataFinal)
	}
	query += fmt.Sprintf(" AND (uc.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY uc.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) UsoConsumoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		produtoFabricadoID := getInt(item, "produto_fabricado_id")
		quantidade := getFloat(item, "quantidade")
		dataUso := getStr(item, "data_uso")
		motivo := getStr(item, "motivo")

		isNew := false
		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "uso_consumo")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO uso_consumo (id, empresa_id, produto_fabricado_id, quantidade, data_uso, motivo, usuario_id)
				VALUES ($1,$2,$3,$4,$5::date,$6,$7) RETURNING id`,
				id, empresaID, produtoFabricadoID, quantidade, dataUso, motivo, usuarioID).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE uso_consumo SET produto_fabricado_id=$1, quantidade=$2, data_uso=$3::date, motivo=$4
				WHERE id=$5 AND empresa_id=$6`,
				produtoFabricadoID, quantidade, dataUso, motivo, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if isNew {
			err = atualizarEstoqueProdutoFabricado(r.Context(), tx, produtoFabricadoID, empresaID, -quantidade, dataUso, usuarioID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Uso/consumo salvo com sucesso"})
}

func (h *ProducaoHandler) UsoConsumoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var produtoFabricadoID int
	var quantidade float64
	var dataUso string
	err = tx.QueryRow(r.Context(),
		`SELECT produto_fabricado_id, quantidade, data_uso FROM uso_consumo WHERE id = $1 AND empresa_id = $2`,
		id, empresaID).Scan(&produtoFabricadoID, &quantidade, &dataUso)
	if err != nil {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM uso_consumo WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}

	usuarioID := middleware.GetUserID(r)
	err = atualizarEstoqueProdutoFabricado(r.Context(), tx, produtoFabricadoID, empresaID, quantidade, dataUso, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Uso/consumo excluído com sucesso"})
}

// Internal helpers
func atualizarEstoqueInsumo(ctx context.Context, tx pgx.Tx, insumoID, empresaID int, delta float64, dataAtualizacao string, usuarioID int) error {
	tag, err := tx.Exec(ctx, `
		UPDATE estoque_insumo
		SET quantidade = quantidade + $1, data_atualizacao = $2::date
		WHERE insumo_id = $3 AND empresa_id = $4
	`, delta, dataAtualizacao, insumoID, empresaID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		estID, errGen := database.GerarID(ctx, tx, empresaID, "estoque_insumo")
		if errGen != nil {
			return errGen
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO estoque_insumo (id, insumo_id, quantidade, data_atualizacao, empresa_id, usuario_id)
			VALUES ($1, $2, $3, $4::date, $5, $6)
		`, estID, insumoID, delta, dataAtualizacao, empresaID, usuarioID)
	}
	return err
}

func atualizarEstoqueProdutoFabricado(ctx context.Context, tx pgx.Tx, produtoFabricadoID, empresaID int, delta float64, dataAtualizacao string, usuarioID int) error {
	tag, err := tx.Exec(ctx, `
		UPDATE estoque_produto_fabricado
		SET quantidade = quantidade + $1, data_atualizacao = $2::date
		WHERE produto_fabricado_id = $3 AND empresa_id = $4
	`, delta, dataAtualizacao, produtoFabricadoID, empresaID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		estID, errGen := database.GerarID(ctx, tx, empresaID, "estoque_produto_fabricado")
		if errGen != nil {
			return errGen
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO estoque_produto_fabricado (id, produto_fabricado_id, quantidade, data_atualizacao, empresa_id, usuario_id)
			VALUES ($1, $2, $3, $4::date, $5, $6)
		`, estID, produtoFabricadoID, delta, dataAtualizacao, empresaID, usuarioID)
	}
	return err
}

// --- Lancamento Automatico Config ---
func (h *ProducaoHandler) LancamentoAutomaticoConfigListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	query := `SELECT * FROM lancamento_automatico_config WHERE 1=1`
	var args []interface{}
	argN := 1

	tipoOrigem := r.URL.Query().Get("tipo_origem")
	if tipoOrigem != "" {
		query += fmt.Sprintf(" AND tipo_origem = $%d", argN); argN++; args = append(args, tipoOrigem)
	}
	tipoLancamento := r.URL.Query().Get("tipo_lancamento")
	if tipoLancamento != "" {
		query += fmt.Sprintf(" AND tipo_lancamento = $%d", argN); argN++; args = append(args, tipoLancamento)
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *ProducaoHandler) LancamentoAutomaticoConfigSalvar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Salvar(w, r, "lancamento_automatico_config",
		[]string{"tipo_origem", "tipo_lancamento", "categoria_id", "dias_vencimento", "descricao_template", "ativo", "usuario_id"})
}

func (h *ProducaoHandler) LancamentoAutomaticoConfigExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "lancamento_automatico_config")
}

func recalcularCustosFabricacao(ctx context.Context, tx pgx.Tx, fabricacaoID, empresaID int) error {
	var custoAdicionalTotal float64
	err := tx.QueryRow(ctx,
		`SELECT COALESCE(SUM(valor), 0) FROM fabricacao_custo_adicional WHERE fabricacao_id = $1`,
		fabricacaoID).Scan(&custoAdicionalTotal)
	if err != nil {
		return err
	}

	var custoInsumos, quantidadeProduzida float64
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(custo_insumos, 0), COALESCE(quantidade_produzida, 0)
		FROM fabricacao WHERE id = $1 AND empresa_id = $2`,
		fabricacaoID, empresaID).Scan(&custoInsumos, &quantidadeProduzida)
	if err != nil {
		return err
	}

	custoTotal := custoInsumos + custoAdicionalTotal
	custoUnitario := 0.0
	if quantidadeProduzida > 0 {
		custoUnitario = custoTotal / quantidadeProduzida
	}

	_, err = tx.Exec(ctx, `
		UPDATE fabricacao
		SET custo_adicional_total = $1, custo_total = $2, custo_unitario = $3
		WHERE id = $4 AND empresa_id = $5`,
		custoAdicionalTotal, custoTotal, custoUnitario, fabricacaoID, empresaID)
	return err
}

func recalcularCustoMedio(ctx context.Context, tx pgx.Tx, insumoID, empresaID int) error {
	_, err := tx.Exec(ctx, `
		UPDATE insumo i
		SET custo_medio = COALESCE((
			SELECT SUM(cii.valor_unitario * cii.quantidade) / NULLIF(SUM(cii.quantidade), 0)
			FROM compra_insumo_item cii
			WHERE cii.insumo_id = $1 AND cii.empresa_id = $2
		), 0)
		WHERE i.id = $1 AND i.empresa_id = $2
	`, insumoID, empresaID)
	return err
}

func (h *ProducaoHandler) ProducaoDashboardListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	now := time.Now()
	anoStr := r.URL.Query().Get("ano")
	mesStr := r.URL.Query().Get("mes")

	ano := now.Year()
	mes := int(now.Month())

	if anoStr != "" {
		if a, err := strconv.Atoi(anoStr); err == nil && a > 0 {
			ano = a
		}
	}
	if mesStr != "" {
		if m, err := strconv.Atoi(mesStr); err == nil && m >= 1 && m <= 12 {
			mes = m
		}
	}

	var totalVendas, qtdVendida, qtdVendas float64
	err := h.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(vp.valor_total), 0),
			COALESCE(SUM(COALESCE(vpi.qtd_total, 0)), 0),
			COALESCE(COUNT(DISTINCT vp.id), 0)
		FROM venda_produto vp
		LEFT JOIN LATERAL (
			SELECT SUM(vpi2.quantidade) as qtd_total
			FROM venda_produto_item vpi2
			WHERE vpi2.venda_id = vp.id AND vpi2.empresa_id = vp.empresa_id
		) vpi ON true
		WHERE vp.empresa_id = $1
			AND EXTRACT(YEAR FROM vp.data_venda) = $2
			AND EXTRACT(MONTH FROM vp.data_venda) = $3
	`, empresaID, ano, mes).Scan(&totalVendas, &qtdVendida, &qtdVendas)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var totalCompras, qtdCompras float64
	err = h.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(ci.valor_total), 0),
			COALESCE(COUNT(DISTINCT ci.id), 0)
		FROM compra_insumo ci
		WHERE ci.empresa_id = $1
			AND EXTRACT(YEAR FROM ci.data_compra) = $2
			AND EXTRACT(MONTH FROM ci.data_compra) = $3
	`, empresaID, ano, mes).Scan(&totalCompras, &qtdCompras)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var qtdFabricada, custoTotal, qtdFabricacoes float64
	err = h.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(f.quantidade_produzida), 0),
			COALESCE(SUM(f.custo_total), 0),
			COALESCE(COUNT(DISTINCT f.id), 0)
		FROM fabricacao f
		WHERE f.empresa_id = $1
			AND EXTRACT(YEAR FROM f.data_fabricacao) = $2
			AND EXTRACT(MONTH FROM f.data_fabricacao) = $3
	`, empresaID, ano, mes).Scan(&qtdFabricada, &custoTotal, &qtdFabricacoes)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	mensalVendasRows, err := h.Pool.Query(r.Context(), `
		SELECT EXTRACT(MONTH FROM vp.data_venda) AS mes,
			SUM(vp.valor_total) AS valor,
			SUM(COALESCE(vpi.qtd_total, 0)) AS qtd,
			COUNT(DISTINCT vp.id) AS qtd_vendas
		FROM venda_produto vp
		LEFT JOIN LATERAL (
			SELECT SUM(vpi2.quantidade) as qtd_total
			FROM venda_produto_item vpi2
			WHERE vpi2.venda_id = vp.id AND vpi2.empresa_id = vp.empresa_id
		) vpi ON true
		WHERE vp.empresa_id = $1 AND EXTRACT(YEAR FROM vp.data_venda) = $2
		GROUP BY EXTRACT(MONTH FROM vp.data_venda) ORDER BY mes
	`, empresaID, ano)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	mensalVendas := rowsToMap(mensalVendasRows)

	mensalComprasRows, err := h.Pool.Query(r.Context(), `
		SELECT EXTRACT(MONTH FROM ci.data_compra) AS mes,
			SUM(ci.valor_total) AS valor,
			COUNT(DISTINCT ci.id) AS qtd
		FROM compra_insumo ci
		WHERE ci.empresa_id = $1 AND EXTRACT(YEAR FROM ci.data_compra) = $2
		GROUP BY EXTRACT(MONTH FROM ci.data_compra) ORDER BY mes
	`, empresaID, ano)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	mensalCompras := rowsToMap(mensalComprasRows)

	mensalFabricacaoRows, err := h.Pool.Query(r.Context(), `
		SELECT EXTRACT(MONTH FROM f.data_fabricacao) AS mes,
			SUM(f.quantidade_produzida) AS qtd_fabricada,
			SUM(f.custo_total) AS custo_total,
			COUNT(DISTINCT f.id) AS qtd
		FROM fabricacao f
		WHERE f.empresa_id = $1 AND EXTRACT(YEAR FROM f.data_fabricacao) = $2
		GROUP BY EXTRACT(MONTH FROM f.data_fabricacao) ORDER BY mes
	`, empresaID, ano)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	mensalFabricacao := rowsToMap(mensalFabricacaoRows)

	diarioFabricacaoRows, err := h.Pool.Query(r.Context(), `
		SELECT f.data_fabricacao AS dia,
			SUM(f.quantidade_produzida) AS qtd_fabricada
		FROM fabricacao f
		WHERE f.empresa_id = $1
			AND EXTRACT(YEAR FROM f.data_fabricacao) = $2
			AND EXTRACT(MONTH FROM f.data_fabricacao) = $3
		GROUP BY f.data_fabricacao ORDER BY f.data_fabricacao
	`, empresaID, ano, mes)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	diarioFabricacao := rowsToMap(diarioFabricacaoRows)

	diarioVendasRows, err := h.Pool.Query(r.Context(), `
		SELECT vp.data_venda AS dia,
			SUM(vp.valor_total) AS valor
		FROM venda_produto vp
		WHERE vp.empresa_id = $1
			AND EXTRACT(YEAR FROM vp.data_venda) = $2
			AND EXTRACT(MONTH FROM vp.data_venda) = $3
		GROUP BY vp.data_venda ORDER BY vp.data_venda
	`, empresaID, ano, mes)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	diarioVendas := rowsToMap(diarioVendasRows)

	kpis := map[string]interface{}{
		"total_vendas":    totalVendas,
		"qtd_vendida":     qtdVendida,
		"qtd_vendas":      qtdVendas,
		"total_compras":   totalCompras,
		"qtd_compras":     qtdCompras,
		"qtd_fabricada":   qtdFabricada,
		"custo_total":     custoTotal,
		"qtd_fabricacoes": qtdFabricacoes,
		"lucro_bruto":     totalVendas - custoTotal,
		"lucro_liquido":   totalVendas - totalCompras - custoTotal,
	}

	result := map[string]interface{}{
		"kpis":              kpis,
		"mensal_vendas":     mensalVendas,
		"mensal_compras":    mensalCompras,
		"mensal_fabricacao": mensalFabricacao,
		"diario_fabricacao":  diarioFabricacao,
		"diario_vendas":     diarioVendas,
	}
	jsonSuccess(w, result)
}
