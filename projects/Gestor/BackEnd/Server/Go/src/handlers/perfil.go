package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/config"
	"gestor-server/middleware"
)

type PerfilHandler struct {
	Pool *pgxpool.Pool
}

func NewPerfilHandler(pool *pgxpool.Pool) *PerfilHandler {
	return &PerfilHandler{Pool: pool}
}

type usuarioPerfil struct {
	EmpresaID    int
	ID           int
	Nome         string
	Email        string
	Avatar       string
	Senha        string
	Pin          string
	IsSuperadmin bool
}

type perfilResposta struct {
	ID           int    `json:"id"`
	EmpresaID    int    `json:"empresa_id"`
	EmpresaNome  string `json:"empresa_nome"`
	Nome         string `json:"nome"`
	Email        string `json:"email"`
	Avatar       string `json:"avatar"`
	IsSuperadmin bool   `json:"is_superadmin"`
	TemSenha     bool   `json:"tem_senha"`
	TemPin       bool   `json:"tem_pin"`
}

var emailPerfilRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// usuarioAtual resolve a linha do usuario logado. Como a PK de usuario e
// composta por (empresa_id, id), o superadmin pode estar em uma empresa
// diferente da empresa selecionada no topo: nesse caso priorizamos a linha de
// superadmin da empresa selecionada, depois a empresa principal (1) e por fim
// qualquer outra. Para usuarios comuns usamos sempre a empresa do token.
func (h *PerfilHandler) usuarioAtual(r *http.Request) (*usuarioPerfil, error) {
	usuarioID := middleware.GetUserID(r)
	empresaLogada := middleware.GetEmpresaLogada(r)
	superadmin := middleware.GetIsSuperadmin(r)
	if usuarioID <= 0 {
		return nil, pgx.ErrNoRows
	}

	var u usuarioPerfil
	err := h.Pool.QueryRow(r.Context(), `
		SELECT empresa_id, id, nome, COALESCE(email, ''), COALESCE(avatar, ''),
		       COALESCE(senha, ''), COALESCE(pin, ''), is_superadmin
		FROM public.usuario
		WHERE id = $1
		  AND (($3 AND is_superadmin) OR (NOT $3 AND empresa_id = $2))
		ORDER BY CASE WHEN empresa_id = $2 THEN 0 WHEN empresa_id = 1 THEN 1 ELSE 2 END, empresa_id
		LIMIT 1
	`, usuarioID, empresaLogada, superadmin).Scan(
		&u.EmpresaID, &u.ID, &u.Nome, &u.Email, &u.Avatar, &u.Senha, &u.Pin, &u.IsSuperadmin,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (h *PerfilHandler) resposta(ctx context.Context, u *usuarioPerfil) perfilResposta {
	var empresaNome string
	_ = h.Pool.QueryRow(ctx,
		`SELECT COALESCE(NULLIF(fantasia, ''), razao_social, '') FROM public.empresa WHERE id = $1`,
		u.EmpresaID).Scan(&empresaNome)

	return perfilResposta{
		ID:           u.ID,
		EmpresaID:    u.EmpresaID,
		EmpresaNome:  empresaNome,
		Nome:         u.Nome,
		Email:        u.Email,
		Avatar:       u.Avatar,
		IsSuperadmin: u.IsSuperadmin,
		TemSenha:     u.Senha != "",
		TemPin:       u.Pin != "",
	}
}

func responderErroPerfil(w http.ResponseWriter, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		jsonError(w, "Usuário não encontrado", http.StatusNotFound)
		return
	}
	jsonError(w, "Erro ao carregar perfil", http.StatusInternalServerError)
}

// Obter retorna os dados do perfil do usuario logado.
func (h *PerfilHandler) Obter(w http.ResponseWriter, r *http.Request) {
	u, err := h.usuarioAtual(r)
	if err != nil {
		responderErroPerfil(w, err)
		return
	}
	jsonSuccess(w, h.resposta(r.Context(), u))
}

// Atualizar altera login (nome), e-mail, senha e PIN do proprio usuario.
// Empresa, status e is_superadmin nao sao editaveis pelo perfil.
func (h *PerfilHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Nome       *string `json:"nome"`
		Email      *string `json:"email"`
		SenhaAtual string  `json:"senha_atual"`
		NovaSenha  string  `json:"nova_senha"`
		NovoPin    string  `json:"novo_pin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	u, err := h.usuarioAtual(r)
	if err != nil {
		responderErroPerfil(w, err)
		return
	}

	nome := strings.TrimSpace(u.Nome)
	nomeMudou := false
	if body.Nome != nil {
		nome = strings.TrimSpace(*body.Nome)
		nomeMudou = nome != u.Nome
	}

	email := strings.TrimSpace(u.Email)
	emailMudou := false
	if body.Email != nil {
		email = strings.TrimSpace(*body.Email)
		emailMudou = email != u.Email
	}

	novaSenha := strings.TrimSpace(body.NovaSenha)
	novoPin := strings.TrimSpace(body.NovoPin)
	senhaMudou := novaSenha != ""
	pinMudou := novoPin != ""

	if !nomeMudou && !emailMudou && !senhaMudou && !pinMudou {
		jsonSuccess(w, h.resposta(r.Context(), u))
		return
	}

	senhaAtual := body.SenhaAtual
	if strings.TrimSpace(senhaAtual) == "" {
		jsonError(w, "Informe a senha atual (ou o PIN atual) para confirmar as alterações", http.StatusBadRequest)
		return
	}
	if u.Senha != "" {
		if !verificarSenha(senhaAtual, u.Senha) {
			jsonError(w, "Senha atual inválida", http.StatusUnauthorized)
			return
		}
	} else if u.Pin != "" {
		if !verificarSenha(senhaAtual, u.Pin) {
			jsonError(w, "PIN atual inválido", http.StatusUnauthorized)
			return
		}
	} else {
		jsonError(w, "Usuário sem senha ou PIN configurado", http.StatusBadRequest)
		return
	}

	if nomeMudou {
		if len(nome) < 1 || len(nome) > 100 {
			jsonError(w, "Login/nome deve ter entre 1 e 100 caracteres", http.StatusBadRequest)
			return
		}
		var existe int
		err := h.Pool.QueryRow(r.Context(),
			`SELECT 1 FROM public.usuario WHERE empresa_id = $1 AND upper(nome) = upper($2) AND id <> $3 LIMIT 1`,
			u.EmpresaID, nome, u.ID).Scan(&existe)
		if err == nil {
			jsonError(w, "Já existe um usuário com esse login nesta empresa", http.StatusConflict)
			return
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			jsonError(w, "Erro ao validar login", http.StatusInternalServerError)
			return
		}
	}

	if emailMudou && email != "" {
		if len(email) > 100 || !emailPerfilRe.MatchString(email) {
			jsonError(w, "E-mail inválido", http.StatusBadRequest)
			return
		}
		var existe int
		err := h.Pool.QueryRow(r.Context(),
			`SELECT 1 FROM public.usuario WHERE empresa_id = $1 AND upper(email) = upper($2) AND id <> $3 LIMIT 1`,
			u.EmpresaID, email, u.ID).Scan(&existe)
		if err == nil {
			jsonError(w, "Já existe um usuário com esse e-mail nesta empresa", http.StatusConflict)
			return
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			jsonError(w, "Erro ao validar e-mail", http.StatusInternalServerError)
			return
		}
	}

	if senhaMudou && (len(novaSenha) < 4 || len(novaSenha) > 100) {
		jsonError(w, "Senha deve ter entre 4 e 100 caracteres", http.StatusBadRequest)
		return
	}
	if pinMudou && !regexp.MustCompile(`^\d{4}$`).MatchString(novoPin) {
		jsonError(w, "PIN deve ter exatamente 4 dígitos", http.StatusBadRequest)
		return
	}

	sets := []string{}
	args := []interface{}{}
	idx := 1
	if nomeMudou {
		sets = append(sets, fmt.Sprintf("nome = $%d", idx))
		args = append(args, nome)
		idx++
	}
	if emailMudou {
		sets = append(sets, fmt.Sprintf("email = $%d", idx))
		if email == "" {
			args = append(args, nil)
		} else {
			args = append(args, email)
		}
		idx++
	}
	if senhaMudou {
		sets = append(sets, fmt.Sprintf("senha = $%d", idx))
		args = append(args, hashSenhaBcrypt(novaSenha))
		idx++
	}
	if pinMudou {
		sets = append(sets, fmt.Sprintf("pin = $%d", idx))
		args = append(args, hashSenhaBcrypt(novoPin))
		idx++
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, u.EmpresaID, u.ID)

	query := fmt.Sprintf(
		"UPDATE public.usuario SET %s WHERE empresa_id = $%d AND id = $%d",
		strings.Join(sets, ", "), idx, idx+1,
	)
	if _, err := h.Pool.Exec(r.Context(), query, args...); err != nil {
		jsonError(w, "Erro ao salvar perfil", http.StatusInternalServerError)
		return
	}

	atualizado, err := h.usuarioAtual(r)
	if err != nil {
		responderErroPerfil(w, err)
		return
	}
	jsonSuccess(w, h.resposta(r.Context(), atualizado))
}

// SalvarAvatar grava/remove a foto do perfil. A imagem chega em base64 (o
// frontend ja reduz para 512x512 JPEG) e e salva em
// Fotos/Avatares/{empresa_id}/{usuario_id}_{timestamp}.{ext}, com o caminho
// relativo gravado em usuario.avatar. O timestamp evita cache antigo.
func (h *PerfilHandler) SalvarAvatar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Avatar string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	u, err := h.usuarioAtual(r)
	if err != nil {
		responderErroPerfil(w, err)
		return
	}

	if strings.TrimSpace(body.Avatar) == "" {
		if _, err := h.Pool.Exec(r.Context(),
			`UPDATE public.usuario SET avatar = NULL, updated_at = NOW() WHERE empresa_id = $1 AND id = $2`,
			u.EmpresaID, u.ID); err != nil {
			jsonError(w, "Erro ao remover foto", http.StatusInternalServerError)
			return
		}
		h.apagarAvatar(u.Avatar)
		jsonSuccess(w, map[string]string{"avatar": ""})
		return
	}

	raw := strings.TrimSpace(body.Avatar)
	if idx := strings.Index(raw, ","); idx >= 0 {
		raw = raw[idx+1:]
	}
	data, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		jsonError(w, "Imagem inválida", http.StatusBadRequest)
		return
	}
	if len(data) == 0 {
		jsonError(w, "Imagem inválida", http.StatusBadRequest)
		return
	}
	if len(data) > 2*1024*1024 {
		jsonError(w, "Imagem muito grande (máx. 2MB)", http.StatusBadRequest)
		return
	}
	ext := detectFotoExt(data)
	if ext == "" {
		jsonError(w, "Formato de imagem inválido (use JPG, PNG ou WEBP)", http.StatusBadRequest)
		return
	}

	// Organiza por empresa e usa IDs estaveis (o login/CNPJ pode mudar).
	empresaDir := strconv.Itoa(u.EmpresaID)
	subDir := filepath.Join(config.Load().FotosDir, "Avatares", empresaDir)
	if err := os.MkdirAll(subDir, 0755); err != nil {
		jsonError(w, "Erro ao criar diretório de uploads", http.StatusInternalServerError)
		return
	}

	nomeArquivo := fmt.Sprintf("%d_%d%s", u.ID, time.Now().UnixNano(), ext)
	caminho := filepath.Join(subDir, nomeArquivo)
	if err := os.WriteFile(caminho, data, 0644); err != nil {
		jsonError(w, "Erro ao salvar imagem", http.StatusInternalServerError)
		return
	}

	relativo := filepath.ToSlash(filepath.Join("Avatares", empresaDir, nomeArquivo))
	if _, err := h.Pool.Exec(r.Context(),
		`UPDATE public.usuario SET avatar = $1, updated_at = NOW() WHERE empresa_id = $2 AND id = $3`,
		relativo, u.EmpresaID, u.ID); err != nil {
		_ = os.Remove(caminho)
		jsonError(w, "Erro ao salvar foto", http.StatusInternalServerError)
		return
	}

	h.apagarAvatar(u.Avatar)
	jsonSuccess(w, map[string]string{"avatar": relativo})
}

func (h *PerfilHandler) apagarAvatar(relativo string) {
	relativo = strings.TrimSpace(relativo)
	if relativo == "" {
		return
	}
	normalizado := filepath.ToSlash(relativo)
	if !strings.HasPrefix(normalizado, "Avatares/") {
		return
	}
	caminho := filepath.Join(config.Load().FotosDir, filepath.FromSlash(normalizado))
	if _, err := os.Stat(caminho); err == nil {
		_ = os.Remove(caminho)
	}
}
