package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/middleware"
)

type ErpHandler struct {
	Pool *pgxpool.Pool
}

func NewErpHandler(pool *pgxpool.Pool) *ErpHandler {
	return &ErpHandler{Pool: pool}
}

type erpTableMeta struct {
	Key        string
	CodeColumn string
	CodePrefix string
	Protected  bool
}

var erpTables = map[string]erpTableMeta{
	"categoria":                  {Key: "id"},
	"centro_custo":               {Key: "id"},
	"cliente":                    {Key: "id", CodeColumn: "codigo", CodePrefix: "C"},
	"condicao_pagamento":         {Key: "id"},
	"condicao_pagamento_parcela": {Key: "id"},
	"conta_bancaria":             {Key: "id"},
	"contas_pagar":               {Key: "id"},
	"contas_pagar_baixas":        {Key: "id"},
	"contas_pagar_parcelas":      {Key: "id"},
	"contas_receber":             {Key: "id"},
	"contas_receber_baixas":      {Key: "id"},
	"contas_receber_parcelas":    {Key: "id"},
	"contato":                    {Key: "id"},
	"contato_email":              {Key: "id"},
	"contato_rede_social":        {Key: "id"},
	"contato_telefone":           {Key: "id"},
	"deposito":                   {Key: "id"},
	"empresa":                    {Key: "id", Protected: true},
	"endereco":                   {Key: "id"},
	"estoque_movimento":          {Key: "id"},
	"estoque_saldo":              {Key: "id"},
	"fabricante":                 {Key: "id"},
	"familia":                    {Key: "id"},
	"forma_pagamento":            {Key: "id"},
	"fornecedor":                 {Key: "id", CodeColumn: "codigo", CodePrefix: "F"},
	"grupo":                      {Key: "id"},
	"marca":                      {Key: "id"},
	"pessoa":                     {Key: "id"},
	"plano_contas":               {Key: "id"},
	"produto":                    {Key: "id", CodeColumn: "codigo", CodePrefix: "P"},
	"produto_codigo_barras":      {Key: "id"},
	"produto_estoque_config":     {Key: "produto_id"},
	"produto_fiscal":             {Key: "produto_id"},
	"produto_fornecedor":         {Key: "id"},
	"produto_preco":              {Key: "id"},
	"segmento":                   {Key: "id"},
	"subgrupo":                   {Key: "id"},
	"tabela_preco":               {Key: "id"},
	"unidade_medida":             {Key: "id"},
}

