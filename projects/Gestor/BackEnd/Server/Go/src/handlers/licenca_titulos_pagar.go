package handlers

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
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

type LicencaTitulosPagarSolicitacao struct {
	ID              int    `json:"id"`
	Device          string `json:"device"`
	Cliente         string `json:"cliente"`
	CNPJ            string `json:"cnpj"`
	AppVersao       string `json:"app_versao"`
	Plataforma      string `json:"plataforma"`
	Status          string `json:"status"`
	Token           string `json:"token"`
	LicencaID       int    `json:"licenca_id"`
	Observacoes     string `json:"observacoes"`
	PixChave        string `json:"pix_chave"`
	ValorCentavos   int64  `json:"valor_centavos"`
	Mensagem        string `json:"mensagem"`
	ComprovanteNome string `json:"comprovante_nome"`
	ComprovanteTipo string `json:"comprovante_tipo"`
	HasComprovante  bool   `json:"has_comprovante"`
	ComprovanteEm   string `json:"comprovante_em"`
	CriadoEm        string `json:"criado_em"`
	AtualizadoEm    string `json:"atualizado_em"`
	UltimoContato   string `json:"ultimo_contato_em"`
	LiberadoEm      string `json:"liberado_em"`
	EntregueEm      string `json:"entregue_em"`
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
		h.keyErr = errors.New("LICENCA_TITULOS_PAGAR_PRIVATE_KEY_FILE nao configurado")
		return nil, h.keyErr
	}

	conteudo, err := os.ReadFile(arquivo)
	if err != nil {
		h.keyErr = fmt.Errorf("nao foi possivel ler a chave privada: %w", err)
		return nil, h.keyErr
	}

	chave, err := jwt.ParseECPrivateKeyFromPEM(conteudo)
	if err != nil {
		h.keyErr = fmt.Errorf("chave privada invalida: %w", err)
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
	log.Printf("Licenca Titulos a Pagar indisponivel: %v", err)
	JsonError(w, "Licenciamento nao configurado no servidor.", http.StatusServiceUnavailable)
}

func novoTokenID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b[:])
}

func hashSegredo(segredo string) string {
	h := sha256.Sum256([]byte(segredo))
	return hex.EncodeToString(h[:])
}

func limitarTexto(valor string, max int) string {
	valor = strings.TrimSpace(valor)
	if len(valor) <= max {
		return valor
	}
	runes := []rune(valor)
	if len(runes) > max {
		runes = runes[:max]
	}
	return string(runes)
}

