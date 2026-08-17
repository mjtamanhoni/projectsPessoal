package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"gestor-server/config"
	"gestor-server/middleware"
)

const fotosBase = "Produtos Fabricados"

func detectFotoExt(data []byte) string {
	switch {
	case bytes.HasPrefix(data, []byte{0xFF, 0xD8, 0xFF}):
		return ".jpg"
	case bytes.HasPrefix(data, []byte{0x89, 0x50, 0x4E, 0x47}):
		return ".png"
	case bytes.HasPrefix(data, []byte("RIFF")) && len(data) > 12 && string(data[8:12]) == "WEBP":
		return ".webp"
	}
	return ""
}

func sanitizarNomeArquivo(nome string) string {
	nome = strings.TrimSpace(nome)
	if nome == "" {
		return "produto"
	}
	replacer := strings.NewReplacer(
		"\\", "-",
		"/", "-",
		":", "-",
		"*", "-",
		"?", "-",
		"\"", "",
		"<", "",
		">", "",
		"|", "-",
	)
	nome = replacer.Replace(nome)
	nome = strings.Trim(nome, " .")
	if nome == "" {
		return "produto"
	}
	return nome
}

func (h *ProducaoHandler) ProdutoFotoSalvar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	var req struct {
		ID   int    `json:"id"`
		Foto string `json:"foto"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	if req.ID <= 0 {
		jsonError(w, "ID do produto obrigatório", http.StatusBadRequest)
		return
	}

	var empresaNome, produtoNome string
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(NULLIF(fantasia,''), razao_social, 'Empresa') FROM empresa WHERE id = $1`,
		empresaID).Scan(&empresaNome); err != nil {
		jsonError(w, "Empresa não encontrada", http.StatusNotFound)
		return
	}
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(nome, 'produto') FROM produto_fabricado WHERE id = $1 AND empresa_id = $2`,
		req.ID, empresaID).Scan(&produtoNome); err != nil {
		jsonError(w, "Produto não encontrado", http.StatusNotFound)
		return
	}

	fotosDir := config.Load().FotosDir

	if req.Foto == "" {
		var fotoAtual *string
		if err := h.Pool.QueryRow(r.Context(),
			`SELECT foto FROM produto_fabricado WHERE id = $1 AND empresa_id = $2`,
			req.ID, empresaID).Scan(&fotoAtual); err == nil && fotoAtual != nil && *fotoAtual != "" {
			antigo := filepath.Join(fotosDir, filepath.FromSlash(*fotoAtual))
			if _, err := os.Stat(antigo); err == nil {
				os.Remove(antigo)
			}
		}
		if _, err := h.Pool.Exec(r.Context(),
			"UPDATE produto_fabricado SET foto = NULL WHERE id = $1 AND empresa_id = $2",
			req.ID, empresaID); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		jsonSuccess(w, map[string]interface{}{"mensagem": "Foto removida com sucesso"})
		return
	}

	raw := req.Foto
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

	subDir := filepath.Join(fotosDir, fotosBase, sanitizarNomeArquivo(empresaNome))
	if err := os.MkdirAll(subDir, 0755); err != nil {
		jsonError(w, "Erro ao criar diretório de uploads", http.StatusInternalServerError)
		return
	}

	arquivoNome := sanitizarNomeArquivo(produtoNome) + ext
	caminhoFinal := filepath.Join(subDir, arquivoNome)
	if err := os.WriteFile(caminhoFinal, data, 0644); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	relativo := filepath.ToSlash(filepath.Join(fotosBase, sanitizarNomeArquivo(empresaNome), arquivoNome))

	var fotoAnterior *string
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT foto FROM produto_fabricado WHERE id = $1 AND empresa_id = $2`,
		req.ID, empresaID).Scan(&fotoAnterior); err == nil && fotoAnterior != nil && *fotoAnterior != "" && *fotoAnterior != relativo {
		antigo := filepath.Join(fotosDir, filepath.FromSlash(*fotoAnterior))
		if _, err := os.Stat(antigo); err == nil {
			os.Remove(antigo)
		}
	}

	if _, err := h.Pool.Exec(r.Context(),
		`UPDATE produto_fabricado SET foto = $1 WHERE id = $2 AND empresa_id = $3`,
		relativo, req.ID, empresaID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Foto salva com sucesso", "foto": relativo})
}

