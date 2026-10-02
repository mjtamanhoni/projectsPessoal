package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

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

func hashSenhaBcrypt(s string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(s), bcrypt.DefaultCost)
	return string(hash)
}

func verificarSenha(senha string, hashArmazenado string) bool {
	// Tenta bcrypt primeiro (novo padrÃ£o)
	if err := bcrypt.CompareHashAndPassword([]byte(hashArmazenado), []byte(senha)); err == nil {
		return true
	}
	// Fallback: verifica SHA-256 (legado)
	return hashArmazenado == hashSenha(senha)
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
	query += " ORDER BY id DESC"

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
	empresaID := middleware.GetEmpresaLogada(r)

	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}

	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM fornecedor WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Fornecedor excluÃ­do com sucesso"})
}

// --- Cliente ---
func (h *BasicCRUD) ClienteListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	isSuperadmin := middleware.GetIsSuperadmin(r)

	// Superadmin pode filtrar por empresa_id via query param.
	// "0" (ou ausencia do param com token escopado) = todas as empresas.
	if isSuperadmin {
		if param := r.URL.Query().Get("empresa_id"); param != "" {
			empresaID = parseInt(param, 0)
		}
	} else {
		// Para usuÃ¡rios NÃƒO superadmin, SEMPRE filtra pela empresa do token
		// Ignora query param empresa_id para evitar bypass
		if tokenEmpresaID := middleware.GetEmpresaID(r); tokenEmpresaID > 0 {
			empresaID = tokenEmpresaID
		}
	}

	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")
	email := r.URL.Query().Get("email")

	query := `SELECT id, empresa_id, nome, telefone, celular, nr, complemento, bairro, cidade, uf, cep, endereco, email, cnpj_cpf, usuario_id, status
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
	query += " ORDER BY id DESC"

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
		[]string{"nome", "telefone", "celular", "nr", "complemento", "bairro", "cidade", "uf", "cep", "endereco", "email", "cnpj_cpf", "usuario_id", "status"})
}

func (h *BasicCRUD) ClienteExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM cliente WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Cliente excluÃ­do com sucesso"})
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
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM marca WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Marca excluÃ­da com sucesso"})
}

// --- Produto Classificacao ---
func (h *BasicCRUD) ProdutoClassificacaoListar(w http.ResponseWriter, r *http.Request) {
	h.Listar(w, r, "public", "produto_classificacao", "", "id, empresa_id, nome, status, created_at", "")
}

func (h *BasicCRUD) ProdutoClassificacaoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "public", "produto_classificacao", []string{"nome", "status"})
}

func (h *BasicCRUD) ProdutoClassificacaoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM produto_classificacao WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "ClassificaÃ§Ã£o excluÃ­da com sucesso"})
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
	query += " ORDER BY id DESC"
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
	query += " ORDER BY id DESC"
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

	// Superadmin pode filtrar por empresa_id via query param.
	// "0" (ou ausencia do param com token escopado) = todas as empresas.
	if isSuperadmin {
		if param := r.URL.Query().Get("empresa_id"); param != "" {
			empresaID = parseInt(param, 0)
		}
	} else {
		// Para usuÃ¡rios NÃƒO superadmin, SEMPRE filtra pela empresa do token
		// Ignora query param empresa_id para evitar bypass
		if tokenEmpresaID := middleware.GetEmpresaID(r); tokenEmpresaID > 0 {
			empresaID = tokenEmpresaID
		}
	}

	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")
	email := r.URL.Query().Get("email")

	query := `SELECT id, empresa_id, nome, email, is_superadmin FROM usuario WHERE (empresa_id = $1 OR $1 = 0)`
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
	query += " ORDER BY id DESC"
	
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
	empresaID := middleware.GetEmpresaLogada(r)
	isSuperadminRequester := middleware.GetIsSuperadmin(r)

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

		if !isSuperadminRequester && isSuperadmin {
			jsonError(w, "Apenas superadmin pode criar/alterar usuÃ¡rios superadmin", http.StatusForbidden)
			return
		}

		// Empresa do registro: superadmin pode informar empresa_id no body
		// (criar/editar usuario em qualquer empresa); demais usam a empresa do login.
		empresaItem := empresaID
		if isSuperadminRequester {
			if v, ok := item["empresa_id"]; ok {
				n := 0
				switch t := v.(type) {
				case float64:
					n = int(t)
				case int:
					n = t
				}
				if n > 0 {
					empresaItem = n
				}
			}
		}

		if id == 0 {
			var existe int
			if err := tx.QueryRow(r.Context(),
				`SELECT 1 FROM public.empresa WHERE id = $1`, empresaItem).Scan(&existe); err != nil {
				jsonError(w, "Empresa informada nao encontrada", http.StatusBadRequest)
				return
			}

			id, err = database.GerarID(r.Context(), tx, empresaItem, "usuario")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}

			cols := []string{"id", "empresa_id", "nome"}
			vals := []interface{}{id, empresaItem, nome}
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
				vals = append(vals, hashSenhaBcrypt(senha))
				phs = append(phs, fmt.Sprintf("$%d", paramIdx))
				paramIdx++
			}
			if pin != "" {
				cols = append(cols, "pin")
				vals = append(vals, hashSenhaBcrypt(pin))
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
				vals = append(vals, hashSenhaBcrypt(senha))
				paramIdx++
			}
			if pin != "" {
				setClauses = append(setClauses, fmt.Sprintf("pin = $%d", paramIdx))
				vals = append(vals, hashSenhaBcrypt(pin))
				paramIdx++
			}
			if isSuperadminRequester {
				setClauses = append(setClauses, fmt.Sprintf("is_superadmin = $%d", paramIdx))
				vals = append(vals, isSuperadmin)
				paramIdx++
			}

			vals = append(vals, id, empresaItem)
			tag, errUpd := tx.Exec(r.Context(),
				fmt.Sprintf("UPDATE usuario SET %s WHERE id = $%d AND empresa_id = $%d",
					strings.Join(setClauses, ", "), paramIdx, paramIdx+1), vals...)
			if errUpd != nil {
				err = errUpd
			} else if tag.RowsAffected() == 0 {
				jsonError(w, "Usuario nao encontrado na empresa informada", http.StatusNotFound)
				return
			}
		}

		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "UsuÃ¡rio(s) salvo(s) com sucesso"})
}

func (h *BasicCRUD) UsuarioExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaLogada(r)
	// Superadmin pode excluir usuario de outra empresa informando empresa_id
	if middleware.GetIsSuperadmin(r) {
		if p := parseInt(r.URL.Query().Get("empresa_id"), 0); p > 0 {
			empresaID = p
		}
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM usuario WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "UsuÃ¡rio excluÃ­do com sucesso"})
}

func (h *BasicCRUD) UsuarioAlterarSenha(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID         int    `json:"id"`
		SenhaAtual string `json:"senha_atual"`
		NovaSenha  string `json:"nova_senha"`
		EmpresaID  int    `json:"empresa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invÃ¡lido", http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaLogada(r)
	isSuperadmin := middleware.GetIsSuperadmin(r)

	// Superadmin pode informar empresa_id explicitamente (padrao: empresa do login)
	if isSuperadmin && body.EmpresaID > 0 {
		empresaID = body.EmpresaID
	}

	if empresaID == 0 {
		jsonError(w, "Empresa não determinada", http.StatusBadRequest)
		return
	}

	var senhaHash string
	err := h.Pool.QueryRow(r.Context(),
		`SELECT senha FROM usuario WHERE id = $1 AND empresa_id = $2`,
		body.ID, empresaID).Scan(&senhaHash)
	if err != nil {
		jsonError(w, "UsuÃ¡rio nÃ£o encontrado", http.StatusNotFound)
		return
	}
	if !verificarSenha(body.SenhaAtual, senhaHash) {
		jsonError(w, "Senha atual invÃ¡lida", http.StatusUnauthorized)
		return
	}

	novoHash := hashSenhaBcrypt(body.NovaSenha)
	_, err = h.Pool.Exec(r.Context(),
		`UPDATE usuario SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
		novoHash, body.ID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Senha alterada com sucesso"})
}

func (h *BasicCRUD) UsuarioAlterarPin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID       int    `json:"id"`
		NovoPin  string `json:"novo_pin"`
		EmpresaID int    `json:"empresa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invÃ¡lido", http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaLogada(r)
	isSuperadmin := middleware.GetIsSuperadmin(r)

	// Superadmin pode informar empresa_id explicitamente (padrao: empresa do login)
	if isSuperadmin && body.EmpresaID > 0 {
		empresaID = body.EmpresaID
	}

	if empresaID == 0 {
		jsonError(w, "Empresa não determinada", http.StatusBadRequest)
		return
	}

	_, err := h.Pool.Exec(r.Context(),
		`UPDATE usuario SET pin = $1 WHERE id = $2 AND empresa_id = $3`,
		hashSenhaBcrypt(body.NovoPin), body.ID, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "PIN alterado com sucesso"})
}

