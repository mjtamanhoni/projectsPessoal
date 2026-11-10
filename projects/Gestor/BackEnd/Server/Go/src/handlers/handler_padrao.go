package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

// PadraoHandler expoe o catalogo base (schema padrao) e a replicacao
// dos cadastros padrao para uma empresa.
//
// As tabelas do schema padrao NAO possuem empresa_id: sao a matriz.
// O vinculo do que ja foi aplicado fica em padrao.empresa_item.
type PadraoHandler struct {
	*BasicCRUD
}

func NewPadraoHandler(pool *pgxpool.Pool) *PadraoHandler {
	return &PadraoHandler{BasicCRUD: NewBasicCRUD(pool)}
}

type padraoTabelaDef struct {
	Tabela   string
	PK       []string
	Serial   bool
	Conflito []string
	Ordem    string
}

// Lista branca de tabelas que podem ser manipuladas pelo endpoint generico.
// Mantem o handler restrito ao schema padrao (evita SQL injection por nome).
var padraoTabelasDef = map[string]padraoTabelaDef{
	"marca":                           {Tabela: "marca", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "codigo"},
	"produto_classificacao":           {Tabela: "produto_classificacao", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "ordem, nome"},
	"insumo":                          {Tabela: "insumo", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "nome"},
	"adicional":                       {Tabela: "adicional", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "nome"},
	"adicional_produto_classificacao": {Tabela: "adicional_produto_classificacao", PK: []string{"adicional_id", "produto_classificacao_id"}, Serial: false, Ordem: "adicional_id"},
	"custo_adicional_tipo":            {Tabela: "custo_adicional_tipo", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "nome"},
	"produto_fabricado":               {Tabela: "produto_fabricado", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "nome"},
	"receita_ingrediente":             {Tabela: "receita_ingrediente", PK: []string{"id"}, Serial: true, Conflito: []string{"produto_fabricado_id", "insumo_id"}, Ordem: "id"},
	"produto_adicional":               {Tabela: "produto_adicional", PK: []string{"produto_fabricado_id", "adicional_id"}, Serial: false, Ordem: "produto_fabricado_id"},
	"produto_venda":                   {Tabela: "produto_venda", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "nome"},
	"produto_venda_item":              {Tabela: "produto_venda_item", PK: []string{"id"}, Serial: true, Conflito: []string{"produto_venda_id", "nome"}, Ordem: "produto_venda_id, ordem"},
	"pacote":                          {Tabela: "pacote", PK: []string{"id"}, Serial: true, Conflito: []string{"codigo"}, Ordem: "nome"},
	"pacote_item":                     {Tabela: "pacote_item", PK: []string{"pacote_id", "tipo", "padrao_id"}, Serial: false, Ordem: "pacote_id, tipo, ordem"},
}

var padraoColunasCache sync.Map

func (h *PadraoHandler) obterDef(tabela string) (padraoTabelaDef, bool) {
	def, ok := padraoTabelasDef[tabela]
	return def, ok
}

// Listar retorna todas as linhas da tabela padrao em JSON.
func (h *PadraoHandler) Listar(w http.ResponseWriter, r *http.Request) {
	def, ok := h.obterDef(chi.URLParam(r, "tabela"))
	if !ok {
		jsonError(w, "Tabela padrao invalida", http.StatusNotFound)
		return
	}

	ordem := def.Ordem
	if ordem == "" {
		ordem = "1"
	}
	query := fmt.Sprintf(
		`SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM padrao.%s ORDER BY %s) t`,
		def.Tabela, ordem)

	var raw []byte
	if err := h.Pool.QueryRow(r.Context(), query).Scan(&raw); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(raw)
}

// Salvar insere ou atualiza registros da tabela padrao.
func (h *PadraoHandler) Salvar(w http.ResponseWriter, r *http.Request) {
	def, ok := h.obterDef(chi.URLParam(r, "tabela"))
	if !ok {
		jsonError(w, "Tabela padrao invalida", http.StatusNotFound)
		return
	}

	items, err := h.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	colunas, err := h.colunasTabela(r.Context(), def.Tabela)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		if def.Serial && id > 0 {
			if err := salvarPadraoAtualizar(r.Context(), tx, def, colunas, item, id); err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			continue
		}
		if err := salvarPadraoInserir(r.Context(), tx, def, colunas, item); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro(s) salvo(s) com sucesso"})
}

