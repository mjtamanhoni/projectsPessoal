package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"gestor-server/database"
)

func MigracoesListar(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status, err := database.MigracoesStatus(pool)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		jsonSuccess(w, status)
	}
}

func MigracoesAplicar(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Nome string `json:"nome"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Nome == "" {
			jsonError(w, "Parâmetro 'nome' é obrigatório", http.StatusBadRequest)
			return
		}

		err := database.AplicarMigracao(pool, body.Nome)
		if err != nil {
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		jsonSuccess(w, map[string]string{"mensagem": "Migração aplicada com sucesso"})
	}
}
