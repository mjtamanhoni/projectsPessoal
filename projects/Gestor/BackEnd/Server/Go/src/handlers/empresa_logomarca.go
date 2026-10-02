package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"gestor-server/config"
)

const logomarcasBase = "Logomarcas"

// EmpresaLogomarcaSalvar salva/remove a logomarca de uma empresa.
// POST /empresa/logomarca  body: { id, logomarca }
// - logomarca vazio: remove a logomarca atual (apaga o arquivo e zera o campo).
// - logomarca em base64: salva o arquivo em Fotos/Logomarcas/{nome da empresa}.{ext} e grava o caminho relativo.
func (h *BasicCRUD) EmpresaLogomarcaSalvar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID              int    `json:"id"`
		Logomarca       string `json:"logomarca"`        // compatibilidade: usa logomarca_paginas
		LogomarcaPaginas    string `json:"logomarca_paginas"`     // Logo das páginas
		LogomarcaRelatorios string `json:"logomarca_relatorios"`  // Logo para relatórios jato de tinta
		LogomarcaFiscal     string `json:"logomarca_fiscal"`      // Logo para impressora fiscal
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	if req.ID <= 0 {
		jsonError(w, "ID da empresa obrigatório", http.StatusBadRequest)
		return
	}

	var empresaNome string
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(NULLIF(fantasia,''), razao_social, 'Empresa') FROM public.empresa WHERE id = $1`,
		req.ID).Scan(&empresaNome); err != nil {
		jsonError(w, "Empresa não encontrada", http.StatusNotFound)
		return
	}

	fotosDir := config.Load().FotosDir

	removerArquivoAtual := func(campo string) {
		var atual *string
		if err := h.Pool.QueryRow(r.Context(),
			fmt.Sprintf(`SELECT %s FROM public.empresa WHERE id = $1`, campo),
			req.ID).Scan(&atual); err == nil && atual != nil && *atual != "" {
			caminho := filepath.Join(fotosDir, filepath.FromSlash(*atual))
			if _, err := os.Stat(caminho); err == nil {
				os.Remove(caminho)
			}
		}
	}

	processarLogomarca := func(campo, valor string) (string, error) {
		if valor == "" {
			return "", nil
		}
		raw := valor
		if idx := strings.Index(raw, ","); idx >= 0 {
			raw = raw[idx+1:]
		}
		data, err := base64.StdEncoding.DecodeString(strings.TrimSpace(raw))
		if err != nil {
			return "", fmt.Errorf("imagem inválida (base64): %s", campo)
		}
		if len(data) > 8*1024*1024 {
			return "", fmt.Errorf("imagem muito grande (máx. 8MB): %s", campo)
		}
		ext := detectFotoExt(data)
		if ext == "" {
			return "", fmt.Errorf("formato de imagem inválido (use JPG, PNG ou WEBP): %s", campo)
		}

		subDir := filepath.Join(fotosDir, logomarcasBase)
		if err := os.MkdirAll(subDir, 0755); err != nil {
			return "", fmt.Errorf("erro ao criar diretório de uploads: %s", campo)
		}

		arquivoNome := fmt.Sprintf("%s_%s%s", sanitizarNomeArquivo(empresaNome), campo, ext)
		caminhoFinal := filepath.Join(subDir, arquivoNome)
		if err := os.WriteFile(caminhoFinal, data, 0644); err != nil {
			return "", err
		}

		// Remove arquivo anterior se diferente
		var atual *string
		if err := h.Pool.QueryRow(r.Context(),
			fmt.Sprintf(`SELECT %s FROM public.empresa WHERE id = $1`, campo),
			req.ID).Scan(&atual); err == nil && atual != nil && *atual != "" && *atual != filepath.ToSlash(filepath.Join(logomarcasBase, arquivoNome)) {
			antigo := filepath.Join(fotosDir, filepath.FromSlash(*atual))
			if _, err := os.Stat(antigo); err == nil {
				os.Remove(antigo)
			}
		}

		return filepath.ToSlash(filepath.Join(logomarcasBase, arquivoNome)), nil
	}

	// Processa cada tipo de logomarca
	var relPaginas, relRelatorios, relFiscal string
	var err error

	if req.LogomarcaPaginas != "" || req.Logomarca != "" {
		valor := req.LogomarcaPaginas
		if valor == "" {
			valor = req.Logomarca // compatibilidade
		}
		if valor != "" {
			removerArquivoAtual("logomarca_paginas")
			relPaginas, err = processarLogomarca("logomarca_paginas", valor)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
		}
	}
	if req.LogomarcaRelatorios != "" {
		removerArquivoAtual("logomarca_relatorios")
		relRelatorios, err = processarLogomarca("logomarca_relatorios", req.LogomarcaRelatorios)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	if req.LogomarcaFiscal != "" {
		removerArquivoAtual("logomarca_fiscal")
		relFiscal, err = processarLogomarca("logomarca_fiscal", req.LogomarcaFiscal)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	// Atualiza banco
	updates := []string{}
	vals := []interface{}{}
	paramIdx := 1

	if relPaginas != "" {
		updates = append(updates, fmt.Sprintf("logomarca_paginas = $%d", paramIdx))
		vals = append(vals, relPaginas)
		paramIdx++
	}
	if relRelatorios != "" {
		updates = append(updates, fmt.Sprintf("logomarca_relatorios = $%d", paramIdx))
		vals = append(vals, relRelatorios)
		paramIdx++
	}
	if relFiscal != "" {
		updates = append(updates, fmt.Sprintf("logomarca_fiscal = $%d", paramIdx))
		vals = append(vals, relFiscal)
		paramIdx++
	}

	if len(updates) > 0 {
		vals = append(vals, req.ID)
		query := fmt.Sprintf("UPDATE public.empresa SET %s WHERE id = $%d", strings.Join(updates, ", "), paramIdx)
		if _, err := h.Pool.Exec(r.Context(), query, vals...); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	resp := map[string]interface{}{"mensagem": "Logomarcas salvas com sucesso"}
	if relPaginas != "" {
		resp["logomarca_paginas"] = relPaginas
	}
	if relRelatorios != "" {
		resp["logomarca_relatorios"] = relRelatorios
	}
	if relFiscal != "" {
		resp["logomarca_fiscal"] = relFiscal
	}
	jsonSuccess(w, resp)
}
