package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey        contextKey = "user_id"
	EmpresaIDKey     contextKey = "empresa_id"
	IsSuperadminKey  contextKey = "is_superadmin"
)

var jwtSecret []byte

func SetJWTSecret(secret string) {
	jwtSecret = []byte(secret)
}

type Claims struct {
	ID          int  `json:"id"`
	Empresa     int  `json:"empresa"`
	IsSuperadmin bool `json:"is_superadmin"`
	jwt.RegisteredClaims
}

func GerarToken(userID, empresaID int, isSuperadmin bool) (string, error) {
	claims := Claims{
		ID:          userID,
		Empresa:     empresaID,
		IsSuperadmin: isSuperadmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"erro":"Token não informado"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			http.Error(w, `{"erro":"Formato de token inválido"}`, http.StatusUnauthorized)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"erro":"Sessão inválida ou token expirado"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, claims.ID)
		ctx = context.WithValue(ctx, EmpresaIDKey, claims.Empresa)
		ctx = context.WithValue(ctx, IsSuperadminKey, claims.IsSuperadmin)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(r *http.Request) int {
	if v, ok := r.Context().Value(UserIDKey).(int); ok {
		return v
	}
	return 0
}

func GetEmpresaID(r *http.Request) int {
	if v, ok := r.Context().Value(EmpresaIDKey).(int); ok {
		return v
	}
	return 1
}

func GetIsSuperadmin(r *http.Request) bool {
	if v, ok := r.Context().Value(IsSuperadminKey).(bool); ok {
		return v
	}
	return false
}

func ParseClaimsFromRequest(r *http.Request) *Claims {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil
	}
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == authHeader {
		return nil
	}
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil
	}
	return claims
}
