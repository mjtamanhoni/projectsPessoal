package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

func parseInt(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

func JsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"erro": msg})
}

func JsonSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	JsonError(w, msg, status)
}

func jsonSuccess(w http.ResponseWriter, data interface{}) {
	JsonSuccess(w, data)
}

func hashSenha(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

// --- Fornecedor ---
func (h *BasicCRUD) FornecedorListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")
	email := r.URL.Query().Get("email")

	query := `SELECT id, empresa_id, nome, telefone, celular, endereco, email, cnpj_cpf, usuario_id
		FROM public.fornecedor WHERE 1=1`
	var args []interface{}
	argN := 1

	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	if email != "" {
		query += fmt.Sprintf(" AND upper(email) = upper($%d)", argN); argN++; args = append(args, email)
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := rowsToMap(rows)
	jsonSuccess(w, result)
}

func (h *BasicCRUD) FornecedorAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "", "fornecedor",
		[]string{"nome", "telefone", "celular", "endereco", "email", "cnpj_cpf", "usuario_id"})
}

func (h *BasicCRUD) FornecedorExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)

	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}

	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM fornecedor WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Fornecedor excluído com sucesso"})
}

// --- Cliente ---
func (h *BasicCRUD) ClienteListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")
	email := r.URL.Query().Get("email")

	query := `SELECT id, empresa_id, nome, telefone, celular, endereco, email, cnpj_cpf, usuario_id
		FROM public.cliente WHERE 1=1`
	var args []interface{}
	argN := 1

	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	if email != "" {
		query += fmt.Sprintf(" AND upper(email) = upper($%d)", argN); argN++; args = append(args, email)
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY id"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}
func (h *BasicCRUD) ClienteAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "", "cliente",
		[]string{"nome", "telefone", "celular", "endereco", "email", "cnpj_cpf", "usuario_id"})
}

func (h *BasicCRUD) ClienteExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM cliente WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Cliente excluído com sucesso"})
}

// --- Marca ---
func (h *BasicCRUD) MarcaListar(w http.ResponseWriter, r *http.Request) {
	h.Listar(w, r, "public", "marca", "", "id, empresa_id, nome, ativo", "")
}

func (h *BasicCRUD) MarcaAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "public", "marca", []string{"nome", "ativo"})
}

func (h *BasicCRUD) MarcaExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM marca WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Marca excluída com sucesso"})
}

// --- Categoria Pagar ---
func (h *BasicCRUD) CategoriaPagarListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT * FROM categoria_pagar WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) CategoriaPagarAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "gestor", "categoria_pagar",
		[]string{"nome", "descricao", "ativo", "usuario_id"})
}

func (h *BasicCRUD) CategoriaPagarExcluir(w http.ResponseWriter, r *http.Request) {
	h.genericDelete(w, r, "categoria_pagar")
}

// --- Categoria Receber ---
func (h *BasicCRUD) CategoriaReceberListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT * FROM categoria_receber WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) CategoriaReceberAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "gestor", "categoria_receber",
		[]string{"nome", "descricao", "ativo", "usuario_id"})
}

func (h *BasicCRUD) CategoriaReceberExcluir(w http.ResponseWriter, r *http.Request) {
	h.genericDelete(w, r, "categoria_receber")
}

