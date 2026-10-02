package util

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	ctx := context.Background()
	dbURL := "postgres://postgres:M74E25@Ta@localhost:5432/gestor"
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		fmt.Printf("Erro: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Hash da senha "2018"
	hash, err := bcrypt.GenerateFromPassword([]byte("2018"), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("Erro hash: %v\n", err)
		os.Exit(1)
	}

	result, err := pool.Exec(ctx, `UPDATE public.usuario SET senha = $1 WHERE email = 'mjtamanhoni@gmail.com'`, string(hash))
	if err != nil {
		fmt.Printf("Erro update: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Senha atualizada: %d usuários\n", result.RowsAffected())
}