type erpColumn struct {
	Name      string
	DataType  string
	Generated bool
	Identity  bool
	Nullable  bool
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func (h *ErpHandler) tableColumns(ctx context.Context, table string) (map[string]erpColumn, error) {
	rows, err := h.Pool.Query(ctx, `
		SELECT column_name, data_type, is_generated, is_identity, is_nullable
		FROM information_schema.columns
		WHERE table_schema = 'erp' AND table_name = $1
		ORDER BY ordinal_position`, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols := map[string]erpColumn{}
	for rows.Next() {
		var name, dataType, generated, identity, nullable string
		if err := rows.Scan(&name, &dataType, &generated, &identity, &nullable); err != nil {
			return nil, err
		}
		cols[name] = erpColumn{
			Name:      name,
			DataType:  dataType,
			Generated: generated == "ALWAYS",
			Identity:  identity == "YES",
			Nullable:  nullable == "YES",
		}
	}
	return cols, rows.Err()
}

func isErpAuditColumn(name string) bool {
	switch name {
	case "empresa_id", "criado_em", "criado_por", "atualizado_em", "atualizado_por":
		return true
	}
	return false
}

func (h *ErpHandler) writableColumns(cols map[string]erpColumn, meta erpTableMeta) []string {
	out := make([]string, 0, len(cols))
	for name, col := range cols {
		if col.Generated || isErpAuditColumn(name) {
			continue
		}
		if name == meta.Key {
			continue
		}
		out = append(out, name)
	}
	return out
}

func erpCastType(dataType string) string {
	switch dataType {
	case "smallint":
		return "::smallint"
	case "integer":
		return "::integer"
	case "bigint":
		return "::bigint"
	case "numeric":
		return "::numeric"
	case "real":
		return "::real"
	case "double precision":
		return "::double precision"
	case "boolean":
		return "::boolean"
	case "date":
		return "::date"
	case "timestamp with time zone":
		return "::timestamptz"
	case "timestamp without time zone":
		return "::timestamp"
	case "time without time zone":
		return "::time"
	case "jsonb":
		return "::jsonb"
	case "json":
		return "::json"
	case "uuid":
		return "::uuid"
	case "character", "character varying", "text":
		return "::text"
	default:
		return "::text"
	}
}

func jsonTextValue(v any) any {
	switch x := v.(type) {
	case nil:
		return nil
	case string:
		return x
	case json.Number:
		return x.String()
	case bool:
		if x {
			return "true"
		}
		return "false"
	default:
		b, err := json.Marshal(x)
		if err != nil {
			return fmt.Sprint(x)
		}
		return string(b)
	}
}

func decodeErpObject(r *http.Request) (map[string]json.RawMessage, error) {
	dec := json.NewDecoder(r.Body)
	dec.UseNumber()
	var body map[string]json.RawMessage
	if err := dec.Decode(&body); err != nil {
		return nil, err
	}
	return body, nil
}

func decodeErpValue(raw json.RawMessage) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	return v, nil
}

func erpEmpresaRead(r *http.Request) int {
	empresaID := middleware.GetEmpresaID(r)
	if empresaID > 0 {
		return empresaID
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("empresa_id")); raw != "" {
		if id, err := strconv.Atoi(raw); err == nil && id > 0 {
			return id
		}
	}
	return 0
}

func erpEmpresaWrite(r *http.Request) int {
	return middleware.GetEmpresaLogada(r)
}

func erpError(w http.ResponseWriter, err error) {
	msg := err.Error()
	status := http.StatusInternalServerError
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			status = http.StatusConflict
			msg = "Registro duplicado"
			if pgErr.Detail != "" {
				msg += ": " + pgErr.Detail
			}
		case "23503":
			status = http.StatusConflict
			msg = "Registro referenciado ou inexistente"
			if pgErr.Detail != "" {
				msg += ": " + pgErr.Detail
			}
		case "23514":
			status = http.StatusBadRequest
			msg = "Valor inválido"
			if pgErr.Detail != "" {
				msg += ": " + pgErr.Detail
			}
		case "23502":
			status = http.StatusBadRequest
			msg = "Campo obrigatório não informado"
			if pgErr.ColumnName != "" {
				msg += ": " + pgErr.ColumnName
			}
		case "22P02", "22007", "22008":
			status = http.StatusBadRequest
			msg = "Valor com formato inválido"
		}
	}
	JsonError(w, msg, status)
}

func (h *ErpHandler) nextErpID(ctx context.Context, table string) (int64, error) {
	var id int64
	err := h.Pool.QueryRow(ctx,
		`SELECT nextval(pg_get_serial_sequence('erp.' || $1, 'id'))`, table).Scan(&id)
	return id, err
}

