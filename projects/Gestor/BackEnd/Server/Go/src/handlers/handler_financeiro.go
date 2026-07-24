package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/middleware"
)

func getFloat(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok && v != nil {
		switch val := v.(type) {
		case float64:
			return val
		case json.Number:
			f, _ := val.Float64()
			return f
		}
	}
	return 0
}

type FinanceiroHandler struct {
	Pool      *pgxpool.Pool
	BasicCRUD *BasicCRUD
}

// --- Contas Pagar ---
func (h *FinanceiroHandler) ContasPagarListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	fornecedorID := parseInt(r.URL.Query().Get("fornecedor_id"), 0)
	descricao := r.URL.Query().Get("descricao")
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")
	pago := parseInt(r.URL.Query().Get("pago"), -1)

	query := `SELECT cp.*, f.nome as fornecedor_nome, f.telefone as fornecedor_telefone,
		f.email as fornecedor_email, cp2.nome as categoria_nome, u.nome as usuario_nome
		FROM contas_pagar cp
		LEFT JOIN public.fornecedor f ON f.id = cp.fornecedor_id AND f.empresa_id = cp.empresa_id
		LEFT JOIN categoria_pagar cp2 ON cp2.id = cp.id_categoria AND cp2.empresa_id = cp.empresa_id
		LEFT JOIN public.usuario u ON u.id = cp.usuario_id AND u.empresa_id = cp.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND cp.id = $%d", argN); argN++; args = append(args, id)
	}
	if fornecedorID > 0 {
		query += fmt.Sprintf(" AND cp.fornecedor_id = $%d", argN); argN++; args = append(args, fornecedorID)
	}
	if descricao != "" {
		query += fmt.Sprintf(" AND upper(cp.descricao) LIKE upper($%d)", argN); argN++; args = append(args, "%"+descricao+"%")
	}
	if dataInicial != "" {
		query += fmt.Sprintf(" AND cp.data_vencimento >= $%d::date", argN); argN++; args = append(args, dataInicial)
	}
	if dataFinal != "" {
		query += fmt.Sprintf(" AND cp.data_vencimento <= $%d::date", argN); argN++; args = append(args, dataFinal)
	}
	if pago >= 0 {
		query += fmt.Sprintf(" AND cp.pago = $%d", argN); argN++; args = append(args, pago == 1)
	}
	query += fmt.Sprintf(" AND (cp.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY cp.data_vencimento ASC, cp.id ASC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *FinanceiroHandler) ContasPagarAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.genericUpsert(w, r, "", "contas_pagar",
		[]string{"fornecedor_id", "descricao", "valor", "data_vencimento", "id_categoria", "usuario_id", "pago"})
}

func (h *FinanceiroHandler) ContasPagarExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM contas_pagar WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Conta a pagar excluída com sucesso"})
}

func (h *FinanceiroHandler) ContasPagarPagar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID           int     `json:"id"`
		DataPagamento string `json:"data_pagamento"`
		ValorBaixa   float64 `json:"valorBaixa"`
		Desconto     float64 `json:"desconto"`
		Acrescimo    float64 `json:"acrescimo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	if body.ID <= 0 {
		jsonError(w, "Código da Conta a Pagar não informado.", http.StatusBadRequest)
		return
	}

	setClauses := "pago = true"
	args := []interface{}{}

	if body.DataPagamento != "" {
		args = append(args, body.DataPagamento)
		setClauses += fmt.Sprintf(", data_pagamento = $%d::date", len(args))
	} else {
		setClauses += ", data_pagamento = CURRENT_DATE"
	}

	if body.ValorBaixa > 0 {
		args = append(args, body.ValorBaixa)
		setClauses += fmt.Sprintf(", valor_baixa = $%d", len(args))
	}
	if body.Desconto > 0 {
		args = append(args, body.Desconto)
		setClauses += fmt.Sprintf(", desconto = $%d", len(args))
	}
	if body.Acrescimo > 0 {
		args = append(args, body.Acrescimo)
		setClauses += fmt.Sprintf(", acrescimo = $%d", len(args))
	}

	allArgs := append(args, body.ID, empresaID)
	phID := fmt.Sprintf("$%d", len(args)+1)
	phEmp := fmt.Sprintf("$%d", len(args)+2)

	sql := fmt.Sprintf("UPDATE contas_pagar SET %s WHERE id = %s AND empresa_id = %s",
		setClauses, phID, phEmp)

	tag, err := h.Pool.Exec(r.Context(), sql, allArgs...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Conta a pagar não encontrada", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Pagamento registrado com sucesso"})
}