// Excluir remove um registro. Tabelas seriais usam ?id=; tabelas com chave
// composta usam os nomes das colunas da PK como query string.
func (h *PadraoHandler) Excluir(w http.ResponseWriter, r *http.Request) {
	def, ok := h.obterDef(chi.URLParam(r, "tabela"))
	if !ok {
		jsonError(w, "Tabela padrao invalida", http.StatusNotFound)
		return
	}

	var where []string
	var args []interface{}

	if def.Serial {
		id := parseInt(r.URL.Query().Get("id"), 0)
		if id == 0 {
			jsonError(w, "ID nao informado", http.StatusBadRequest)
			return
		}
		where = append(where, "id = $1")
		args = append(args, id)
	} else {
		for i, col := range def.PK {
			v := r.URL.Query().Get(col)
			if v == "" {
				jsonError(w, fmt.Sprintf("Parametro '%s' e obrigatorio", col), http.StatusBadRequest)
				return
			}
			where = append(where, fmt.Sprintf("%s = $%d", col, i+1))
			if n, err := strconv.Atoi(v); err == nil {
				args = append(args, n)
			} else {
				args = append(args, v)
			}
		}
	}

	query := fmt.Sprintf("DELETE FROM padrao.%s WHERE %s", def.Tabela, strings.Join(where, " AND "))
	tag, err := h.Pool.Exec(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nao encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro excluido com sucesso"})
}

func salvarPadraoInserir(ctx context.Context, tx pgx.Tx, def padraoTabelaDef, colunas map[string]string, item map[string]interface{}) error {
	var cols []string
	var vals []interface{}
	var phs []string
	idx := 1

	for col, tipo := range colunas {
		if col == "id" || col == "created_at" || col == "updated_at" || col == "versao" {
			continue
		}
		raw, ok := obterCampoPadrao(item, col)
		if !ok {
			continue
		}
		cols = append(cols, col)
		vals = append(vals, converterValorPadrao(raw, tipo))
		phs = append(phs, fmt.Sprintf("$%d", idx))
		idx++
	}

	if len(cols) == 0 {
		return fmt.Errorf("nenhum campo valido informado")
	}

	query := fmt.Sprintf("INSERT INTO padrao.%s (%s) VALUES (%s)",
		def.Tabela, strings.Join(cols, ", "), strings.Join(phs, ", "))

	if len(def.Conflito) > 0 {
		query += fmt.Sprintf(" ON CONFLICT (%s) DO NOTHING", strings.Join(def.Conflito, ", "))
	} else if !def.Serial && len(def.PK) > 0 {
		var sets []string
		for _, col := range cols {
			if !contemString(def.PK, col) {
				sets = append(sets, fmt.Sprintf("%s = EXCLUDED.%s", col, col))
			}
		}
		if len(sets) > 0 {
			query += fmt.Sprintf(" ON CONFLICT (%s) DO UPDATE SET %s",
				strings.Join(def.PK, ", "), strings.Join(sets, ", "))
		} else {
			query += " ON CONFLICT DO NOTHING"
		}
	} else {
		query += " ON CONFLICT DO NOTHING"
	}

	_, err := tx.Exec(ctx, query, vals...)
	return err
}

func salvarPadraoAtualizar(ctx context.Context, tx pgx.Tx, def padraoTabelaDef, colunas map[string]string, item map[string]interface{}, id int) error {
	var sets []string
	var vals []interface{}
	idx := 1

	for col, tipo := range colunas {
		if col == "id" || col == "created_at" || col == "updated_at" || col == "versao" {
			continue
		}
		raw, ok := obterCampoPadrao(item, col)
		if !ok {
			continue
		}
		sets = append(sets, fmt.Sprintf("%s = $%d", col, idx))
		vals = append(vals, converterValorPadrao(raw, tipo))
		idx++
	}

	if len(sets) == 0 {
		return nil
	}

	if _, temVersao := colunas["versao"]; temVersao {
		sets = append(sets, "versao = versao + 1")
	}

	vals = append(vals, id)
	query := fmt.Sprintf("UPDATE padrao.%s SET %s WHERE id = $%d",
		def.Tabela, strings.Join(sets, ", "), idx)

	_, err := tx.Exec(ctx, query, vals...)
	return err
}

func (h *PadraoHandler) colunasTabela(ctx context.Context, tabela string) (map[string]string, error) {
	if v, ok := padraoColunasCache.Load(tabela); ok {
		return v.(map[string]string), nil
	}

	rows, err := h.Pool.Query(ctx,
		`SELECT column_name, data_type FROM information_schema.columns
		 WHERE table_schema = 'padrao' AND table_name = $1`, tabela)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	colunas := map[string]string{}
	for rows.Next() {
		var nome, tipo string
		if err := rows.Scan(&nome, &tipo); err != nil {
			return nil, err
		}
		colunas[nome] = tipo
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	padraoColunasCache.Store(tabela, colunas)
	return colunas, nil
}

func contemString(lista []string, alvo string) bool {
	for _, v := range lista {
		if v == alvo {
			return true
		}
	}
	return false
}

func obterCampoPadrao(item map[string]interface{}, col string) (interface{}, bool) {
	if v, ok := item[col]; ok {
		return v, true
	}
	camel := snakeToCamel(col)
	if camel != col {
		if v, ok := item[camel]; ok {
			return v, true
		}
	}
	return nil, false
}

func converterValorPadrao(v interface{}, tipo string) interface{} {
	if v == nil {
		return nil
	}

	switch tipo {
	case "integer", "bigint", "smallint":
		switch x := v.(type) {
		case json.Number:
			n, _ := x.Int64()
			return n
		case float64:
			return int64(x)
		case int:
			return int64(x)
		case int64:
			return x
		case string:
			if n, err := strconv.ParseInt(x, 10, 64); err == nil {
				return n
			}
			return nil
		case bool:
			if x {
				return int64(1)
			}
			return int64(0)
		}
	case "numeric", "real", "double precision":
		switch x := v.(type) {
		case json.Number:
			f, _ := x.Float64()
			return f
		case float64:
			return x
		case int:
			return float64(x)
		case int64:
			return float64(x)
		case string:
			if f, err := strconv.ParseFloat(x, 64); err == nil {
				return f
			}
			return nil
		}
	case "boolean":
		switch x := v.(type) {
		case bool:
			return x
		case string:
			return x == "true" || x == "1"
		case json.Number:
			f, _ := x.Float64()
			return f != 0
		case float64:
			return x != 0
		}
	default:
		switch x := v.(type) {
		case json.Number:
			return x.String()
		case string:
			return x
		case bool:
			if x {
				return "true"
			}
			return "false"
		case float64:
			return strconv.FormatFloat(x, 'f', -1, 64)
		}
	}
	return v
}

// ---------- Replicacao ----------

type padraoResumo struct {
	Tabela     string `json:"tabela"`
	Inseridos  int    `json:"inseridos"`
	Existentes int    `json:"existentes"`
	Ignorados  int    `json:"ignorados"`
}

// Replicar copia o catalogo padrao para uma empresa (somente superadmin).
// Body: { "empresa_id": 1, "pacote_id": 1 } (pacote_id opcional).
func (h *PadraoHandler) Replicar(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}

	var body struct {
		EmpresaID int `json:"empresa_id"`
		PacoteID  int `json:"pacote_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	if body.EmpresaID == 0 {
		jsonError(w, "empresa_id e obrigatorio", http.StatusBadRequest)
		return
	}

	var empresaNome string
	err := h.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(NULLIF(fantasia, ''), razao_social) FROM public.empresa WHERE id = $1`,
		body.EmpresaID).Scan(&empresaNome)
	if err != nil {
		jsonError(w, "Empresa nao encontrada", http.StatusNotFound)
		return
	}

	var filtro map[string]map[int]bool
	if body.PacoteID > 0 {
		filtro = map[string]map[int]bool{}
		rows, err := h.Pool.Query(r.Context(),
			`SELECT tipo, padrao_id FROM padrao.pacote_item WHERE pacote_id = $1`, body.PacoteID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for rows.Next() {
			var tipo string
			var padraoID int
			if err := rows.Scan(&tipo, &padraoID); err != nil {
				rows.Close()
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if filtro[tipo] == nil {
				filtro[tipo] = map[int]bool{}
			}
			filtro[tipo][padraoID] = true
		}
		rows.Close()
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var resumo []padraoResumo
	etapas := []func(context.Context, pgx.Tx, int, map[string]map[int]bool) (padraoResumo, error){
		h.replicarMarcas,
		h.replicarClassificacoes,
		h.replicarInsumos,
		h.replicarAdicionais,
		h.replicarAdicionalClassificacao,
		h.replicarCustosAdicionais,
		h.replicarProdutosFabricados,
		h.replicarReceitas,
		h.replicarProdutoAdicional,
		h.replicarProdutosVenda,
		h.replicarProdutoVendaItens,
	}

	for _, etapa := range etapas {
		res, err := etapa(r.Context(), tx, body.EmpresaID, filtro)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		resumo = append(resumo, res)
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{
		"mensagem":   "Cadastros padrao aplicados com sucesso",
		"empresa_id": body.EmpresaID,
		"empresa":    empresaNome,
		"resumo":     resumo,
	})
}

// AplicadosListar retorna, por tabela, quantos registros padrao ja foram
// aplicados na empresa informada.
func (h *PadraoHandler) AplicadosListar(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	empresaID := parseInt(r.URL.Query().Get("empresa_id"), 0)
	if empresaID == 0 {
		jsonError(w, "empresa_id e obrigatorio", http.StatusBadRequest)
		return
	}

	rows, err := h.Pool.Query(r.Context(), `
		SELECT tipo, COUNT(*) AS total, MAX(aplicado_em) AS ultimo
		FROM padrao.empresa_item
		WHERE empresa_id = $1
		GROUP BY tipo
		ORDER BY tipo`, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *PadraoHandler) aplicados(ctx context.Context, tx pgx.Tx, empresaID int, tipo string) (map[int]int, error) {
	m := map[int]int{}
	rows, err := tx.Query(ctx,
		`SELECT padrao_id, registro_id FROM padrao.empresa_item
		 WHERE empresa_id = $1 AND tipo = $2`, empresaID, tipo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var padraoID, registroID int
		if err := rows.Scan(&padraoID, &registroID); err != nil {
			return nil, err
		}
		m[padraoID] = registroID
	}
	return m, rows.Err()
}

func (h *PadraoHandler) registrar(ctx context.Context, tx pgx.Tx, empresaID int, tipo string, padraoID, registroID, versao int) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO padrao.empresa_item (empresa_id, tipo, padrao_id, registro_id, versao_aplicada)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (empresa_id, tipo, padrao_id) DO UPDATE
		SET registro_id = EXCLUDED.registro_id,
		    versao_aplicada = EXCLUDED.versao_aplicada,
		    aplicado_em = NOW()`,
		empresaID, tipo, padraoID, registroID, versao)
	return err
}

func filtroInclui(filtro map[string]map[int]bool, tipo string, id int) bool {
	if filtro == nil {
		return true
	}
	conj, ok := filtro[tipo]
	if !ok {
		return false
	}
	return conj[id]
}

func (h *PadraoHandler) replicarMarcas(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "marca"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "marca")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `SELECT id, nome, ativo, versao FROM padrao.marca ORDER BY id`)
	if err != nil {
		return res, err
	}
	type item struct {
		id     int
		nome   string
		ativo  bool
		versao int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.ativo, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "marca", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		rid, err := database.GerarID(ctx, tx, empresaID, "marca")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO marca (empresa_id, id, nome, ativo) VALUES ($1, $2, $3, $4)`,
			empresaID, rid, x.nome, x.ativo); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "marca", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarClassificacoes(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "produto_classificacao"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "produto_classificacao")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `SELECT id, nome, status, versao FROM padrao.produto_classificacao ORDER BY ordem, nome`)
	if err != nil {
		return res, err
	}
	type item struct {
		id     int
		nome   string
		status int
		versao int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.status, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "produto_classificacao", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		rid, err := database.GerarID(ctx, tx, empresaID, "produto_classificacao")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO produto_classificacao (empresa_id, id, nome, status) VALUES ($1, $2, $3, $4)`,
			empresaID, rid, x.nome, x.status); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "produto_classificacao", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarInsumos(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "insumo"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "insumo")
	if err != nil {
		return res, err
	}
	marcas, err := h.aplicados(ctx, tx, empresaID, "marca")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, nome, unidade_medida, custo_medio, marca_id, ativo, status, versao
		FROM padrao.insumo ORDER BY nome`)
	if err != nil {
		return res, err
	}
	type item struct {
		id      int
		nome    string
		unidade string
		custo   float64
		marcaID sql.NullInt64
		ativo   bool
		status  int
		versao  int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.unidade, &x.custo, &x.marcaID, &x.ativo, &x.status, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "insumo", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		var marcaID interface{}
		if x.marcaID.Valid {
			if v, ok := marcas[int(x.marcaID.Int64)]; ok {
				marcaID = v
			}
		}
		rid, err := database.GerarID(ctx, tx, empresaID, "insumo")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO insumo (empresa_id, id, nome, unidade_medida, custo_medio, ativo, status, id_marca)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			empresaID, rid, x.nome, x.unidade, x.custo, x.ativo, x.status, marcaID); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "insumo", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarAdicionais(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "adicional"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "adicional")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `SELECT id, nome, descricao, preco, ativo, versao FROM padrao.adicional ORDER BY nome`)
	if err != nil {
		return res, err
	}
	type item struct {
		id        int
		nome      string
		descricao sql.NullString
		preco     float64
		ativo     bool
		versao    int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.descricao, &x.preco, &x.ativo, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "adicional", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		var descricao interface{}
		if x.descricao.Valid {
			descricao = x.descricao.String
		}
		rid, err := database.GerarID(ctx, tx, empresaID, "adicional")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO adicional (empresa_id, id, nome, descricao, preco, ativo) VALUES ($1, $2, $3, $4, $5, $6)`,
			empresaID, rid, x.nome, descricao, x.preco, x.ativo); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "adicional", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarAdicionalClassificacao(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "adicional_produto_classificacao"}
	adicionais, err := h.aplicados(ctx, tx, empresaID, "adicional")
	if err != nil {
		return res, err
	}
	classificacoes, err := h.aplicados(ctx, tx, empresaID, "produto_classificacao")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT adicional_id, produto_classificacao_id, status
		FROM padrao.adicional_produto_classificacao`)
	if err != nil {
		return res, err
	}
	type item struct {
		adicionalID int
		classID     int
		status      int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.adicionalID, &x.classID, &x.status); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if filtro != nil && (!filtroInclui(filtro, "adicional", x.adicionalID) || !filtroInclui(filtro, "produto_classificacao", x.classID)) {
			res.Ignorados++
			continue
		}
		adID, ok1 := adicionais[x.adicionalID]
		clID, ok2 := classificacoes[x.classID]
		if !ok1 || !ok2 {
			res.Ignorados++
			continue
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO adicional_produto_classificacao (empresa_id, adicional_id, produto_classificacao_id, status)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (empresa_id, adicional_id, produto_classificacao_id) DO NOTHING`,
			empresaID, adID, clID, x.status)
		if err != nil {
			return res, err
		}
		if tag.RowsAffected() > 0 {
			res.Inseridos++
		} else {
			res.Existentes++
		}
	}
	return res, nil
}

func (h *PadraoHandler) replicarCustosAdicionais(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "custo_adicional_tipo"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "custo_adicional_tipo")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `SELECT id, nome, ativo, versao FROM padrao.custo_adicional_tipo ORDER BY nome`)
	if err != nil {
		return res, err
	}
	type item struct {
		id     int
		nome   string
		ativo  bool
		versao int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.ativo, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "custo_adicional_tipo", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		rid, err := database.GerarID(ctx, tx, empresaID, "custo_adicional_tipo")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO custo_adicional_tipo (empresa_id, id, nome, ativo) VALUES ($1, $2, $3, $4)`,
			empresaID, rid, x.nome, x.ativo); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "custo_adicional_tipo", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarProdutosFabricados(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "produto_fabricado"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "produto_fabricado")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, nome, descricao, rendimento, unidade_medida, custo_unitario,
		       margem_lucro, valor_venda_sugerido, preco, foto, ativo, versao
		FROM padrao.produto_fabricado ORDER BY nome`)
	if err != nil {
		return res, err
	}
	type item struct {
		id         int
		nome       string
		descricao  sql.NullString
		rendimento sql.NullFloat64
		unidade    string
		custo      float64
		margem     float64
		valor      float64
		preco      sql.NullFloat64
		foto       sql.NullString
		ativo      bool
		versao     int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.descricao, &x.rendimento, &x.unidade, &x.custo,
			&x.margem, &x.valor, &x.preco, &x.foto, &x.ativo, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "produto_fabricado", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}

		var descricao, foto, rendimento, preco interface{}
		if x.descricao.Valid {
			descricao = x.descricao.String
		}
		if x.foto.Valid {
			foto = x.foto.String
		}
		if x.rendimento.Valid {
			rendimento = x.rendimento.Float64
		}
		if x.preco.Valid {
			preco = x.preco.Float64
		}

		rid, err := database.GerarID(ctx, tx, empresaID, "produto_fabricado")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO produto_fabricado
				(empresa_id, id, nome, descricao, rendimento, unidade_medida, custo_unitario,
				 margem_lucro, valor_venda_sugerido, preco, foto, ativo)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			empresaID, rid, x.nome, descricao, rendimento, x.unidade, x.custo,
			x.margem, x.valor, preco, foto, x.ativo); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "produto_fabricado", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarReceitas(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "receita_ingrediente"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "receita_ingrediente")
	if err != nil {
		return res, err
	}
	produtos, err := h.aplicados(ctx, tx, empresaID, "produto_fabricado")
	if err != nil {
		return res, err
	}
	insumos, err := h.aplicados(ctx, tx, empresaID, "insumo")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, produto_fabricado_id, insumo_id, quantidade
		FROM padrao.receita_ingrediente ORDER BY id`)
	if err != nil {
		return res, err
	}
	type item struct {
		id         int
		produtoID  int
		insumoID   int
		quantidade float64
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.produtoID, &x.insumoID, &x.quantidade); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "receita_ingrediente", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		produtoID, ok1 := produtos[x.produtoID]
		insumoID, ok2 := insumos[x.insumoID]
		if !ok1 || !ok2 {
			res.Ignorados++
			continue
		}
		rid, err := database.GerarID(ctx, tx, empresaID, "receita_ingrediente")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO receita_ingrediente (empresa_id, id, produto_fabricado_id, insumo_id, quantidade)
			VALUES ($1, $2, $3, $4, $5)`,
			empresaID, rid, produtoID, insumoID, x.quantidade); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "receita_ingrediente", x.id, rid, 1); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarProdutoAdicional(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "produto_adicional"}
	produtos, err := h.aplicados(ctx, tx, empresaID, "produto_fabricado")
	if err != nil {
		return res, err
	}
	adicionais, err := h.aplicados(ctx, tx, empresaID, "adicional")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT produto_fabricado_id, adicional_id FROM padrao.produto_adicional`)
	if err != nil {
		return res, err
	}
	type item struct {
		produtoID   int
		adicionalID int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.produtoID, &x.adicionalID); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if filtro != nil && (!filtroInclui(filtro, "produto_fabricado", x.produtoID) || !filtroInclui(filtro, "adicional", x.adicionalID)) {
			res.Ignorados++
			continue
		}
		produtoID, ok1 := produtos[x.produtoID]
		adicionalID, ok2 := adicionais[x.adicionalID]
		if !ok1 || !ok2 {
			res.Ignorados++
			continue
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO produto_adicional (empresa_id, produto_fabricado_id, adicional_id)
			VALUES ($1, $2, $3)
			ON CONFLICT (empresa_id, produto_fabricado_id, adicional_id) DO NOTHING`,
			empresaID, produtoID, adicionalID)
		if err != nil {
			return res, err
		}
		if tag.RowsAffected() > 0 {
			res.Inseridos++
		} else {
			res.Existentes++
		}
	}
	return res, nil
}

func (h *PadraoHandler) replicarProdutosVenda(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "produto_venda"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "produto_venda")
	if err != nil {
		return res, err
	}
	produtos, err := h.aplicados(ctx, tx, empresaID, "produto_fabricado")
	if err != nil {
		return res, err
	}
	classificacoes, err := h.aplicados(ctx, tx, empresaID, "produto_classificacao")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, nome, descricao, preco, produto_fabricado_id, produto_classificacao_id, foto, ativo, versao
		FROM padrao.produto_venda ORDER BY nome`)
	if err != nil {
		return res, err
	}
	type item struct {
		id        int
		nome      string
		descricao sql.NullString
		preco     float64
		produtoID sql.NullInt64
		classID   sql.NullInt64
		foto      sql.NullString
		ativo     bool
		versao    int
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.nome, &x.descricao, &x.preco, &x.produtoID, &x.classID, &x.foto, &x.ativo, &x.versao); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "produto_venda", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}

		var descricao, foto, produtoID, classID interface{}
		if x.descricao.Valid {
			descricao = x.descricao.String
		}
		if x.foto.Valid {
			foto = x.foto.String
		}
		if x.produtoID.Valid {
			if v, ok := produtos[int(x.produtoID.Int64)]; ok {
				produtoID = v
			}
		}
		if x.classID.Valid {
			if v, ok := classificacoes[int(x.classID.Int64)]; ok {
				classID = v
			}
		}

		rid, err := database.GerarID(ctx, tx, empresaID, "produto_venda")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO produto_venda
				(empresa_id, id, nome, descricao, preco, produto_fabricado_id, produto_classificacao_id, foto, ativo)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			empresaID, rid, x.nome, descricao, x.preco, produtoID, classID, foto, x.ativo); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "produto_venda", x.id, rid, x.versao); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}