func (h *ErpHandler) fetchErpRow(ctx context.Context, table, keyCol string, empresaID int, key any) (map[string]any, error) {
	where := fmt.Sprintf("t.%s = $1", quoteIdent(keyCol))
	args := []any{key}
	if empresaID > 0 {
		where += " AND t.empresa_id = $2"
		args = append(args, empresaID)
	}
	var raw string
	err := h.Pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT row_to_json(t)::text FROM erp.%s t WHERE %s LIMIT 1`, quoteIdent(table), where),
		args...).Scan(&raw)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (h *ErpHandler) jsonList(ctx context.Context, sql string, args ...any) ([]map[string]any, error) {
	rows, err := h.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (h *ErpHandler) Listar(w http.ResponseWriter, r *http.Request) {
	table := chi.URLParam(r, "tabela")
	meta, ok := erpTables[table]
	if !ok {
		JsonError(w, "Recurso ERP inválido", http.StatusNotFound)
		return
	}

	ctx := r.Context()
	cols, err := h.tableColumns(ctx, table)
	if err != nil {
		erpError(w, err)
		return
	}

	empresaID := erpEmpresaRead(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	limit := 200
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil {
			limit = n
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 1000 {
		limit = 1000
	}
	offset := 0
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			offset = n
		}
	}

	where := []string{"1=1"}
	args := []any{}
	argN := 1
	if empresaID > 0 {
		where = append(where, fmt.Sprintf("t.empresa_id = $%d", argN))
		args = append(args, empresaID)
		argN++
	}
	if q != "" {
		priority := []string{"nome", "nome_fantasia", "documento", "codigo", "descricao", "email", "identificador", "numero"}
		searchCols := make([]string, 0, 6)
		for _, name := range priority {
			if col, ok := cols[name]; ok && (col.DataType == "character varying" || col.DataType == "character" || col.DataType == "text") {
				searchCols = append(searchCols, name)
			}
		}
		if len(searchCols) == 0 {
			for name, col := range cols {
				if (col.DataType == "character varying" || col.DataType == "character" || col.DataType == "text") && !isErpAuditColumn(name) {
					searchCols = append(searchCols, name)
					if len(searchCols) >= 4 {
						break
					}
				}
			}
		}
		if len(searchCols) > 0 {
			parts := make([]string, 0, len(searchCols))
			for _, name := range searchCols {
				parts = append(parts, fmt.Sprintf("t.%s ILIKE $%d", quoteIdent(name), argN))
			}
			where = append(where, "("+strings.Join(parts, " OR ")+")")
			args = append(args, "%"+q+"%")
			argN++
		}
	}
	if status != "" && status != "all" {
		if _, ok := cols["status"]; ok {
			where = append(where, fmt.Sprintf("t.status = $%d", argN))
			args = append(args, status)
			argN++
		}
	}

	order := fmt.Sprintf("t.%s DESC", quoteIdent(meta.Key))
	if _, ok := cols["criado_em"]; ok {
		order = fmt.Sprintf("t.criado_em DESC NULLS LAST, t.%s DESC", quoteIdent(meta.Key))
	} else if _, ok := cols["nome"]; ok {
		order = fmt.Sprintf("t.nome ASC, t.%s ASC", quoteIdent(meta.Key))
	}

	sql := fmt.Sprintf(`SELECT row_to_json(t)::text FROM erp.%s t WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		quoteIdent(table), strings.Join(where, " AND "), order, argN, argN+1)
	args = append(args, limit, offset)

	list, err := h.jsonList(ctx, sql, args...)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, list)
}