func (h *FinanceiroHandler) ContasPagarEstornar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	if body.ID <= 0 {
		jsonError(w, "Código da Conta a Pagar não informado.", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(),
		`UPDATE contas_pagar SET pago = false, data_pagamento = null WHERE id = $1 AND empresa_id = $2`,
		body.ID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Conta a pagar não encontrada", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Estorno de pagamento realizado com sucesso"})
}

// --- Contas Receber ---
func (h *FinanceiroHandler) ContasReceberListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	descricao := r.URL.Query().Get("descricao")
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")
	recebido := parseInt(r.URL.Query().Get("recebido"), -1)

	query := `SELECT cr.*, cl.nome as cliente_nome, cl.telefone as cliente_telefone,
		cl.email as cliente_email, cr2.nome as categoria_nome, u.nome as usuario_nome
		FROM contas_receber cr
		LEFT JOIN public.cliente cl ON cl.id = cr.cliente_id AND cl.empresa_id = cr.empresa_id
		LEFT JOIN categoria_receber cr2 ON cr2.id = cr.id_categoria AND cr2.empresa_id = cr.empresa_id
		LEFT JOIN public.usuario u ON u.id = cr.usuario_id AND u.empresa_id = cr.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND cr.id = $%d", argN); argN++; args = append(args, id)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND cr.cliente_id = $%d", argN); argN++; args = append(args, clienteID)
	}
	if descricao != "" {
		query += fmt.Sprintf(" AND upper(cr.descricao) LIKE upper($%d)", argN); argN++; args = append(args, "%"+descricao+"%")
	}
	if dataInicial != "" {
		query += fmt.Sprintf(" AND cr.data_vencimento >= $%d::date", argN); argN++; args = append(args, dataInicial)
	}
	if dataFinal != "" {
		query += fmt.Sprintf(" AND cr.data_vencimento <= $%d::date", argN); argN++; args = append(args, dataFinal)
	}
	if recebido >= 0 {
		query += fmt.Sprintf(" AND cr.recebido = $%d", argN); argN++; args = append(args, recebido == 1)
	}
	query += fmt.Sprintf(" AND (cr.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY cr.data_vencimento ASC, cr.id ASC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *FinanceiroHandler) ContasReceberAtualizar(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.genericUpsert(w, r, "", "contas_receber",
		[]string{"cliente_id", "descricao", "valor", "data_vencimento", "id_categoria", "usuario_id", "recebido"})
}

func (h *FinanceiroHandler) ContasReceberExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM contas_receber WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Conta a receber excluída com sucesso"})
}

func (h *FinanceiroHandler) ContasReceberReceber(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID             int     `json:"id"`
		DataRecebimento string `json:"data_recebimento"`
		ValorBaixa     float64 `json:"valorBaixa"`
		Desconto       float64 `json:"desconto"`
		Acrescimo      float64 `json:"acrescimo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	if body.ID <= 0 {
		jsonError(w, "Código da Conta a Receber não informado.", http.StatusBadRequest)
		return
	}

	setClauses := "recebido = true"
	args := []interface{}{}

	if body.DataRecebimento != "" {
		args = append(args, body.DataRecebimento)
		setClauses += fmt.Sprintf(", data_recebimento = $%d::date", len(args))
	} else {
		setClauses += ", data_recebimento = CURRENT_DATE"
	}

	if body.ValorBaixa > 0 {
		args = append(args, body.ValorBaixa)
		setClauses += fmt.Sprintf(", valor_baixa = $%d", len(args))
	}
	if body.Desconto > 0 {
		args = append(args, body.Desconto)
		setClauses += fmt.Sprintf(", desconto = $%d", len(args))
	}
	if body.Acrescimo > 0 {
		args = append(args, body.Acrescimo)
		setClauses += fmt.Sprintf(", acrescimo = $%d", len(args))
	}

	allArgs := append(args, body.ID, empresaID)
	phID := fmt.Sprintf("$%d", len(args)+1)
	phEmp := fmt.Sprintf("$%d", len(args)+2)

	sql := fmt.Sprintf("UPDATE contas_receber SET %s WHERE id = %s AND empresa_id = %s",
		setClauses, phID, phEmp)

	tag, err := h.Pool.Exec(r.Context(), sql, allArgs...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Conta a receber não encontrada", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Recebimento registrado com sucesso"})
}

