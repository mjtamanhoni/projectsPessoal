package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"

	"gestor-server/middleware"
)

// Configuracao de IA por empresa: cada empresa pode ter a propria chave,
// modelo, URL base e cota diaria. Sem registro, o BFF usa o fallback global
// definido no .env (LLM_API_KEY / LLM_MODEL / LLM_QUOTA_DIARIA).

const empresaLLMQuotaPadrao = 20

type empresaLLMConfig struct {
	EmpresaID   int
	APIKey      string
	BaseURL     string
	Modelo      string
	QuotaDiaria int
}

// empresaAlvoLLM resolve a empresa da operacao. Usuario comum so pode operar
// a propria empresa; superadmin pode informar qualquer empresa_id.
func empresaAlvoLLM(r *http.Request, solicitada int) (int, error) {
	empresaLogada := middleware.GetEmpresaLogada(r)
	if solicitada <= 0 || solicitada == empresaLogada {
		return empresaLogada, nil
	}
	if !middleware.GetIsSuperadmin(r) {
		return 0, fmt.Errorf("acesso restrito a empresa do usuario")
	}
	return solicitada, nil
}

func carregarEmpresaLLMConfig(r *http.Request, h *RelatorioIAHandler, empresaID int) (empresaLLMConfig, error) {
	cfg := empresaLLMConfig{EmpresaID: empresaID, QuotaDiaria: empresaLLMQuotaPadrao}
	err := h.Pool.QueryRow(r.Context(), `
		SELECT COALESCE(api_key, ''), COALESCE(base_url, ''), COALESCE(modelo, ''), COALESCE(quota_diaria, $2)
		FROM empresa_llm_config
		WHERE empresa_id = $1`, empresaID, empresaLLMQuotaPadrao).
		Scan(&cfg.APIKey, &cfg.BaseURL, &cfg.Modelo, &cfg.QuotaDiaria)
	if errors.Is(err, pgx.ErrNoRows) {
		return cfg, nil
	}
	if err != nil {
		return cfg, err
	}
	if cfg.QuotaDiaria <= 0 {
		cfg.QuotaDiaria = empresaLLMQuotaPadrao
	}
	return cfg, nil
}

func mascararChaveIA(chave string) string {
	chave = strings.TrimSpace(chave)
	if chave == "" {
		return ""
	}
	if len(chave) <= 4 {
		return "****"
	}
	return "****" + chave[len(chave)-4:]
}

func empresaLLMConfigResposta(cfg empresaLLMConfig) map[string]interface{} {
	return map[string]interface{}{
		"empresa_id":        cfg.EmpresaID,
		"api_key_mascarada": mascararChaveIA(cfg.APIKey),
		"configurado":       strings.TrimSpace(cfg.APIKey) != "",
		"base_url":          cfg.BaseURL,
		"modelo":            cfg.Modelo,
		"quota_diaria":      cfg.QuotaDiaria,
	}
}

// LLMConfigGet devolve a configuracao armazenada da empresa (chave mascarada).
// GET /relatorio-ia/llm-config?empresa_id=X
func (h *RelatorioIAHandler) LLMConfigGet(w http.ResponseWriter, r *http.Request) {
	empresaID, err := empresaAlvoLLM(r, parseInt(r.URL.Query().Get("empresa_id"), 0))
	if err != nil {
		jsonError(w, err.Error(), http.StatusForbidden)
		return
	}

	cfg, err := carregarEmpresaLLMConfig(r, h, empresaID)
	if err != nil {
		jsonError(w, "Erro ao ler configuracao da IA: "+err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, empresaLLMConfigResposta(cfg))
}

// LLMKeyGet devolve a chave em texto puro para uso interno do BFF.
// GET /relatorio-ia/llm-key?empresa_id=X
func (h *RelatorioIAHandler) LLMKeyGet(w http.ResponseWriter, r *http.Request) {
	if !middleware.ValidarSegredoInterno(r) {
		jsonError(w, "Acesso interno", http.StatusForbidden)
		return
	}

	empresaID, err := empresaAlvoLLM(r, parseInt(r.URL.Query().Get("empresa_id"), 0))
	if err != nil {
		jsonError(w, err.Error(), http.StatusForbidden)
		return
	}

	cfg, err := carregarEmpresaLLMConfig(r, h, empresaID)
	if err != nil {
		jsonError(w, "Erro ao ler chave da IA: "+err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{
		"empresa_id":   cfg.EmpresaID,
		"api_key":      cfg.APIKey,
		"base_url":     cfg.BaseURL,
		"modelo":       cfg.Modelo,
		"quota_diaria": cfg.QuotaDiaria,
	})
}

// LLMConfigSalvar cria/atualiza a configuracao da empresa.
// PUT /relatorio-ia/llm-config
func (h *RelatorioIAHandler) LLMConfigSalvar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		EmpresaID    int     `json:"empresa_id"`
		APIKey       *string `json:"api_key"`
		BaseURL      *string `json:"base_url"`
		Modelo       *string `json:"modelo"`
		QuotaDiaria  *int    `json:"quota_diaria"`
		RemoverChave bool    `json:"remover_chave"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Corpo invalido", http.StatusBadRequest)
		return
	}

	empresaID, err := empresaAlvoLLM(r, body.EmpresaID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusForbidden)
		return
	}

	cfg, err := carregarEmpresaLLMConfig(r, h, empresaID)
	if err != nil {
		jsonError(w, "Erro ao ler configuracao da IA: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if body.RemoverChave {
		cfg.APIKey = ""
	} else if body.APIKey != nil {
		if chave := strings.TrimSpace(*body.APIKey); chave != "" {
			cfg.APIKey = chave
		}
	}
	if body.BaseURL != nil {
		cfg.BaseURL = strings.TrimSpace(*body.BaseURL)
	}
	if body.Modelo != nil {
		cfg.Modelo = strings.TrimSpace(*body.Modelo)
	}
	if body.QuotaDiaria != nil {
		if *body.QuotaDiaria < 1 || *body.QuotaDiaria > 10000 {
			jsonError(w, "Cota diaria deve estar entre 1 e 10000", http.StatusBadRequest)
			return
		}
		cfg.QuotaDiaria = *body.QuotaDiaria
	}
	if cfg.QuotaDiaria <= 0 {
		cfg.QuotaDiaria = empresaLLMQuotaPadrao
	}
	if len(cfg.APIKey) > 500 {
		jsonError(w, "Chave da IA muito longa", http.StatusBadRequest)
		return
	}
	if len(cfg.BaseURL) > 300 {
		jsonError(w, "URL base muito longa", http.StatusBadRequest)
		return
	}
	if len(cfg.Modelo) > 100 {
		jsonError(w, "Modelo muito longo", http.StatusBadRequest)
		return
	}

	if _, err := h.Pool.Exec(r.Context(), `
		INSERT INTO empresa_llm_config (empresa_id, api_key, base_url, modelo, quota_diaria, atualizado_em)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), $5, NOW())
		ON CONFLICT (empresa_id) DO UPDATE SET
			api_key = EXCLUDED.api_key,
			base_url = EXCLUDED.base_url,
			modelo = EXCLUDED.modelo,
			quota_diaria = EXCLUDED.quota_diaria,
			atualizado_em = NOW()`,
		empresaID, cfg.APIKey, cfg.BaseURL, cfg.Modelo, cfg.QuotaDiaria); err != nil {
		jsonError(w, "Erro ao salvar configuracao da IA: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonSuccess(w, empresaLLMConfigResposta(cfg))
}