// --- Admin: Redefinir Senha (sem senha atual, apenas SuperAdmin) ---
func (h *BasicCRUD) UsuarioAdminRedefinirSenha(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Apenas administradores podem executar esta aÃ§Ã£o", http.StatusForbidden)
		return
	}

	var body struct {
		ID        int    `json:"id"`
		NovaSenha string `json:"nova_senha"`
		EmpresaID int    `json:"empresa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invÃ¡lido", http.StatusBadRequest)
		return
	}

	if body.ID == 0 || body.NovaSenha == "" {
		jsonError(w, "ID do usuÃ¡rio e nova senha sÃ£o obrigatÃ³rios", http.StatusBadRequest)
		return
	}
	if body.EmpresaID == 0 {
		body.EmpresaID = middleware.GetEmpresaLogada(r)
	}

	novoHash := hashSenhaBcrypt(body.NovaSenha)
	_, err := h.Pool.Exec(r.Context(),
		`UPDATE usuario SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
		novoHash, body.ID, body.EmpresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"mensagem": "Senha redefinida com sucesso"})
}

// --- Admin: Redefinir PIN (sem PIN atual, apenas SuperAdmin) ---
func (h *BasicCRUD) UsuarioAdminRedefinirPin(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Apenas administradores podem executar esta aÃ§Ã£o", http.StatusForbidden)
		return
	}

	var body struct {
		ID        int    `json:"id"`
		NovoPin   string `json:"novo_pin"`
		EmpresaID int    `json:"empresa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invÃ¡lido", http.StatusBadRequest)
		return
	}

	if body.ID == 0 || body.NovoPin == "" {
		jsonError(w, "ID do usuÃ¡rio e novo PIN sÃ£o obrigatÃ³rios", http.StatusBadRequest)
		return
	}
	if body.EmpresaID == 0 {
		body.EmpresaID = middleware.GetEmpresaLogada(r)
	}

	novoHash := hashSenhaBcrypt(body.NovoPin)
	_, err := h.Pool.Exec(r.Context(),
		`UPDATE usuario SET pin = $1 WHERE id = $2 AND empresa_id = $3`,
		novoHash, body.ID, body.EmpresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"mensagem": "PIN redefinido com sucesso"})
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
	query += " ORDER BY id DESC"
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

// --- Empresa PÃºblica ---
func (h *BasicCRUD) EmpresaListarPublico(w http.ResponseWriter, r *http.Request) {
	query := `SELECT e.id, e.razao_social, e.fantasia,
		e.cnpj_cpf, e.inscricao_estadual_identidade, e.regime_tributario,
		e.endereco, e.telefone, e.celular, e.email, e.chave_pix, e.logomarca, e.logomarca_paginas, e.logomarca_relatorios, e.logomarca_fiscal, e.delivery,
		COALESCE(e.is_open, 0) AS is_open,
		COALESCE(cnt.total, 0) AS total_encomendas
		FROM public.empresa e
		LEFT JOIN (
			SELECT empresa_id, COUNT(*) AS total
			FROM public.encomenda
			WHERE status <= 3
			GROUP BY empresa_id
		) cnt ON cnt.empresa_id = e.id
		WHERE 1=1`
	var args []interface{}
	if r.URL.Query().Get("delivery") == "1" {
		query += " AND e.delivery = 1"
	}
	query += " ORDER BY total_encomendas DESC, e.fantasia, e.razao_social"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

// --- Empresa ---
func (h *BasicCRUD) EmpresaListar(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	id := parseInt(r.URL.Query().Get("id"), 0)
	nome := r.URL.Query().Get("nome")

	query := `SELECT e.id, e.razao_social as nome, e.razao_social, e.fantasia,
		e.cnpj_cpf, e.inscricao_estadual_identidade, e.regime_tributario,
		e.endereco, e.telefone, e.celular, e.email, e.chave_pix, e.logomarca, e.logomarca_paginas, e.logomarca_relatorios, e.logomarca_fiscal, e.delivery
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
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	items, err := h.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	idSalvo := 0

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
		chavePix := getStr(item, "chave_pix")
		_, temLogomarca := item["logomarca"]
		logomarca := getStr(item, "logomarca")
		_, temLogomarcaPaginas := item["logomarca_paginas"]
		logomarcaPaginas := getStr(item, "logomarca_paginas")
		_, temLogomarcaRelatorios := item["logomarca_relatorios"]
		logomarcaRelatorios := getStr(item, "logomarca_relatorios")
		_, temLogomarcaFiscal := item["logomarca_fiscal"]
		logomarcaFiscal := getStr(item, "logomarca_fiscal")
		temDelivery := false
		delivery := 0
		if v, ok := item["delivery"]; ok && v != nil {
			temDelivery = true
			switch val := v.(type) {
			case bool:
				if val {
					delivery = 1
				}
			case float64:
				delivery = int(val)
			case json.Number:
				n, _ := val.Int64()
				delivery = int(n)
			}
		}
		temIsOpen := false
		isOpen := 0
		if v, ok := item["is_open"]; ok && v != nil {
			temIsOpen = true
			switch val := v.(type) {
			case bool:
				if val {
					isOpen = 1
				}
			case float64:
				isOpen = int(val)
			case json.Number:
				n, _ := val.Int64()
				isOpen = int(n)
			}
		}

		if id == 0 {
			err = tx.QueryRow(r.Context(),
				`INSERT INTO public.empresa (razao_social, fantasia, cnpj_cpf, inscricao_estadual_identidade,
					regime_tributario, endereco, telefone, celular, email, chave_pix, logomarca, logomarca_paginas, logomarca_relatorios, logomarca_fiscal, delivery, is_open)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
				razaoSocial, fantasia, cnpjCpf, inscricaoEstadual, regimeTributario, endereco, telefone, celular, email, chavePix, logomarca, logomarcaPaginas, logomarcaRelatorios, logomarcaFiscal, delivery, isOpen,
			).Scan(&id)
		} else {
			setClauses := []string{"razao_social=$1", "fantasia=$2", "cnpj_cpf=$3",
				"inscricao_estadual_identidade=$4", "regime_tributario=$5", "endereco=$6",
				"telefone=$7", "celular=$8", "email=$9", "chave_pix=$10"}
			vals := []interface{}{razaoSocial, fantasia, cnpjCpf, inscricaoEstadual, regimeTributario, endereco, telefone, celular, email, chavePix}
			if temLogomarca {
				setClauses = append(setClauses, fmt.Sprintf("logomarca=$%d", len(vals)+1))
				vals = append(vals, logomarca)
			}
			if temLogomarcaPaginas {
				setClauses = append(setClauses, fmt.Sprintf("logomarca_paginas=$%d", len(vals)+1))
				vals = append(vals, logomarcaPaginas)
			}
			if temLogomarcaRelatorios {
				setClauses = append(setClauses, fmt.Sprintf("logomarca_relatorios=$%d", len(vals)+1))
				vals = append(vals, logomarcaRelatorios)
			}
			if temLogomarcaFiscal {
				setClauses = append(setClauses, fmt.Sprintf("logomarca_fiscal=$%d", len(vals)+1))
				vals = append(vals, logomarcaFiscal)
			}
			if temDelivery {
				setClauses = append(setClauses, fmt.Sprintf("delivery=$%d", len(vals)+1))
				vals = append(vals, delivery)
			}
			if temIsOpen {
				setClauses = append(setClauses, fmt.Sprintf("is_open=$%d", len(vals)+1))
				vals = append(vals, isOpen)
			}
			vals = append(vals, id)
			_, err = tx.Exec(r.Context(),
				fmt.Sprintf("UPDATE public.empresa SET %s WHERE id=$%d",
					strings.Join(setClauses, ", "), len(vals)),
				vals...)
		}
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		idSalvo = id
	}
	tx.Commit(r.Context())
	resp := map[string]interface{}{"mensagem": "Empresa salva com sucesso"}
	if len(items) == 1 {
		resp["id"] = idSalvo
	}
	jsonSuccess(w, resp)
}

func (h *BasicCRUD) EmpresaToggleIsOpen(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	body, err := h.parseBody(r)
	if err != nil || len(body) == 0 {
		jsonError(w, "Body obrigatorio", http.StatusBadRequest)
		return
	}
	item := body[0]
	id := getID(item)
	if id == 0 {
		jsonError(w, "ID da empresa obrigatorio", http.StatusBadRequest)
		return
	}
	isOpen := 0
	if v, ok := item["is_open"]; ok && v != nil {
		switch val := v.(type) {
		case bool:
			if val {
				isOpen = 1
			}
		case float64:
			isOpen = int(val)
		case json.Number:
			n, _ := val.Int64()
			isOpen = int(n)
		}
	}
	tag, err := h.Pool.Exec(r.Context(),
		`UPDATE public.empresa SET is_open = $1 WHERE id = $2`, isOpen, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Empresa nao encontrada", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Status atualizado", "is_open": isOpen})
}

func (h *BasicCRUD) EmpresaExcluir(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM public.empresa WHERE id = $1`, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Empresa excluÃ­da com sucesso"})
}

func (h *BasicCRUD) EmpresaAtualizarSequencias(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	total := 0

	var empresaIDs []int
	empRows, err := tx.Query(r.Context(), `
		SELECT id FROM public.empresa
		UNION
		SELECT DISTINCT empresa_id FROM public.usuario WHERE empresa_id IS NOT NULL
		ORDER BY id`)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for empRows.Next() {
		var eid int
		empRows.Scan(&eid)
		empresaIDs = append(empresaIDs, eid)
	}
	empRows.Close()

	if len(empresaIDs) == 0 {
		empresaIDs = []int{1}
	}

	for _, eid := range empresaIDs {
		for _, tabela := range database.TabelasEmpresa {
			var maxID int
			err = tx.QueryRow(r.Context(),
				fmt.Sprintf("SELECT COALESCE(MAX(id), 0) FROM %s WHERE empresa_id = $1", tabela), eid).Scan(&maxID)
			if err != nil {
				continue
			}
			_, err = tx.Exec(r.Context(), `
				INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
				VALUES ($1, $2, $3)
				ON CONFLICT (empresa_id, tabela) DO UPDATE SET last_id = GREATEST(public.empresa_sequences.last_id, EXCLUDED.last_id)
			`, eid, tabela, maxID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
			total++
		}
	}

	for _, tabela := range database.TabelasGlobais {
		var maxID int
		err = tx.QueryRow(r.Context(),
			fmt.Sprintf("SELECT COALESCE(MAX(id), 0) FROM %s", tabela)).Scan(&maxID)
		if err != nil {
			continue
		}
		_, err = tx.Exec(r.Context(), `
			INSERT INTO public.empresa_sequences (empresa_id, tabela, last_id)
			VALUES (0, $1, $2)
			ON CONFLICT (empresa_id, tabela) DO UPDATE SET last_id = GREATEST(public.empresa_sequences.last_id, EXCLUDED.last_id)
		`, tabela, maxID)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		total++
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{
		"mensagem": fmt.Sprintf("SequÃªncias atualizadas para %d tabela(s) em %d empresa(s)", total, len(empresaIDs)),
		"total":    total,
	})
}

func (h *BasicCRUD) EmpresaLimparDados(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
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
		jsonError(w, "CÃ³digo da Empresa nÃ£o informado.", http.StatusBadRequest)
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
		"encomenda_item_removido",
		"encomenda_item_adicional",
		"encomenda_item",
		"encomenda",
		"venda_produto_item_removido",
		"venda_produto_item_adicional",
		"venda_produto_item",
		"venda_produto",
		"receita_ingrediente",
		"produto_adicional",
		"adicional_produto_classificacao",
		"produto_venda_item",
		"produto_venda",
		"compra_insumo",
		"fabricacao",
		"contas_receber",
		"contas_pagar",
		"usuario_formulario_permissao",
		"usuario_formulario",
		"empresa_modulo",
		"servico",
		"custo_adicional_tipo",
		"adicional",
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
	query += " ORDER BY id DESC"
	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *BasicCRUD) FormularioAtualizar(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	h.globalUpsert(w, r, "formulario",
		[]string{"nome"})
}

func (h *BasicCRUD) FormularioExcluir(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
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
		jsonError(w, "JSON invÃ¡lido", http.StatusBadRequest)
		return
	}
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)

	if body.UsuarioFormularioID == 0 {
		jsonError(w, "usuario_formulario_id Ã© obrigatÃ³rio", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`DELETE FROM public.usuario_formulario_permissao WHERE usuario_formulario_id = $1 AND empresa_id = $2`,
		body.UsuarioFormularioID, empresaID)
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
	jsonSuccess(w, map[string]interface{}{"mensagem": "PermissÃµes salvas com sucesso"})
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
	all := r.URL.Query().Get("all") == "true"

	query := `SELECT m.* FROM public.modulo m WHERE 1=1`
	var args []interface{}
	argN := 1
	if id > 0 {
		query += fmt.Sprintf(" AND m.id = $%d", argN); argN++; args = append(args, id)
	}
	if nome != "" {
		query += fmt.Sprintf(" AND upper(m.nome) LIKE upper($%d)", argN); argN++; args = append(args, "%"+nome+"%")
	}
	if !all {
		query += fmt.Sprintf(` AND (m.id IN (SELECT em.modulo_id FROM public.empresa_modulo em
			WHERE em.empresa_id = $%d) OR $%d = 0)`, argN, argN)
		args = append(args, empresaID)
	}
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
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	h.globalUpsert(w, r, "modulo",
		[]string{"nome", "descricao"})
}

func (h *BasicCRUD) ModuloExcluir(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
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
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	h.globalUpsert(w, r, "modulo_formulario",
		[]string{"modulo_id", "formulario_id", "abertura"})
}

func (h *BasicCRUD) ModuloFormularioExcluir(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
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
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
	h.genericUpsert(w, r, "public", "empresa_modulo",
		[]string{"modulo_id", "empresa_id"})
}

func (h *BasicCRUD) EmpresaModuloExcluir(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}
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

// dataOuNil retorna nil (NULL no banco) quando a data Ã© vazia, ou a prÃ³pria string.
func dataOuNil(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func formaPagamentoIDOrNil(id int) interface{} {
	if id == 0 {
		return nil
	}
	return id
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func trocoParaOrNil(v float64) interface{} {
	if v == 0 {
		return nil
	}
	return v
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

// --- Forma Pagamento ---
func (h *BasicCRUD) FormaPagamentoListar(w http.ResponseWriter, r *http.Request) {
	h.Listar(w, r, "public", "forma_pagamento", "", "id, empresa_id, descricao, classificacao, status, created_at", "")
}

func (h *BasicCRUD) FormaPagamentoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "public", "forma_pagamento", []string{"descricao", "classificacao", "status"})
}

func (h *BasicCRUD) FormaPagamentoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM forma_pagamento WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Forma de pagamento excluÃ­da com sucesso"})
}

// --- Condicao Pagamento ---
func (h *BasicCRUD) CondicaoPagamentoListar(w http.ResponseWriter, r *http.Request) {
	h.Listar(w, r, "public", "condicao_pagamento", "", "id, empresa_id, descricao, qtd_parcelas, dias_primeiro_vencimento, dias_intervalo, status, created_at, parcelamento_fixo, dia_vencimento_fixo, a_vista", "")
}

func (h *BasicCRUD) CondicaoPagamentoAtualizar(w http.ResponseWriter, r *http.Request) {
	h.genericUpsert(w, r, "public", "condicao_pagamento", []string{"descricao", "qtd_parcelas", "dias_primeiro_vencimento", "dias_intervalo", "status", "parcelamento_fixo", "dia_vencimento_fixo", "a_vista"})
}

func (h *BasicCRUD) CondicaoPagamentoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nÃ£o informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM condicao_pagamento WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nÃ£o encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "CondiÃ§Ã£o de pagamento excluÃ­da com sucesso"})
}