func normalizarDevice(valor string) (string, bool) {
	device := strings.ToUpper(strings.TrimSpace(valor))
	if len(device) != 8 {
		return "", false
	}
	for _, c := range device {
		if (c < 'A' || c > 'Z') && (c < '0' || c > '9') {
			return "", false
		}
	}
	return device, true
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
		JsonError(w, "Dados invalidos", http.StatusBadRequest)
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
		JsonError(w, "Plano invalido. Use 'full'.", http.StatusBadRequest)
		return
	}

	device := strings.ToUpper(strings.TrimSpace(req.Device))
	if device != "" {
		var ok bool
		device, ok = normalizarDevice(device)
		if !ok {
			JsonError(w, "Codigo do aparelho deve ter 8 caracteres", http.StatusBadRequest)
			return
		}
	}

	expiraEm, err := parseValidade(req.Validade)
	if err != nil {
		JsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	item, semChave, err := h.criarLicenca(
		cliente,
		strings.TrimSpace(req.CNPJ),
		device,
		plano,
		expiraEm,
		strings.TrimSpace(req.Observacoes),
		middleware.GetUserID(r),
	)
	if err != nil {
		if semChave {
			h.responderSemChave(w, err)
			return
		}
		JsonError(w, "Nao foi possivel salvar a licenca", http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, item)
}

func parseValidade(validade string) (*time.Time, error) {
	validade = strings.TrimSpace(validade)
	if validade == "" {
		return nil, nil
	}
	data, err := time.ParseInLocation("2006-01-02", validade, time.Local)
	if err != nil {
		return nil, errors.New("Validade invalida. Use AAAA-MM-DD.")
	}
	fim := time.Date(data.Year(), data.Month(), data.Day(), 23, 59, 59, 0, time.Local)
	return &fim, nil
}

func (h *LicencaTitulosPagarHandler) criarLicenca(
	cliente string,
	cnpj string,
	device string,
	plano string,
	expiraEm *time.Time,
	observacoes string,
	criadoPor int,
) (LicencaTitulosPagar, bool, error) {
	var item LicencaTitulosPagar

	chave, err := h.chavePrivada()
	if err != nil {
		return item, true, err
	}

	keyID := strings.TrimSpace(h.KeyID)
	if keyID == "" {
		keyID = "2026-01"
	}
	agora := time.Now()
	emitidoEm := agora.Format("2006-01-02")

	claims := LicencaTitulosPagarClaims{
		V:         1,
		Tipo:      licencaTitulosPagarTipo,
		Plano:     plano,
		Cliente:   cliente,
		CNPJ:      cnpj,
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
		log.Printf("Erro ao assinar licenca Titulos a Pagar: %v", err)
		return item, false, err
	}

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
	`, cliente, cnpj, device, plano, keyID, assinado, agora,
		expiraEm, observacoes, criadoPor).Scan(
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
		log.Printf("Erro ao salvar licenca Titulos a Pagar: %v", err)
		return item, false, err
	}

	return item, false, nil
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
		JsonError(w, "Informe o id da licenca", http.StatusBadRequest)
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
		JsonError(w, "Licenca nao encontrada", http.StatusNotFound)
		return
	}

	JsonSuccess(w, map[string]string{"mensagem": "Licenca revogada"})
}

func (h *LicencaTitulosPagarHandler) SincronizarDispositivo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Codigo            string `json:"codigo"`
		Segredo           string `json:"segredo"`
		Cliente           string `json:"cliente"`
		CNPJ              string `json:"cnpj"`
		AppVersao         string `json:"app_versao"`
		Plataforma        string `json:"plataforma"`
		Mensagem          string `json:"mensagem"`
		ComprovanteBase64 string `json:"comprovante_base64"`
		ComprovanteNome   string `json:"comprovante_nome"`
		ComprovanteTipo   string `json:"comprovante_tipo"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 12<<20)).Decode(&req); err != nil {
		JsonError(w, "Dados invalidos", http.StatusBadRequest)
		return
	}

	device, ok := normalizarDevice(req.Codigo)
	if !ok {
		JsonError(w, "Codigo do aparelho invalido", http.StatusBadRequest)
		return
	}
	segredo := strings.TrimSpace(req.Segredo)
	if len(segredo) < 32 || len(segredo) > 200 {
		JsonError(w, "Segredo do aparelho invalido", http.StatusBadRequest)
		return
	}

	cliente := limitarTexto(req.Cliente, 200)
	cnpj := limitarTexto(req.CNPJ, 20)
	appVersao := limitarTexto(req.AppVersao, 40)
	plataforma := limitarTexto(req.Plataforma, 30)
	mensagem := limitarTexto(req.Mensagem, 2000)
	comprovanteNome := limitarTexto(req.ComprovanteNome, 200)
	comprovanteTipo := limitarTexto(req.ComprovanteTipo, 60)
	comprovanteBase64 := strings.TrimSpace(req.ComprovanteBase64)

	if comprovanteBase64 != "" {
		if !strings.HasPrefix(comprovanteTipo, "image/") && comprovanteTipo != "application/pdf" {
			JsonError(w, "Tipo de comprovante invalido", http.StatusBadRequest)
			return
		}
		if len(comprovanteBase64) > 10<<20 {
			JsonError(w, "Comprovante muito grande", http.StatusRequestEntityTooLarge)
			return
		}
	}

	var comprovanteEm *time.Time
	if comprovanteBase64 != "" {
		agora := time.Now()
		comprovanteEm = &agora
	}

	ctx := context.Background()
	hash := hashSegredo(segredo)

	var (
		status string
		token  *string
	)
	err := h.Pool.QueryRow(ctx, `
		SELECT status, token
		  FROM public.licenca_titulos_pagar_solicitacao
		 WHERE device = $1 AND segredo_hash = $2
	`, device, hash).Scan(&status, &token)

	if errors.Is(err, pgx.ErrNoRows) {
		// Pode ser um dispositivo novo ou um codigo existente com outro segredo.
		_, err = h.Pool.Exec(ctx, `
			INSERT INTO public.licenca_titulos_pagar_solicitacao
				(device, segredo_hash, cliente, cnpj, app_versao, plataforma,
				 mensagem, comprovante_base64,
				 comprovante_nome, comprovante_tipo, comprovante_em,
				 status, ultimo_contato_em)
			VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''),
			        NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''),
			        NULLIF($9, ''), NULLIF($10, ''), $11,
			        'pendente', NOW())
			ON CONFLICT (device) DO NOTHING
		`, device, hash, cliente, cnpj, appVersao, plataforma,
			mensagem, comprovanteBase64,
			comprovanteNome, comprovanteTipo, comprovanteEm)
		if err != nil {
			JsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		err = h.Pool.QueryRow(ctx, `
			SELECT status, token
			  FROM public.licenca_titulos_pagar_solicitacao
			 WHERE device = $1 AND segredo_hash = $2
		`, device, hash).Scan(&status, &token)
		if errors.Is(err, pgx.ErrNoRows) {
			JsonError(w, "Codigo do aparelho ja registrado com outro segredo", http.StatusForbidden)
			return
		}
		if err != nil {
			JsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = h.Pool.Exec(ctx, `
		UPDATE public.licenca_titulos_pagar_solicitacao
		   SET cliente = COALESCE(NULLIF($2, ''), cliente),
		       cnpj = COALESCE(NULLIF($3, ''), cnpj),
		       app_versao = COALESCE(NULLIF($4, ''), app_versao),
		       plataforma = COALESCE(NULLIF($5, ''), plataforma),
		       mensagem = COALESCE(NULLIF($6, ''), mensagem),
		       comprovante_base64 = COALESCE(NULLIF($7, ''), comprovante_base64),
		       comprovante_nome = COALESCE(NULLIF($8, ''), comprovante_nome),
		       comprovante_tipo = COALESCE(NULLIF($9, ''), comprovante_tipo),
		       comprovante_em = COALESCE($10, comprovante_em),
		       ultimo_contato_em = NOW(),
		       atualizado_em = NOW()
		 WHERE device = $1 AND segredo_hash = $11
	`, device, cliente, cnpj, appVersao, plataforma,
		mensagem, comprovanteBase64, comprovanteNome, comprovanteTipo,
		comprovanteEm, hash)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if status == "revogada" && comprovanteBase64 != "" {
		_, err = h.Pool.Exec(ctx, `
			UPDATE public.licenca_titulos_pagar_solicitacao
			   SET status = 'pendente',
			       token = NULL,
			       licenca_id = NULL,
			       liberado_em = NULL,
			       entregue_em = NULL,
			       atualizado_em = NOW()
			 WHERE device = $1 AND segredo_hash = $2
		`, device, hash)
		if err != nil {
			JsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		status = "pendente"
		token = nil
	}

	var (
		pixChave       string
		valorCentavos  int64
		hasComprovante bool
		mensagemAtual  string
	)
	err = h.Pool.QueryRow(ctx, `
		SELECT status, token,
		       COALESCE(pix_chave, ''),
		       COALESCE(valor_centavos, 0),
		       (comprovante_base64 IS NOT NULL AND comprovante_base64 <> ''),
		       COALESCE(mensagem, '')
		  FROM public.licenca_titulos_pagar_solicitacao
		 WHERE device = $1 AND segredo_hash = $2
	`, device, hash).Scan(&status, &token, &pixChave, &valorCentavos, &hasComprovante, &mensagemAtual)
	if errors.Is(err, pgx.ErrNoRows) {
		JsonError(w, "Solicitacao nao encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resposta := map[string]any{
		"status":          status,
		"pix_chave":       pixChave,
		"valor_centavos":  valorCentavos,
		"has_comprovante": hasComprovante,
		"mensagem":        mensagemAtual,
	}
	if status == "liberada" && token != nil && strings.TrimSpace(*token) != "" {
		resposta["token"] = *token
	} else if status == "liberada" {
		resposta["status"] = "pendente"
	}

	JsonSuccess(w, resposta)
}

func (h *LicencaTitulosPagarHandler) ConfirmarEntregaDispositivo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Codigo  string `json:"codigo"`
		Segredo string `json:"segredo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JsonError(w, "Dados invalidos", http.StatusBadRequest)
		return
	}

	device, ok := normalizarDevice(req.Codigo)
	if !ok {
		JsonError(w, "Codigo do aparelho invalido", http.StatusBadRequest)
		return
	}
	segredo := strings.TrimSpace(req.Segredo)
	if len(segredo) < 32 || len(segredo) > 200 {
		JsonError(w, "Segredo do aparelho invalido", http.StatusBadRequest)
		return
	}

	tag, err := h.Pool.Exec(context.Background(), `
		UPDATE public.licenca_titulos_pagar_solicitacao
		   SET entregue_em = COALESCE(entregue_em, NOW()),
		       ultimo_contato_em = NOW(),
		       atualizado_em = NOW()
		 WHERE device = $1 AND segredo_hash = $2 AND status = 'liberada'
	`, device, hashSegredo(segredo))
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		JsonError(w, "Solicitacao nao encontrada", http.StatusNotFound)
		return
	}

	JsonSuccess(w, map[string]string{"status": "entregue"})
}

func (h *LicencaTitulosPagarHandler) ListarSolicitacoes(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	rows, err := h.Pool.Query(context.Background(), `
		SELECT id, device, COALESCE(cliente, ''), COALESCE(cnpj, ''),
		       COALESCE(app_versao, ''), COALESCE(plataforma, ''), status,
		       COALESCE(token, ''), COALESCE(licenca_id, 0),
		       COALESCE(observacoes, ''),
		       COALESCE(pix_chave, ''), COALESCE(valor_centavos, 0),
		       COALESCE(mensagem, ''), COALESCE(comprovante_nome, ''),
		       COALESCE(comprovante_tipo, ''),
		       (comprovante_base64 IS NOT NULL AND comprovante_base64 <> ''),
		       COALESCE(to_char(comprovante_em, 'YYYY-MM-DD"T"HH24:MI:SS'), ''),
		       to_char(criado_em, 'YYYY-MM-DD"T"HH24:MI:SS'),
		       to_char(atualizado_em, 'YYYY-MM-DD"T"HH24:MI:SS'),
		       COALESCE(to_char(ultimo_contato_em, 'YYYY-MM-DD"T"HH24:MI:SS'), ''),
		       COALESCE(to_char(liberado_em, 'YYYY-MM-DD"T"HH24:MI:SS'), ''),
		       COALESCE(to_char(entregue_em, 'YYYY-MM-DD"T"HH24:MI:SS'), '')
		  FROM public.licenca_titulos_pagar_solicitacao
		 ORDER BY CASE
		            WHEN status = 'pendente' AND comprovante_base64 IS NOT NULL AND comprovante_base64 <> '' THEN 0
		            WHEN status = 'pendente' THEN 1
		            WHEN status = 'liberada' THEN 2
		            ELSE 3
		          END,
		          COALESCE(ultimo_contato_em, criado_em) DESC
	`)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	lista := make([]LicencaTitulosPagarSolicitacao, 0)
	for rows.Next() {
		var item LicencaTitulosPagarSolicitacao
		if err := rows.Scan(
			&item.ID,
			&item.Device,
			&item.Cliente,
			&item.CNPJ,
			&item.AppVersao,
			&item.Plataforma,
			&item.Status,
			&item.Token,
			&item.LicencaID,
			&item.Observacoes,
			&item.PixChave,
			&item.ValorCentavos,
			&item.Mensagem,
			&item.ComprovanteNome,
			&item.ComprovanteTipo,
			&item.HasComprovante,
			&item.ComprovanteEm,
			&item.CriadoEm,
			&item.AtualizadoEm,
			&item.UltimoContato,
			&item.LiberadoEm,
			&item.EntregueEm,
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

func (h *LicencaTitulosPagarHandler) EnviarPixSolicitacao(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	var req struct {
		ID            int    `json:"id"`
		PixChave      string `json:"pix_chave"`
		ValorCentavos *int64 `json:"valor_centavos"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		JsonError(w, "Dados invalidos", http.StatusBadRequest)
		return
	}
	if req.ID <= 0 {
		JsonError(w, "Informe o id da solicitacao", http.StatusBadRequest)
		return
	}
	pixChave := limitarTexto(strings.TrimSpace(req.PixChave), 255)
	if pixChave == "" {
		JsonError(w, "Informe a chave PIX", http.StatusBadRequest)
		return
	}

	var valorPtr *int64
	if req.ValorCentavos != nil && *req.ValorCentavos > 0 {
		valor := *req.ValorCentavos
		valorPtr = &valor
	}

	tag, err := h.Pool.Exec(context.Background(), `
		UPDATE public.licenca_titulos_pagar_solicitacao
		   SET pix_chave = $2,
		       valor_centavos = COALESCE($3, valor_centavos),
		       atualizado_em = NOW()
		 WHERE id = $1 AND status IN ('pendente', 'revogada')
	`, req.ID, pixChave, valorPtr)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		JsonError(w, "Solicitacao nao encontrada ou ja liberada", http.StatusNotFound)
		return
	}

	JsonSuccess(w, map[string]string{"status": "ok"})
}

func (h *LicencaTitulosPagarHandler) ComprovanteSolicitacao(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	id, err := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("id")))
	if err != nil || id <= 0 {
		JsonError(w, "Informe o id da solicitacao", http.StatusBadRequest)
		return
	}

	var nome, tipo, base64 string
	err = h.Pool.QueryRow(context.Background(), `
		SELECT COALESCE(comprovante_nome, ''), COALESCE(comprovante_tipo, ''),
		       COALESCE(comprovante_base64, '')
		  FROM public.licenca_titulos_pagar_solicitacao
		 WHERE id = $1
	`, id).Scan(&nome, &tipo, &base64)
	if errors.Is(err, pgx.ErrNoRows) {
		JsonError(w, "Solicitacao nao encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if base64 == "" {
		JsonError(w, "Solicitacao sem comprovante", http.StatusNotFound)
		return
	}

	JsonSuccess(w, map[string]string{"nome": nome, "tipo": tipo, "base64": base64})
}

