package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

// RelatorioIAHandler expoe a camada de seguranca das consultas geradas pela IA.
// A IA devolve um SELECT; este handler valida, executa em transacao somente
// leitura com timeout e limita o numero de linhas retornadas.
type RelatorioIAHandler struct {
	Pool *pgxpool.Pool
}

const relatorioIaMaxLinhas = 500
const relatorioIaTimeout = "15000ms"

// Palavras proibidas: qualquer tentativa de escrita/DDL/administracao.
// pg_* bloqueia funcoes de sistema (pg_sleep, pg_read_file, etc).
var relatorioIaProibido = regexp.MustCompile(`(?i)\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|vacuum|reindex|prepare|deallocate|listen|notify|refresh|lock|comment|into|dblink|lo_import|lo_export|pg_\w+)\b`)

// validarSQLRelatorioIA recebe o SQL gerado pela IA e devolve um SELECT seguro.
func validarSQLRelatorioIA(sql string) (string, error) {
	sql = strings.TrimSpace(sql)
	sql = strings.TrimSuffix(sql, ";")
	sql = strings.TrimSpace(sql)

	if sql == "" {
		return "", fmt.Errorf("consulta vazia")
	}
	if strings.Contains(sql, ";") {
		return "", fmt.Errorf("multiplas instrucoes nao sao permitidas")
	}

	superior := strings.ToUpper(strings.TrimSpace(sql))
	if !strings.HasPrefix(superior, "SELECT") && !strings.HasPrefix(superior, "WITH") {
		return "", fmt.Errorf("apenas instrucoes SELECT sao permitidas")
	}
	// Normaliza espacos/quebras de linha: SQL formatado em varias linhas
	// (ex.: montador de relatorios) tem FROM no inicio da linha.
	normalizado := strings.Join(strings.Fields(superior), " ")
	if !strings.Contains(normalizado, " FROM ") {
		return "", fmt.Errorf("a consulta precisa ler de uma tabela (FROM)")
	}
	if loc := relatorioIaProibido.FindString(sql); loc != "" {
		return "", fmt.Errorf("termo nao permitido na consulta: %s", strings.ToLower(loc))
	}

	// Sempre envolve a consulta para forcar o teto de linhas.
	final := fmt.Sprintf("SELECT * FROM (\n%s\n) AS relatorio_ia LIMIT %d", sql, relatorioIaMaxLinhas)
	return final, nil
}

