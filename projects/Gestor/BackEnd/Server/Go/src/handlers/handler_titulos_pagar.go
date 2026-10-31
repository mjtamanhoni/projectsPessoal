package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"

	"gestor-server/database"
	"gestor-server/middleware"
)

// --- Titulos a Pagar ---

func (h *FinanceiroHandler) TitulosPagarListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	status := r.URL.Query().Get("status")
	credor := r.URL.Query().Get("credor")
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT empresa_id, id, usuario_id, credor, descricao, numero_documento,
		valor_total::float8 AS valor_total, data_emissao, data_vencimento, status::text AS status,
		total_pago::float8 AS total_pago, saldo_devedor::float8 AS saldo_devedor,
		dias_atraso, ultimo_pagamento, criado_em, atualizado_em
		FROM public.vw_titulos_saldo WHERE 1=1`
	var args []interface{}
	argN := 1

	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN)
		argN++
		args = append(args, id)
	}
	if status != "" {
		query += fmt.Sprintf(" AND status::text = $%d", argN)
		argN++
		args = append(args, status)
	}
	if credor != "" {
		query += fmt.Sprintf(" AND upper(credor) LIKE upper($%d)", argN)
		argN++
		args = append(args, "%"+credor+"%")
	}
	if dataInicial != "" {
		query += fmt.Sprintf(" AND data_vencimento >= $%d::date", argN)
		argN++
		args = append(args, dataInicial)
	}
	if dataFinal != "" {
		query += fmt.Sprintf(" AND data_vencimento <= $%d::date", argN)
		argN++
		args = append(args, dataFinal)
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN)
	args = append(args, empresaID)
	query += " ORDER BY data_vencimento ASC, id ASC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *FinanceiroHandler) TitulosPagarAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.genericUpsert(w, r, "", "titulos_pagar",
		[]string{"usuario_id", "credor", "descricao", "numero_documento", "valor_total", "data_emissao", "data_vencimento", "status"})
}

func (h *FinanceiroHandler) TitulosPagarExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nao informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	if _, err := tx.Exec(r.Context(),
		`DELETE FROM public.pagamentos_efetuados WHERE empresa_id = $1 AND titulo_id = $2`,
		empresaID, id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM public.titulos_pagar WHERE empresa_id = $1 AND id = $2`,
		empresaID, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Titulo nao encontrado", http.StatusNotFound)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Titulo excluido com sucesso"})
}

