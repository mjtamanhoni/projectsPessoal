package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
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
		// Busca usuários com PIN na empresa informada (ou em todas se superadmin)
		var rows pgx.Rows
		var err error

		if empresaID > 0 {
			rows, err = h.Pool.Query(r.Context(),
				`SELECT id, nome, email, pin, is_superadmin, empresa_id FROM usuario WHERE pin IS NOT NULL AND pin != '' AND empresa_id = $1`,
				empresaID)
		} else {
			rows, err = h.Pool.Query(r.Context(),
				`SELECT id, nome, email, pin, is_superadmin, empresa_id FROM usuario WHERE pin IS NOT NULL AND pin != ''`)
		}
		if err != nil {
			jsonError(w, "PIN inválido", http.StatusUnauthorized)
			return
		}
		defer rows.Close()

		found := false
		for rows.Next() {
			var pinHash string
			var empID *int
			if err := rows.Scan(&userID, &nome, &email, &pinHash, &isSuperadmin, &empID); err != nil {
				continue
			}
			if verificarSenha(req.Pin, pinHash) {
				empresaIDUsuario = empID
				found = true
				if !strings.HasPrefix(pinHash, "$2") {
					h.Pool.Exec(r.Context(),
						`UPDATE usuario SET pin = $1 WHERE id = $2 AND empresa_id = $3`,
						hashSenhaBcrypt(req.Pin), userID, empresaID)
				}
				break
			}
		}
		if !found {
			// Superadmin pode usar o PIN em qualquer empresa: tenta localizar
			// o PIN sem o filtro de empresa e so aceita se for superadmin.
			rowsAll, errAll := h.Pool.Query(r.Context(),
				`SELECT id, nome, email, pin, is_superadmin, empresa_id FROM usuario WHERE pin IS NOT NULL AND pin != ''`)
			if errAll == nil {
				for rowsAll.Next() {
					var pinHash string
					var empID *int
					if err := rowsAll.Scan(&userID, &nome, &email, &pinHash, &isSuperadmin, &empID); err != nil {
						continue
					}
					if !isSuperadmin {
						continue
					}
					if verificarSenha(req.Pin, pinHash) {
						empresaIDUsuario = empID
						found = true
						if !strings.HasPrefix(pinHash, "$2") {
							empUpd := empresaID
							if empID != nil {
								empUpd = *empID
							}
							h.Pool.Exec(r.Context(),
								`UPDATE usuario SET pin = $1 WHERE id = $2 AND empresa_id = $3`,
								hashSenhaBcrypt(req.Pin), userID, empUpd)
						}
						break
					}
				}
				rowsAll.Close()
			}
		}
		if !found {
			jsonError(w, "PIN inválido", http.StatusUnauthorized)
			return
		}
	} else {
		var senhaHash string
		var query string
		var args []interface{}

		if empresaID > 0 {
			query = `SELECT id, nome, email, senha, is_superadmin, empresa_id FROM usuario WHERE (nome = $1 OR email = $1) AND empresa_id = $2`
			args = []interface{}{req.Login, empresaID}
		} else {
			query = `SELECT id, nome, email, senha, is_superadmin, empresa_id FROM usuario WHERE nome = $1 OR email = $1`
			args = []interface{}{req.Login}
		}

		err := h.Pool.QueryRow(r.Context(), query, args...).Scan(&userID, &nome, &email, &senhaHash, &isSuperadmin, &empresaIDUsuario)
		if errors.Is(err, pgx.ErrNoRows) && empresaID > 0 {
			// Usuario nao existe na empresa informada. Superadmin pode logar
			// em qualquer empresa: tenta localizar sem o filtro de empresa
			// (priorizando a linha de superadmin) e so aceita se for superadmin.
			err = h.Pool.QueryRow(r.Context(),
				`SELECT id, nome, email, senha, is_superadmin, empresa_id FROM usuario WHERE (nome = $1 OR email = $1) ORDER BY is_superadmin DESC, id`,
				req.Login,
			).Scan(&userID, &nome, &email, &senhaHash, &isSuperadmin, &empresaIDUsuario)
			if err == nil && !isSuperadmin {
				// Mesmo email/usuario existindo em outra empresa: mantem o
				// comportamento anterior (nao localizado) para nao-superadmin.
				err = pgx.ErrNoRows
			}
		}
		if err != nil {
			jsonError(w, "Usuário não localizado", http.StatusNotFound)
			return
		}
		if senhaHash == "" {
			jsonError(w, "Senha não configurada", http.StatusUnauthorized)
			return
		}
		if !verificarSenha(req.Senha, senhaHash) {
			jsonError(w, "Senha inválida", http.StatusUnauthorized)
			return
		}
		// Migração transparente: se a senha ainda é SHA-256, re-hash com bcrypt
		if !strings.HasPrefix(senhaHash, "$2") {
			empUpd := empresaID
			if empresaIDUsuario != nil {
				empUpd = *empresaIDUsuario
			}
			h.Pool.Exec(r.Context(),
				`UPDATE usuario SET senha = $1 WHERE id = $2 AND empresa_id = $3`,
				hashSenhaBcrypt(req.Senha), userID, empUpd)
		}
	}

	if !isSuperadmin {
		if empresaIDUsuario == nil || *empresaIDUsuario != empresaID {
			jsonError(w, "Usuário não possui acesso a empresa selecionada.", http.StatusForbidden)
			return
		}
	}

	// Empresa real resolvida a partir do CNPJ/CPF informado no login.
	// Usada em TODO o sistema para gravar (INSERT/UPDATE/DELETE) e como
	// padrao de filtro no frontend (combobox de usuarios/clientes).
	empresaLogada := empresaID

	// Escopo de leitura: tambem usa a empresa do login (inclusive para superadmin).
	// O superadmin troca de empresa em tempo real via /usuario/trocarEmpresa,
	// que emite um novo token com a empresa selecionada.
	token, err := middleware.GerarToken(userID, empresaLogada, empresaLogada, isSuperadmin)
	if err != nil {
		jsonError(w, "Erro interno no servidor", http.StatusInternalServerError)
		return
	}

	empresaInfo := montarEmpresaInfo(r.Context(), h.Pool, empresaID)

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

