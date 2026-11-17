package handlers

import (
	"embed"
	"encoding/csv"
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
	"gestor-server/middleware"
)

type RegiaoEntregaHandler struct {
	Pool *pgxpool.Pool
}

type RegiaoEntregaItem struct {
	CodigoIBGE string   `json:"codigo_ibge"`
	Cidade     string   `json:"cidade"`
	UF         string   `json:"uf"`
	Latitude   *float64 `json:"latitude"`
	Longitude  *float64 `json:"longitude"`
}

type regiaoEntregaLoteRequest struct {
	EmpresaID int                 `json:"empresa_id"`
	Regioes   []RegiaoEntregaItem `json:"regioes"`
}

func empresaAlvoRegiao(r *http.Request, solicitada int) int {
	if middleware.GetIsSuperadmin(r) {
		if solicitada > 0 {
			return solicitada
		}
		return 0
	}
	return middleware.GetEmpresaLogada(r)
}

func ufRegiaoValida(uf string) bool {
	if len(uf) != 2 {
		return false
	}
	for _, c := range uf {
		if c < 'A' || c > 'Z' {
			return false
		}
	}
	return true
}

func codigoIBGEValido(codigo string) bool {
	if codigo == "" {
		return true
	}
	if len(codigo) != 7 {
		return false
	}
	for _, c := range codigo {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

var acentosCidade = strings.NewReplacer(
	"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u",
	"ç", "c", "ñ", "n",
	"Á", "A", "À", "A", "Ã", "A", "Â", "A", "Ä", "A",
	"É", "E", "È", "E", "Ê", "E", "Ë", "E",
	"Í", "I", "Ì", "I", "Î", "I", "Ï", "I",
	"Ó", "O", "Ò", "O", "Õ", "O", "Ô", "O", "Ö", "O",
	"Ú", "U", "Ù", "U", "Û", "U", "Ü", "U",
	"Ç", "C", "Ñ", "N",
)

func chaveCidade(nome string) string {
	s := strings.ToLower(strings.TrimSpace(acentosCidade.Replace(nome)))
	var b strings.Builder
	espaco := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			espaco = false
			continue
		}
		if b.Len() > 0 && !espaco {
			b.WriteByte(' ')
			espaco = true
		}
	}
	return strings.TrimSpace(b.String())
}

func validarRegiao(item RegiaoEntregaItem) (string, string, string, string, string) {
	cidade := strings.TrimSpace(item.Cidade)
	uf := strings.ToUpper(strings.TrimSpace(item.UF))
	codigo := strings.TrimSpace(item.CodigoIBGE)
	chave := chaveCidade(cidade)
	if cidade == "" || chave == "" {
		return "", "", "", "", "Cidade obrigatoria"
	}
	if !ufRegiaoValida(uf) {
		return "", "", "", "", "UF invalida"
	}
	if !codigoIBGEValido(codigo) {
		return "", "", "", "", "Codigo IBGE invalido"
	}
	return cidade, uf, chave, codigo, ""
}

func (h *RegiaoEntregaHandler) Listar(w http.ResponseWriter, r *http.Request) {
	empresaID := empresaAlvoRegiao(r, parseInt(r.URL.Query().Get("empresa_id"), 0))
	uf := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("uf")))
	cidade := chaveCidade(r.URL.Query().Get("cidade"))

	query := `SELECT empresa_id, id, uf, cidade, cidade_chave, codigo_ibge,
		COALESCE(latitude, 0) AS latitude, COALESCE(longitude, 0) AS longitude,
		created_at
		FROM public.empresa_regiao_entrega WHERE 1=1`
	args := []interface{}{}
	argN := 1
	if empresaID > 0 {
		query += " AND empresa_id = $" + strconv.Itoa(argN)
		args = append(args, empresaID)
		argN++
	}
	if uf != "" {
		query += " AND uf = $" + strconv.Itoa(argN)
		args = append(args, uf)
		argN++
	}
	if cidade != "" {
		query += " AND cidade_chave = $" + strconv.Itoa(argN)
		args = append(args, cidade)
		argN++
	}
	query += " ORDER BY uf, cidade"

	rows, err := h.Pool.Query(r.Context(), query, args...)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	jsonSuccess(w, rowsToMap(rows))
}

