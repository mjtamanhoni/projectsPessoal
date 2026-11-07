package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"gestor-server/database"
	"gestor-server/middleware"
)

// Estados do ciclo de vida da empresa.
const (
	EmpresaInativa  = 0
	EmpresaAtiva    = 1
	EmpresaPendente = 2
)

const (
	tokenAcessoAlfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	tokenAcessoTamanho  = 10
	tokenAcessoValidade = 7 * 24 * time.Hour
)

func jsonErrorCodigo(w http.ResponseWriter, msg string, status int, codigo string, empresaID int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	payload := map[string]interface{}{"erro": msg}
	if codigo != "" {
		payload["codigo"] = codigo
	}
	if empresaID > 0 {
		payload["empresa_id"] = empresaID
	}
	json.NewEncoder(w).Encode(payload)
}

func normalizarTokenAcesso(token string) string {
	r := strings.NewReplacer(" ", "", "-", "", "\t", "", "\n", "", "\r", "")
	return strings.ToUpper(r.Replace(strings.TrimSpace(token)))
}

func hashTokenAcesso(token string) string {
	h := sha256.Sum256([]byte(normalizarTokenAcesso(token)))
	return hex.EncodeToString(h[:])
}

func gerarTokenAcesso(n int) (string, error) {
	b := make([]byte, n)
	max := big.NewInt(int64(len(tokenAcessoAlfabeto)))
	for i := range b {
		idx, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b[i] = tokenAcessoAlfabeto[idx.Int64()]
	}
	return string(b), nil
}

type empresaIDRequest struct {
	ID        int `json:"id"`
	EmpresaID int `json:"empresa_id"`
}

func (r empresaIDRequest) empresaID() int {
	if r.EmpresaID > 0 {
		return r.EmpresaID
	}
	return r.ID
}