// --- Usuario ---
func (h *BasicCRUD) UsuarioListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	isSuperadmin := middleware.GetIsSuperadmin(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")
	email := r.URL.Query().Get("email")

	query := `SELECT id, nome, email, is_superadmin FROM usuario WHERE (empresa_id = $1 OR $1 = 0)`
	var args []interface{}
	argN := 2
	if !isSuperadmin {
		query += fmt.Sprintf(" AND is_superadmin = $%d", argN)
		args = append(args, false)
		argN++
	}
	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	if email != "" {
		query += fmt.Sprintf(" AND upper(email) = upper($%d)", argN); argN++; args = append(args, email)
	}
	query += " ORDER BY id"
	rows, err := h.Pool.Query(r.Context(), query, append([]interface{}{empresaID}, args...)...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) UsuarioAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.parseBody(r)
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
		nome := item["nome"].(string)
		email := getStr(item, "email")
		senha := getStr(item, "senha")
		pin := getStr(item, "pin")
		isSuperadmin := false
		if v, ok := item["is_superadmin"]; ok {
			isSuperadmin, _ = v.(bool)
		}

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, "usuario")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}

			cols := []string{"id", "empresa_id", "nome"}
			vals := []interface{}{id, empresaID, nome}
			phs := []string{"$1", "$2", "$3"}
			paramIdx := 4

			if email != "" {
				cols = append(cols, "email")
				vals = append(vals, email)
				phs = append(phs, fmt.Sprintf("$%d", paramIdx))
				paramIdx++
			}
			if senha != "" {
				cols = append(cols, "senha")
				vals = append(vals, hashSenha(senha))
				phs = append(phs, fmt.Sprintf("$%d", paramIdx))
				paramIdx++
			}
			if pin != "" {
				cols = append(cols, "pin")
				vals = append(vals, hashSenha(pin))
				phs = append(phs, fmt.Sprintf("$%d", paramIdx))
				paramIdx++
			}
			cols = append(cols, "is_superadmin")
			vals = append(vals, isSuperadmin)
			phs = append(phs, fmt.Sprintf("$%d", paramIdx))
			paramIdx++

			err = tx.QueryRow(r.Context(),
				fmt.Sprintf("INSERT INTO usuario (%s) VALUES (%s) RETURNING id",
					strings.Join(cols, ", "), strings.Join(phs, ", ")), vals...).Scan(&id)
		} else {
			setClauses := []string{}
			vals := []interface{}{}
			paramIdx := 1

			setClauses = append(setClauses, fmt.Sprintf("nome = $%d", paramIdx))
			vals = append(vals, nome)
			paramIdx++

			if email != "" {
				setClauses = append(setClauses, fmt.Sprintf("email = $%d", paramIdx))
				vals = append(vals, email)
				paramIdx++
			}
			if senha != "" {
				setClauses = append(setClauses, fmt.Sprintf("senha = $%d", paramIdx))
				vals = append(vals, hashSenha(senha))
				paramIdx++
			}
			if pin != "" {
				setClauses = append(setClauses, fmt.Sprintf("pin = $%d", paramIdx))
				vals = append(vals, hashSenha(pin))
				paramIdx++
			}
			setClauses = append(setClauses, fmt.Sprintf("is_superadmin = $%d", paramIdx))
			vals = append(vals, isSuperadmin)
			paramIdx++

			vals = append(vals, id, empresaID)
			_, err = tx.Exec(r.Context(),
				fmt.Sprintf("UPDATE usuario SET %s WHERE id = $%d AND empresa_id = $%d",
					strings.Join(setClauses, ", "), paramIdx, paramIdx+1), vals...)
		}

		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Usuário(s) salvo(s) com sucesso"})
}

func (h *BasicCRUD) UsuarioExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM usuario WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Usuário excluído com sucesso"})
}

func (h *BasicCRUD) UsuarioAlterarSenha(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID         int    `json:"id"`
		SenhaAtual string `json:"senha_atual"`
		NovaSenha  string `json:"nova_senha"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaID(r)

	var senhaHash string
	err := h.Pool.QueryRow(r.Context(),
		`SELECT senha FROM usuario WHERE id = $1 AND empresa_id = $2`, body.ID, empresaID).Scan(&senhaHash)
	if err != nil {
		jsonError(w, "Usuário não encontrado", http.StatusNotFound)
		return
	}
	if hashSenha(body.SenhaAtual) != senhaHash {
		jsonError(w, "Senha atual inválida", http.StatusUnauthorized)
		return
	}

	_, err = h.Pool.Exec(r.Context(),
		`UPDATE usuario SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
		hashSenha(body.NovaSenha), body.ID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Senha alterada com sucesso"})
}