func (h *ErpHandler) Obter(w http.ResponseWriter, r *http.Request) {
	table := chi.URLParam(r, "tabela")
	meta, ok := erpTables[table]
	if !ok {
		JsonError(w, "Recurso ERP inválido", http.StatusNotFound)
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		JsonError(w, "Identificador inválido", http.StatusBadRequest)
		return
	}

	row, err := h.fetchErpRow(r.Context(), table, meta.Key, erpEmpresaRead(r), id)
	if errors.Is(err, pgx.ErrNoRows) {
		JsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func (h *ErpHandler) Salvar(w http.ResponseWriter, r *http.Request) {
	table := chi.URLParam(r, "tabela")
	meta, ok := erpTables[table]
	if !ok {
		JsonError(w, "Recurso ERP inválido", http.StatusNotFound)
		return
	}
	if meta.Protected {
		JsonError(w, "Recurso protegido contra alteração genérica", http.StatusForbidden)
		return
	}

	empresaID := erpEmpresaWrite(r)
	if empresaID <= 0 {
		JsonError(w, "Empresa não identificada", http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserID(r)

	body, err := decodeErpObject(r)
	if err != nil {
		JsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	cols, err := h.tableColumns(ctx, table)
	if err != nil {
		erpError(w, err)
		return
	}

	idParam := chi.URLParam(r, "id")
	updating := idParam != ""
	var keyValue int64

	if updating {
		keyValue, err = strconv.ParseInt(idParam, 10, 64)
		if err != nil {
			JsonError(w, "Identificador inválido", http.StatusBadRequest)
			return
		}
	}

	allowed := map[string]erpColumn{}
	for _, name := range h.writableColumns(cols, meta) {
		allowed[name] = cols[name]
	}

	if updating {
		set := []string{}
		args := []any{}
		argN := 1
		for name, raw := range body {
			col, ok := allowed[name]
			if !ok {
				continue
			}
			v, err := decodeErpValue(raw)
			if err != nil {
				JsonError(w, "Valor inválido em "+name, http.StatusBadRequest)
				return
			}
			set = append(set, fmt.Sprintf("%s = CAST($%d::text AS %s)", quoteIdent(name), argN, erpColumnCast(col.DataType)))
			args = append(args, sqlStringValue(v))
			argN++
		}
		if _, ok := cols["atualizado_por"]; ok {
			set = append(set, fmt.Sprintf("atualizado_por = $%d", argN))
			args = append(args, userID)
			argN++
		}
		if len(set) == 0 {
			JsonError(w, "Nenhum campo válido para atualizar", http.StatusBadRequest)
			return
		}
		where := fmt.Sprintf("empresa_id = $%d AND %s = $%d", argN, quoteIdent(meta.Key), argN+1)
		args = append(args, empresaID, keyValue)
		sql := fmt.Sprintf(`UPDATE erp.%s SET %s WHERE %s`, quoteIdent(table), strings.Join(set, ", "), where)
		if _, err := h.Pool.Exec(ctx, sql, args...); err != nil {
			erpError(w, err)
			return
		}
	} else {
		insertCols := []string{"empresa_id"}
		placeholders := []string{fmt.Sprintf("$1")}
		args := []any{empresaID}
		argN := 2

		var newID int64
		if meta.Key == "id" {
			newID, err = h.nextErpID(ctx, table)
			if err != nil {
				erpError(w, err)
				return
			}
			insertCols = append(insertCols, "id")
			placeholders = append(placeholders, fmt.Sprintf("$%d", argN))
			args = append(args, newID)
			argN++
		}

		provided := map[string]bool{}
		for name, raw := range body {
			col, ok := allowed[name]
			if !ok {
				continue
			}
			v, err := decodeErpValue(raw)
			if err != nil {
				JsonError(w, "Valor inválido em "+name, http.StatusBadRequest)
				return
			}
			insertCols = append(insertCols, quoteIdent(name))
			placeholders = append(placeholders, fmt.Sprintf("CAST($%d::text AS %s)", argN, erpColumnCast(col.DataType)))
			args = append(args, sqlStringValue(v))
			provided[name] = true
			argN++
		}

		if meta.Key != "id" {
			raw, ok := body[meta.Key]
			if !ok {
				JsonError(w, "Campo obrigatório: "+meta.Key, http.StatusBadRequest)
				return
			}
			v, _ := decodeErpValue(raw)
			parsed, err := strconv.ParseInt(fmt.Sprint(sqlStringValue(v)), 10, 64)
			if err != nil {
				JsonError(w, "Campo inválido: "+meta.Key, http.StatusBadRequest)
				return
			}
			newID = parsed
		}

		if meta.CodeColumn != "" {
			if codeCol, ok := allowed[meta.CodeColumn]; ok && !provided[meta.CodeColumn] {
				code := meta.CodePrefix + fmt.Sprintf("%06d", newID)
				insertCols = append(insertCols, quoteIdent(meta.CodeColumn))
				placeholders = append(placeholders, fmt.Sprintf("CAST($%d::text AS %s)", argN, erpColumnCast(codeCol.DataType)))
				args = append(args, code)
				argN++
			}
		}
		if _, ok := cols["criado_por"]; ok && userID > 0 {
			insertCols = append(insertCols, "criado_por")
			placeholders = append(placeholders, fmt.Sprintf("$%d", argN))
			args = append(args, userID)
			argN++
		}

		sql := fmt.Sprintf(`INSERT INTO erp.%s (%s) VALUES (%s)`,
			quoteIdent(table), strings.Join(insertCols, ", "), strings.Join(placeholders, ", "))
		if _, err := h.Pool.Exec(ctx, sql, args...); err != nil {
			erpError(w, err)
			return
		}
		keyValue = newID
	}

	row, err := h.fetchErpRow(ctx, table, meta.Key, empresaID, keyValue)
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, row)
}

func erpColumnCast(dataType string) string {
	switch dataType {
	case "smallint", "integer", "bigint", "numeric", "real", "double precision",
		"boolean", "date", "timestamp with time zone", "timestamp without time zone",
		"time without time zone", "jsonb", "json", "uuid":
		return dataType
	default:
		return "text"
	}
}

func sqlStringValue(v any) any {
	switch x := v.(type) {
	case nil:
		return nil
	case string:
		return x
	case json.Number:
		return x.String()
	case bool:
		if x {
			return "true"
		}
		return "false"
	default:
		b, err := json.Marshal(x)
		if err != nil {
			return fmt.Sprint(x)
		}
		return string(b)
	}
}

func (h *ErpHandler) Excluir(w http.ResponseWriter, r *http.Request) {
	table := chi.URLParam(r, "tabela")
	meta, ok := erpTables[table]
	if !ok {
		JsonError(w, "Recurso ERP inválido", http.StatusNotFound)
		return
	}
	if meta.Protected {
		JsonError(w, "Recurso protegido contra exclusão genérica", http.StatusForbidden)
		return
	}
	empresaID := erpEmpresaWrite(r)
	if empresaID <= 0 {
		JsonError(w, "Empresa não identificada", http.StatusBadRequest)
		return
	}
	keyValue, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		JsonError(w, "Identificador inválido", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	cols, err := h.tableColumns(ctx, table)
	if err != nil {
		erpError(w, err)
		return
	}

	_, hasStatus := cols["status"]
	if hasStatus {
		_, err = h.Pool.Exec(ctx,
			fmt.Sprintf(`UPDATE erp.%s SET status = 0, atualizado_por = $1 WHERE empresa_id = $2 AND %s = $3`,
				quoteIdent(table), quoteIdent(meta.Key)),
			middleware.GetUserID(r), empresaID, keyValue)
	} else {
		_, err = h.Pool.Exec(ctx,
			fmt.Sprintf(`DELETE FROM erp.%s WHERE empresa_id = $1 AND %s = $2`,
				quoteIdent(table), quoteIdent(meta.Key)),
			empresaID, keyValue)
	}
	if err != nil {
		erpError(w, err)
		return
	}
	JsonSuccess(w, map[string]bool{"sucesso": true})
}

func (h *ErpHandler) Lookups(w http.ResponseWriter, r *http.Request) {
	empresaID := erpEmpresaRead(r)
	ctx := r.Context()

	base := func(table, order string) ([]map[string]any, error) {
		sql := fmt.Sprintf(`SELECT row_to_json(t)::text FROM erp.%s t WHERE t.status = 1 AND ($1 = 0 OR t.empresa_id = $1) ORDER BY %s`,
			quoteIdent(table), order)
		return h.jsonList(ctx, sql, empresaID)
	}

	planoContas, err := base("plano_contas", "t.codigo ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	centrosCusto, err := base("centro_custo", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	formasPagamento, err := base("forma_pagamento", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	contasBancarias, err := base("conta_bancaria", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	tabelasPreco, err := base("tabela_preco", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	unidades, err := base("unidade_medida", "t.descricao ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	categorias, err := base("categoria", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	familias, err := base("familia", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	segmentos, err := base("segmento", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	marcas, err := base("marca", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	fabricantes, err := base("fabricante", "t.razao_social ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	depositos, err := base("deposito", "t.nome ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	grupos, err := base("grupo", "t.codigo ASC")
	if err != nil {
		erpError(w, err)
		return
	}
	subgrupos, err := base("subgrupo", "t.codigo ASC")
	if err != nil {
		erpError(w, err)
		return
	}

	condicoes, err := h.jsonList(ctx, `
		SELECT row_to_json(x)::text FROM (
			SELECT c.*, COALESCE((
				SELECT json_agg(p ORDER BY p.numero)
				FROM erp.condicao_pagamento_parcela p
				WHERE p.empresa_id = c.empresa_id AND p.condicao_pagamento_id = c.id
			), '[]'::json) AS parcelas
			FROM erp.condicao_pagamento c
			WHERE c.status = 1 AND ($1 = 0 OR c.empresa_id = $1)
			ORDER BY c.nome
		) x`, empresaID)
	if err != nil {
		erpError(w, err)
		return
	}

	JsonSuccess(w, map[string]any{
		"plano_contas":        planoContas,
		"centros_custo":       centrosCusto,
		"formas_pagamento":    formasPagamento,
		"contas_bancarias":    contasBancarias,
		"tabelas_preco":       tabelasPreco,
		"unidades_medida":     unidades,
		"categorias":          categorias,
		"familias":            familias,
		"segmentos":           segmentos,
		"marcas":              marcas,
		"fabricantes":         fabricantes,
		"depositos":           depositos,
		"grupos":              grupos,
		"subgrupos":           subgrupos,
		"condicoes_pagamento": condicoes,
	})
}