// EmpresaGerarToken gera um token de primeiro acesso para a empresa.
// POST /empresa/token  body: { id | empresa_id }
// Restrito ao superadmin. O token em texto puro so e retornado uma vez.
func (h *BasicCRUD) EmpresaGerarToken(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}

	var body empresaIDRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := body.empresaID()
	if empresaID <= 0 {
		jsonError(w, "ID da empresa obrigatorio", http.StatusBadRequest)
		return
	}
	if empresaID == 1 {
		jsonError(w, "A empresa principal nao precisa de token de primeiro acesso", http.StatusBadRequest)
		return
	}

	var status int
	err := h.Pool.QueryRow(r.Context(),
		`SELECT status FROM public.empresa WHERE id = $1`, empresaID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		jsonError(w, "Empresa nao encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}

	token, err := gerarTokenAcesso(tokenAcessoTamanho)
	if err != nil {
		jsonError(w, "Erro ao gerar token", http.StatusInternalServerError)
		return
	}
	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Invalida tokens anteriores ainda nao usados.
	if _, err := tx.Exec(r.Context(), `
		UPDATE public.empresa_token_acesso
		   SET revogado_em = NOW()
		 WHERE empresa_id = $1
		   AND usado_em IS NULL
		   AND revogado_em IS NULL`, empresaID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var expiraEm time.Time
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO public.empresa_token_acesso (empresa_id, token_hash, expira_em, criado_por)
		VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 second'), $4)
		RETURNING expira_em`,
		empresaID, hashTokenAcesso(token), int(tokenAcessoValidade.Seconds()), middleware.GetUserID(r),
	).Scan(&expiraEm); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Empresa que ainda nao estava ativa passa a aguardar o primeiro acesso.
	if status != EmpresaAtiva {
		if _, err := tx.Exec(r.Context(),
			`UPDATE public.empresa SET status = $1 WHERE id = $2`,
			EmpresaPendente, empresaID); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, "Erro ao salvar token", http.StatusInternalServerError)
		return
	}

	middleware.InvalidarCacheEmpresa(empresaID)

	jsonSuccess(w, map[string]interface{}{
		"empresa_id": empresaID,
		"token":      token,
		"expira_em":  expiraEm.Format(time.RFC3339),
	})
}

// EmpresaRevogarToken revoga os tokens de primeiro acesso pendentes.
// POST /empresa/token/revogar  body: { id | empresa_id }
func (h *BasicCRUD) EmpresaRevogarToken(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}

	var body empresaIDRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := body.empresaID()
	if empresaID <= 0 {
		jsonError(w, "ID da empresa obrigatorio", http.StatusBadRequest)
		return
	}

	tag, err := h.Pool.Exec(r.Context(), `
		UPDATE public.empresa_token_acesso
		   SET revogado_em = NOW()
		 WHERE empresa_id = $1
		   AND usado_em IS NULL
		   AND revogado_em IS NULL`, empresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	middleware.InvalidarCacheEmpresa(empresaID)

	jsonSuccess(w, map[string]interface{}{
		"mensagem":         "Tokens revogados",
		"tokens_revogados": tag.RowsAffected(),
	})
}

type empresaStatusRequest struct {
	ID        int  `json:"id"`
	EmpresaID int  `json:"empresa_id"`
	Status    *int `json:"status"`
}

// EmpresaAlterarStatus ativa ou inativa uma empresa.
// POST /empresa/status  body: { id | empresa_id, status: 0|1 }
func (h *BasicCRUD) EmpresaAlterarStatus(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Acesso restrito a superadmin", http.StatusForbidden)
		return
	}

	var body empresaStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := body.EmpresaID
	if empresaID <= 0 {
		empresaID = body.ID
	}
	if empresaID <= 0 {
		jsonError(w, "ID da empresa obrigatorio", http.StatusBadRequest)
		return
	}
	if body.Status == nil || (*body.Status != EmpresaInativa && *body.Status != EmpresaAtiva) {
		jsonError(w, "Status invalido. Use 0 (inativa) ou 1 (ativa)", http.StatusBadRequest)
		return
	}
	if empresaID == 1 && *body.Status == EmpresaInativa {
		jsonError(w, "A empresa principal nao pode ser inativada", http.StatusBadRequest)
		return
	}

	var tag interface{ RowsAffected() int64 }
	var err error
	if *body.Status == EmpresaAtiva {
		tag, err = h.Pool.Exec(r.Context(), `
			UPDATE public.empresa
			   SET status = $1,
			       ativada_em = COALESCE(ativada_em, NOW()),
			       ativada_por = COALESCE(ativada_por, $3)
			 WHERE id = $2`,
			EmpresaAtiva, empresaID, middleware.GetUserID(r))
	} else {
		tag, err = h.Pool.Exec(r.Context(), `
			UPDATE public.empresa SET status = $1 WHERE id = $2`,
			EmpresaInativa, empresaID)
	}
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Empresa nao encontrada", http.StatusNotFound)
		return
	}

	if *body.Status == EmpresaInativa {
		h.Pool.Exec(r.Context(), `
			UPDATE public.empresa_token_acesso
			   SET revogado_em = NOW()
			 WHERE empresa_id = $1
			   AND usado_em IS NULL
			   AND revogado_em IS NULL`, empresaID)
	}

	middleware.InvalidarCacheEmpresa(empresaID)

	jsonSuccess(w, map[string]interface{}{
		"mensagem":   "Status atualizado",
		"empresa_id": empresaID,
		"status":     *body.Status,
	})
}

type primeiroAcessoRequest struct {
	Token string `json:"token"`
	Nome  string `json:"nome"`
	Email string `json:"email"`
	Senha string `json:"senha"`
}

// PrimeiroAcesso valida o token de primeiro acesso. Se o e-mail ja existir na
// empresa, vincula o token ao usuario existente confirmando a senha atual;
// caso contrario, cria o usuario administrador.
// POST /auth/primeiro-acesso  body: { token, nome, email, senha }
func (h *BasicCRUD) PrimeiroAcesso(w http.ResponseWriter, r *http.Request) {
	var body primeiroAcessoRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}

	token := normalizarTokenAcesso(body.Token)
	if token == "" {
		jsonError(w, "Token obrigatorio", http.StatusBadRequest)
		return
	}
	nome := strings.TrimSpace(body.Nome)
	email := strings.TrimSpace(body.Email)
	if !strings.Contains(email, "@") || len(email) < 5 || len(email) > 100 {
		jsonError(w, "Informe um e-mail valido (ate 100 caracteres)", http.StatusBadRequest)
		return
	}
	if len(body.Senha) < 4 || len(body.Senha) > 72 {
		jsonError(w, "A senha deve ter entre 4 e 72 caracteres", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var tokenID, empresaID int
	err = tx.QueryRow(r.Context(), `
		SELECT t.id, t.empresa_id
		  FROM public.empresa_token_acesso t
		  JOIN public.empresa e ON e.id = t.empresa_id
		 WHERE t.token_hash = $1
		   AND t.usado_em IS NULL
		   AND t.revogado_em IS NULL
		   AND t.expira_em > NOW()
		 FOR UPDATE OF t`, hashTokenAcesso(token)).Scan(&tokenID, &empresaID)
	if errors.Is(err, pgx.ErrNoRows) {
		jsonError(w, "Token invalido ou expirado", http.StatusUnauthorized)
		return
	}
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}

	// Empresa ja cadastrada: o e-mail pode pertencer a um usuario existente.
	// Nesse caso o token e vinculado a ele, mediante confirmacao da senha atual,
	// sem criar um novo usuario. Empresa nova: cria o administrador.
	var usuarioID int
	var nomeFinal, emailFinal, senhaHash string
	var isSuperadmin bool
	err = tx.QueryRow(r.Context(), `
		SELECT id, nome, COALESCE(email, ''), COALESCE(senha, ''), is_superadmin
		  FROM public.usuario
		 WHERE empresa_id = $1 AND lower(email) = lower($2)
		 ORDER BY id
		 LIMIT 1`, empresaID, email).Scan(
		&usuarioID, &nomeFinal, &emailFinal, &senhaHash, &isSuperadmin)
	switch {
	case err == nil:
		if senhaHash == "" {
			jsonError(w, "Senha nao configurada para este usuario", http.StatusUnauthorized)
			return
		}
		if !verificarSenha(body.Senha, senhaHash) {
			jsonError(w, "Senha invalida para o e-mail informado", http.StatusUnauthorized)
			return
		}
		// Migracao transparente: se a senha ainda e SHA-256, re-hash com bcrypt.
		if !strings.HasPrefix(senhaHash, "$2") {
			if _, err := tx.Exec(r.Context(),
				`UPDATE public.usuario SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
				hashSenhaBcrypt(body.Senha), usuarioID, empresaID); err != nil {
				jsonError(w, "Erro interno", http.StatusInternalServerError)
				return
			}
		}
	case errors.Is(err, pgx.ErrNoRows):
		if len(nome) < 2 || len(nome) > 100 {
			jsonError(w, "Informe o nome do administrador (ate 100 caracteres)", http.StatusBadRequest)
			return
		}
		nomeFinal = nome
		emailFinal = email
		isSuperadmin = false
		usuarioID, err = database.GerarID(r.Context(), tx, empresaID, "usuario")
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if _, err := tx.Exec(r.Context(), `
			INSERT INTO public.usuario (empresa_id, id, nome, email, senha, is_superadmin, status)
			VALUES ($1, $2, $3, $4, $5, false, 1)`,
			empresaID, usuarioID, nome, email, hashSenhaBcrypt(body.Senha)); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	default:
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}

	if _, err := tx.Exec(r.Context(), `
		UPDATE public.empresa_token_acesso SET usado_em = NOW() WHERE id = $1`, tokenID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err := tx.Exec(r.Context(), `
		UPDATE public.empresa
		   SET status = $1,
		       ativada_em = COALESCE(ativada_em, NOW()),
		       ativada_por = $3
		 WHERE id = $2`,
		EmpresaAtiva, empresaID, usuarioID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, "Erro ao efetivar empresa", http.StatusInternalServerError)
		return
	}

	middleware.InvalidarCacheEmpresa(empresaID)

	tokenJWT, err := middleware.GerarToken(usuarioID, empresaID, empresaID, isSuperadmin)
	if err != nil {
		jsonError(w, "Erro interno no servidor", http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{
		"id":            usuarioID,
		"nome":          nomeFinal,
		"email":         emailFinal,
		"usuario":       nomeFinal,
		"token":         tokenJWT,
		"empresa":       empresaID,
		"is_superadmin": isSuperadmin,
		"empresa_info":  montarEmpresaInfo(r.Context(), h.Pool, empresaID),
	})
}
