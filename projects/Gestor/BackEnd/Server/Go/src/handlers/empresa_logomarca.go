package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gestor-server/config"
)

const logomarcasBase = "Logomarcas"

// EmpresaLogomarcaSalvar salva/remove as logomarcas de uma empresa.
// POST /empresa/logomarca  body: { id, logomarca | logomarca_paginas, logomarca_relatorios, logomarca_fiscal }
//   - campo ausente: mantém a logomarca atual daquele tipo.
//   - campo vazio: remove a logomarca atual (apaga o arquivo e zera a coluna).
//   - campo em base64: salva o arquivo em Fotos/Logomarcas/{nome da empresa}_{campo}_{timestamp}.{ext}
//     e grava o caminho relativo. O nome é único a cada envio para que a troca de
//     uma logomarca já existente sempre gere uma URL nova (sem cache do navegador)
//     e para não sobrescrever um arquivo que possa estar em uso no Windows.
func (h *BasicCRUD) EmpresaLogomarcaSalvar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID                  int     `json:"id"`
		Logomarca           *string `json:"logomarca"`            // compatibilidade: usa logomarca_paginas
		LogomarcaPaginas    *string `json:"logomarca_paginas"`    // Logo das páginas
		LogomarcaRelatorios *string `json:"logomarca_relatorios"` // Logo para relatórios jato de tinta
		LogomarcaFiscal     *string `json:"logomarca_fiscal"`     // Logo para impressora fiscal
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
				_ = os.Remove(caminho)
			}
		}
	}

	processarLogomarca := func(campo, valor string) (string, error) {
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

		base := sanitizarNomeArquivo(empresaNome)
		if runes := []rune(base); len(runes) > 60 {
			base = string(runes[:60])
		}
		arquivoNome := fmt.Sprintf("%s_%s_%s%s", base, campo, time.Now().Format("20060102-150405"), ext)
		caminhoFinal := filepath.Join(subDir, arquivoNome)
		if err := os.WriteFile(caminhoFinal, data, 0644); err != nil {
			return "", err
		}
		return filepath.ToSlash(filepath.Join(logomarcasBase, arquivoNome)), nil
	}

	// Monta a lista de campos a processar. logomarca é compatibilidade de logomarca_paginas.
	type campoLogo struct {
		coluna string
		valor  *string
	}
	campos := []campoLogo{}
	if req.LogomarcaPaginas != nil {
		campos = append(campos, campoLogo{"logomarca_paginas", req.LogomarcaPaginas})
	} else if req.Logomarca != nil {
		campos = append(campos, campoLogo{"logomarca_paginas", req.Logomarca})
	}
	if req.LogomarcaRelatorios != nil {
		campos = append(campos, campoLogo{"logomarca_relatorios", req.LogomarcaRelatorios})
	}
	if req.LogomarcaFiscal != nil {
		campos = append(campos, campoLogo{"logomarca_fiscal", req.LogomarcaFiscal})
	}

	if len(campos) == 0 {
		jsonError(w, "Nenhuma logomarca informada", http.StatusBadRequest)
		return
	}

	updates := []string{}
	vals := []interface{}{}
	resp := map[string]interface{}{}

	for _, c := range campos {
		valor := strings.TrimSpace(*c.valor)
		if valor == "" {
			// Remove a logomarca atual (arquivo + coluna).
			removerArquivoAtual(c.coluna)
			updates = append(updates, fmt.Sprintf("%s = NULL", c.coluna))
			resp[c.coluna] = nil
			continue
		}
		rel, err := processarLogomarca(c.coluna, valor)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		// Apaga o arquivo antigo. O novo tem nome único, então nunca é o mesmo arquivo.
		removerArquivoAtual(c.coluna)
		updates = append(updates, fmt.Sprintf("%s = $%d", c.coluna, len(vals)+1))
		vals = append(vals, rel)
		resp[c.coluna] = rel
	}

	vals = append(vals, req.ID)
	query := fmt.Sprintf("UPDATE public.empresa SET %s WHERE id = $%d", strings.Join(updates, ", "), len(vals))
	if _, err := h.Pool.Exec(r.Context(), query, vals...); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp["mensagem"] = "Logomarcas salvas com sucesso"
	jsonSuccess(w, resp)
}
