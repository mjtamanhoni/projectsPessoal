package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

type APKHandler struct {
	APKDir string
	mu     sync.Mutex
}

func NewAPKHandler(apkDir string) *APKHandler {
	os.MkdirAll(apkDir, 0755)
	return &APKHandler{APKDir: apkDir}
}

type APKInfo struct {
	Nome       string `json:"nome"`
	Tamanho    int64  `json:"tamanho"`
	Modificado string `json:"modificado"`
	Versao     string `json:"versao"`
}

type APKVersionFile struct {
	Arquivos []APKInfo `json:"arquivos"`
}

func (h *APKHandler) loadVersions() APKVersionFile {
	data, err := os.ReadFile(filepath.Join(h.APKDir, "versions.json"))
	if err != nil {
		return APKVersionFile{}
	}
	var v APKVersionFile
	json.Unmarshal(data, &v)
	return v
}

func (h *APKHandler) saveVersions(v APKVersionFile) {
	data, _ := json.MarshalIndent(v, "", "  ")
	os.WriteFile(filepath.Join(h.APKDir, "versions.json"), data, 0644)
}

// Listar lista todos os APKs disponiveis.
func (h *APKHandler) Listar(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(h.APKDir)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	versions := h.loadVersions()
	versaoMap := make(map[string]string)
	for _, v := range versions.Arquivos {
		versaoMap[v.Nome] = v.Versao
	}

	var result []APKInfo
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(strings.ToLower(e.Name()), ".apk") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		result = append(result, APKInfo{
			Nome:       e.Name(),
			Tamanho:    info.Size(),
			Modificado: info.ModTime().UTC().Format(time.RFC3339),
			Versao:     versaoMap[e.Name()],
		})
	}
	if result == nil {
		result = []APKInfo{}
	}
	JsonSuccess(w, result)
}

// VersionReturn retorno do endpoint publico de versao.
type VersionReturn struct {
	Nome    string `json:"nome"`
	Versao  string `json:"versao"`
	Arquivo string `json:"arquivo"`
}

// VersaoPublico retorna a versao mais recente do APK (publico, sem auth).
// Suporta ?app=producao para filtrar por tipo de app.
func (h *APKHandler) VersaoPublico(w http.ResponseWriter, r *http.Request) {
	versions := h.loadVersions()
	appFilter := strings.TrimSpace(r.URL.Query().Get("app"))

	var maisRecente *APKInfo
	for i := range versions.Arquivos {
		v := &versions.Arquivos[i]
		if v.Versao == "" {
			continue
		}
		// Filtrar por tipo de app se solicitado
		if appFilter != "" {
			nomeLower := strings.ToLower(v.Nome)
			if appFilter == "producao" && !strings.Contains(nomeLower, "producao") && !strings.Contains(nomeLower, "fabrica") {
				continue
			}
			if appFilter == "cliente" && (strings.Contains(nomeLower, "producao") || strings.Contains(nomeLower, "fabrica")) {
				continue
			}
		}
		if maisRecente == nil || v.Versao > maisRecente.Versao {
			maisRecente = v
		}
	}

	if maisRecente == nil {
		JsonSuccess(w, VersionReturn{})
		return
	}

	JsonSuccess(w, VersionReturn{
		Nome:    maisRecente.Nome,
		Versao:  maisRecente.Versao,
		Arquivo: maisRecente.Nome,
	})
}

// Upload recebe um arquivo APK via multipart e salva no diretorio.
func (h *APKHandler) Upload(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if err := r.ParseMultipartForm(100 << 20); err != nil {
		JsonError(w, "Erro ao processar upload: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("apk")
	if err != nil {
		JsonError(w, "Campo 'apk' e obrigatorio", http.StatusBadRequest)
		return
	}
	defer file.Close()

	nome := header.Filename
	if nome == "" {
		nome = "app.apk"
	}
	if !strings.HasSuffix(strings.ToLower(nome), ".apk") {
		nome += ".apk"
	}
	nome = filepath.Base(nome)

	versao := strings.TrimSpace(r.FormValue("versao"))
	if versao == "" {
		// Reuse existing version for this file if it exists
		versions := h.loadVersions()
		for _, v := range versions.Arquivos {
			if v.Nome == nome && v.Versao != "" {
				versao = v.Versao
				break
			}
		}
		if versao == "" {
			now := time.Now()
			versao = fmt.Sprintf("%04d.%02d.%02d.%02d.%02d", now.Year(), now.Month(), now.Day(), now.Hour(), now.Minute())
		}
	}

	dst, err := os.Create(filepath.Join(h.APKDir, nome))
	if err != nil {
		JsonError(w, "Erro ao salvar arquivo: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		JsonError(w, "Erro ao gravar arquivo: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Salvar versao no versions.json
	versions := h.loadVersions()
	found := false
	for i := range versions.Arquivos {
		if versions.Arquivos[i].Nome == nome {
			versions.Arquivos[i].Versao = versao
			versions.Arquivos[i].Tamanho = header.Size
			versions.Arquivos[i].Modificado = time.Now().UTC().Format(time.RFC3339)
			found = true
			break
		}
	}
	if !found {
		versions.Arquivos = append(versions.Arquivos, APKInfo{
			Nome:       nome,
			Tamanho:    header.Size,
			Modificado: time.Now().UTC().Format(time.RFC3339),
			Versao:     versao,
		})
	}
	h.saveVersions(versions)

	info, _ := dst.Stat()
	JsonSuccess(w, APKInfo{
		Nome:       nome,
		Tamanho:    info.Size(),
		Modificado: info.ModTime().UTC().Format(time.RFC3339),
		Versao:     versao,
	})
}

// Excluir remove um APK do diretorio.
func (h *APKHandler) Excluir(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	defer h.mu.Unlock()

	nome := chi.URLParam(r, "filename")
	nome = filepath.Base(nome)
	if nome == "" || nome == "." || nome == ".." {
		JsonError(w, "Nome de arquivo invalido", http.StatusBadRequest)
		return
	}

	caminho := filepath.Join(h.APKDir, nome)
	if _, err := os.Stat(caminho); os.IsNotExist(err) {
		JsonError(w, "Arquivo nao encontrado", http.StatusNotFound)
		return
	}

	if err := os.Remove(caminho); err != nil {
		JsonError(w, "Erro ao excluir: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Remover do versions.json
	versions := h.loadVersions()
	var filtrados []APKInfo
	for _, v := range versions.Arquivos {
		if v.Nome != nome {
			filtrados = append(filtrados, v)
		}
	}
	versions.Arquivos = filtrados
	h.saveVersions(versions)

	JsonSuccess(w, map[string]string{"mensagem": "Arquivo excluido com sucesso"})
}

// Download serve o arquivo APK para download.
func (h *APKHandler) Download(w http.ResponseWriter, r *http.Request) {
	nome := chi.URLParam(r, "filename")
	nome = filepath.Base(nome)

	caminho := filepath.Join(h.APKDir, nome)
	if _, err := os.Stat(caminho); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", nome))
	w.Header().Set("Content-Type", "application/vnd.android.package-archive")
	http.ServeFile(w, r, caminho)
}