func (h *FinanceiroHandler) ContasReceberEstornar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	if body.ID <= 0 {
		jsonError(w, "Código da Conta a Receber não informado.", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(),
		`UPDATE contas_receber SET recebido = false, data_recebimento = null WHERE id = $1 AND empresa_id = $2`,
		body.ID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Conta a receber não encontrada", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Estorno de recebimento realizado com sucesso"})
}

// --- Dashboard ---
func (h *FinanceiroHandler) DashboardListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	dataInicial := r.URL.Query().Get("dataInicial")
	dataFinal := r.URL.Query().Get("dataFinal")

	now := time.Now()
	if dataInicial == "" {
		dataInicial = now.AddDate(0, -5, 0).Format("2006-01-02")
	}
	if dataFinal == "" {
		dataFinal = now.Format("2006-01-02")
	}

	var totalReceber, totalPagar float64
	err := h.Pool.QueryRow(r.Context(), `
		SELECT
			COALESCE((SELECT SUM(valor) FROM contas_receber
				WHERE data_vencimento BETWEEN $1::date AND $2::date
				AND (empresa_id = $3 OR $3 = 0)), 0) AS total_receber,
			COALESCE((SELECT SUM(valor) FROM contas_pagar
				WHERE data_vencimento BETWEEN $1::date AND $2::date
				AND (empresa_id = $3 OR $3 = 0)), 0) AS total_pagar
	`, dataInicial, dataFinal, empresaID).Scan(&totalReceber, &totalPagar)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	mesIni := now.AddDate(0, -5, 0).Format("2006-01-02")
	mesFim := now.Format("2006-01-02")

	rows, err := h.Pool.Query(r.Context(), `
		SELECT mes_texto, SUM(total_receber) AS total_receber, SUM(total_pagar) AS total_pagar
		FROM (
			SELECT TO_CHAR(data_vencimento, 'YYYY-MM') AS mes_texto,
				SUM(valor) AS total_receber, 0::numeric AS total_pagar
			FROM contas_receber
			WHERE data_vencimento BETWEEN $1::date AND $2::date
				AND (empresa_id = $3 OR $3 = 0)
			GROUP BY TO_CHAR(data_vencimento, 'YYYY-MM')
			UNION ALL
			SELECT TO_CHAR(data_vencimento, 'YYYY-MM') AS mes_texto,
				0::numeric AS total_receber, SUM(valor) AS total_pagar
			FROM contas_pagar
			WHERE data_vencimento BETWEEN $1::date AND $2::date
				AND (empresa_id = $3 OR $3 = 0)
			GROUP BY TO_CHAR(data_vencimento, 'YYYY-MM')
		) sub
		GROUP BY mes_texto
		ORDER BY mes_texto
	`, mesIni, mesFim, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := map[string]interface{}{
		"total_receber": totalReceber,
		"total_pagar":   totalPagar,
		"mensal":        rowsToMap(rows),
	}
	jsonSuccess(w, result)
}

// helpers
func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key]; ok && v != nil {
		switch val := v.(type) {
		case float64:
			return int(val)
		case json.Number:
			n, _ := val.Int64()
			return int(n)
		}
	}
	return 0
}
