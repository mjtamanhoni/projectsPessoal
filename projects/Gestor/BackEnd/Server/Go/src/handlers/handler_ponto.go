package handlers

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

type PontoHandler struct {
	Pool      *pgxpool.Pool
	BasicCRUD *BasicCRUD
}

type pontoCombo struct {
	UsuarioID int
	ClienteID int
	ServicoID int
	Ano       int
	Mes       int
}

type pontoLancamento struct {
	ID   int
	Data time.Time
	Hora time.Time
	Tipo string
}

func (h *PontoHandler) PontoLancamentosListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	servicoID := parseInt(r.URL.Query().Get("servico_id"), 0)
	ano := parseInt(r.URL.Query().Get("ano"), 0)
	mes := parseInt(r.URL.Query().Get("mes"), 0)

	query := `SELECT pl.id, pl.empresa_id, pl.usuario_id, pl.cliente_id, pl.servico_id,
			pl.valor_hora::float8 AS valor_hora, pl.data_servico::text AS data_servico,
			pl.hora_lancamento::text AS hora_lancamento, trim(pl.tipo_lancamento) AS tipo_lancamento,
			pl.observacoes, pl.status, pl.created_at, pl.updated_at,
			pl.latitude::float8 AS latitude, pl.longitude::float8 AS longitude, pl.foto,
			u.nome AS usuario_nome, c.nome AS cliente_nome, s.nome AS servico_nome
		FROM public.lanc_horas_trabalhadas pl
		LEFT JOIN public.usuario u ON u.id = pl.usuario_id AND u.empresa_id = pl.empresa_id
		LEFT JOIN public.cliente c ON c.id = pl.cliente_id AND c.empresa_id = pl.empresa_id
		LEFT JOIN public.servico s ON s.id = pl.servico_id AND s.empresa_id = pl.empresa_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND pl.id = $%d", argN)
		argN++
		args = append(args, id)
	}
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND pl.usuario_id = $%d", argN)
		argN++
		args = append(args, usuarioID)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND pl.cliente_id = $%d", argN)
		argN++
		args = append(args, clienteID)
	}
	if servicoID > 0 {
		query += fmt.Sprintf(" AND pl.servico_id = $%d", argN)
		argN++
		args = append(args, servicoID)
	}
	if ano > 0 {
		query += fmt.Sprintf(" AND EXTRACT(YEAR FROM pl.data_servico) = $%d", argN)
		argN++
		args = append(args, ano)
	}
	if mes > 0 {
		query += fmt.Sprintf(" AND EXTRACT(MONTH FROM pl.data_servico) = $%d", argN)
		argN++
		args = append(args, mes)
	}
	query += fmt.Sprintf(" AND pl.empresa_id = $%d", argN)
	args = append(args, empresaID)
	query += " ORDER BY pl.data_servico DESC, pl.hora_lancamento DESC, pl.id DESC"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}

func (h *PontoHandler) PontoLancamentosSalvar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaLogada(r)
	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		usuarioID := getInt(item, "usuario_id")
		clienteID := getInt(item, "cliente_id")
		servicoID := getInt(item, "servico_id")
		dataServico := strings.TrimSpace(getStr(item, "data_servico"))
		horaLancamento := strings.TrimSpace(getStr(item, "hora_lancamento"))
		tipo := strings.ToUpper(strings.TrimSpace(getStr(item, "tipo_lancamento")))
		valorHora := getFloat(item, "valor_hora")
		latitude, temLatitude := item["latitude"]
		longitude, temLongitude := item["longitude"]
		temGeo := temLatitude && temLongitude && latitude != nil && longitude != nil
		var latArg, lngArg interface{}
		if temGeo {
			lat := getFloat(item, "latitude")
			lng := getFloat(item, "longitude")
			if lat < -90 || lat > 90 || lng < -180 || lng > 180 {
				jsonError(w, "Geolocalizacao invalida", http.StatusBadRequest)
				return
			}
			latArg = lat
			lngArg = lng
		}
		foto := strings.TrimSpace(getStr(item, "foto"))
		if len(foto) > 300000 {
			jsonError(w, "Foto muito grande (maximo 300 KB)", http.StatusBadRequest)
			return
		}

		if usuarioID <= 0 || clienteID <= 0 || servicoID <= 0 {
			jsonError(w, "Usuario, cliente e servico sao obrigatorios", http.StatusBadRequest)
			return
		}
		if dataServico == "" || horaLancamento == "" {
			jsonError(w, "Data e hora sao obrigatorias", http.StatusBadRequest)
			return
		}
		if tipo != "E" && tipo != "S" {
			jsonError(w, "Tipo de lancamento deve ser E ou S", http.StatusBadRequest)
			return
		}
		if valorHora <= 0 {
			_ = tx.QueryRow(r.Context(), `
				SELECT COALESCE(valor_hora, 0)
				FROM public.servico
				WHERE empresa_id = $1 AND id = $2`,
				empresaID, servicoID).Scan(&valorHora)
		}

		data, err := time.Parse("2006-01-02", dataServico)
		if err != nil {
			jsonError(w, "Data invalida", http.StatusBadRequest)
			return
		}

		var old *pontoCombo
		if id == 0 {
			esperado, ultimo, errUltimo := h.buscarUltimoPonto(r.Context(), tx, empresaID, usuarioID, data)
			if errUltimo != nil {
				jsonError(w, errUltimo.Error(), http.StatusInternalServerError)
				return
			}
			if ultimo != nil && ultimo.Tipo == "E" && ultimo.Data.Before(data) {
				jsonError(w, fmt.Sprintf(
					"Ha uma entrada em aberto em %s. Registre a saida desse dia antes de iniciar um novo dia.",
					ultimo.Data.Format("02/01/2006")), http.StatusConflict)
				return
			}
			if tipo != esperado {
				rotulo := "Entrada"
				if esperado == "S" {
					rotulo = "Saida"
				}
				jsonError(w, fmt.Sprintf("O proximo lancamento deve ser %s", rotulo), http.StatusBadRequest)
				return
			}

			id, err = database.GerarID(r.Context(), tx, empresaID, "lanc_horas_trabalhadas")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			_, err = tx.Exec(r.Context(), `
				INSERT INTO public.lanc_horas_trabalhadas
					(id, empresa_id, usuario_id, cliente_id, servico_id, valor_hora,
					 data_servico, hora_lancamento, tipo_lancamento, observacoes,
					 latitude, longitude, foto, updated_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::time,$9,$10,$11,$12,$13,NOW())`,
				id, empresaID, usuarioID, clienteID, servicoID, valorHora,
				dataServico, horaLancamento, tipo, getStr(item, "observacoes"),
				latArg, lngArg, nullStr(foto))
		} else {
			old, err = h.buscarComboLancamento(r.Context(), tx, empresaID, id)
			if err != nil {
				if err == pgx.ErrNoRows {
					jsonError(w, "Lancamento nao encontrado", http.StatusNotFound)
				} else {
					jsonError(w, err.Error(), http.StatusInternalServerError)
				}
				return
			}
			_, err = tx.Exec(r.Context(), `
				UPDATE public.lanc_horas_trabalhadas
				SET usuario_id = $1, cliente_id = $2, servico_id = $3, valor_hora = $4,
					data_servico = $5::date, hora_lancamento = $6::time,
					tipo_lancamento = $7, observacoes = $8,
					latitude = $9, longitude = $10, foto = $11, updated_at = NOW()
				WHERE id = $12 AND empresa_id = $13`,
				usuarioID, clienteID, servicoID, valorHora,
				dataServico, horaLancamento, tipo, getStr(item, "observacoes"),
				latArg, lngArg, nullStr(foto), id, empresaID)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		novo := pontoCombo{
			UsuarioID: usuarioID,
			ClienteID: clienteID,
			ServicoID: servicoID,
			Ano:       data.Year(),
			Mes:       int(data.Month()),
		}
		if old != nil && (old.UsuarioID != novo.UsuarioID || old.ClienteID != novo.ClienteID ||
			old.ServicoID != novo.ServicoID || old.Ano != novo.Ano || old.Mes != novo.Mes) {
			if err := h.recalcularPontoCombo(r.Context(), tx, empresaID, *old); err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
		if err := h.recalcularPontoCombo(r.Context(), tx, empresaID, novo); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Marcacao(oes) salva(s) com sucesso"})
}

func (h *PontoHandler) PontoLancamentosExcluir(w http.ResponseWriter, r *http.Request) {
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

	old, err := h.buscarComboLancamento(r.Context(), tx, empresaID, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			jsonError(w, "Lancamento nao encontrado", http.StatusNotFound)
		} else {
			jsonError(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	tag, err := tx.Exec(r.Context(),
		`DELETE FROM public.lanc_horas_trabalhadas WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Lancamento nao encontrado", http.StatusNotFound)
		return
	}
	if err := h.recalcularPontoCombo(r.Context(), tx, empresaID, *old); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Lancamento excluido com sucesso"})
}