func logRelatorioIA(r *http.Request, h *RelatorioIAHandler, sql string, linhas int, status, mensagem string) {
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)
	_, _ = h.Pool.Exec(r.Context(), `
		INSERT INTO relatorio_ia_log (empresa_id, usuario_id, sql_gerado, linhas, status, mensagem)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		empresaID, usuarioID, sql, linhas, status, mensagem)
}

// Consulta executa o SQL validado pela IA (somente leitura).
// POST /relatorio-ia/consulta  { "sql": "SELECT ..." }
func (h *RelatorioIAHandler) Consulta(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SQL string `json:"sql"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Corpo invalido", http.StatusBadRequest)
		return
	}

	sqlFinal, err := validarSQLRelatorioIA(body.SQL)
	if err != nil {
		logRelatorioIA(r, h, body.SQL, 0, "rejeitado", err.Error())
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno ao iniciar consulta", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	// Transacao somente leitura + timeout: mesmo que a validacao falhe por alguma
	// borda, o banco recusa qualquer escrita e aborta consultas lentas.
	if _, err := tx.Exec(r.Context(), "SET TRANSACTION READ ONLY"); err != nil {
		jsonError(w, "Erro interno ao preparar consulta", http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec(r.Context(), "SET LOCAL statement_timeout = '"+relatorioIaTimeout+"'"); err != nil {
		jsonError(w, "Erro interno ao preparar timeout", http.StatusInternalServerError)
		return
	}

	rows, err := tx.Query(r.Context(), sqlFinal)
	if err != nil {
		logRelatorioIA(r, h, sqlFinal, 0, "erro", err.Error())
		jsonError(w, "Erro na consulta: "+err.Error(), http.StatusBadRequest)
		return
	}

	fieldDescriptions := rows.FieldDescriptions()
	colunas := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		colunas[i] = string(fd.Name)
	}

	linhas := []map[string]interface{}{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, name := range colunas {
			if i < len(values) {
				row[name] = convertPGValue(values[i])
			}
		}
		linhas = append(linhas, row)
	}
	rows.Close()

	logRelatorioIA(r, h, sqlFinal, len(linhas), "ok", "")

	jsonSuccess(w, map[string]interface{}{
		"colunas":      colunas,
		"linhas":       linhas,
		"sql":          sqlFinal,
		"total_linhas": len(linhas),
	})
}

// ConversasListar devolve o historico do usuario logado.
// GET /relatorio-ia/conversas
func (h *RelatorioIAHandler) ConversasListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)

	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, titulo, criado_em, atualizado_em
		FROM relatorio_ia_conversa
		WHERE empresa_id = $1 AND usuario_id = $2
		ORDER BY atualizado_em DESC
		LIMIT 100`, empresaID, usuarioID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Conversa struct {
		ID           int       `json:"id"`
		Titulo       string    `json:"titulo"`
		CriadoEm     time.Time `json:"criado_em"`
		AtualizadoEm time.Time `json:"atualizado_em"`
	}
	resultado := []Conversa{}
	for rows.Next() {
		var c Conversa
		if err := rows.Scan(&c.ID, &c.Titulo, &c.CriadoEm, &c.AtualizadoEm); err == nil {
			resultado = append(resultado, c)
		}
	}
	jsonSuccess(w, resultado)
}

// ConversaCriar cria uma nova conversa e devolve o id.
// POST /relatorio-ia/conversas  { "titulo": "..." }
func (h *RelatorioIAHandler) ConversaCriar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Titulo string `json:"titulo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Titulo) == "" {
		jsonError(w, "Titulo obrigatorio", http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	id, err := database.GerarID(r.Context(), tx, empresaID, "relatorio_ia_conversa")
	if err != nil {
		jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	titulo := body.Titulo
	if len(titulo) > 200 {
		titulo = titulo[:200]
	}

	if _, err := tx.Exec(r.Context(), `
		INSERT INTO relatorio_ia_conversa (empresa_id, id, usuario_id, titulo)
		VALUES ($1, $2, $3, $4)`,
		empresaID, id, usuarioID, titulo); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"id": id, "titulo": titulo})
}