func (h *RegiaoEntregaHandler) SalvarLote(w http.ResponseWriter, r *http.Request) {
	var body regiaoEntregaLoteRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := empresaAlvoRegiao(r, body.EmpresaID)
	if empresaID <= 0 {
		jsonError(w, "Informe a empresa", http.StatusBadRequest)
		return
	}
	if len(body.Regioes) > 20000 {
		jsonError(w, "Limite de 20000 cidades por empresa", http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	if _, err := tx.Exec(r.Context(), `DELETE FROM public.empresa_regiao_entrega WHERE empresa_id = $1`, empresaID); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	vistos := map[string]bool{}
	total := 0
	for _, item := range body.Regioes {
		cidade, uf, chave, codigo, erro := validarRegiao(item)
		if erro != "" {
			jsonError(w, erro, http.StatusBadRequest)
			return
		}
		chaveUnica := uf + "|" + chave
		if vistos[chaveUnica] {
			continue
		}
		vistos[chaveUnica] = true

		id, err := database.GerarID(r.Context(), tx, empresaID, "empresa_regiao_entrega")
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if _, err := tx.Exec(r.Context(), `
			INSERT INTO public.empresa_regiao_entrega
				(empresa_id, id, uf, cidade, cidade_chave, codigo_ibge, latitude, longitude)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8)
			ON CONFLICT (empresa_id, uf, cidade_chave) DO UPDATE
			SET cidade = EXCLUDED.cidade,
				codigo_ibge = EXCLUDED.codigo_ibge,
				latitude = EXCLUDED.latitude,
				longitude = EXCLUDED.longitude
		`, empresaID, id, uf, cidade, chave, codigo, item.Latitude, item.Longitude); err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		total++
	}

	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"ok": true, "empresa_id": empresaID, "total": total})
}

func (h *RegiaoEntregaHandler) Adicionar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		EmpresaID int `json:"empresa_id"`
		RegiaoEntregaItem
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "JSON invalido", http.StatusBadRequest)
		return
	}
	empresaID := empresaAlvoRegiao(r, body.EmpresaID)
	if empresaID <= 0 {
		jsonError(w, "Informe a empresa", http.StatusBadRequest)
		return
	}
	cidade, uf, chave, codigo, erro := validarRegiao(body.RegiaoEntregaItem)
	if erro != "" {
		jsonError(w, erro, http.StatusBadRequest)
		return
	}

	tx, err := h.Pool.Begin(r.Context())
	if err != nil {
		jsonError(w, "Erro interno", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())

	id, err := database.GerarID(r.Context(), tx, empresaID, "empresa_regiao_entrega")
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.QueryRow(r.Context(), `
		INSERT INTO public.empresa_regiao_entrega
			(empresa_id, id, uf, cidade, cidade_chave, codigo_ibge, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8)
		ON CONFLICT (empresa_id, uf, cidade_chave) DO UPDATE
		SET cidade = EXCLUDED.cidade,
			codigo_ibge = EXCLUDED.codigo_ibge,
			latitude = EXCLUDED.latitude,
			longitude = EXCLUDED.longitude
		RETURNING id
	`, empresaID, id, uf, cidade, chave, codigo, body.Latitude, body.Longitude).Scan(&id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonSuccess(w, map[string]interface{}{"ok": true, "empresa_id": empresaID, "id": id})
}

func (h *RegiaoEntregaHandler) Excluir(w http.ResponseWriter, r *http.Request) {
	empresaID := empresaAlvoRegiao(r, parseInt(r.URL.Query().Get("empresa_id"), 0))
	if empresaID <= 0 {
		jsonError(w, "Informe a empresa", http.StatusBadRequest)
		return
	}
	id := parseInt(r.URL.Query().Get("id"), 0)
	if id <= 0 {
		jsonError(w, "Informe o id", http.StatusBadRequest)
		return
	}
	tag, err := h.Pool.Exec(r.Context(),
		`DELETE FROM public.empresa_regiao_entrega WHERE empresa_id = $1 AND id = $2`, empresaID, id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		jsonError(w, "Regiao nao encontrada", http.StatusNotFound)
		return
	}
	jsonSuccess(w, map[string]interface{}{"ok": true})
}

//go:embed assets/municipios.csv
var municipiosCSV embed.FS

type municipioIBGE struct {
	CodigoIBGE string
	Nome       string
	UF         string
	Latitude   float64
	Longitude  float64
}

var (
	municipiosOnce sync.Once
	municipiosList []municipioIBGE
	municipiosErro error
)

func carregarMunicipios() {
	data, err := municipiosCSV.ReadFile("assets/municipios.csv")
	if err != nil {
		municipiosErro = err
		return
	}
	reader := csv.NewReader(strings.NewReader(string(data)))
	registros, err := reader.ReadAll()
	if err != nil {
		municipiosErro = err
		return
	}
	lista := make([]municipioIBGE, 0, len(registros)-1)
	for i, linha := range registros {
		if i == 0 || len(linha) < 5 {
			continue
		}
		lat, err1 := strconv.ParseFloat(strings.TrimSpace(linha[3]), 64)
		lon, err2 := strconv.ParseFloat(strings.TrimSpace(linha[4]), 64)
		if err1 != nil || err2 != nil {
			continue
		}
		lista = append(lista, municipioIBGE{
			CodigoIBGE: strings.TrimSpace(linha[0]),
			Nome:       strings.TrimSpace(linha[1]),
			UF:         strings.ToUpper(strings.TrimSpace(linha[2])),
			Latitude:   lat,
			Longitude:  lon,
		})
	}
	sort.Slice(lista, func(i, j int) bool { return lista[i].CodigoIBGE < lista[j].CodigoIBGE })
	municipiosList = lista
}

func distanciaKm(lat1, lon1, lat2, lon2 float64) float64 {
	const raioTerraKm = 6371.0088
	graus := math.Pi / 180
	dLat := (lat2 - lat1) * graus
	dLon := (lon2 - lon1) * graus
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*graus)*math.Cos(lat2*graus)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * raioTerraKm * math.Asin(math.Min(1, math.Sqrt(a)))
}

