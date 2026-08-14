package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

type HorasHandler struct {
	Pool      *pgxpool.Pool
	BasicCRUD *BasicCRUD
}

// --- Horas Trabalhadas ---
func (h *HorasHandler) HorasTrabalhadasListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	servicoID := parseInt(r.URL.Query().Get("servico_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT ht.*, u.nome as usuario_nome, cl.nome as cliente_nome, s.nome as servico_nome
		FROM horas_trabalhadas ht
		LEFT JOIN public.usuario u ON u.id = ht.usuario_id AND u.empresa_id = ht.empresa_id
		LEFT JOIN public.cliente cl ON cl.id = ht.cliente_id AND cl.empresa_id = ht.empresa_id
		LEFT JOIN servico s ON s.id = ht.servico_id AND s.empresa_id = ht.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND ht.id = $%d", argN); argN++; args = append(args, id)
	}
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND ht.usuario_id = $%d", argN); argN++; args = append(args, usuarioID)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND ht.cliente_id = $%d", argN); argN++; args = append(args, clienteID)
	}
	if servicoID > 0 {
		query += fmt.Sprintf(" AND ht.servico_id = $%d", argN); argN++; args = append(args, servicoID)
	}
	if dataInicial != "" {
		query += fmt.Sprintf(" AND ht.data_servico >= $%d::date", argN); argN++; args = append(args, dataInicial)
	}
	if dataFinal != "" {
		query += fmt.Sprintf(" AND ht.data_servico <= $%d::date", argN); argN++; args = append(args, dataFinal)
	}
	query += fmt.Sprintf(" AND (ht.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY ht.data_servico DESC, ht.hora_inicio DESC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *HorasHandler) HorasTrabalhadasAtualizar(w http.ResponseWriter, r *http.Request) {
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
		clienteID := getInt(item, "cliente_id")
		quantidadeHoras := getFloat(item, "quantidade_horas")
		totalHoras := getFloat(item, "total_horas")
		dataServico := getStr(item, "data_servico")
		servicoID := getInt(item, "servico_id")
		isNew := false

		if id == 0 {
			isNew = true
			id, err = database.GerarID(r.Context(), tx, empresaID, "horas_trabalhadas")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO horas_trabalhadas (id, empresa_id, usuario_id, cliente_id, servico_id,
					valor_hora, data_servico, hora_inicio, hora_termino, quantidade_horas, total_horas, observacoes)
				VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::time,$9::time,$10,$11,$12) RETURNING id`,
				id, empresaID,
				getInt(item, "usuario_id"),
				clienteID,
				servicoID,
				getFloat(item, "valor_hora"),
				dataServico,
				getStr(item, "hora_inicio"),
				getStr(item, "hora_termino"),
				quantidadeHoras,
				totalHoras,
				getStr(item, "observacoes")).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE horas_trabalhadas SET usuario_id=$1, cliente_id=$2,
					servico_id=$3, valor_hora=$4, data_servico=$5::date,
					hora_inicio=$6::time, hora_termino=$7::time,
					quantidade_horas=$8, total_horas=$9, observacoes=$10
				WHERE id=$11 AND empresa_id=$12`,
				getInt(item, "usuario_id"),
				clienteID,
				servicoID,
				getFloat(item, "valor_hora"),
				dataServico,
				getStr(item, "hora_inicio"),
				getStr(item, "hora_termino"),
				quantidadeHoras,
				totalHoras,
				getStr(item, "observacoes"),
				id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Generate contas_receber for new service records with cliente
		if isNew && clienteID > 0 && totalHoras > 0 {
			descricao := fmt.Sprintf("Servico: %.2f horas", quantidadeHoras)
			vencimento := dataServico
			var catID int

			config, errCfg := queryLancamentoConfig(r.Context(), h.Pool, empresaID, "servico")
			if errCfg == nil && config != nil {
				catID = config.CategoriaID
				descricao = buildDescricao(config.DescricaoTemplate, map[string]string{
					"{quantidade}": fmt.Sprintf("%.2f", quantidadeHoras),
					"{cliente}":    fmt.Sprintf("%d", clienteID),
				})
				if dataServico != "" && config.DiasVencimento > 0 {
					tx.QueryRow(r.Context(),
						`SELECT ($1::date + $2::integer)::text`,
						dataServico, config.DiasVencimento).Scan(&vencimento)
				}
			}

			if catID > 0 {
				var crID int
				crID, err = database.GerarID(r.Context(), tx, empresaID, "contas_receber")
				if err != nil {
					jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
					return
				}
				err = tx.QueryRow(r.Context(), `
					INSERT INTO contas_receber (id, empresa_id, usuario_id, cliente_id, descricao,
						valor, data_vencimento, recebido, lancamento_origem_id)
					VALUES ($1,$2,$3,$4,$5,$6,$7::date,false,$8)
					RETURNING id
				`, crID, empresaID, getInt(item, "usuario_id"), clienteID,
					descricao, totalHoras, vencimento, id).Scan(&crID)
				if err != nil {
					jsonError(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}
		}
	}
	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Hora(s) trabalhada(s) salva(s) com sucesso"})
}

func (h *HorasHandler) HorasTrabalhadasExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM horas_trabalhadas WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro excluído com sucesso"})
}