// --- Forma Pagamento Condicao ---
func (h *BasicCRUD) FormaPagamentoCondicaoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)
	formaID := parseInt(r.URL.Query().Get("forma_pagamento_id"), 0)

	query := `SELECT fpc.empresa_id, fpc.forma_pagamento_id, fpc.condicao_pagamento_id, fpc.status, fpc.created_at,
		cp.descricao AS condicao_pagamento_descricao, cp.qtd_parcelas, cp.dias_primeiro_vencimento, cp.dias_intervalo,
		cp.parcelamento_fixo, cp.dia_vencimento_fixo, cp.a_vista
		FROM forma_pagamento_condicao fpc
		JOIN condicao_pagamento cp ON cp.empresa_id = fpc.empresa_id AND cp.id = fpc.condicao_pagamento_id
		WHERE 1=1`
	var args []interface{}
	argN := 1

	if formaID > 0 {
		query += fmt.Sprintf(" AND fpc.forma_pagamento_id = $%d", argN)
		argN++
		args = append(args, formaID)
	}
	query += fmt.Sprintf(" AND (fpc.empresa_id = $%d OR $%d = 0)", argN, argN)
	args = append(args, empresaID)
	query += " ORDER BY fpc.forma_pagamento_id, cp.descricao"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

// --- Bandeira Cartao ---
func (h *BasicCRUD) BandeiraCartaoListar(w http.ResponseWriter, r *http.Request) {
	h.Listar(w, r, "public", "bandeira_cartao", "", "id, empresa_id, nome, imagem, status, created_at, updated_at", "")
}