func municipioMaisProximo(lat, lon float64) (municipioIBGE, float64) {
	municipiosOnce.Do(carregarMunicipios)
	var melhor municipioIBGE
	melhorDist := math.MaxFloat64
	for _, m := range municipiosList {
		d := distanciaKm(lat, lon, m.Latitude, m.Longitude)
		if d < melhorDist {
			melhorDist = d
			melhor = m
		}
	}
	return melhor, melhorDist
}

func (h *RegiaoEntregaHandler) ReverseGeocode(w http.ResponseWriter, r *http.Request) {
	lat, err1 := strconv.ParseFloat(strings.ReplaceAll(r.URL.Query().Get("lat"), ",", "."), 64)
	lon, err2 := strconv.ParseFloat(strings.ReplaceAll(r.URL.Query().Get("lon"), ",", "."), 64)
	if err1 != nil || err2 != nil || math.IsNaN(lat) || math.IsNaN(lon) {
		jsonError(w, "Informe lat e lon validos", http.StatusBadRequest)
		return
	}
	if lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		jsonError(w, "Coordenadas fora do intervalo", http.StatusBadRequest)
		return
	}
	municipiosOnce.Do(carregarMunicipios)
	if municipiosErro != nil {
		jsonError(w, "Base de municipios indisponivel", http.StatusInternalServerError)
		return
	}
	municipio, distancia := municipioMaisProximo(lat, lon)
	jsonSuccess(w, map[string]interface{}{
		"codigo_ibge":   municipio.CodigoIBGE,
		"cidade":        municipio.Nome,
		"uf":            municipio.UF,
		"latitude":      municipio.Latitude,
		"longitude":     municipio.Longitude,
		"distancia_km":  math.Round(distancia*100) / 100,
		"fora_do_pais":  distancia > 100,
		"total_cidades": len(municipiosList),
	})
}

// GeocodePorCoordenada devolve o municipio mais proximo para uso interno
// (filtro publico de empresas por regiao de entrega).
func GeocodePorCoordenada(lat, lon float64) (string, string, string, float64, bool) {
	municipiosOnce.Do(carregarMunicipios)
	if municipiosErro != nil || len(municipiosList) == 0 {
		return "", "", "", 0, false
	}
	municipio, distancia := municipioMaisProximo(lat, lon)
	return municipio.Nome, municipio.UF, municipio.CodigoIBGE, distancia, true
}