// --- Horas Abatidas ---
func (h *HorasHandler) HorasAbatidasListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	dataInicial := r.URL.Query().Get("data_inicial")
	dataFinal := r.URL.Query().Get("data_final")

	query := `SELECT ha.*, u.nome as usuario_nome, c.nome as cliente_nome, s.nome as servico_nome
		FROM horas_abatidas ha
		LEFT JOIN public.usuario u ON u.id = ha.usuario_id AND u.empresa_id = ha.empresa_id
		LEFT JOIN public.cliente c ON c.id = ha.cliente_id AND c.empresa_id = ha.empresa_id
		LEFT JOIN servico s ON s.id = ha.servico_id AND s.empresa_id = ha.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND ha.id = $%d", argN); argN++; args = append(args, id)
	}
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND ha.usuario_id = $%d", argN); argN++; args = append(args, usuarioID)
	}
	if dataInicial != "" {
		query += fmt.Sprintf(" AND ha.data_abatimento >= $%d::date", argN); argN++; args = append(args, dataInicial)
	}
	if dataFinal != "" {
		query += fmt.Sprintf(" AND ha.data_abatimento <= $%d::date", argN); argN++; args = append(args, dataFinal)
	}
	query += fmt.Sprintf(" AND (ha.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY ha.data_abatimento DESC, ha.id DESC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *HorasHandler) HorasAbatidasAtualizar(w http.ResponseWriter, r *http.Request) {
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

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, "horas_abatidas")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO horas_abatidas (id, empresa_id, usuario_id, cliente_id, servico_id,
					data_abatimento, valor, valor_hora, quantidade_horas, observacoes)
				VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10) RETURNING id`,
				id, empresaID,
				getInt(item, "usuario_id"),
				getInt(item, "cliente_id"),
				getInt(item, "servico_id"),
				getStr(item, "data_abatimento"),
				getFloat(item, "valor"),
				getFloat(item, "valor_hora"),
				getFloat(item, "quantidade_horas"),
				getStr(item, "observacoes")).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE horas_abatidas SET usuario_id=$1, cliente_id=$2,
					servico_id=$3, data_abatimento=$4::date,
					valor=$5, valor_hora=$6, quantidade_horas=$7, observacoes=$8
				WHERE id=$9 AND empresa_id=$10`,
				getInt(item, "usuario_id"),
				getInt(item, "cliente_id"),
				getInt(item, "servico_id"),
				getStr(item, "data_abatimento"),
				getFloat(item, "valor"),
				getFloat(item, "valor_hora"),
				getFloat(item, "quantidade_horas"),
				getStr(item, "observacoes"),
				id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Hora(s) abatida(s) salva(s) com sucesso"})
}

func (h *HorasHandler) HorasAbatidasExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "horas_abatidas")
}

// --- Horas Excedidas ---
func (h *HorasHandler) HorasExcedidasListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	servicoID := parseInt(r.URL.Query().Get("servico_id"), 0)
	anoOrigem := parseInt(r.URL.Query().Get("ano_origem"), 0)
	mesOrigem := parseInt(r.URL.Query().Get("mes_origem"), 0)

	query := `SELECT he.*, u.nome as usuario_nome, c.nome as cliente_nome, s.nome as servico_nome
		FROM horas_excedidas he
		LEFT JOIN public.usuario u ON u.id = he.usuario_id AND u.empresa_id = he.empresa_id
		LEFT JOIN public.cliente c ON c.id = he.cliente_id AND c.empresa_id = he.empresa_id
		LEFT JOIN servico s ON s.id = he.servico_id AND s.empresa_id = he.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND he.id = $%d", argN); argN++; args = append(args, id)
	}
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND he.usuario_id = $%d", argN); argN++; args = append(args, usuarioID)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND he.cliente_id = $%d", argN); argN++; args = append(args, clienteID)
	}
	if servicoID > 0 {
		query += fmt.Sprintf(" AND he.servico_id = $%d", argN); argN++; args = append(args, servicoID)
	}
	if anoOrigem > 0 {
		query += fmt.Sprintf(" AND he.ano_origem = $%d", argN); argN++; args = append(args, anoOrigem)
	}
	if mesOrigem > 0 {
		query += fmt.Sprintf(" AND he.mes_origem = $%d", argN); argN++; args = append(args, mesOrigem)
	}
	query += fmt.Sprintf(" AND (he.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY he.ano_origem DESC, he.mes_origem DESC, he.id DESC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *HorasHandler) HorasExcedidasAtualizar(w http.ResponseWriter, r *http.Request) {
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

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, "horas_excedidas")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = tx.QueryRow(r.Context(), `
				INSERT INTO horas_excedidas (id, empresa_id, usuario_id, cliente_id, servico_id,
					mes_origem, ano_origem, delta_horas)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
				id, empresaID,
				getInt(item, "usuario_id"),
				getInt(item, "cliente_id"),
				getInt(item, "servico_id"),
				getInt(item, "mes_origem"),
				getInt(item, "ano_origem"),
				getFloat(item, "delta_horas")).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE horas_excedidas SET usuario_id=$1, cliente_id=$2,
					servico_id=$3, mes_origem=$4, ano_origem=$5, delta_horas=$6
				WHERE id=$7 AND empresa_id=$8`,
				getInt(item, "usuario_id"),
				getInt(item, "cliente_id"),
				getInt(item, "servico_id"),
				getInt(item, "mes_origem"),
				getInt(item, "ano_origem"),
				getFloat(item, "delta_horas"),
				id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
				return
		}
	}
	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Hora(s) excedida(s) salva(s) com sucesso"})
}

