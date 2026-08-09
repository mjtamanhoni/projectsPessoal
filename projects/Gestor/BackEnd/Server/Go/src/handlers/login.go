package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/middleware"
)

type LoginHandler struct {
	Pool *pgxpool.Pool
}

type loginRequest struct {
	Pin     string      `json:"pin"`
	Login   string      `json:"login"`
	Senha   string      `json:"senha"`
	Empresa interface{} `json:"empresa"`
}

func soDigitos(s string) string {
	return regexp.MustCompile(`\D`).ReplaceAllString(strings.TrimSpace(s), "")
}

func (h *LoginHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest

	if r.Method == http.MethodGet {
		req.Pin = r.URL.Query().Get("pin")
		req.Login = r.URL.Query().Get("login")
		req.Senha = r.URL.Query().Get("senha")
		req.Empresa = r.URL.Query().Get("empresa")
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

	empresaID := 1
	if req.Empresa != nil {
		switch v := req.Empresa.(type) {
		case float64:
			empresaID = int(v)
		case string:
			digits := soDigitos(v)
			if len(digits) >= 11 {
				err := h.Pool.QueryRow(r.Context(),
					`SELECT id FROM public.empresa WHERE regexp_replace(cnpj_cpf, '[^0-9]', '', 'g') = $1`, digits,
				).Scan(&empresaID)
				if err != nil {
					jsonError(w, "CPF/CNPJ não encontrado na base de dados.", http.StatusUnauthorized)
					return
				}
			} else if n := parseInt(digits, 0); n > 0 {
				empresaID = n
			}
		}
	}
	if empresaID == 0 {
		empresaID = 1
	}

	var userID int
	var nome, email string
	var isSuperadmin bool
	var empresaIDUsuario *int

	if req.Pin != "" {
		pinHash := hashSenha(req.Pin)
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id, nome, email, is_superadmin, empresa_id FROM usuario WHERE pin = $1`, pinHash,
		).Scan(&userID, &nome, &email, &isSuperadmin, &empresaIDUsuario)
		if err != nil {
			jsonError(w, "PIN inválido", http.StatusUnauthorized)
			return
		}
	} else {
		var senhaHash string
		err := h.Pool.QueryRow(r.Context(),
			`SELECT id, nome, email, senha, is_superadmin, empresa_id FROM usuario WHERE nome = $1 OR email = $1`,
			req.Login,
		).Scan(&userID, &nome, &email, &senhaHash, &isSuperadmin, &empresaIDUsuario)
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
		if empresaIDUsuario == nil || *empresaIDUsuario != empresaID {
			jsonError(w, "Usuário não possui acesso a empresa selecionada.", http.StatusForbidden)
			return
		}
	}

	token, err := middleware.GerarToken(userID, empresaID, isSuperadmin)
	if err != nil {
		jsonError(w, "Erro interno no servidor", http.StatusInternalServerError)
		return
	}

	var razaoSocial, fantasia, cnpjCpf, ieId, regimeTrib, endereco, telefone, celular, emailEmpresa, chavePix *string
	empresaInfo := map[string]interface{}{"id": empresaID}
	err = h.Pool.QueryRow(r.Context(),
		`SELECT razao_social, fantasia, cnpj_cpf, inscricao_estadual_identidade, regime_tributario, endereco, telefone, celular, email, chave_pix FROM public.empresa WHERE id = $1`,
		empresaID,
	).Scan(&razaoSocial, &fantasia, &cnpjCpf, &ieId, &regimeTrib, &endereco, &telefone, &celular, &emailEmpresa, &chavePix)
	if err == nil {
		if razaoSocial != nil {
			empresaInfo["razao_social"] = *razaoSocial
		}
		if fantasia != nil {
			empresaInfo["fantasia"] = *fantasia
		}
		if cnpjCpf != nil {
			empresaInfo["cnpj_cpf"] = *cnpjCpf
		}
		if ieId != nil {
			empresaInfo["inscricao_estadual_identidade"] = *ieId
		}
		if regimeTrib != nil {
			empresaInfo["regime_tributario"] = *regimeTrib
		}
		if endereco != nil {
			empresaInfo["endereco"] = *endereco
		}
		if telefone != nil {
			empresaInfo["telefone"] = *telefone
		}
		if celular != nil {
			empresaInfo["celular"] = *celular
		}
		if emailEmpresa != nil {
			empresaInfo["email"] = *emailEmpresa
		}
		if chavePix != nil {
			empresaInfo["chave_pix"] = *chavePix
		}
	}

	resp := map[string]interface{}{
		"id":            userID,
		"nome":          nome,
		"email":         email,
		"usuario":       nome,
		"token":         token,
		"empresa":       empresaID,
		"is_superadmin": isSuperadmin,
		"empresa_info":  empresaInfo,
	}

	json.NewEncoder(w).Encode(resp)
}
