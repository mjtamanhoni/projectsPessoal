package handlers

import (
	"encoding/base64"
	"encoding/json"
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
		ID        int    `json:"id"`
		Logomarca string `json:"logomarca"`
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

	removerArquivoAtual := func() {
		var atual *string
		if err := h.Pool.QueryRow(r.Context(),
			`SELECT logomarca FROM public.empresa WHERE id = $1`,
			req.ID).Scan(&atual); err == nil && atual != nil && *atual != "" {
			caminho := filepath.Join(fotosDir, filepath.FromSlash(*atual))
			if _, err := os.Stat(caminho); err == nil {
				os.Remove(caminho)
			}
		}
	}

	if req.Logomarca == "" {
		removerArquivoAtual()
		if _, err := h.Pool.Exec(r.Context(),
			"UPDATE public.empresa SET logomarca = NULL WHERE id = $1",
			req.ID); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		jsonSuccess(w, map[string]interface{}{"mensagem": "Logomarca removida com sucesso"})
		return
	}

	raw := req.Logomarca
	if idx := strings.Index(raw, ","); idx >= 0 {
		raw = raw[idx+1:]
	}
	data, err := base64.StdEncoding.DecodeString(strings.TrimSpace(raw))
	if err != nil {
		jsonError(w, "Imagem inválida (base64)", http.StatusBadRequest)
		return
	}
	if len(data) > 8*1024*1024 {
		jsonError(w, "Imagem muito grande (máx. 8MB)", http.StatusBadRequest)
		return
	}
	ext := detectFotoExt(data)
	if ext == "" {
		jsonError(w, "Formato de imagem inválido (use JPG, PNG ou WEBP)", http.StatusBadRequest)
		return
	}

	subDir := filepath.Join(fotosDir, logomarcasBase)
	if err := os.MkdirAll(subDir, 0755); err != nil {
		jsonError(w, "Erro ao criar diretório de uploads", http.StatusInternalServerError)
		return
	}

	arquivoNome := sanitizarNomeArquivo(empresaNome) + ext
	caminhoFinal := filepath.Join(subDir, arquivoNome)
	if err := os.WriteFile(caminhoFinal, data, 0644); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	relativo := filepath.ToSlash(filepath.Join(logomarcasBase, arquivoNome))

	var atual *string
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT logomarca FROM public.empresa WHERE id = $1`,
		req.ID).Scan(&atual); err == nil && atual != nil && *atual != "" && *atual != relativo {
		antigo := filepath.Join(fotosDir, filepath.FromSlash(*atual))
		if _, err := os.Stat(antigo); err == nil {
			os.Remove(antigo)
		}
	}

	if _, err := h.Pool.Exec(r.Context(),
		"UPDATE public.empresa SET logomarca = $1 WHERE id = $2",
		relativo, req.ID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Logomarca salva com sucesso", "logomarca": relativo})
}