func (h *PadraoHandler) replicarProdutoVendaItens(ctx context.Context, tx pgx.Tx, empresaID int, filtro map[string]map[int]bool) (padraoResumo, error) {
	res := padraoResumo{Tabela: "produto_venda_item"}
	aplicado, err := h.aplicados(ctx, tx, empresaID, "produto_venda_item")
	if err != nil {
		return res, err
	}
	produtos, err := h.aplicados(ctx, tx, empresaID, "produto_venda")
	if err != nil {
		return res, err
	}
	adicionais, err := h.aplicados(ctx, tx, empresaID, "adicional")
	if err != nil {
		return res, err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, produto_venda_id, nome, pode_remover, pode_adicionar, adicional_id, ordem, ativo
		FROM padrao.produto_venda_item ORDER BY produto_venda_id, ordem`)
	if err != nil {
		return res, err
	}
	type item struct {
		id          int
		produtoID   int
		nome        string
		remover     bool
		adicionar   bool
		adicionalID sql.NullInt64
		ordem       int
		ativo       bool
	}
	var lista []item
	for rows.Next() {
		var x item
		if err := rows.Scan(&x.id, &x.produtoID, &x.nome, &x.remover, &x.adicionar, &x.adicionalID, &x.ordem, &x.ativo); err != nil {
			rows.Close()
			return res, err
		}
		lista = append(lista, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}

	for _, x := range lista {
		if !filtroInclui(filtro, "produto_venda_item", x.id) {
			res.Ignorados++
			continue
		}
		if _, ok := aplicado[x.id]; ok {
			res.Existentes++
			continue
		}
		produtoID, ok := produtos[x.produtoID]
		if !ok {
			res.Ignorados++
			continue
		}
		var adicionalID interface{}
		if x.adicionalID.Valid {
			if v, ok := adicionais[int(x.adicionalID.Int64)]; ok {
				adicionalID = v
			}
		}

		rid, err := database.GerarID(ctx, tx, empresaID, "produto_venda_item")
		if err != nil {
			return res, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO produto_venda_item
				(empresa_id, id, produto_venda_id, nome, pode_remover, pode_adicionar, adicional_id, ordem, ativo)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			empresaID, rid, produtoID, x.nome, x.remover, x.adicionar, adicionalID, x.ordem, x.ativo); err != nil {
			return res, err
		}
		if err := h.registrar(ctx, tx, empresaID, "produto_venda_item", x.id, rid, 1); err != nil {
			return res, err
		}
		res.Inseridos++
	}
	return res, nil
}