func (h *FinanceiroHandler) TitulosPagarBaixaTotal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)
	if body.ID <= 0 {
		jsonError(w, "ID do titulo nao informado", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var valorTotal, saldo float64
	var status string
	err = tx.QueryRow(r.Context(), `
		SELECT t.valor_total::float8, t.status::text,
			ROUND(t.valor_total - COALESCE((
				SELECT SUM(p.valor_pago)
				FROM public.pagamentos_efetuados p
				WHERE p.empresa_id = t.empresa_id AND p.titulo_id = t.id
			), 0), 2)::float8
		FROM public.titulos_pagar t
		WHERE t.empresa_id = $1 AND t.id = $2
		FOR UPDATE
	`, empresaID, body.ID).Scan(&valorTotal, &status, &saldo)
	if errors.Is(err, pgx.ErrNoRows) {
		jsonError(w, "Titulo nao encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if status == "CANCELADO" {
		jsonError(w, "Nao e possivel baixar um titulo cancelado", http.StatusBadRequest)
		return
	}
	if saldo <= 0.005 {
		jsonError(w, "Titulo ja esta baixado", http.StatusBadRequest)
		return
	}
	_ = valorTotal

	nextID, err := database.GerarID(r.Context(), tx, empresaID, "pagamentos_efetuados")
	if err != nil {
		jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var usuarioArg interface{}
	if usuarioID > 0 {
		usuarioArg = usuarioID
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO public.pagamentos_efetuados
			(empresa_id, id, titulo_id, usuario_id, data_pagamento, valor_pago, forma_pagamento)
		VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'BAIXA TOTAL')
	`, empresaID, nextID, body.ID, usuarioArg, saldo)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var novoStatus string
	if err := tx.QueryRow(r.Context(),
		`SELECT status::text FROM public.titulos_pagar WHERE empresa_id = $1 AND id = $2`,
		empresaID, body.ID).Scan(&novoStatus); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{
		"mensagem":   "Titulo baixado com sucesso",
		"id":         nextID,
		"valor_pago": saldo,
		"status":     novoStatus,
	})
}

// --- Pagamentos Efetuados ---

func (h *FinanceiroHandler) PagamentosEfetuadosListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	tituloID := parseInt(r.URL.Query().Get("titulo_id"), 0)

	query := `SELECT p.empresa_id, p.id, p.titulo_id, p.usuario_id, p.data_pagamento,
		p.valor_pago::float8 AS valor_pago, p.forma_pagamento, p.observacao, p.criado_em,
		u.nome AS usuario_nome
		FROM public.pagamentos_efetuados p
		LEFT JOIN public.usuario u ON u.empresa_id = p.empresa_id AND u.id = p.usuario_id
		WHERE 1=1`
	var args []interface{}
	argN := 1

	if id > 0 {
		query += fmt.Sprintf(" AND p.id = $%d", argN)
		argN++
		args = append(args, id)
	}
	if tituloID > 0 {
		query += fmt.Sprintf(" AND p.titulo_id = $%d", argN)
		argN++
		args = append(args, tituloID)
	}
	query += fmt.Sprintf(" AND (p.empresa_id = $%d OR $%d = 0)", argN, argN)
	args = append(args, empresaID)
	query += " ORDER BY p.data_pagamento DESC, p.id DESC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *FinanceiroHandler) PagamentosEfetuadosSalvar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TituloID       int     `json:"titulo_id"`
		DataPagamento  string  `json:"data_pagamento"`
		ValorPago      float64 `json:"valor_pago"`
		FormaPagamento string  `json:"forma_pagamento"`
		Observacao     string  `json:"observacao"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)
	if body.TituloID <= 0 {
		jsonError(w, "ID do titulo nao informado", http.StatusBadRequest)
		return
	}
	if body.ValorPago <= 0 {
		jsonError(w, "Valor do pagamento deve ser maior que zero", http.StatusBadRequest)
		return
	}
	if body.DataPagamento == "" {
		body.DataPagamento = time.Now().Format("2006-01-02")
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var valorTotal, totalPago float64
	var status string
	err = tx.QueryRow(r.Context(), `
		SELECT valor_total::float8, status::text
		FROM public.titulos_pagar
		WHERE empresa_id = $1 AND id = $2
		FOR UPDATE
	`, empresaID, body.TituloID).Scan(&valorTotal, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		jsonError(w, "Titulo nao encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if status == "CANCELADO" {
		jsonError(w, "Nao e possivel pagar um titulo cancelado", http.StatusBadRequest)
		return
	}

	if err := tx.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(valor_pago), 0)::float8
		FROM public.pagamentos_efetuados
		WHERE empresa_id = $1 AND titulo_id = $2
	`, empresaID, body.TituloID).Scan(&totalPago); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	saldo := math.Round((valorTotal-totalPago)*100) / 100
	if body.ValorPago > saldo+0.005 {
		jsonError(w, fmt.Sprintf(
			"Valor informado (R$ %.2f) e maior que o saldo devedor (R$ %.2f)",
			body.ValorPago, saldo,
		), http.StatusBadRequest)
		return
	}

	nextID, err := database.GerarID(r.Context(), tx, empresaID, "pagamentos_efetuados")
	if err != nil {
		jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var usuarioArg interface{}
	if usuarioID > 0 {
		usuarioArg = usuarioID
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO public.pagamentos_efetuados
			(empresa_id, id, titulo_id, usuario_id, data_pagamento, valor_pago, forma_pagamento, observacao)
		VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8)
	`, empresaID, nextID, body.TituloID, usuarioArg, body.DataPagamento,
		body.ValorPago, body.FormaPagamento, body.Observacao)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var novoStatus string
	if err := tx.QueryRow(r.Context(),
		`SELECT status::text FROM public.titulos_pagar WHERE empresa_id = $1 AND id = $2`,
		empresaID, body.TituloID).Scan(&novoStatus); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{
		"mensagem": "Pagamento registrado com sucesso",
		"id":       nextID,
		"status":   novoStatus,
	})
}

func (h *FinanceiroHandler) PagamentosEfetuadosExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nao informado", http.StatusBadRequest)
		return
	}

	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM public.pagamentos_efetuados WHERE empresa_id = $1 AND id = $2`,
		empresaID, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Pagamento nao encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Pagamento excluido com sucesso"})
}