const fotosBaseVenda = "Produtos de Venda"

// ProdutoVendaFotoSalvar salva ou remove a foto de um produto de venda.
func (h *ProducaoHandler) ProdutoVendaFotoSalvar(w http.ResponseWriter, r *http.Request) {
	empresaID := middleware.GetEmpresaID(r)

	var req struct {
		ID   int    `json:"id"`
		Foto string `json:"foto"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "JSON inválido", http.StatusBadRequest)
		return
	}
	if req.ID <= 0 {
		jsonError(w, "ID do produto de venda obrigatório", http.StatusBadRequest)
		return
	}

	var empresaNome, produtoNome string
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(NULLIF(fantasia,''), razao_social, 'Empresa') FROM empresa WHERE id = $1`,
		empresaID).Scan(&empresaNome); err != nil {
		jsonError(w, "Empresa não encontrada", http.StatusNotFound)
		return
	}
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(nome, 'produto') FROM produto_venda WHERE id = $1 AND empresa_id = $2`,
		req.ID, empresaID).Scan(&produtoNome); err != nil {
		jsonError(w, "Produto de venda não encontrado", http.StatusNotFound)
		return
	}

	fotosDir := config.Load().FotosDir

	if req.Foto == "" {
		var fotoAtual *string
		if err := h.Pool.QueryRow(r.Context(),
			`SELECT foto FROM produto_venda WHERE id = $1 AND empresa_id = $2`,
			req.ID, empresaID).Scan(&fotoAtual); err == nil && fotoAtual != nil && *fotoAtual != "" {
			antigo := filepath.Join(fotosDir, filepath.FromSlash(*fotoAtual))
			if _, err := os.Stat(antigo); err == nil {
				os.Remove(antigo)
			}
		}
		if _, err := h.Pool.Exec(r.Context(),
			"UPDATE produto_venda SET foto = NULL WHERE id = $1 AND empresa_id = $2",
			req.ID, empresaID); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		jsonSuccess(w, map[string]interface{}{"mensagem": "Foto removida com sucesso"})
		return
	}

	raw := req.Foto
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

	subDir := filepath.Join(fotosDir, fotosBaseVenda, sanitizarNomeArquivo(empresaNome))
	if err := os.MkdirAll(subDir, 0755); err != nil {
		jsonError(w, "Erro ao criar diretório de uploads", http.StatusInternalServerError)
		return
	}

	arquivoNome := sanitizarNomeArquivo(produtoNome) + ext
	caminhoFinal := filepath.Join(subDir, arquivoNome)
	if err := os.WriteFile(caminhoFinal, data, 0644); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	relativo := filepath.ToSlash(filepath.Join(fotosBaseVenda, sanitizarNomeArquivo(empresaNome), arquivoNome))

	var fotoAnterior *string
	if err := h.Pool.QueryRow(r.Context(),
		`SELECT foto FROM produto_venda WHERE id = $1 AND empresa_id = $2`,
		req.ID, empresaID).Scan(&fotoAnterior); err == nil && fotoAnterior != nil && *fotoAnterior != "" && *fotoAnterior != relativo {
		antigo := filepath.Join(fotosDir, filepath.FromSlash(*fotoAnterior))
		if _, err := os.Stat(antigo); err == nil {
			os.Remove(antigo)
		}
	}

	if _, err := h.Pool.Exec(r.Context(),
		`UPDATE produto_venda SET foto = $1 WHERE id = $2 AND empresa_id = $3`,
		relativo, req.ID, empresaID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"mensagem": "Foto salva com sucesso", "foto": relativo})
}
