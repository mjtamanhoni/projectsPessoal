package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/middleware"
)

type LoginHandler struct {
	Pool *pgxpool.Pool
}

type loginRequest struct {
	Pin     string `json:"pin"`
	Login   string `json:"login"`
	Senha   string `json:"senha"`
	Empresa int    `json:"empresa"`
}

func (h *LoginHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest

	if r.Method == http.MethodGet {
		req.Pin = r.URL.Query().Get("pin")
		req.Login = r.URL.Query().Get("login")
		req.Senha = r.URL.Query().Get("senha")
		req.Empresa = parseInt(r.URL.Query().Get("empresa"), 1)
	} else {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, "JSON inválido", http.StatusBadRequest)
			return
		}
	}

	if req.Pin == "" && (req.Login == "" || req.Senha == "") {
		jsonError(w, "Parâmetro pin não informado.", http.StatusBadRequest)
		return
	}

	if req.Empresa == 0 {
		req.Empresa = 1
	}

	var userID int
	var nome, email string
	var isSuperadmin bool
	var empresaID *int

	if req.Pin != "" {
		pinHash := hashSenha(req.Pin)
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id, nome, email, is_superadmin, empresa_id FROM usuario WHERE pin = $1`, pinHash,
		).Scan(&userID, &nome, &email, &isSuperadmin, &empresaID)
		if err != nil {
			jsonError(w, "PIN inválido", http.StatusUnauthorized)
			return
		}
	} else {
		var senhaHash string
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id, nome, email, senha, is_superadmin, empresa_id FROM usuario WHERE nome = $1 OR email = $1`,
			req.Login,
		).Scan(&userID, &nome, &email, &senhaHash, &isSuperadmin, &empresaID)
		if err != nil {
			jsonError(w, "Usuário não localizado", http.StatusNotFound)
			return
		}
		if senhaHash == "" {
			jsonError(w, "Senha não configurada", http.StatusUnauthorized)
			return
		}
		if senhaHash != hashSenha(req.Senha) {
			jsonError(w, "Senha inválida", http.StatusUnauthorized)
			return
		}
	}

	if !isSuperadmin {
		if empresaID == nil || *empresaID != req.Empresa {
			jsonError(w, "Usuário não possui acesso a empresa selecionada.", http.StatusForbidden)
			return
		}
	}

	token, err := middleware.GerarToken(userID, req.Empresa, isSuperadmin)
	if err != nil {
		jsonError(w, "Erro interno no servidor", http.StatusInternalServerError)
		return
	}

	resp := map[string]interface{}{
		"id":            userID,
		"nome":          nome,
		"email":         email,
		"usuario":       nome,
		"token":         token,
		"empresa":       req.Empresa,
		"is_superadmin": isSuperadmin,
	}

	json.NewEncoder(w).Encode(resp)
}
