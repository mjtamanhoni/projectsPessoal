package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

type BasicCRUD struct {
	Pool *pgxpool.Pool
}

func NewBasicCRUD(pool *pgxpool.Pool) *BasicCRUD {
	return &BasicCRUD{Pool: pool}
}

func (b *BasicCRUD) parseBody(r *http.Request) ([]map[string]interface{}, error) {
	var items []map[string]interface{}
	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()

	var raw interface{}
	if err := decoder.Decode(&raw); err != nil {
		return nil, fmt.Errorf("JSON inválido")
	}

	switch v := raw.(type) {
	case []interface{}:
		for _, item := range v {
			if obj, ok := item.(map[string]interface{}); ok {
				items = append(items, obj)
			}
		}
	case map[string]interface{}:
		items = append(items, v)
	default:
		return nil, fmt.Errorf("JSON inválido. Envie um array ou objeto.")
	}

	return items, nil
}

func (b *BasicCRUD) Listar(w http.ResponseWriter, r *http.Request, schema, table string, joins string, fields string, baseQuery string) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)

	if fields == "" {
		fields = fmt.Sprintf("%s.*", table)
	}
	q := fmt.Sprintf("SELECT %s FROM %s %s WHERE 1=1", fields, table, joins)
	if baseQuery != "" {
		q = baseQuery
	}

	var args []interface{}
	argN := 1

	if id > 0 {
		if joins != "" {
			if strings.Contains(joins, " on ") {
				parts := strings.Fields(joins)
				alias := table
				for i, p := range parts {
					if strings.EqualFold(p, "as") && i > 0 {
						alias = parts[i+1]
						break
					}
				}
				q += fmt.Sprintf(" AND %s.id = $%d", alias, argN)
			} else {
				q += fmt.Sprintf(" AND %s.id = $%d", table, argN)
			}
		} else {
			q += fmt.Sprintf(" AND id = $%d", argN)
		}
		argN++
		args = append(args, id)
	}

	nome := r.URL.Query().Get("nome")
	if nome != "" {
		q += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN)
		argN++
		args = append(args, "%"+nome+"%")
	}

	q += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN)
	argN++
	args = append(args, empresaID)

	q += " ORDER BY id"

	rows, err := b.Pool.Query(r.Context(), q, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, rowsToMap(rows))
}
func (b *BasicCRUD) Salvar(w http.ResponseWriter, r *http.Request, table string, fields []string) {
	items, err := b.parseBody(r)
	if err != nil {
		log.Printf("[Salvar] Erro ao parsear body (table=%s): %v", table, err)
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := b.Pool.Begin(r.Context())
	if err != nil {
		log.Printf("[Salvar] Erro ao iniciar transacao (table=%s): %v", table, err)
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var savedIDs []int

	for _, item := range items {
		id := getID(item)

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, table)
			if err != nil {
				log.Printf("[Salvar] Erro ao gerar ID (table=%s, empresa=%d): %v", table, empresaID, err)
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}

			cols := []string{"id", "empresa_id"}
			vals := []interface{}{id, empresaID}
			phs := []string{"$1", "$2"}
			paramIdx := 3

			for _, field := range fields {
				val, hasField := getFieldValue(item, field)
				if field == "usuario_id" && !hasField && usuarioID > 0 {
					hasField = true
					val = usuarioID
				}
				if hasField {
					cols = append(cols, field)
					vals = append(vals, val)
					phs = append(phs, fmt.Sprintf("$%d", paramIdx))
					paramIdx++
				}
			}

			sql := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id",
				table,
				strings.Join(cols, ", "),
				strings.Join(phs, ", "))

			err = tx.QueryRow(r.Context(), sql, vals...).Scan(&id)
			if err != nil {
				log.Printf("[Salvar] Erro INSERT (table=%s, sql=%s, vals=%v): %v", table, sql, vals, err)
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			savedIDs = append(savedIDs, id)
		} else {
			savedIDs = append(savedIDs, id)
			setClauses := []string{}
			vals := []interface{}{}
			paramIdx := 1

			for _, field := range fields {
				val, hasField := getFieldValue(item, field)
				if field == "usuario_id" && !hasField && usuarioID > 0 {
					hasField = true
					val = usuarioID
				}
				if hasField {
					setClauses = append(setClauses, fmt.Sprintf("%s = $%d", field, paramIdx))
					vals = append(vals, val)
					paramIdx++
				}
			}

			vals = append(vals, id, empresaID)
			sql := fmt.Sprintf("UPDATE %s SET %s WHERE id = $%d AND empresa_id = $%d",
				table, strings.Join(setClauses, ", "), paramIdx, paramIdx+1)

			_, err = tx.Exec(r.Context(), sql, vals...)
			if err != nil {
				log.Printf("[Salvar] Erro UPDATE (table=%s, sql=%s, vals=%v): %v", table, sql, vals, err)
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		log.Printf("[Salvar] Erro ao commitar transacao (table=%s): %v", table, err)
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro(s) salvo(s) com sucesso", "ids": savedIDs})
}
func (b *BasicCRUD) Excluir(w http.ResponseWriter, r *http.Request, table string) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := b.Pool.Exec(r.Context(),
		fmt.Sprintf("DELETE FROM %s WHERE id = $1 AND empresa_id = $2", table),
		id, empresaID)
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

func (b *BasicCRUD) genericUpsert(w http.ResponseWriter, r *http.Request,
	schema, table string, requiredFields []string) {

	items, err := b.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	if len(items) > 0 {
		if v, ok := getFieldValue(items[0], "empresa_id"); ok {
			switch n := v.(type) {
			case float64:
				if n != 0 {
					empresaID = int(n)
				}
			case json.Number:
				if i, err := n.Int64(); err == nil && i != 0 {
					empresaID = int(i)
				}
			case int:
				if n != 0 {
					empresaID = n
				}
			}
		}
	}

	tx, err := b.Pool.Begin(r.Context())
	if err != nil {
		log.Printf("[genericUpsert] Erro ao iniciar transacao: %v", err)
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, table)
			if err != nil {
				log.Printf("[genericUpsert] Erro ao gerar ID (table=%s, empresa=%d): %v", table, empresaID, err)
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}

			allInsertCols := []string{"id", "empresa_id"}
			allInsertVals := []interface{}{id, empresaID}
			allInsertPH := []string{"$1", "$2"}
			paramIdx := 3

			for _, field := range requiredFields {
				if field == "id" || field == "empresa_id" {
					continue
				}
				val, hasField := getFieldValue(item, field)
				if field == "usuario_id" && !hasField && usuarioID > 0 {
					hasField = true
					val = usuarioID
				}
				if hasField {
					allInsertCols = append(allInsertCols, field)
					allInsertVals = append(allInsertVals, val)
					allInsertPH = append(allInsertPH, fmt.Sprintf("$%d", paramIdx))
					paramIdx++
				}
			}

			sqlStr := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id",
				table,
				strings.Join(allInsertCols, ", "),
				strings.Join(allInsertPH, ", "))

			err = tx.QueryRow(r.Context(), sqlStr, allInsertVals...).Scan(&id)
			if err != nil {
				log.Printf("[genericUpsert] Erro INSERT (table=%s, sql=%s, vals=%v): %v", table, sqlStr, allInsertVals, err)
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			allSetClauses := []string{}
			allVals := []interface{}{}
			paramIdx := 1

			for _, field := range requiredFields {
				if field == "id" || field == "empresa_id" {
					continue
				}
				val, hasField := getFieldValue(item, field)
				if field == "usuario_id" && !hasField && usuarioID > 0 {
					hasField = true
					val = usuarioID
				}
				if hasField {
					allSetClauses = append(allSetClauses, fmt.Sprintf("%s = $%d", field, paramIdx))
					allVals = append(allVals, val)
					paramIdx++
				}
			}

			allVals = append(allVals, id, empresaID)
			sqlStr := fmt.Sprintf("UPDATE %s SET %s WHERE id = $%d AND empresa_id = $%d",
				table, strings.Join(allSetClauses, ", "), paramIdx, paramIdx+1)

			_, err = tx.Exec(r.Context(), sqlStr, allVals...)
			if err != nil {
				log.Printf("[genericUpsert] Erro UPDATE (table=%s, sql=%s, vals=%v): %v", table, sqlStr, allVals, err)
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		log.Printf("[genericUpsert] Erro ao commitar transacao: %v", err)
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro(s) salvo(s) com sucesso"})
}

func (b *BasicCRUD) genericDelete(w http.ResponseWriter, r *http.Request, table string) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := parseInt(r.URL.Query().Get("empresa_id"), 0)
	if empresaID == 0 {
		empresaID = middleware.GetEmpresaID(r)
	}

	if id == 0 {
		log.Printf("[genericDelete] ID nao informado (table=%s)", table)
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tag, err := b.Pool.Exec(r.Context(),
		fmt.Sprintf("DELETE FROM %s WHERE id = $1 AND empresa_id = $2", table),
		id, empresaID)
	if err != nil {
		log.Printf("[genericDelete] Erro DELETE (table=%s, id=%d, empresa=%d): %v", table, id, empresaID, err)
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		log.Printf("[genericDelete] Registro nao encontrado (table=%s, id=%d, empresa=%d)", table, id, empresaID)
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro excluído com sucesso"})
}

// Global table upsert (no empresa_id)
func (b *BasicCRUD) globalUpsert(w http.ResponseWriter, r *http.Request, table string, fields []string) {
	items, err := b.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := b.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)

		if id == 0 {
			id, err = database.GerarIDGlobal(r.Context(), tx, table)
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}

			cols := []string{"id"}
			vals := []interface{}{id}
			phs := []string{"$1"}
			paramIdx := 2

			for _, field := range fields {
				val, hasField := getFieldValue(item, field)
				if hasField {
					cols = append(cols, field)
					vals = append(vals, val)
					phs = append(phs, fmt.Sprintf("$%d", paramIdx))
					paramIdx++
				}
			}

			sql := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id",
				table, strings.Join(cols, ", "), strings.Join(phs, ", "))

			err = tx.QueryRow(r.Context(), sql, vals...).Scan(&id)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			setClauses := []string{}
			vals := []interface{}{}
			paramIdx := 1

			for _, field := range fields {
				val, hasField := getFieldValue(item, field)
				if hasField {
					setClauses = append(setClauses, fmt.Sprintf("%s = $%d", field, paramIdx))
					vals = append(vals, val)
					paramIdx++
				}
			}

			vals = append(vals, id)
			sql := fmt.Sprintf("UPDATE %s SET %s WHERE id = $%d",
				table, strings.Join(setClauses, ", "), paramIdx)

			_, err = tx.Exec(r.Context(), sql, vals...)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro(s) salvo(s) com sucesso"})
}

func (b *BasicCRUD) globalExcluir(w http.ResponseWriter, r *http.Request, table string) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := b.Pool.Exec(r.Context(),
		fmt.Sprintf("DELETE FROM %s WHERE id = $1", table),
		id)
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

func rowsToMap(rows pgx.Rows) []map[string]interface{} {
	defer rows.Close()

	var result []map[string]interface{}
	fieldDescriptions := rows.FieldDescriptions()
	fieldNames := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		fieldNames[i] = string(fd.Name)
	}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, name := range fieldNames {
			if i < len(values) {
				row[name] = convertPGValue(values[i])
			}
		}
		result = append(result, row)
	}

	if result == nil {
		return []map[string]interface{}{}
	}
	return result
}

func convertPGValue(v interface{}) interface{} {
	switch val := v.(type) {
	case time.Time:
		return val.Format("2006-01-02")
	case pgtype.Time:
		if !val.Valid {
			return nil
		}
		hours := val.Microseconds / 3600000000
		minutes := (val.Microseconds % 3600000000) / 60000000
		secs := (val.Microseconds % 60000000) / 1000000
		return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, secs)
	case pgtype.Date:
		if !val.Valid {
			return nil
		}
		return val.Time.Format("2006-01-02")
	case pgtype.Timestamp:
		if !val.Valid {
			return nil
		}
		return val.Time.Format("2006-01-02T15:04:05")
	case pgtype.Interval:
		if !val.Valid {
			return nil
		}
		totalSecs := int64(val.Months)*2592000 + int64(val.Days)*86400 + val.Microseconds/1000000
		hours := totalSecs / 3600
		minutes := (totalSecs % 3600) / 60
		secs := totalSecs % 60
		return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, secs)
	default:
		return v
	}
}

func snakeToCamel(s string) string {
	parts := strings.Split(s, "_")
	result := parts[0]
	for _, p := range parts[1:] {
		if len(p) > 0 {
			result += strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return result
}

func getFieldValue(item map[string]interface{}, field string) (interface{}, bool) {
	val, ok := item[field]
	if !ok {
		camelField := snakeToCamel(field)
		if camelField != field {
			val, ok = item[camelField]
		}
	}
	if !ok {
		return nil, false
	}
	switch v := val.(type) {
	case float64:
		if v == float64(int(v)) {
			return int(v), true
		}
		return v, true
	case json.Number:
		if i, err := v.Int64(); err == nil {
			return int(i), true
		}
		if f, err := v.Float64(); err == nil {
			return f, true
		}
		return v.String(), true
	case string:
		return v, true
	case bool:
		return v, true
	case nil:
		return nil, true
	default:
		return v, true
	}
}

var _ = pgx.Rows(nil)