func (h *BasicCRUD) BandeiraCartaoAtualizar(w http.ResponseWriter, r *http.Request) {
	items, err := h.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaLogada(r)

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

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	for _, item := range items {
		id := getID(item)
		nome := getStr(item, "nome")
		status := 1
		if v, ok := item["status"]; ok && v != nil {
			switch val := v.(type) {
			case float64:
				status = int(val)
			case json.Number:
				n, _ := val.Int64()
				status = int(n)
			}
		}

		var imagemBytes []byte
		if imgStr := getStr(item, "imagem"); imgStr != "" {
			imagemBytes, err = decodeBase64(imgStr)
			if err != nil {
				jsonError(w, "Imagem invalida: "+err.Error(), http.StatusBadRequest)
				return
			}
		}

		if id == 0 {
			id, err = database.GerarID(r.Context(), tx, empresaID, "bandeira_cartao")
			if err != nil {
				jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
				return
			}
			_, err = tx.Exec(r.Context(),
				`INSERT INTO public.bandeira_cartao (id, empresa_id, nome, imagem, status)
				VALUES ($1, $2, $3, $4, $5)`,
				id, empresaID, nome, imagemBytes, status)
		} else {
			setClauses := []string{"nome = $1", "status = $2", "updated_at = now()"}
			vals := []interface{}{nome, status}
			paramIdx := 3

			if imagemBytes != nil {
				setClauses = append(setClauses, fmt.Sprintf("imagem = $%d", paramIdx))
				vals = append(vals, imagemBytes)
				paramIdx++
			}

			vals = append(vals, id, empresaID)
			_, err = tx.Exec(r.Context(),
				fmt.Sprintf("UPDATE public.bandeira_cartao SET %s WHERE id = $%d AND empresa_id = $%d",
					strings.Join(setClauses, ", "), paramIdx, paramIdx+1),
				vals...)
		}

		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	tx.Commit(r.Context())
	jsonSuccess(w, map[string]interface{}{"mensagem": "Bandeira de cartao salva com sucesso"})
}

func (h *BasicCRUD) BandeiraCartaoExcluir(w http.ResponseWriter, r *http.Request) {
	id := parseInt(r.URL.Query().Get("id"), 0)
	empresaID := middleware.GetEmpresaLogada(r)
	if id == 0 {
		jsonError(w, "ID nao informado", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(), `DELETE FROM public.bandeira_cartao WHERE id = $1 AND empresa_id = $2`, id, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Registro nao encontrado", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Bandeira de cartao excluida com sucesso"})
}

// BandeiraCartaoPublicoListar lista bandeiras de cartao ativas (publico, sem auth).
func (h *BasicCRUD) BandeiraCartaoPublicoListar(w http.ResponseWriter, r *http.Request) {
	empresaID := parseInt(r.URL.Query().Get("empresa"), 0)
	if empresaID == 0 {
		jsonError(w, "ParÃ¢metro 'empresa' Ã© obrigatÃ³rio", http.StatusBadRequest)
		return
	}
	rows, err := h.Pool.Query(r.Context(),
		`SELECT id, nome FROM public.bandeira_cartao WHERE empresa_id = $1 AND COALESCE(status, 1) = 1 ORDER BY nome`,
		empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type bc struct {
		ID   int    `json:"id"`
		Nome string `json:"nome"`
	}
	var result []bc
	for rows.Next() {
		var b bc
		if err := rows.Scan(&b.ID, &b.Nome); err != nil {
			continue
		}
		result = append(result, b)
	}
	if result == nil {
		result = []bc{}
	}
	jsonSuccess(w, result)
}

// decodeBase64 decodifica uma string base64 em bytes, removendo o prefixo data:... se presente.
func decodeBase64(s string) ([]byte, error) {
	if idx := strings.Index(s, ","); idx != -1 {
		s = s[idx+1:]
	}
	return base64.StdEncoding.DecodeString(s)
}

func (h *BasicCRUD) FormaPagamentoCondicaoSalvar(w http.ResponseWriter, r *http.Request) {
	items, err := h.parseBody(r)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaLogada(r)

	if len(items) == 0 {
		jsonError(w, "Nenhum registro informado", http.StatusBadRequest)
		return
	}

	// Expect: { forma_pagamento_id, condicao_pagamento_ids: [...] }
	item := items[0]
	formaID := getInt(item, "forma_pagamento_id")
	condicoesRaw, _ := item["condicao_pagamento_ids"]
	condicaoIDs, ok := condicoesRaw.([]interface{})
	if !ok {
		jsonError(w, "condicao_pagamento_ids deve ser um array", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Delete all existing associations for this forma
	_, err = tx.Exec(r.Context(),
		`DELETE FROM forma_pagamento_condicao WHERE empresa_id = $1 AND forma_pagamento_id = $2`,
		empresaID, formaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert new associations
	for _, cid := range condicaoIDs {
		condID := 0
		switch v := cid.(type) {
		case float64:
			condID = int(v)
		case json.Number:
			condID, _ = strconv.Atoi(v.String())
		}
		if condID > 0 {
			_, err = tx.Exec(r.Context(),
				`INSERT INTO forma_pagamento_condicao (empresa_id, forma_pagamento_id, condicao_pagamento_id, status)
				VALUES ($1, $2, $3, 1)`,
				empresaID, formaID, condID)
			if err != nil {
				jsonError(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "CondiÃ§Ãµes atualizadas com sucesso"})
}

// --- Redefinir Senha (PÃºblico - sem autenticaÃ§Ã£o) ---
func (h *BasicCRUD) UsuarioRedefinirSenhaPublico(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Login      string `json:"login"`
		Empresa    string `json:"empresa"`
		SenhaAtual string `json:"senha_atual"`
		NovaSenha  string `json:"nova_senha"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invÃ¡lido", http.StatusBadRequest)
		return
	}

	if body.Login == "" || body.Empresa == "" || body.SenhaAtual == "" || body.NovaSenha == "" {
		jsonError(w, "Todos os campos sÃ£o obrigatÃ³rios", http.StatusBadRequest)
		return
	}

	// Resolve empresa por CNPJ/CPF ou ID
	empresaID := 1
	digits := regexp.MustCompile(`\D`).ReplaceAllString(strings.TrimSpace(body.Empresa), "")
	if len(digits) >= 11 {
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id FROM public.empresa WHERE regexp_replace(cnpj_cpf, '[^0-9]', '', 'g') = $1`, digits,
		).Scan(&empresaID)
		if err != nil {
			jsonError(w, "Empresa nÃ£o encontrada", http.StatusNotFound)
			return
		}
	} else if n := parseInt(digits, 0); n > 0 {
		empresaID = n
	}

	// Busca o usuÃ¡rio
	var userID int
	var senhaHash string
	var empresaIDUsuario *int
	err := h.Pool.QueryRow(r.Context(),
		`SELECT id, senha, empresa_id FROM usuario WHERE (nome = $1 OR email = $1) AND empresa_id = $2`,
		body.Login, empresaID,
	).Scan(&userID, &senhaHash, &empresaIDUsuario)
	if errors.Is(err, pgx.ErrNoRows) {
		// Superadmin pode redefinir a propria senha informando o CNPJ de
		// qualquer empresa: busca sem o filtro e so aceita se for superadmin.
		var isSuper bool
		err = h.Pool.QueryRow(r.Context(),
			`SELECT id, senha, empresa_id, is_superadmin FROM usuario WHERE (nome = $1 OR email = $1) ORDER BY is_superadmin DESC, id`,
			body.Login,
		).Scan(&userID, &senhaHash, &empresaIDUsuario, &isSuper)
		if err == nil && !isSuper {
			err = pgx.ErrNoRows
		}
	}
	if err != nil {
		jsonError(w, "UsuÃ¡rio nÃ£o encontrado", http.StatusNotFound)
		return
	}
	empresaIDRegistro := empresaID
	if empresaIDUsuario != nil {
		empresaIDRegistro = *empresaIDUsuario
	}

	if senhaHash == "" {
		jsonError(w, "UsuÃ¡rio nÃ£o possui senha configurada", http.StatusForbidden)
		return
	}

	// Valida a senha atual (suporta SHA-256 legado e bcrypt)
	if !verificarSenha(body.SenhaAtual, senhaHash) {
		jsonError(w, "Senha atual invÃ¡lida", http.StatusUnauthorized)
		return
	}

	// Salva a nova senha com bcrypt
	novoHash := hashSenhaBcrypt(body.NovaSenha)
	_, err = h.Pool.Exec(r.Context(),
		`UPDATE usuario SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
		novoHash, userID, empresaIDRegistro)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"mensagem": "Senha redefinida com sucesso"})
}