func (h *BasicCRUD) UsuarioAlterarPin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID      int    `json:"id"`
		NovoPin string `json:"novo_pin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	_, err := h.Pool.Exec(r.Context(),
		`UPDATE usuario SET pin = $1 WHERE id = $2 AND empresa_id = $3`,
		hashSenha(body.NovoPin), body.ID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "PIN alterado com sucesso"})
}

// --- Servico ---
func (h *BasicCRUD) ServicoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT * FROM servico WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += fmt.Sprintf(" AND (empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) ServicoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "servicos", "servico",
		[]string{"nome", "horas_minimas", "valor_hora", "usuario_id"})
}

func (h *BasicCRUD) ServicoExcluir(w http.ResponseWriter, r *http.Request) {
	h.genericDelete(w, r, "servico")
}

// --- Empresa Pública ---
func (h *BasicCRUD) EmpresaListarPublico(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(), `SELECT id, razao_social, fantasia FROM public.empresa ORDER BY id`)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

// --- Empresa ---
func (h *BasicCRUD) EmpresaListar(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT e.id, e.razao_social as nome, e.razao_social, e.fantasia,
		e.cnpj_cpf, e.inscricao_estadual_identidade, e.regime_tributario,
		e.endereco, e.telefone, e.celular, e.email
		FROM public.empresa e WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND e.id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(e.razao_social) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += " ORDER BY e.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) EmpresaAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		razaoSocial := item["razao_social"].(string)
		fantasia := getStr(item, "fantasia")
		cnpjCpf := getStr(item, "cnpj_cpf")
		inscricaoEstadual := getStr(item, "inscricao_estadual_identidade")
		regimeTributario := getStr(item, "regime_tributario")
		endereco := getStr(item, "endereco")
		telefone := getStr(item, "telefone")
		celular := getStr(item, "celular")
		email := getStr(item, "email")

		if id == 0 {
			err = tx.QueryRow(r.Context(),
				`INSERT INTO public.empresa (razao_social, fantasia, cnpj_cpf, inscricao_estadual_identidade,
					regime_tributario, endereco, telefone, celular, email)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
				razaoSocial, fantasia, cnpjCpf, inscricaoEstadual, regimeTributario, endereco, telefone, celular, email,
			).Scan(&id)
		} else {
			_, err = tx.Exec(r.Context(), `
				UPDATE public.empresa SET razao_social=$1, fantasia=$2, cnpj_cpf=$3,
					inscricao_estadual_identidade=$4, regime_tributario=$5, endereco=$6,
					telefone=$7, celular=$8, email=$9
				WHERE id=$10`,
				razaoSocial, fantasia, cnpjCpf, inscricaoEstadual, regimeTributario, endereco, telefone, celular, email, id)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	tx.Commit(r.Context())
	_ = usuarioID
	jsonSuccess(w, map[string]interface{}{"mensagem": "Empresa salva com sucesso"})
}

func (h *BasicCRUD) EmpresaExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "ID não informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM public.empresa WHERE id = $1`, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro não encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Empresa excluída com sucesso"})
}