// MensagensListar devolve as mensagens de uma conversa (em ordem cronologica).
// GET /relatorio-ia/conversaMensagens?conversa_id=X
func (h *RelatorioIAHandler) MensagensListar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)
	conversaID := parseInt(r.URL.Query().Get("conversa_id"), 0)
	if conversaID == 0 {
		jsonError(w, "conversa_id obrigatorio", http.StatusBadRequest)
		return
	}

	// Garante que a conversa pertence ao usuario logado.
	var dono int
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT usuario_id FROM relatorio_ia_conversa WHERE empresa_id = $1 AND id = $2`,
		empresaID, conversaID).Scan(&dono); err != nil || dono != usuarioID {
		jsonError(w, "Conversa nao encontrada", http.StatusNotFound)
		return
	}

	rows, err := h.Pool.Query(r.Context(), `
		SELECT id, papel, conteudo, sql_gerado, dados, criado_em
		FROM relatorio_ia_mensagem
		WHERE empresa_id = $1 AND conversa_id = $2
		ORDER BY id ASC`, empresaID, conversaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Mensagem struct {
		ID        int             `json:"id"`
		Papel     string          `json:"papel"`
		Conteudo  string          `json:"conteudo"`
		SQLGerado *string         `json:"sql_gerado,omitempty"`
		Dados     json.RawMessage `json:"dados,omitempty"`
		CriadoEm  time.Time       `json:"criado_em"`
	}
	resultado := []Mensagem{}
	for rows.Next() {
		var m Mensagem
		var sqlGerado *string
		var dados []byte
		var criadoEm time.Time
		if err := rows.Scan(&m.ID, &m.Papel, &m.Conteudo, &sqlGerado, &dados, &criadoEm); err == nil {
			m.SQLGerado = sqlGerado
			if len(dados) > 0 {
				m.Dados = json.RawMessage(dados)
			}
			m.CriadoEm = criadoEm
			resultado = append(resultado, m)
		}
	}
	jsonSuccess(w, resultado)
}

// MensagemSalvar persiste uma mensagem (usuario ou IA) e atualiza a conversa.
// POST /relatorio-ia/mensagem  { conversa_id, papel, conteudo, sql_gerado?, dados? }
func (h *RelatorioIAHandler) MensagemSalvar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ConversaID int             `json:"conversa_id"`
		Papel      string          `json:"papel"`
		Conteudo  string          `json:"conteudo"`
		SQLGerado  string          `json:"sql_gerado"`
		Dados      json.RawMessage `json:"dados"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Corpo invalido", http.StatusBadRequest)
		return
	}
	if body.ConversaID == 0 || strings.TrimSpace(body.Conteudo) == "" {
		jsonError(w, "conversa_id e conteudo obrigatorios", http.StatusBadRequest)
		return
	}
	if body.Papel != "usuario" && body.Papel != "ia" {
		jsonError(w, "papel deve ser 'usuario' ou 'ia'", http.StatusBadRequest)
		return
	}

	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)

	var dono int
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT usuario_id FROM relatorio_ia_conversa WHERE empresa_id = $1 AND id = $2`,
		empresaID, body.ConversaID).Scan(&dono); err != nil || dono != usuarioID {
		jsonError(w, "Conversa nao encontrada", http.StatusNotFound)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	id, err := database.GerarID(r.Context(), tx, empresaID, "relatorio_ia_mensagem")
	if err != nil {
		jsonError(w, "Erro ao gerar ID: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var sqlGerado interface{}
	if body.SQLGerado != "" {
		sqlGerado = body.SQLGerado
	}
	var dados interface{}
	if len(body.Dados) > 0 && string(body.Dados) != "null" {
		dados = string(body.Dados)
	}

	if _, err := tx.Exec(r.Context(), `
		INSERT INTO relatorio_ia_mensagem (empresa_id, conversa_id, id, papel, conteudo, sql_gerado, dados)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
		empresaID, body.ConversaID, id, body.Papel, body.Conteudo, sqlGerado, dados); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err := tx.Exec(r.Context(), `
		UPDATE relatorio_ia_conversa SET atualizado_em = NOW()
		WHERE empresa_id = $1 AND id = $2`,
		empresaID, body.ConversaID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"id": id})
}

// ConversaExcluir remove a conversa e as mensagens (cascade manual).
// DELETE /relatorio-ia/conversa?id=X
func (h *RelatorioIAHandler) ConversaExcluir(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id == 0 {
		jsonError(w, "id obrigatorio", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	var dono int
	if err := tx.QueryRow(r.Context(),
		`SELECT usuario_id FROM relatorio_ia_conversa WHERE empresa_id = $1 AND id = $2`,
		empresaID, id).Scan(&dono); err != nil || dono != usuarioID {
		jsonError(w, "Conversa nao encontrada", http.StatusNotFound)
		return
	}

	if _, err := tx.Exec(r.Context(),
		`DELETE FROM relatorio_ia_mensagem WHERE empresa_id = $1 AND conversa_id = $2`,
		empresaID, id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec(r.Context(),
		`DELETE FROM relatorio_ia_conversa WHERE empresa_id = $1 AND id = $2`,
		empresaID, id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"mensagem": "Conversa excluida"})
}

// Quota devolve o numero de consultas feitas hoje pelo usuario (mensagens do usuario).
// GET /relatorio-ia/quota
func (h *RelatorioIAHandler) Quota(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaLogada(r)
	usuarioID := middleware.GetUserID(r)

	var usadas int
	if err := h.Pool.QueryRow(r.Context(), `
		SELECT COUNT(*)
		FROM relatorio_ia_mensagem m
		JOIN relatorio_ia_conversa c ON c.empresa_id = m.empresa_id AND c.id = m.conversa_id
		WHERE m.empresa_id = $1 AND c.usuario_id = $2
		  AND m.papel = 'usuario'
		  AND m.criado_em >= CURRENT_DATE`,
		empresaID, usuarioID).Scan(&usadas); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, map[string]interface{}{"usadas": usadas})
}