// montarEmpresaInfo monta o mapa de dados da empresa usado na resposta de login
// e na troca de empresa do superadmin.
func montarEmpresaInfo(ctx context.Context, pool *pgxpool.Pool, empresaID int) map[string]interface{} {
	var razaoSocial, fantasia, cnpjCpf, ieId, regimeTrib, endereco, telefone, celular, emailEmpresa, chavePix, logomarca, logomarcaPaginas, logomarcaRelatorios, logomarcaFiscal *string
	var delivery int
	empresaInfo := map[string]interface{}{"id": empresaID}
	err := pool.QueryRow(ctx,
		`SELECT razao_social, fantasia, cnpj_cpf, inscricao_estadual_identidade, regime_tributario, endereco, telefone, celular, email, chave_pix, logomarca, logomarca_paginas, logomarca_relatorios, logomarca_fiscal, delivery FROM public.empresa WHERE id = $1`,
		empresaID,
	).Scan(&razaoSocial, &fantasia, &cnpjCpf, &ieId, &regimeTrib, &endereco, &telefone, &celular, &emailEmpresa, &chavePix, &logomarca, &logomarcaPaginas, &logomarcaRelatorios, &logomarcaFiscal, &delivery)
	if err != nil {
		return empresaInfo
	}
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
	if logomarca != nil {
		empresaInfo["logomarca"] = *logomarca
	}
	if logomarcaPaginas != nil {
		empresaInfo["logomarca_paginas"] = *logomarcaPaginas
	}
	if logomarcaRelatorios != nil {
		empresaInfo["logomarca_relatorios"] = *logomarcaRelatorios
	}
	if logomarcaFiscal != nil {
		empresaInfo["logomarca_fiscal"] = *logomarcaFiscal
	}
	empresaInfo["delivery"] = delivery
	return empresaInfo
}

// TrocarEmpresa emite um novo token para o superadmin ja apontando para a
// empresa selecionada (troca de contexto sem deslogar).
func (h *LoginHandler) TrocarEmpresa(w http.ResponseWriter, r *http.Request) {
	if !middleware.GetIsSuperadmin(r) {
		jsonError(w, "Apenas o superadmin pode trocar de empresa", http.StatusForbidden)
		return
	}

	var body struct {
		EmpresaID int `json:"empresa_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.EmpresaID <= 0 {
		jsonError(w, "empresa_id obrigatorio", http.StatusBadRequest)
		return
	}

	var dummy int
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT 1 FROM public.empresa WHERE id = $1`, body.EmpresaID).Scan(&dummy); err != nil {
		jsonError(w, "Empresa nao encontrada", http.StatusNotFound)
		return
	}

	userID := middleware.GetUserID(r)
	token, err := middleware.GerarToken(userID, body.EmpresaID, body.EmpresaID, true)
	if err != nil {
		jsonError(w, "Erro interno no servidor", http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{
		"token":        token,
		"empresa":      body.EmpresaID,
		"empresa_info": montarEmpresaInfo(r.Context(), h.Pool, body.EmpresaID),
	})
}