func (h *HorasHandler) HorasExcedidasExcluir(w http.ResponseWriter, r *http.Request) {
	h.BasicCRUD.Excluir(w, r, "horas_excedidas")
}

func (h *HorasHandler) HorasDashboardListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	now := time.Now()
	anoStr := r.URL.Query().Get("ano")
	mesStr := r.URL.Query().Get("mes")
	dataInicio := r.URL.Query().Get("dataInicio")
	dataFim := r.URL.Query().Get("dataFim")
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	servicoID := parseInt(r.URL.Query().Get("servico_id"), 0)

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

	buildCond := func(alias, colData string) (string, []interface{}) {
		args := []interface{}{empresaID}
		argN := 2
		cond := ""
		if dataInicio != "" || dataFim != "" {
			if dataInicio != "" {
				args = append(args, dataInicio)
				cond += fmt.Sprintf(" AND %s.%s >= $%d", alias, colData, argN)
				argN++
			}
			if dataFim != "" {
				args = append(args, dataFim)
				cond += fmt.Sprintf(" AND %s.%s <= $%d", alias, colData, argN)
				argN++
			}
		} else {
			args = append(args, ano, mes)
			cond = fmt.Sprintf(" AND EXTRACT(YEAR FROM %s.%s) = $%d AND EXTRACT(MONTH FROM %s.%s) = $%d", alias, colData, argN, alias, colData, argN+1)
			argN += 2
		}
		if usuarioID > 0 {
			args = append(args, usuarioID)
			cond += fmt.Sprintf(" AND %s.usuario_id = $%d", alias, argN)
			argN++
		}
		if clienteID > 0 {
			args = append(args, clienteID)
			cond += fmt.Sprintf(" AND %s.cliente_id = $%d", alias, argN)
			argN++
		}
		if servicoID > 0 {
			args = append(args, servicoID)
			cond += fmt.Sprintf(" AND %s.servico_id = $%d", alias, argN)
			argN++
		}
		return cond, args
	}

	var totalHoras, totalValor, totalAbatido float64
	var diasTrabalhados int

	condHt, argsHt := buildCond("ht", "data_servico")
	err := h.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(ht.quantidade_horas), 0),
			COALESCE(SUM(ht.total_horas), 0),
			COALESCE(COUNT(DISTINCT ht.data_servico), 0)
		FROM horas_trabalhadas ht
		WHERE 1=1`+condHt, argsHt...).Scan(&totalHoras, &totalValor, &diasTrabalhados)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	condHa, argsHa := buildCond("ha", "data_abatimento")
	err = h.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(ha.quantidade_horas), 0)
		FROM horas_abatidas ha
		WHERE 1=1`+condHa, argsHa...).Scan(&totalAbatido)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	dailyRows, err := h.Pool.Query(r.Context(), `
		SELECT ht.data_servico AS dia,
			SUM(ht.quantidade_horas) AS horas,
			SUM(ht.total_horas) AS valor
		FROM horas_trabalhadas ht
		WHERE 1=1`+condHt+`
		GROUP BY ht.data_servico
		ORDER BY ht.data_servico`, argsHt...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	dailyData := rowsToMap(dailyRows)

	monthlyRows, err := h.Pool.Query(r.Context(), `
		SELECT EXTRACT(MONTH FROM ht.data_servico) AS mes,
			SUM(ht.quantidade_horas) AS horas,
			SUM(ht.total_horas) AS valor
		FROM horas_trabalhadas ht
		WHERE 1=1`+condHt+`
		GROUP BY EXTRACT(MONTH FROM ht.data_servico)
		ORDER BY mes`, argsHt...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	monthlyData := rowsToMap(monthlyRows)

	abatidoRows, err := h.Pool.Query(r.Context(), `
		SELECT EXTRACT(MONTH FROM ha.data_abatimento) AS mes,
			SUM(ha.quantidade_horas) AS horas_abatidas
		FROM horas_abatidas ha
		WHERE 1=1`+condHa+`
		GROUP BY EXTRACT(MONTH FROM ha.data_abatimento)
		ORDER BY mes`, argsHa...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	abatidoData := rowsToMap(abatidoRows)

	kpis := map[string]interface{}{
		"total_horas":      totalHoras,
		"total_valor":      totalValor,
		"total_abatido":    totalAbatido,
		"dias_trabalhados": diasTrabalhados,
	}

	result := map[string]interface{}{
		"kpis":           kpis,
		"diario":         dailyData,
		"mensal":         monthlyData,
		"abatido_mensal": abatidoData,
	}
	jsonSuccess(w, result)
}
