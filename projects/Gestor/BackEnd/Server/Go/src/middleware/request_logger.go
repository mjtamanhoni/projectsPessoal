package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"gestor-server/database"
	"gestor-server/logger"
)

var skipPaths = map[string]bool{
	"/logs":      true,
	"/logs/json": true,
	"/health":    true,
}

func RequestLogger(logStore *logger.LogStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if skipPaths[r.URL.Path] {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()

			jsonRecebido := ""
			if r.Body != nil {
				bodyBytes, _ := io.ReadAll(r.Body)
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

				if len(bodyBytes) > 0 && bodyBytes[0] == '{' {
					var compact bytes.Buffer
					if json.Compact(&compact, bodyBytes) == nil {
						jsonRecebido = compact.String()
					} else {
						jsonRecebido = string(bodyBytes)
					}
				}
			}

			ctx := database.InitScriptsContext(r.Context())
			r = r.WithContext(ctx)

			lw := &logWriter{ResponseWriter: w, body: &bytes.Buffer{}}
			next.ServeHTTP(lw, r)

			duration := time.Since(start)
			status := lw.statusCode

			msg := http.StatusText(status)
			jsonRetornado := ""
			if lw.body.Len() > 0 {
				bodyStr := lw.body.String()
				if status >= 400 {
					msg = extractErrorMessage(bodyStr)
				}
				if len(bodyStr) > 0 && (bodyStr[0] == '{' || bodyStr[0] == '[') {
					jsonRetornado = bodyStr
				}
			}
			if msg == "" {
				msg = http.StatusText(status)
			}

			go logStore.Log(logger.LogEntry{
				Hora:          start.Format("15:04:05"),
				Metodo:        r.Method,
				Rota:          r.URL.Path,
				Status:        status,
				Mensagem:      msg,
				EmpresaID:     claimsFromRequest(r),
				UsuarioID:     userIDFromRequest(r),
				DuracaoMs:     duration.Milliseconds(),
				JsonRecebido:  jsonRecebido,
				JsonRetornado: jsonRetornado,
				Scripts:       database.GetScripts(ctx),
			})
		})
	}
}

type logWriter struct {
	http.ResponseWriter
	statusCode int
	body       *bytes.Buffer
}

func (lw *logWriter) WriteHeader(code int) {
	lw.statusCode = code
	lw.ResponseWriter.WriteHeader(code)
}

func (lw *logWriter) Write(b []byte) (int, error) {
	if lw.statusCode == 0 {
		lw.statusCode = http.StatusOK
	}
	lw.body.Write(b)
	return lw.ResponseWriter.Write(b)
}

func userIDFromRequest(r *http.Request) int {
	if claims := ParseClaimsFromRequest(r); claims != nil {
		return claims.ID
	}
	return GetUserID(r)
}

func claimsFromRequest(r *http.Request) int {
	if claims := ParseClaimsFromRequest(r); claims != nil {
		return claims.Empresa
	}
	return GetEmpresaID(r)
}

func extractErrorMessage(body string) string {
	var parsed struct {
		Erro string `json:"erro"`
	}
	if err := json.Unmarshal([]byte(body), &parsed); err == nil && parsed.Erro != "" {
		return parsed.Erro
	}
	body = strings.TrimSpace(body)
	if len(body) > 200 {
		body = body[:200]
	}
	return body
}