func (h *BasicCRUD) EmpresaAtualizarSequencias(w http.ResponseWriter, r *http.Request) {
	tabelas := []string{
		"fornecedor", "cliente", "categoria_pagar", "categoria_receber",
		"servico", "usuario", "usuario_formulario", "empresa_modulo",
		"contas_pagar", "contas_receber", "horas_trabalhadas",
		"horas_abatidas", "horas_excedidas", "insumo", "produto_fabricado",
		"receita_ingrediente", "custo_adicional_tipo", "fabricacao_custo_adicional",
		"estoque_insumo", "estoque_produto_fabricado", "compra_insumo",
		"fabricacao", "venda_produto", "venda_produto_item", "usuario_formulario_permissao",
	}
	tabelasGlobais := []string{
		"formulario", "modulo", "modulo_formulario",
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	total := 0

	// Obtém todos os empresa_id distintos
	empRows, err := tx.Query(r.Context(), `SELECT DISTINCT empresa_id FROM empresa_sequences ORDER BY empresa_id`)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var empresaIDs []int
	for empRows.Next() {
		var eid int
		empRows.Scan(&eid)
		empresaIDs = append(empresaIDs, eid)
	}
	empRows.Close()

	// Se não houver registros, busca das tabelas
	if len(empresaIDs) == 0 {
		rows, err := tx.Query(r.Context(), `SELECT DISTINCT empresa_id FROM usuario WHERE empresa_id IS NOT NULL ORDER BY empresa_id`)
		if err == nil {
			for rows.Next() {
				var eid int
				rows.Scan(&eid)
				empresaIDs = append(empresaIDs, eid)
			}
			rows.Close()
		}
		// Garante empresa_id = 0 para globais
		empresaIDs = append(empresaIDs, 0)
	}

	if len(empresaIDs) == 0 {
		// fallback: usa empresa 1 e 0
		empresaIDs = []int{0, 1}
	}

	for _, eid := range empresaIDs {
		var lista []string
		if eid == 0 {
			lista = tabelasGlobais
		} else {
			lista = tabelas
		}
		for _, tabela := range lista {
			var maxID int
			if eid == 0 {
				err = tx.QueryRow(r.Context(),
					fmt.Sprintf("SELECT COALESCE(MAX(id), 0) FROM %s", tabela)).Scan(&maxID)
			} else {
				err = tx.QueryRow(r.Context(),
					fmt.Sprintf("SELECT COALESCE(MAX(id), 0) FROM %s WHERE empresa_id = $1", tabela), eid).Scan(&maxID)
			}
			if err != nil {
				continue
			}
			_, err = tx.Exec(r.Context(), `
				INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
				VALUES ($1, $2, $3)
				ON CONFLICT (empresa_id, tabela) DO UPDATE SET last_id = $3
			`, eid, tabela, maxID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			total++
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{
		"mensagem": fmt.Sprintf("Sequências atualizadas para %d tabela(s) em %d empresa(s)", total, len(empresaIDs)),
		"total":    total,
	})
}

func (h *BasicCRUD) EmpresaLimparDados(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa_id"), 0)
	if empresaID == 0 {
		var body struct {
			EmpresaID int `json:"empresa_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err == nil && body.EmpresaID > 0 {
			empresaID = body.EmpresaID
		}
	}
	if empresaID <= 0 {
		jsonError(w, "Código da Empresa não informado.", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	tables := []string{
		"horas_excedidas",
		"horas_abatidas",
		"horas_trabalhadas",
		"estoque_insumo",
		"estoque_produto_fabricado",
		"fabricacao_custo_adicional",
		"venda_produto_item",
		"venda_produto",
		"receita_ingrediente",
		"compra_insumo",
		"fabricacao",
		"contas_receber",
		"contas_pagar",
		"usuario_formulario_permissao",
		"usuario_formulario",
		"empresa_modulo",
		"servico",
		"custo_adicional_tipo",
		"produto_fabricado",
		"insumo",
		"categoria_receber",
		"categoria_pagar",
		"fornecedor",
		"cliente",
	}

	for _, table := range tables {
		_, err = tx.Exec(r.Context(),
			fmt.Sprintf("DELETE FROM %s WHERE empresa_id = $1", table), empresaID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Dados da empresa limpos com sucesso"})
}

// --- Formulario ---
func (h *BasicCRUD) FormularioListar(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT * FROM formulario WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += " ORDER BY id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) FormularioAtualizar(w http.ResponseWriter, r *http.Request) {
	h.globalUpsert(w, r, "formulario",
		[]string{"nome"})
}

func (h *BasicCRUD) FormularioExcluir(w http.ResponseWriter, r *http.Request) {
	h.globalExcluir(w, r, "formulario")
}

// --- Usuario Formulario ---
func (h *BasicCRUD) UsuarioFormularioListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	usuarioID := parseInt(r.URL.Query().Get("usuario_id"), 0)
	formularioID := parseInt(r.URL.Query().Get("formulario_id"), 0)

	query := `SELECT uf.*, f.nome as formulario_nome, u.nome as usuario_nome
		FROM public.usuario_formulario uf
		JOIN public.formulario f ON f.id = uf.formulario_id
		JOIN public.usuario u ON u.id = uf.usuario_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND uf.id = $%d", argN); argN++; args = append(args, id)
	}
	if usuarioID > 0 {
		query += fmt.Sprintf(" AND uf.usuario_id = $%d", argN); argN++; args = append(args, usuarioID)
	}
	if formularioID > 0 {
		query += fmt.Sprintf(" AND uf.formulario_id = $%d", argN); argN++; args = append(args, formularioID)
	}
	query += fmt.Sprintf(" AND (uf.empresa_id = $%d OR $%d = 0)", argN, argN); args = append(args, empresaID)
	query += " ORDER BY uf.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) UsuarioFormularioAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "public", "usuario_formulario",
		[]string{"usuario_id", "formulario_id"})
}

func (h *BasicCRUD) UsuarioFormularioExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaID(r)

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

	_, err = tx.Exec(r.Context(),
		"DELETE FROM public.usuario_formulario_permissao WHERE empresa_id = $1 AND usuario_formulario_id = $2",
		empresaID, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tag, err := tx.Exec(r.Context(),
		"DELETE FROM public.usuario_formulario WHERE id = $1 AND empresa_id = $2",
		id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nao encontrado", http.StatusNotFound)
		return
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Registro excluido com sucesso"})
}

// --- Permissao ---
func (h *BasicCRUD) PermissaoListar(w http.ResponseWriter, r *http.Request) {
	rows, err := h.Pool.Query(r.Context(),
		`SELECT * FROM permissao ORDER BY id`)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

// --- Usuario Formulario Permissao ---
func (h *BasicCRUD) UsuarioFormularioPermissaoListar(w http.ResponseWriter, r *http.Request) {
	ufID := parseInt(r.URL.Query().Get("usuario_formulario_id"), 0)
	empresaID := middleware.GetEmpresaID(r)

	query := `SELECT ufp.*, p.nome as permissao_nome
		FROM public.usuario_formulario_permissao ufp
		JOIN public.permissao p ON p.id = ufp.permissao_id
		WHERE ufp.usuario_formulario_id = $1 AND (ufp.empresa_id = $2 OR $2 = 0)
		ORDER BY ufp.id`
	rows, err := h.Pool.Query(r.Context(), query, ufID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) UsuarioFormularioPermissaoSalvar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UsuarioFormularioID int           `json:"usuario_formulario_id"`
		Permissoes          []interface{} `json:"permissoes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaID(r)
	usuarioID := middleware.GetUserID(r)

	if body.UsuarioFormularioID == 0 {
		jsonError(w, "usuario_formulario_id é obrigatório", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`DELETE FROM public.usuario_formulario_permissao WHERE usuario_formulario_id = $1`,
		body.UsuarioFormularioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, p := range body.Permissoes {
		permNome, ok := p.(string)
		if !ok {
			continue
		}
		var permID int
		err = tx.QueryRow(r.Context(),
			`SELECT id FROM public.permissao WHERE nome = $1`, permNome).Scan(&permID)
		if err != nil {
			continue
		}

		var newID int
		newID, err = database.GerarID(r.Context(), tx, empresaID, "usuario_formulario_permissao")
		if err != nil {
			jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
			return
		}
		err = tx.QueryRow(r.Context(),
			`INSERT INTO public.usuario_formulario_permissao (id, usuario_formulario_id, permissao_id, empresa_id, usuario_id)
			VALUES ($1,$2,$3,$4,$5) RETURNING id`,
			newID, body.UsuarioFormularioID, permID, empresaID, usuarioID).Scan(&newID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Permissões salvas com sucesso"})
}

func (h *BasicCRUD) UsuarioPermissoes(w http.ResponseWriter, r *http.Request) {
	usuarioID := middleware.GetUserID(r)
	empresaID := middleware.GetEmpresaID(r)

	rows, err := h.Pool.Query(r.Context(), `
		SELECT uf.id as uf_id, f.nome as formulario_nome, uf.formulario_start
		FROM public.usuario_formulario uf
		JOIN public.formulario f ON f.id = uf.formulario_id
		WHERE uf.usuario_id = $1 AND (uf.empresa_id = $2 OR $2 = 0)
		ORDER BY f.nome
	`, usuarioID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type formPerm struct {
		Nome            string   `json:"nome"`
		Permissoes      []string `json:"permissoes"`
		FormularioStart int      `json:"formulario_start"`
	}

	var result []formPerm
	for rows.Next() {
		var ufID int
		var formNome string
		var formularioStart int
		rows.Scan(&ufID, &formNome, &formularioStart)

		permRows, err := h.Pool.Query(r.Context(), `
			SELECT p.nome FROM public.usuario_formulario_permissao ufp
			JOIN public.permissao p ON p.id = ufp.permissao_id
			WHERE ufp.usuario_formulario_id = $1
		`, ufID)
		if err != nil {
			continue
		}

		var perms []string
		for permRows.Next() {
			var p string
			permRows.Scan(&p)
			perms = append(perms, p)
		}
		permRows.Close()

		if perms == nil {
			perms = []string{}
		}

		result = append(result, formPerm{Nome: formNome, Permissoes: perms, FormularioStart: formularioStart})
	}

	jsonSuccess(w, result)
}

// --- Modulo ---
func (h *BasicCRUD) ModuloListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT m.* FROM public.modulo m WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND m.id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(m.nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	query += fmt.Sprintf(` AND (m.id IN (SELECT em.modulo_id FROM public.empresa_modulo em
		WHERE em.empresa_id = $%d) OR $%d = 0)`, argN, argN)
	args = append(args, empresaID)
	query += " ORDER BY m.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) ModuloAtualizar(w http.ResponseWriter, r *http.Request) {
	h.globalUpsert(w, r, "modulo",
		[]string{"nome", "descricao"})
}

func (h *BasicCRUD) ModuloExcluir(w http.ResponseWriter, r *http.Request) {
	h.globalExcluir(w, r, "modulo")
}

// --- Modulo Formulario ---
func (h *BasicCRUD) ModuloFormularioListar(w http.ResponseWriter, r *http.Request) {
	moduloID := parseInt(r.URL.Query().Get("modulo_id"), 0)

	query := `SELECT mf.*, f.nome as formulario_nome
		FROM modulo_formulario mf
		JOIN formulario f ON f.id = mf.formulario_id
		WHERE 1=1`
	var args []interface{}
	argN := 1
	if moduloID > 0 {
		query += fmt.Sprintf(" AND mf.modulo_id = $%d", argN); argN++; args = append(args, moduloID)
	}
	query += " ORDER BY mf.id"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) ModuloFormularioSalvar(w http.ResponseWriter, r *http.Request) {
	h.globalUpsert(w, r, "modulo_formulario",
		[]string{"modulo_id", "formulario_id", "abertura"})
}

func (h *BasicCRUD) ModuloFormularioExcluir(w http.ResponseWriter, r *http.Request) {
	h.globalExcluir(w, r, "modulo_formulario")
}

// --- Empresa Modulo ---
func (h *BasicCRUD) EmpresaModuloListar(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa_id"), 0)
	if empresaID == 0 {
		empresaID = middleware.GetEmpresaID(r)
	}
	rows, err := h.Pool.Query(r.Context(), `
		SELECT em.*, m.nome as modulo_nome
		FROM public.empresa_modulo em
		JOIN public.modulo m ON m.id = em.modulo_id
		WHERE (em.empresa_id = $1 OR $1 = 0)
		ORDER BY em.id`, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) EmpresaModuloSalvar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "public", "empresa_modulo",
		[]string{"modulo_id", "empresa_id"})
}

func (h *BasicCRUD) EmpresaModuloExcluir(w http.ResponseWriter, r *http.Request) {
	h.genericDelete(w, r, "empresa_modulo")
}

// helpers
func getID(item map[string]interface{}) int {
	v, ok := item["id"]
	if !ok || v == nil {
		v, ok = item["codigo"]
		if !ok || v == nil {
			return 0
		}
	}
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case json.Number:
		n, _ := val.Int64()
		return int(n)
	default:
		return 0
	}
}

func getStr(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok && v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

type LancamentoAutomaticoConfig struct {
	CategoriaID       int
	DiasVencimento    int
	DescricaoTemplate string
}

func buildDescricao(template string, vars map[string]string) string {
	result := template
	for k, v := range vars {
		result = strings.ReplaceAll(result, k, v)
	}
	return result
}

func queryLancamentoConfig(ctx context.Context, pool *pgxpool.Pool, empresaID int, tipoOrigem string) (*LancamentoAutomaticoConfig, error) {
	var cfg LancamentoAutomaticoConfig
	err := pool.QueryRow(ctx, `
		SELECT categoria_id, COALESCE(dias_vencimento, 30), COALESCE(descricao_template, '')
		FROM lancamento_automatico_config
		WHERE empresa_id = $1 AND tipo_origem = $2 AND ativo = true
		LIMIT 1
	`, empresaID, tipoOrigem).Scan(&cfg.CategoriaID, &cfg.DiasVencimento, &cfg.DescricaoTemplate)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}


