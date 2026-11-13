package handlers

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/middleware"
)

type LicencaTitulosPagarHandler struct {
	Pool           *pgxpool.Pool
	PrivateKeyFile string
	KeyID          string

	mu        sync.Mutex
	key       *ecdsa.PrivateKey
	keyErr    error
	keyLoaded bool
}

func NewLicencaTitulosPagarHandler(pool *pgxpool.Pool, privateKeyFile, keyID string) *LicencaTitulosPagarHandler {
	return &LicencaTitulosPagarHandler{
		Pool:           pool,
		PrivateKeyFile: privateKeyFile,
		KeyID:          keyID,
	}
}

type LicencaTitulosPagar struct {
	ID          int    `json:"id"`
	Cliente     string `json:"cliente"`
	CNPJ        string `json:"cnpj"`
	Device      string `json:"device"`
	Plano       string `json:"plano"`
	KeyID       string `json:"key_id"`
	Token       string `json:"token"`
	EmitidoEm   string `json:"emitido_em"`
	ExpiraEm    string `json:"expira_em"`
	Observacoes string `json:"observacoes"`
	RevogadoEm  string `json:"revogado_em"`
	CriadoEm    string `json:"criado_em"`
}

type LicencaTitulosPagarClaims struct {
	V         int    `json:"v"`
	Tipo      string `json:"tipo"`
	Plano     string `json:"plano"`
	Cliente   string `json:"cliente,omitempty"`
	CNPJ      string `json:"cnpj,omitempty"`
	Device    string `json:"device,omitempty"`
	EmitidoEm string `json:"emitido_em,omitempty"`
	KeyID     string `json:"key_id,omitempty"`
	Obs       string `json:"obs,omitempty"`
	jwt.RegisteredClaims
}

const (
	licencaTitulosPagarTipo   = "titulos_pagar"
	licencaTitulosPagarPlano  = "full"
	licencaTitulosPagarIssuer = "gestor"
)

func (h *LicencaTitulosPagarHandler) autorizado(w http.ResponseWriter, r *http.Request) bool {
	if !middleware.GetIsSuperadmin(r) || middleware.GetEmpresaLogada(r) != 1 {
		JsonError(w, "Acesso restrito ao superadmin da empresa principal", http.StatusForbidden)
		return false
	}
	return true
}

func (h *LicencaTitulosPagarHandler) chavePrivada() (*ecdsa.PrivateKey, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.keyLoaded {
		return h.key, h.keyErr
	}
	h.keyLoaded = true

	arquivo := strings.TrimSpace(h.PrivateKeyFile)
	if arquivo == "" {
		h.keyErr = errors.New("LICENCA_TITULOS_PAGAR_PRIVATE_KEY_FILE não configurado")
		return nil, h.keyErr
	}

	conteudo, err := os.ReadFile(arquivo)
	if err != nil {
		h.keyErr = fmt.Errorf("não foi possível ler a chave privada: %w", err)
		return nil, h.keyErr
	}

	chave, err := jwt.ParseECPrivateKeyFromPEM(conteudo)
	if err != nil {
		h.keyErr = fmt.Errorf("chave privada inválida: %w", err)
		return nil, h.keyErr
	}
	if chave.Curve != elliptic.P256() {
		h.keyErr = errors.New("a chave privada precisa ser P-256")
		return nil, h.keyErr
	}

	h.key = chave
	h.keyErr = nil
	return chave, nil
}

func (h *LicencaTitulosPagarHandler) responderSemChave(w http.ResponseWriter, err error) {
	log.Printf("Licença Títulos a Pagar indisponível: %v", err)
	JsonError(w, "Licenciamento não configurado no servidor.", http.StatusServiceUnavailable)
}

func novoTokenID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b[:])
}

func (h *LicencaTitulosPagarHandler) Listar(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	rows, err := h.Pool.Query(context.Background(), `
		SELECT id, cliente, COALESCE(cnpj, ''), COALESCE(device, ''), plano,
		       COALESCE(key_id, ''), token,
		       to_char(emitido_em, 'YYYY-MM-DD'),
		       COALESCE(to_char(expira_em, 'YYYY-MM-DD'), ''),
		       COALESCE(observacoes, ''),
		       COALESCE(to_char(revogado_em, 'YYYY-MM-DD'), ''),
		       to_char(criado_em, 'YYYY-MM-DD')
		  FROM public.licenca_titulos_pagar
		 ORDER BY id DESC
	`)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	lista := make([]LicencaTitulosPagar, 0)
	for rows.Next() {
		var item LicencaTitulosPagar
		if err := rows.Scan(
			&item.ID,
			&item.Cliente,
			&item.CNPJ,
			&item.Device,
			&item.Plano,
			&item.KeyID,
			&item.Token,
			&item.EmitidoEm,
			&item.ExpiraEm,
			&item.Observacoes,
			&item.RevogadoEm,
			&item.CriadoEm,
		); err != nil {
			JsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		lista = append(lista, item)
	}
	if err := rows.Err(); err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, lista)
}