func (h *LicencaTitulosPagarHandler) LiberarSolicitacao(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	var req struct {
		ID          int    `json:"id"`
		Cliente     string `json:"cliente"`
		CNPJ        string `json:"cnpj"`
		Validade    string `json:"validade"`
		Observacoes string `json:"observacoes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ID <= 0 {
		JsonError(w, "Informe o id da solicitacao", http.StatusBadRequest)
		return
	}

	var (
		device     string
		cliente    string
		cnpj       string
		observacoes string
	)
	err := h.Pool.QueryRow(context.Background(), `
		SELECT device, COALESCE(cliente, ''), COALESCE(cnpj, ''),
		       COALESCE(observacoes, '')
		  FROM public.licenca_titulos_pagar_solicitacao
		 WHERE id = $1
	`, req.ID).Scan(&device, &cliente, &cnpj, &observacoes)
	if errors.Is(err, pgx.ErrNoRows) {
		JsonError(w, "Solicitacao nao encontrada", http.StatusNotFound)
		return
	}
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if v := strings.TrimSpace(req.Cliente); v != "" {
		cliente = v
	}
	if v := strings.TrimSpace(req.CNPJ); v != "" {
		cnpj = v
	}
	if strings.TrimSpace(req.Observacoes) != "" {
		observacoes = strings.TrimSpace(req.Observacoes)
	}
	cliente = strings.TrimSpace(cliente)
	if cliente == "" {
		JsonError(w, "Informe o cliente para liberar a licenca", http.StatusBadRequest)
		return
	}
	if len(cliente) > 200 {
		JsonError(w, "Nome do cliente muito longo", http.StatusBadRequest)
		return
	}

	expiraEm, err := parseValidade(req.Validade)
	if err != nil {
		JsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	item, semChave, err := h.criarLicenca(
		cliente,
		strings.TrimSpace(cnpj),
		device,
		licencaTitulosPagarPlano,
		expiraEm,
		observacoes,
		middleware.GetUserID(r),
	)
	if err != nil {
		if semChave {
			h.responderSemChave(w, err)
			return
		}
		JsonError(w, "Nao foi possivel liberar a licenca", http.StatusInternalServerError)
		return
	}

	_, err = h.Pool.Exec(context.Background(), `
		UPDATE public.licenca_titulos_pagar_solicitacao
		   SET status = 'liberada',
		       token = $2,
		       licenca_id = $3,
		       cliente = $4,
		       cnpj = NULLIF($5, ''),
		       observacoes = COALESCE(NULLIF($6, ''), observacoes),
		       liberado_em = NOW(),
		       liberado_por = $7,
		       entregue_em = NULL,
		       atualizado_em = NOW()
		 WHERE id = $1
	`, req.ID, item.Token, item.ID, cliente, strings.TrimSpace(cnpj),
		strings.TrimSpace(req.Observacoes), middleware.GetUserID(r))
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	JsonSuccess(w, item)
}

func (h *LicencaTitulosPagarHandler) RevogarSolicitacao(w http.ResponseWriter, r *http.Request) {
	if !h.autorizado(w, r) {
		return
	}

	var req struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ID <= 0 {
		JsonError(w, "Informe o id da solicitacao", http.StatusBadRequest)
		return
	}

	tag, err := h.Pool.Exec(context.Background(), `
		UPDATE public.licenca_titulos_pagar_solicitacao
		   SET status = 'revogada',
		       token = NULL,
		       atualizado_em = NOW()
		 WHERE id = $1
	`, req.ID)
	if err != nil {
		JsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tag.RowsAffected() == 0 {
		JsonError(w, "Solicitacao nao encontrada", http.StatusNotFound)
		return
	}

	JsonSuccess(w, map[string]string{"mensagem": "Solicitacao revogada"})
}
