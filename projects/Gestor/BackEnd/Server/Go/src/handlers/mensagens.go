package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/middleware"
)

type MensagemHandler struct {
	Pool *pgxpool.Pool
}

func NewMensagemHandler(pool *pgxpool.Pool) *MensagemHandler {
	return &MensagemHandler{Pool: pool}
}

type mensagemItem struct {
	ID        int64     `json:"id"`
	EmpresaID int       `json:"empresa_id"`
	Modulo    string    `json:"modulo"`
	Tipo      string    `json:"tipo"`
	Titulo    string    `json:"titulo"`
	Corpo     string    `json:"corpo"`
	AcaoRota  string    `json:"acao_rota"`
	CriadoEm  time.Time `json:"criado_em"`
	Lida      bool      `json:"lida"`
}

func moduloMensagemValido(modulo string) bool {
	if modulo == "" || len(modulo) > 40 {
		return false
	}
	for _, c := range modulo {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-' {
			continue
		}
		return false
	}
	return true
}

func tipoMensagemValido(tipo string) bool {
	switch tipo {
	case "info", "alerta", "sucesso", "solicitacao", "sistema":
		return true
	}
	return false
}

func (h *MensagemHandler) mensagemVisivel(ctx context.Context, mensagemID, empresaID int, superadmin bool) (bool, error) {
	var ok bool
	err := h.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM public.mensagem m
			 WHERE m.id = $1
			   AND (m.empresa_id = $2 OR ($3 AND m.empresa_id = 0))
		)
	`, mensagemID, empresaID, superadmin).Scan(&ok)
	return ok, err
}

func (h *MensagemHandler) Listar(w http.ResponseWriter, r *http.Request) {
	modulo := strings.TrimSpace(r.URL.Query().Get("modulo"))
	if modulo != "" && !moduloMensagemValido(modulo) {
		JsonError(w, "Modulo invalido", http.StatusBadRequest)
		return
	}

	limite := 50
	if v := strings.TrimSpace(r.URL.Query().Get("limite")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limite = n
		}
	}
	if limite > 200 {
		limite = 200
	}

	usuarioID := middleware.GetUserID(r)
	empresaID := middleware.GetEmpresaLogada(r)
	superadmin := middleware.GetIsSuperadmin(r)
	ctx := context.Background()

	rows, err := h.Pool.Query(ctx, `
		SELECT m.id, m.empresa_id, m.modulo, m.tipo, m.titulo,
		       COALESCE(m.corpo, ''), COALESCE(m.acao_rota, ''),
		       m.criado_em,
		       (ml.lida_em IS NOT NULL)
		  FROM public.mensagem m
		  LEFT JOIN public.mensagem_leitura ml
		         ON ml.mensagem_id = m.id AND ml.usuario_id = $1
		 WHERE (m.expira_em IS NULL OR m.expira_em > NOW())
		   AND (m.empresa_id = $2 OR ($3 AND m.empresa_id = 0))
		   AND ($4 = '' OR m.modulo = $4)
		 ORDER BY m.criado_em DESC, m.id DESC
		 LIMIT $5
	`, usuarioID, empresaID, superadmin, modulo, limite)
	if err != nil {
		JsonError(w, "Erro ao listar mensagens", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	itens := make([]mensagemItem, 0)
	for rows.Next() {
		var item mensagemItem
		if err := rows.Scan(&item.ID, &item.EmpresaID, &item.Modulo, &item.Tipo,
			&item.Titulo, &item.Corpo, &item.AcaoRota, &item.CriadoEm, &item.Lida); err != nil {
			JsonError(w, "Erro ao ler mensagens", http.StatusInternalServerError)
			return
		}
		itens = append(itens, item)
	}
	if err := rows.Err(); err != nil {
		JsonError(w, "Erro ao ler mensagens", http.StatusInternalServerError)
		return
	}

	countRows, err := h.Pool.Query(ctx, `
		SELECT m.modulo, COUNT(*)
		  FROM public.mensagem m
		  LEFT JOIN public.mensagem_leitura ml
		         ON ml.mensagem_id = m.id AND ml.usuario_id = $1
		 WHERE (m.expira_em IS NULL OR m.expira_em > NOW())
		   AND (m.empresa_id = $2 OR ($3 AND m.empresa_id = 0))
		   AND ml.mensagem_id IS NULL
		 GROUP BY m.modulo
	`, usuarioID, empresaID, superadmin)
	if err != nil {
		JsonError(w, "Erro ao contar mensagens", http.StatusInternalServerError)
		return
	}
	defer countRows.Close()

	porModulo := make(map[string]int)
	total := 0
	for countRows.Next() {
		var mod string
		var qtd int
		if err := countRows.Scan(&mod, &qtd); err != nil {
			JsonError(w, "Erro ao contar mensagens", http.StatusInternalServerError)
			return
		}
		porModulo[mod] = qtd
		total += qtd
	}
	if err := countRows.Err(); err != nil {
		JsonError(w, "Erro ao contar mensagens", http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, map[string]any{
		"itens":      itens,
		"nao_lidas":  total,
		"por_modulo": porModulo,
	})
}

func (h *MensagemHandler) MarcarLida(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		JsonError(w, "Informe o id da mensagem", http.StatusBadRequest)
		return
	}

	usuarioID := middleware.GetUserID(r)
	empresaID := middleware.GetEmpresaLogada(r)
	superadmin := middleware.GetIsSuperadmin(r)
	ctx := context.Background()

	visivel, err := h.mensagemVisivel(ctx, id, empresaID, superadmin)
	if err != nil {
		JsonError(w, "Erro ao verificar mensagem", http.StatusInternalServerError)
		return
	}
	if !visivel {
		JsonError(w, "Mensagem nao encontrada", http.StatusNotFound)
		return
	}

	_, err = h.Pool.Exec(ctx, `
		INSERT INTO public.mensagem_leitura (mensagem_id, usuario_id)
		VALUES ($1, $2)
		ON CONFLICT (mensagem_id, usuario_id) DO NOTHING
	`, id, usuarioID)
	if err != nil {
		JsonError(w, "Erro ao marcar mensagem", http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, map[string]any{"ok": true})
}

func (h *MensagemHandler) MarcarTodasLidas(w http.ResponseWriter, r *http.Request) {
	usuarioID := middleware.GetUserID(r)
	empresaID := middleware.GetEmpresaLogada(r)
	superadmin := middleware.GetIsSuperadmin(r)
	ctx := context.Background()

	tag, err := h.Pool.Exec(ctx, `
		INSERT INTO public.mensagem_leitura (mensagem_id, usuario_id)
		SELECT m.id, $1
		  FROM public.mensagem m
		 WHERE (m.expira_em IS NULL OR m.expira_em > NOW())
		   AND (m.empresa_id = $2 OR ($3 AND m.empresa_id = 0))
		ON CONFLICT (mensagem_id, usuario_id) DO NOTHING
	`, usuarioID, empresaID, superadmin)
	if err != nil {
		JsonError(w, "Erro ao marcar mensagens", http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, map[string]any{"ok": true, "marcadas": tag.RowsAffected()})
}

func (h *MensagemHandler) Criar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		EmpresaID  *int   `json:"empresa_id"`
		Modulo     string `json:"modulo"`
		Tipo       string `json:"tipo"`
		Titulo     string `json:"titulo"`
		Corpo      string `json:"corpo"`
		AcaoRota   string `json:"acao_rota"`
		Prioridade int    `json:"prioridade"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		JsonError(w, "Dados invalidos", http.StatusBadRequest)
		return
	}

	modulo := limitarTexto(req.Modulo, 40)
	if !moduloMensagemValido(modulo) {
		JsonError(w, "Informe um modulo valido", http.StatusBadRequest)
		return
	}

	titulo := limitarTexto(req.Titulo, 200)
	if titulo == "" {
		JsonError(w, "Informe o titulo", http.StatusBadRequest)
		return
	}

	corpo := limitarTexto(req.Corpo, 4000)

	tipo := limitarTexto(req.Tipo, 20)
	if tipo == "" {
		tipo = "info"
	}
	if !tipoMensagemValido(tipo) {
		JsonError(w, "Tipo de mensagem invalido", http.StatusBadRequest)
		return
	}

	acaoRota := limitarTexto(req.AcaoRota, 200)
	if acaoRota != "" && !strings.HasPrefix(acaoRota, "/") {
		JsonError(w, "Rota de acao invalida", http.StatusBadRequest)
		return
	}

	prioridade := req.Prioridade
	if prioridade < 0 {
		prioridade = 0
	}
	if prioridade > 9 {
		prioridade = 9
	}

	empresaID := middleware.GetEmpresaLogada(r)
	if middleware.GetIsSuperadmin(r) && req.EmpresaID != nil {
		if *req.EmpresaID < 0 {
			JsonError(w, "Empresa invalida", http.StatusBadRequest)
			return
		}
		empresaID = *req.EmpresaID
	}

	ctx := context.Background()
	if empresaID > 0 {
		var existe bool
		if err := h.Pool.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM public.empresa WHERE id = $1)`, empresaID).Scan(&existe); err != nil {
			JsonError(w, "Erro ao validar empresa", http.StatusInternalServerError)
			return
		}
		if !existe {
			JsonError(w, "Empresa nao encontrada", http.StatusBadRequest)
			return
		}
	}

	var id int64
	var criadoEm time.Time
	err := h.Pool.QueryRow(ctx, `
		INSERT INTO public.mensagem
			(empresa_id, modulo, tipo, titulo, corpo, acao_rota, prioridade, remetente_id)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), $7, $8)
		RETURNING id, criado_em
	`, empresaID, modulo, tipo, titulo, corpo, acaoRota, prioridade, middleware.GetUserID(r)).Scan(&id, &criadoEm)
	if err != nil {
		JsonError(w, "Erro ao criar mensagem", http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, map[string]any{"id": id, "criado_em": criadoEm})
}