func (h *LicencaTitulosPagarHandler) Gerar(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	var req struct {
		Cliente     string `json:"cliente"`
		CNPJ        string `json:"cnpj"`
		Device      string `json:"device"`
		Plano       string `json:"plano"`
		Validade    string `json:"validade"`
		Observacoes string `json:"observacoes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JsonError(w, "Dados inválidos", http.StatusBadRequest)
		return
	}

	cliente := strings.TrimSpace(req.Cliente)
	if cliente == "" {
		JsonError(w, "Informe o cliente", http.StatusBadRequest)
		return
	}
	if len(cliente) > 200 {
		JsonError(w, "Nome do cliente muito longo", http.StatusBadRequest)
		return
	}

	plano := strings.TrimSpace(strings.ToLower(req.Plano))
	if plano == "" {
		plano = licencaTitulosPagarPlano
	}
	if plano != licencaTitulosPagarPlano {
		JsonError(w, "Plano inválido. Use 'full'.", http.StatusBadRequest)
		return
	}

	device := strings.ToUpper(strings.TrimSpace(req.Device))
	if device != "" && len(device) != 8 {
		JsonError(w, "Código do aparelho deve ter 8 caracteres", http.StatusBadRequest)
		return
	}

	var expiraEm *time.Time
	if validade := strings.TrimSpace(req.Validade); validade != "" {
		data, err := time.ParseInLocation("2006-01-02", validade, time.Local)
		if err != nil {
			JsonError(w, "Validade inválida. Use AAAA-MM-DD.", http.StatusBadRequest)
			return
		}
		fim := time.Date(data.Year(), data.Month(), data.Day(), 23, 59, 59, 0, time.Local)
		expiraEm = &fim
	}

	chave, err := h.chavePrivada()
	if err != nil {
		h.responderSemChave(w, err)
		return
	}

	keyID := strings.TrimSpace(h.KeyID)
	if keyID == "" {
		keyID = "2026-01"
	}
	agora := time.Now()
	emitidoEm := agora.Format("2006-01-02")
	observacoes := strings.TrimSpace(req.Observacoes)

	claims := LicencaTitulosPagarClaims{
		V:         1,
		Tipo:      licencaTitulosPagarTipo,
		Plano:     plano,
		Cliente:   cliente,
		CNPJ:      strings.TrimSpace(req.CNPJ),
		Device:    device,
		EmitidoEm: emitidoEm,
		KeyID:     keyID,
		Obs:       observacoes,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:       novoTokenID(),
			Issuer:   licencaTitulosPagarIssuer,
			Subject:  "titulos_pagar_offline",
			IssuedAt: jwt.NewNumericDate(agora),
		},
	}
	if expiraEm != nil {
		claims.ExpiresAt = jwt.NewNumericDate(*expiraEm)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = keyID
	assinado, err := token.SignedString(chave)
	if err != nil {
		log.Printf("Erro ao assinar licença Títulos a Pagar: %v", err)
		JsonError(w, "Não foi possível gerar a licença", http.StatusInternalServerError)
		return
	}

	var item LicencaTitulosPagar
	err = h.Pool.QueryRow(context.Background(), `
		INSERT INTO public.licenca_titulos_pagar
			(empresa_id, cliente, cnpj, device, plano, key_id, token, emitido_em,
			 expira_em, observacoes, criado_por)
		VALUES (1, $1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6, $7, $8, NULLIF($9, ''), $10)
		RETURNING id, cliente, COALESCE(cnpj, ''), COALESCE(device, ''), plano,
		          COALESCE(key_id, ''), token,
		          to_char(emitido_em, 'YYYY-MM-DD'),
		          COALESCE(to_char(expira_em, 'YYYY-MM-DD'), ''),
		          COALESCE(observacoes, ''),
		          COALESCE(to_char(revogado_em, 'YYYY-MM-DD'), ''),
		          to_char(criado_em, 'YYYY-MM-DD')
	`, cliente, strings.TrimSpace(req.CNPJ), device, plano, keyID, assinado, agora,
		expiraEm, observacoes, middleware.GetUserID(r)).Scan(
		&item.ID,
		&item.Cliente,
		&item.CNPJ,
		&item.Device,
		&item.Plano,
		&item.KeyID,
		&item.Token,
		&item.EmitidoEm,
		&item.ExpiraEm,
		&item.Observacoes,
		&item.RevogadoEm,
		&item.CriadoEm,
	)
	if err != nil {
		log.Printf("Erro ao salvar licença Títulos a Pagar: %v", err)
		JsonError(w, "Não foi possível salvar a licença", http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, item)
}

func (h *LicencaTitulosPagarHandler) Revogar(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	var req struct {
		ID     int    `json:"id"`
		Motivo string `json:"motivo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ID <= 0 {
		JsonError(w, "Informe o id da licença", http.StatusBadRequest)
		return
	}

	motivo := strings.TrimSpace(req.Motivo)
	var motivoPtr *string
	if motivo != "" {
		motivoPtr = &motivo
	}

	tag, err := h.Pool.Exec(context.Background(), `
		UPDATE public.licenca_titulos_pagar
		   SET revogado_em = NOW(),
		       revogado_por = $2,
		       motivo_revogacao = $3
		 WHERE id = $1
	`, req.ID, middleware.GetUserID(r), motivoPtr)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		JsonError(w, "Licença não encontrada", http.StatusNotFound)
		return
	}

	JsonSuccess(w, map[string]string{"mensagem": "Licença revogada"})
}
