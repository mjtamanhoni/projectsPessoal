package handlers

import (
	"context"
	"fmt"
	"net/http"

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
		[]string{"nome", "unidade_medida", "custo_medio", "ativo"})
}

func (h *ProducaoHandler) InsumoExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "insumo")
}

// --- Compra Insumo ---
func (h *ProducaoHandler) CompraInsumoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	insumoID := parseInt(r.URL.Query().Get("insumo_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT ci.*, i.nome as insumo_nome
		FROM compra_insumo ci
		LEFT JOIN insumo i ON i.id = ci.insumo_id AND i.empresa_id = ci.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND ci.id = $%d", argN); argN++; args = append(args, id)
	}
	if insumoID > 0 {
		query += fmt.Sprintf(" AND ci.insumo_id = $%d", argN); argN++; args = append(args, insumoID)
	}
	if dataInicial != "" && dataFinal != "" {
		query += fmt.Sprintf(" AND ci.data_compra BETWEEN $%d::date AND $%d::date", argN, argN+1)
		argN += 2; args = append(args, dataInicial, dataFinal)
	}
	query += fmt.Sprintf(" AND (ci.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY ci.id"

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
		valorTotal := getFloat(item, "valor_total")
		valorUnitario := getFloat(item, "valor_unitario")
		dataCompra := getStr(item, "data_compra")
		observacao := getStr(item, "observacao")
		fornecedorID := getInt(item, "fornecedor_id")
		categoriaPagarID := getInt(item, "categoria_pagar_id")

		isNew := false
		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "compra_insumo")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO compra_insumo (id, empresa_id, insumo_id, quantidade,
					valor_total, valor_unitario, data_compra, observacao, usuario_id)
				VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9) RETURNING id`,
				id, empresaID, insumoID, quantidade, valorTotal, valorUnitario, dataCompra, observacao, usuarioID).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE compra_insumo SET insumo_id=$1, quantidade=$2,
					valor_total=$3, valor_unitario=$4, data_compra=$5::date, observacao=$6
				WHERE id=$7 AND empresa_id=$8`,
				insumoID, quantidade, valorTotal, valorUnitario, dataCompra, observacao, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Update inventory
		err = atualizarEstoqueInsumo(r.Context(), tx, insumoID, empresaID, quantidade, dataCompra, usuarioID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Recalculate average cost
		err = recalcularCustoMedio(r.Context(), tx, insumoID, empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Generate contas_pagar for new purchases
		if isNew && fornecedorID > 0 {
			var insumoNome string
			tx.QueryRow(r.Context(),
				`SELECT nome FROM insumo WHERE id = $1 AND empresa_id = $2`,
				insumoID, empresaID).Scan(&insumoNome)

			vencimento := dataCompra
			descricao := "Compra: " + insumoNome
			catID := categoriaPagarID
			config, errCfg := queryLancamentoConfig(r.Context(), h.Pool, empresaID, "compra_insumo")
			if errCfg == nil && config != nil {
				catID = config.CategoriaID
				descricao = buildDescricao(config.DescricaoTemplate, map[string]string{
					"{nome}": insumoNome,
				})
				if dataCompra != "" && config.DiasVencimento > 0 {
					tx.QueryRow(r.Context(),
						`SELECT ($1::date + $2::integer)::text`,
						dataCompra, config.DiasVencimento).Scan(&vencimento)
				}
			}

			if catID == 0 {
				continue
			}

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
				descricao, valorTotal, vencimento, catID, id).Scan(&ctID)
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
		`SELECT insumo_id, quantidade, data_compra FROM compra_insumo WHERE id = $1 AND empresa_id = $2`,
		id, empresaID).Scan(&insumoID, &quantidade, &dataCompra)
	if err != nil {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
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
		JOIN insumo i ON i.id = ri.insumo_id
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
			JOIN insumo i ON i.id = ri.insumo_id
			WHERE ri.produto_fabricado_id = $1
		`, produtoFabricadoID).Scan(&custoInsumos)
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
				WHERE ri.produto_fabricado_id = $1`, produtoFabricadoID)
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

	query := `SELECT vp.*, pf.nome as produto_nome, c.nome as cliente_nome
		FROM venda_produto vp
		LEFT JOIN produto_fabricado pf ON pf.id = vp.produto_fabricado_id AND pf.empresa_id = vp.empresa_id
		LEFT JOIN public.cliente c ON c.id = vp.cliente_id AND c.empresa_id = vp.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND vp.id = $%d", argN); argN++; args = append(args, id)
	}
	if produtoFabricadoID > 0 {
		query += fmt.Sprintf(" AND vp.produto_fabricado_id = $%d", argN); argN++; args = append(args, produtoFabricadoID)
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

		isNew := false
		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "venda_produto")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO venda_produto (id, empresa_id, produto_fabricado_id, cliente_id,
					usuario_id, quantidade, valor_unitario, valor_total, data_venda, observacao)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10) RETURNING id`,
				id, empresaID, produtoFabricadoID, clienteID, usuarioID,
				quantidade, valorUnitario, valorTotal, dataVenda, observacao).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE venda_produto SET produto_fabricado_id=$1,
					cliente_id=$2, quantidade=$3, valor_unitario=$4,
					valor_total=$5, data_venda=$6::date, observacao=$7
				WHERE id=$8 AND empresa_id=$9`,
				produtoFabricadoID, clienteID, quantidade, valorUnitario, valorTotal, dataVenda, observacao, id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if isNew {
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

			// Look up config for venda_produto
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

			// Update contas_receber_id on venda
			_, err = tx.Exec(r.Context(),
				`UPDATE venda_produto SET contas_receber_id = $1 WHERE id = $2`,
				crID, id)
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
	h.BasicCRUD.Excluir(w, r, "venda_produto")
}

// --- Fabricacao Custo Adicional ---
func (h *ProducaoHandler) FabricacaoCustoAdicionalListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	fabricacaoID := parseInt(r.URL.Query().Get("fabricacao_id"), 0)

	query := `SELECT fca.*, cat.nome as custo_adicional_nome
		FROM fabricacao_custo_adicional fca
		JOIN custo_adicional_tipo cat ON cat.id = fca.custo_adicional_tipo_id
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
	h.BasicCRUD.Salvar(w, r, "fabricacao_custo_adicional",
		[]string{"fabricacao_id", "custo_adicional_tipo_id", "valor"})
}

func (h *ProducaoHandler) FabricacaoCustoAdicionalExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "fabricacao_custo_adicional")
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

func recalcularCustoMedio(ctx context.Context, tx pgx.Tx, insumoID, empresaID int) error {
	_, err := tx.Exec(ctx, `
		UPDATE insumo i
		SET custo_medio = COALESCE((
			SELECT SUM(ci.valor_unitario * ci.quantidade) / NULLIF(SUM(ci.quantidade), 0)
			FROM compra_insumo ci
			WHERE ci.insumo_id = $1 AND ci.empresa_id = $2
		), 0)
		WHERE i.id = $1 AND i.empresa_id = $2
	`, insumoID, empresaID)
	return err
}