func (h *PontoHandler) PontoResumo(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	ano := parseInt(r.URL.Query().Get("ano"), 0)
	mes := parseInt(r.URL.Query().Get("mes"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	servicoID := parseInt(r.URL.Query().Get("servico_id"), 0)

	agora := time.Now()
	if ano <= 0 {
		ano = agora.Year()
	}
	if mes <= 0 || mes > 12 {
		mes = int(agora.Month())
	}
	inicio := time.Date(ano, time.Month(mes), 1, 0, 0, 0, 0, time.Local)
	fim := inicio.AddDate(0, 1, 0)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	query := `SELECT DISTINCT usuario_id, cliente_id, servico_id
		FROM public.lanc_horas_trabalhadas
		WHERE empresa_id = $1
		  AND data_servico >= $2::date AND data_servico < $3::date`
	args := []interface{}{empresaID, inicio.Format("2006-01-02"), fim.Format("2006-01-02")}
	argN := 4
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND usuario_id = $%d", argN)
		argN++
		args = append(args, usuarioID)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND cliente_id = $%d", argN)
		argN++
		args = append(args, clienteID)
	}
	if servicoID > 0 {
		query += fmt.Sprintf(" AND servico_id = $%d", argN)
		argN++
		args = append(args, servicoID)
	}

	rows, err := tx.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var combos []pontoCombo
	for rows.Next() {
		var c pontoCombo
		if err := rows.Scan(&c.UsuarioID, &c.ClienteID, &c.ServicoID); err != nil {
			rows.Close()
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		c.Ano = ano
		c.Mes = mes
		combos = append(combos, c)
	}
	rows.Close()

	for _, c := range combos {
		if err := h.recalcularPontoCombo(r.Context(), tx, empresaID, c); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resumoQuery := `SELECT he.id, he.empresa_id, he.usuario_id, he.cliente_id, he.servico_id,
			he.ano, he.mes, he.horas_base::float8 AS horas_base,
			he.horas_trabalhadas::float8 AS horas_trabalhadas,
			he.horas_abatidas::float8 AS horas_abatidas,
			he.delta_horas::float8 AS delta_horas,
			he.horas_excedidas_manual::float8 AS horas_excedidas_manual,
			he.observacoes,
			u.nome AS usuario_nome, c.nome AS cliente_nome, s.nome AS servico_nome,
			COALESCE(s.valor_hora, 0)::float8 AS valor_hora
		FROM public.horas_excedidas_ponto he
		LEFT JOIN public.usuario u ON u.id = he.usuario_id AND u.empresa_id = he.empresa_id
		LEFT JOIN public.cliente c ON c.id = he.cliente_id AND c.empresa_id = he.empresa_id
		LEFT JOIN public.servico s ON s.id = he.servico_id AND s.empresa_id = he.empresa_id
		WHERE he.empresa_id = $1 AND he.ano = $2 AND he.mes = $3`
	resumoArgs := []interface{}{empresaID, ano, mes}
	argN = 4
	if usuarioID > 0 {
		resumoQuery += fmt.Sprintf(" AND he.usuario_id = $%d", argN)
		argN++
		resumoArgs = append(resumoArgs, usuarioID)
	}
	if clienteID > 0 {
		resumoQuery += fmt.Sprintf(" AND he.cliente_id = $%d", argN)
		argN++
		resumoArgs = append(resumoArgs, clienteID)
	}
	if servicoID > 0 {
		resumoQuery += fmt.Sprintf(" AND he.servico_id = $%d", argN)
		argN++
		resumoArgs = append(resumoArgs, servicoID)
	}
	resumoQuery += " ORDER BY u.nome, c.nome, s.nome"

	resumoRows, err := h.Pool.Query(r.Context(), resumoQuery, resumoArgs...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(resumoRows))
}

func (h *PontoHandler) buscarComboLancamento(ctx context.Context, tx pgx.Tx, empresaID, id int) (*pontoCombo, error) {
	var c pontoCombo
	var data time.Time
	err := tx.QueryRow(ctx, `
		SELECT usuario_id, cliente_id, servico_id, data_servico
		FROM public.lanc_horas_trabalhadas
		WHERE id = $1 AND empresa_id = $2`,
		id, empresaID).Scan(&c.UsuarioID, &c.ClienteID, &c.ServicoID, &data)
	if err != nil {
		return nil, err
	}
	c.Ano = data.Year()
	c.Mes = int(data.Month())
	return &c, nil
}

// buscarUltimoPonto retorna o tipo esperado do proximo lancamento e a ultima
// marcacao do usuario ate a data informada.
func (h *PontoHandler) buscarUltimoPonto(ctx context.Context, tx pgx.Tx, empresaID, usuarioID int, data time.Time) (string, *pontoLancamento, error) {
	var l pontoLancamento
	var rawData, rawHora, tipo string
	err := tx.QueryRow(ctx, `
		SELECT id, data_servico::text, hora_lancamento::text, trim(tipo_lancamento)
		FROM public.lanc_horas_trabalhadas
		WHERE empresa_id = $1 AND usuario_id = $2 AND data_servico <= $3::date
		ORDER BY data_servico DESC, hora_lancamento DESC, id DESC
		LIMIT 1`,
		empresaID, usuarioID, data.Format("2006-01-02")).Scan(&l.ID, &rawData, &rawHora, &tipo)
	if err == pgx.ErrNoRows {
		return "E", nil, nil
	}
	if err != nil {
		return "", nil, err
	}

	d, err := time.Parse("2006-01-02", rawData)
	if err != nil {
		return "", nil, err
	}
	hh, err := time.Parse("15:04:05", rawHora)
	if err != nil {
		hh, err = time.Parse("15:04", rawHora)
	}
	if err != nil {
		return "", nil, err
	}
	l.Data = d
	l.Hora = hh
	l.Tipo = strings.TrimSpace(tipo)

	esperado := "E"
	if l.Tipo == "E" {
		esperado = "S"
	}
	return esperado, &l, nil
}

func horaSugeridaFechamento(hora time.Time) string {
	fim := hora.Add(8 * time.Hour)
	limite := time.Date(hora.Year(), hora.Month(), hora.Day(), 23, 59, 0, 0, hora.Location())
	if fim.After(limite) {
		fim = limite
	}
	return fim.Format("15:04")
}

type pontoUltimoInfo struct {
	ID   int    `json:"id"`
	Data string `json:"data"`
	Hora string `json:"hora"`
	Tipo string `json:"tipo"`
}

type pontoProximoResponse struct {
	Tipo                   string           `json:"tipo"`
	Ultimo                 *pontoUltimoInfo `json:"ultimo"`
	DiaEmAberto            bool             `json:"diaEmAberto"`
	DataEmAberto           string           `json:"dataEmAberto,omitempty"`
	HoraSugeridaFechamento string           `json:"horaSugeridaFechamento,omitempty"`
}

func (h *PontoHandler) PontoProximo(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	if usuarioID <= 0 {
		jsonError(w, "Usuario e obrigatorio", http.StatusBadRequest)
		return
	}

	data := time.Now()
	if raw := strings.TrimSpace(r.URL.Query().Get("data")); raw != "" {
		parsed, err := time.Parse("2006-01-02", raw)
		if err != nil {
			jsonError(w, "Data invalida", http.StatusBadRequest)
			return
		}
		data = parsed
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	esperado, ultimo, err := h.buscarUltimoPonto(r.Context(), tx, empresaID, usuarioID, data)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := pontoProximoResponse{Tipo: esperado}
	if ultimo != nil {
		resp.Ultimo = &pontoUltimoInfo{
			ID:   ultimo.ID,
			Data: ultimo.Data.Format("2006-01-02"),
			Hora: ultimo.Hora.Format("15:04"),
			Tipo: ultimo.Tipo,
		}
		if ultimo.Tipo == "E" && ultimo.Data.Before(data) {
			resp.DiaEmAberto = true
			resp.DataEmAberto = ultimo.Data.Format("2006-01-02")
			resp.HoraSugeridaFechamento = horaSugeridaFechamento(ultimo.Hora)
		}
	}
	jsonSuccess(w, resp)
}

func (h *PontoHandler) recalcularPontoCombo(ctx context.Context, tx pgx.Tx, empresaID int, c pontoCombo) error {
	inicio := time.Date(c.Ano, time.Month(c.Mes), 1, 0, 0, 0, 0, time.Local)
	fim := inicio.AddDate(0, 1, 0)
	inicioStr := inicio.Format("2006-01-02")
	fimStr := fim.Format("2006-01-02")

	var horasBase, valorHora float64
	err := tx.QueryRow(ctx, `
		SELECT COALESCE(EXTRACT(EPOCH FROM horas_minimas) / 3600, 0)::float8,
			COALESCE(valor_hora, 0)::float8
		FROM public.servico
		WHERE empresa_id = $1 AND id = $2`,
		empresaID, c.ServicoID).Scan(&horasBase, &valorHora)
	if err != nil && err != pgx.ErrNoRows {
		return err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, data_servico::text, hora_lancamento::text, trim(tipo_lancamento)
		FROM public.lanc_horas_trabalhadas
		WHERE empresa_id = $1 AND usuario_id = $2 AND cliente_id = $3 AND servico_id = $4
		  AND data_servico >= $5::date AND data_servico < $6::date
		ORDER BY data_servico, hora_lancamento, id`,
		empresaID, c.UsuarioID, c.ClienteID, c.ServicoID, inicioStr, fimStr)
	if err != nil {
		return err
	}
	var lancamentos []pontoLancamento
	for rows.Next() {
		var rawID int
		var rawData, rawHora, tipo string
		if err := rows.Scan(&rawID, &rawData, &rawHora, &tipo); err != nil {
			rows.Close()
			return err
		}
		data, errData := time.Parse("2006-01-02", rawData)
		if errData != nil {
			continue
		}
		hora, errHora := time.Parse("15:04:05", rawHora)
		if errHora != nil {
			hora, errHora = time.Parse("15:04", rawHora)
		}
		if errHora != nil {
			continue
		}
		lancamentos = append(lancamentos, pontoLancamento{
			ID:   rawID,
			Data: data,
			Hora: hora,
			Tipo: strings.TrimSpace(tipo),
		})
	}
	rows.Close()

	var horasAbatidas float64
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(quantidade_horas), 0)::float8
		FROM public.horas_abatidas
		WHERE empresa_id = $1 AND usuario_id = $2 AND cliente_id = $3 AND servico_id = $4
		  AND data_abatimento >= $5::date AND data_abatimento < $6::date`,
		empresaID, c.UsuarioID, c.ClienteID, c.ServicoID, inicioStr, fimStr).Scan(&horasAbatidas); err != nil {
		return err
	}

	var excedenteManual float64
	errManual := tx.QueryRow(ctx, `
		SELECT COALESCE(horas_excedidas_manual, 0)::float8
		FROM public.horas_excedidas_ponto
		WHERE empresa_id = $1 AND usuario_id = $2 AND cliente_id = $3
		  AND servico_id = $4 AND ano = $5 AND mes = $6`,
		empresaID, c.UsuarioID, c.ClienteID, c.ServicoID, c.Ano, c.Mes).Scan(&excedenteManual)
	if errManual != nil && errManual != pgx.ErrNoRows {
		return errManual
	}

	horasTrabalhadas := arredondarSegundos(calcularHorasPonto(lancamentos))
	horasBase = arredondarSegundos(horasBase)
	horasAbatidas = arredondarSegundos(horasAbatidas)
	excedenteManual = arredondarSegundos(excedenteManual)
	delta := arredondarSegundos(horasTrabalhadas - horasAbatidas - horasBase)
	if delta < 0 {
		delta = 0
	}
	delta = arredondarSegundos(delta + excedenteManual)
	if valorHora < 0 {
		valorHora = 0
	}

	tag, err := tx.Exec(ctx, `
		UPDATE public.horas_excedidas_ponto
		SET horas_base = $1, horas_trabalhadas = $2, horas_abatidas = $3,
			delta_horas = $4, updated_at = NOW()
		WHERE empresa_id = $5 AND usuario_id = $6 AND cliente_id = $7
		  AND servico_id = $8 AND ano = $9 AND mes = $10`,
		horasBase, horasTrabalhadas, horasAbatidas, delta,
		empresaID, c.UsuarioID, c.ClienteID, c.ServicoID, c.Ano, c.Mes)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		return nil
	}

	id, err := database.GerarID(ctx, tx, empresaID, "horas_excedidas_ponto")
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO public.horas_excedidas_ponto
			(empresa_id, id, usuario_id, cliente_id, servico_id, ano, mes,
			 horas_base, horas_trabalhadas, horas_abatidas, delta_horas, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
		empresaID, id, c.UsuarioID, c.ClienteID, c.ServicoID, c.Ano, c.Mes,
		horasBase, horasTrabalhadas, horasAbatidas, delta)
	return err
}

func calcularHorasPonto(lancamentos []pontoLancamento) float64 {
	if len(lancamentos) == 0 {
		return 0
	}
	ordenados := make([]pontoLancamento, len(lancamentos))
	copy(ordenados, lancamentos)
	sort.SliceStable(ordenados, func(i, j int) bool {
		if !ordenados[i].Data.Equal(ordenados[j].Data) {
			return ordenados[i].Data.Before(ordenados[j].Data)
		}
		if !ordenados[i].Hora.Equal(ordenados[j].Hora) {
			return ordenados[i].Hora.Before(ordenados[j].Hora)
		}
		return ordenados[i].ID < ordenados[j].ID
	})

	total := 0.0
	for i := 0; i < len(ordenados); {
		dia := ordenados[i].Data.Format("2006-01-02")
		fimDia := i
		for fimDia < len(ordenados) && ordenados[fimDia].Data.Format("2006-01-02") == dia {
			fimDia++
		}

		bloco := append([]pontoLancamento(nil), ordenados[i:fimDia]...)
		saidasIniciais := 0
		for saidasIniciais < len(bloco) && bloco[saidasIniciais].Tipo == "S" {
			saidasIniciais++
		}
		if saidasIniciais > 0 && saidasIniciais < len(bloco) {
			bloco = append(bloco[saidasIniciais:], bloco[:saidasIniciais]...)
		}

		var entrada *time.Time
		for _, l := range bloco {
			if l.Tipo == "E" {
				if entrada == nil {
					hora := l.Hora
					entrada = &hora
				}
				continue
			}
			if l.Tipo != "S" || entrada == nil {
				continue
			}
			inicio := time.Date(l.Data.Year(), l.Data.Month(), l.Data.Day(),
				entrada.Hour(), entrada.Minute(), entrada.Second(), 0, time.Local)
			fim := time.Date(l.Data.Year(), l.Data.Month(), l.Data.Day(),
				l.Hora.Hour(), l.Hora.Minute(), l.Hora.Second(), 0, time.Local)
			if !fim.After(inicio) {
				fim = fim.Add(24 * time.Hour)
			}
			total += fim.Sub(inicio).Hours()
			entrada = nil
		}
		i = fimDia
	}
	return arredondarHoras(total)
}

func arredondarHoras(valor float64) float64 {
	if math.Abs(valor) < 0.005 {
		return 0
	}
	return math.Round(valor*100) / 100
}

func arredondarSegundos(valor float64) float64 {
	if math.Abs(valor) < (0.5 / 3600.0) {
		return 0
	}
	return math.Round(valor*3600) / 3600
}

// ---- Horas excedidas: lancamento manual (tabela horas_excedidas_ponto) ----

func (h *PontoHandler) PontoExcedentesSalvar(w http.ResponseWriter, r *http.Request) {
	items, err := h.BasicCRUD.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaLogada(r)
	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		usuarioID := getInt(item, "usuario_id")
		clienteID := getInt(item, "cliente_id")
		servicoID := getInt(item, "servico_id")
		ano := getInt(item, "ano")
		mes := getInt(item, "mes")
		manual := getFloat(item, "horas_excedidas_manual")
		observacoes := strings.TrimSpace(getStr(item, "observacoes"))

		if usuarioID <= 0 || clienteID <= 0 || servicoID <= 0 {
			jsonError(w, "Usuario, cliente e servico sao obrigatorios", http.StatusBadRequest)
			return
		}
		if ano <= 0 || mes < 1 || mes > 12 {
			jsonError(w, "Ano e mes invalidos", http.StatusBadRequest)
			return
		}
		if manual < 0 {
			manual = 0
		}
		manual = arredondarSegundos(manual)

		combo := pontoCombo{
			UsuarioID: usuarioID,
			ClienteID: clienteID,
			ServicoID: servicoID,
			Ano:       ano,
			Mes:       mes,
		}

		tag, err := tx.Exec(r.Context(), `
			UPDATE public.horas_excedidas_ponto
			SET horas_excedidas_manual = $1, observacoes = $2, updated_at = NOW()
			WHERE empresa_id = $3 AND usuario_id = $4 AND cliente_id = $5
			  AND servico_id = $6 AND ano = $7 AND mes = $8`,
			manual, nullStr(observacoes), empresaID, usuarioID, clienteID, servicoID, ano, mes)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if tag.RowsAffected() == 0 {
			id, err := database.GerarID(r.Context(), tx, empresaID, "horas_excedidas_ponto")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			_, err = tx.Exec(r.Context(), `
				INSERT INTO public.horas_excedidas_ponto
					(empresa_id, id, usuario_id, cliente_id, servico_id, ano, mes,
					 horas_base, horas_trabalhadas, horas_abatidas, delta_horas,
					 horas_excedidas_manual, observacoes, updated_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,0,$8,$8,$9,NOW())`,
				empresaID, id, usuarioID, clienteID, servicoID, ano, mes,
				manual, nullStr(observacoes))
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		if err := h.recalcularPontoCombo(r.Context(), tx, empresaID, combo); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Horas excedidas lancadas com sucesso"})
}

func (h *PontoHandler) PontoExcedentesExcluir(w http.ResponseWriter, r *http.Request) {
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

	var combo pontoCombo
	err = tx.QueryRow(r.Context(), `
		SELECT usuario_id, cliente_id, servico_id, ano, mes
		FROM public.horas_excedidas_ponto
		WHERE id = $1 AND empresa_id = $2`, id, empresaID).Scan(
		&combo.UsuarioID, &combo.ClienteID, &combo.ServicoID, &combo.Ano, &combo.Mes)
	if err != nil {
		if err == pgx.ErrNoRows {
			jsonError(w, "Registro nao encontrado", http.StatusNotFound)
		} else {
			jsonError(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	if _, err := tx.Exec(r.Context(), `
		UPDATE public.horas_excedidas_ponto
		SET horas_excedidas_manual = 0, observacoes = NULL, updated_at = NOW()
		WHERE id = $1 AND empresa_id = $2`, id, empresaID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.recalcularPontoCombo(r.Context(), tx, empresaID, combo); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Ajuste de horas excedidas removido"})
}

// ---- Dashboard do Ponto Eletronico ----

type pontoDashCards struct {
	HorasAno           float64 `json:"horasAno"`
	HorasMes           float64 `json:"horasMes"`
	HorasDia           float64 `json:"horasDia"`
	ExcedenteAno       float64 `json:"excedenteAno"`
	ExcedenteMes       float64 `json:"excedenteMes"`
	BaseAno            float64 `json:"baseAno"`
	AbatidasAno        float64 `json:"abatidasAno"`
	ValorExcedenteAno  float64 `json:"valorExcedenteAno"`
	ValorExcedenteMes  float64 `json:"valorExcedenteMes"`
	ValorTrabalhadoAno float64 `json:"valorTrabalhadoAno"`
	ValorTrabalhadoMes float64 `json:"valorTrabalhadoMes"`
	ValorTrabalhadoDia float64 `json:"valorTrabalhadoDia"`
	DiasTrabalhados    int     `json:"diasTrabalhados"`
	MediaDiaria        float64 `json:"mediaDiaria"`
}

type pontoDashMes struct {
	Mes         int     `json:"mes"`
	Label       string  `json:"label"`
	Trabalhadas float64 `json:"trabalhadas"`
	Base        float64 `json:"base"`
	Abatidas    float64 `json:"abatidas"`
	Excedentes  float64 `json:"excedentes"`
	Valor       float64 `json:"valor"`
}

type pontoDashDia struct {
	Dia         int     `json:"dia"`
	Label       string  `json:"label"`
	Trabalhadas float64 `json:"trabalhadas"`
	Valor       float64 `json:"valor"`
}

type pontoDashNomeValor struct {
	Nome  string  `json:"nome"`
	Horas float64 `json:"horas"`
}

type pontoDashboardResponse struct {
	Cards      pontoDashCards       `json:"cards"`
	Mensal     []pontoDashMes       `json:"mensal"`
	Diario     []pontoDashDia       `json:"diario"`
	PorServico []pontoDashNomeValor `json:"porServico"`
	PorUsuario []pontoDashNomeValor `json:"porUsuario"`
}

func (h *PontoHandler) PontoDashboard(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	ano := parseInt(r.URL.Query().Get("ano"), 0)
	mes := parseInt(r.URL.Query().Get("mes"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	clienteID := parseInt(r.URL.Query().Get("cliente_id"), 0)
	servicoID := parseInt(r.URL.Query().Get("servico_id"), 0)

	agora := time.Now()
	if ano <= 0 {
		ano = agora.Year()
	}
	if mes < 1 || mes > 12 {
		mes = int(agora.Month())
	}

	inicioAno := time.Date(ano, time.January, 1, 0, 0, 0, 0, time.Local)
	fimAno := inicioAno.AddDate(1, 0, 0)

	type grupoChave struct {
		UsuarioID int
		ClienteID int
		ServicoID int
		Dia       string
	}

	query := `SELECT pl.id, pl.usuario_id, pl.cliente_id, pl.servico_id,
			pl.data_servico::text AS data_servico, pl.hora_lancamento::text AS hora_lancamento,
			trim(pl.tipo_lancamento) AS tipo_lancamento,
			COALESCE(u.nome, '') AS usuario_nome,
			COALESCE(s.nome, '') AS servico_nome,
			COALESCE(s.valor_hora, 0)::float8 AS valor_hora
		FROM public.lanc_horas_trabalhadas pl
		LEFT JOIN public.usuario u ON u.id = pl.usuario_id AND u.empresa_id = pl.empresa_id
		LEFT JOIN public.servico s ON s.id = pl.servico_id AND s.empresa_id = pl.empresa_id
		WHERE pl.empresa_id = $1 AND pl.data_servico >= $2::date AND pl.data_servico < $3::date`
	args := []interface{}{empresaID, inicioAno.Format("2006-01-02"), fimAno.Format("2006-01-02")}
	argN := 4
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND pl.usuario_id = $%d", argN)
		argN++
		args = append(args, usuarioID)
	}
	if clienteID > 0 {
		query += fmt.Sprintf(" AND pl.cliente_id = $%d", argN)
		argN++
		args = append(args, clienteID)
	}
	if servicoID > 0 {
		query += fmt.Sprintf(" AND pl.servico_id = $%d", argN)
		argN++
		args = append(args, servicoID)
	}
	query += " ORDER BY pl.data_servico, pl.hora_lancamento, pl.id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	buckets := map[grupoChave][]pontoLancamento{}
	servicoNomes := map[int]string{}
	usuarioNomes := map[int]string{}
	servicoValores := map[int]float64{}
	for rows.Next() {
		var id, uID, cID, sID int
		var dataStr, horaStr, tipo, uNome, sNome string
		var valorHora float64
		if err := rows.Scan(&id, &uID, &cID, &sID, &dataStr, &horaStr, &tipo, &uNome, &sNome, &valorHora); err != nil {
			rows.Close()
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		data, errData := time.Parse("2006-01-02", dataStr)
		if errData != nil {
			continue
		}
		hora, errHora := time.Parse("15:04:05", horaStr)
		if errHora != nil {
			hora, errHora = time.Parse("15:04", horaStr)
		}
		if errHora != nil {
			continue
		}
		chave := grupoChave{UsuarioID: uID, ClienteID: cID, ServicoID: sID, Dia: dataStr}
		buckets[chave] = append(buckets[chave], pontoLancamento{
			ID: id, Data: data, Hora: hora, Tipo: strings.TrimSpace(tipo),
		})
		servicoNomes[sID] = sNome
		usuarioNomes[uID] = uNome
		servicoValores[sID] = valorHora
	}
	rows.Close()

	dailyWorked := map[string]float64{}
	dailyValue := map[string]float64{}
	monthWorked := make([]float64, 13)
	monthValue := make([]float64, 13)
	perServico := map[int]float64{}
	perUsuario := map[int]float64{}
	var totalValue float64
	for chave, lances := range buckets {
		horas := calcularHorasPonto(lances)
		if horas <= 0 {
			continue
		}
		valor := horas * servicoValores[chave.ServicoID]
		dailyWorked[chave.Dia] += horas
		dailyValue[chave.Dia] += valor
		totalValue += valor
		if len(chave.Dia) >= 7 {
			m := int(chave.Dia[5]-'0')*10 + int(chave.Dia[6]-'0')
			if m >= 1 && m <= 12 {
				monthWorked[m] += horas
				monthValue[m] += valor
			}
		}
		perServico[chave.ServicoID] += horas
		perUsuario[chave.UsuarioID] += horas
	}

	baseMes := make([]float64, 13)
	abatMes := make([]float64, 13)
	excMes := make([]float64, 13)
	valExcMes := make([]float64, 13)

	resumoQuery := `SELECT he.mes,
			COALESCE(SUM(he.horas_base), 0)::float8,
			COALESCE(SUM(he.horas_abatidas), 0)::float8,
			COALESCE(SUM(he.delta_horas), 0)::float8,
			COALESCE(SUM(he.delta_horas * s.valor_hora), 0)::float8
		FROM public.horas_excedidas_ponto he
		LEFT JOIN public.servico s ON s.id = he.servico_id AND s.empresa_id = he.empresa_id
		WHERE he.empresa_id = $1 AND he.ano = $2`
	resumoArgs := []interface{}{empresaID, ano}
	resumoArgN := 3
	if usuarioID > 0 {
		resumoQuery += fmt.Sprintf(" AND he.usuario_id = $%d", resumoArgN)
		resumoArgN++
		resumoArgs = append(resumoArgs, usuarioID)
	}
	if clienteID > 0 {
		resumoQuery += fmt.Sprintf(" AND he.cliente_id = $%d", resumoArgN)
		resumoArgN++
		resumoArgs = append(resumoArgs, clienteID)
	}
	if servicoID > 0 {
		resumoQuery += fmt.Sprintf(" AND he.servico_id = $%d", resumoArgN)
		resumoArgN++
		resumoArgs = append(resumoArgs, servicoID)
	}
	resumoQuery += " GROUP BY he.mes"

	resumoRows, err := h.Pool.Query(r.Context(), resumoQuery, resumoArgs...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for resumoRows.Next() {
		var m int
		var base, abat, exc, val float64
		if err := resumoRows.Scan(&m, &base, &abat, &exc, &val); err != nil {
			resumoRows.Close()
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if m >= 1 && m <= 12 {
			baseMes[m] = arredondarHoras(base)
			abatMes[m] = arredondarHoras(abat)
			excMes[m] = arredondarHoras(exc)
			valExcMes[m] = math.Round(val*100) / 100
		}
	}
	resumoRows.Close()

	labels := []string{"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"}
	mensal := make([]pontoDashMes, 0, 12)
	var totalAno, totalBaseAno, totalAbatAno, totalExcAno, totalValExcAno float64
	for m := 1; m <= 12; m++ {
		totalAno += monthWorked[m]
		totalBaseAno += baseMes[m]
		totalAbatAno += abatMes[m]
		totalExcAno += excMes[m]
		totalValExcAno += valExcMes[m]
		mensal = append(mensal, pontoDashMes{
			Mes:         m,
			Label:       labels[m-1],
			Trabalhadas: arredondarHoras(monthWorked[m]),
			Base:        baseMes[m],
			Abatidas:    abatMes[m],
			Excedentes:  excMes[m],
			Valor:       math.Round(monthValue[m]*100) / 100,
		})
	}
	totalAno = arredondarHoras(totalAno)

	diasTrabalhados := 0
	for _, horas := range dailyWorked {
		if horas > 0 {
			diasTrabalhados++
		}
	}
	media := 0.0
	if diasTrabalhados > 0 {
		media = arredondarHoras(totalAno / float64(diasTrabalhados))
	}

	hojeStr := agora.Format("2006-01-02")
	horasDia := arredondarHoras(dailyWorked[hojeStr])
	valorDia := math.Round(dailyValue[hojeStr]*100) / 100

	ultimoDia := time.Date(ano, time.Month(mes), 1, 0, 0, 0, 0, time.Local).AddDate(0, 1, -1).Day()
	diario := make([]pontoDashDia, 0, ultimoDia)
	mesStr := fmt.Sprintf("%04d-%02d", ano, mes)
	for d := 1; d <= ultimoDia; d++ {
		diaStr := fmt.Sprintf("%s-%02d", mesStr, d)
		diario = append(diario, pontoDashDia{
			Dia:         d,
			Label:       fmt.Sprintf("%02d", d),
			Trabalhadas: arredondarHoras(dailyWorked[diaStr]),
			Valor:       math.Round(dailyValue[diaStr]*100) / 100,
		})
	}

	porServico := make([]pontoDashNomeValor, 0, len(perServico))
	for sid, horas := range perServico {
		nome := servicoNomes[sid]
		if nome == "" {
			nome = fmt.Sprintf("Servico %d", sid)
		}
		porServico = append(porServico, pontoDashNomeValor{Nome: nome, Horas: arredondarHoras(horas)})
	}
	sort.Slice(porServico, func(i, j int) bool { return porServico[i].Horas > porServico[j].Horas })

	porUsuario := make([]pontoDashNomeValor, 0, len(perUsuario))
	for uid, horas := range perUsuario {
		nome := usuarioNomes[uid]
		if nome == "" {
			nome = fmt.Sprintf("Usuario %d", uid)
		}
		porUsuario = append(porUsuario, pontoDashNomeValor{Nome: nome, Horas: arredondarHoras(horas)})
	}
	sort.Slice(porUsuario, func(i, j int) bool { return porUsuario[i].Horas > porUsuario[j].Horas })

	resp := pontoDashboardResponse{
		Cards: pontoDashCards{
			HorasAno:           totalAno,
			HorasMes:           arredondarHoras(monthWorked[mes]),
			HorasDia:           horasDia,
			ExcedenteAno:       arredondarHoras(totalExcAno),
			ExcedenteMes:       excMes[mes],
			BaseAno:            arredondarHoras(totalBaseAno),
			AbatidasAno:        arredondarHoras(totalAbatAno),
			ValorExcedenteAno:  math.Round(totalValExcAno*100) / 100,
			ValorExcedenteMes:  math.Round(valExcMes[mes]*100) / 100,
			ValorTrabalhadoAno: math.Round(totalValue*100) / 100,
			ValorTrabalhadoMes: math.Round(monthValue[mes]*100) / 100,
			ValorTrabalhadoDia: valorDia,
			DiasTrabalhados:    diasTrabalhados,
			MediaDiaria:        media,
		},
		Mensal:     mensal,
		Diario:     diario,
		PorServico: porServico,
		PorUsuario: porUsuario,
	}
	jsonSuccess(w, resp)
}
