package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	ServerPort string
	JWTSecret  string
	DataDir    string
	FotosDir   string
	APKDir     string
}

func Load() *Config {
	// Carrega variáveis de ambiente do arquivo .env (ignora erro se não existir)
	godotenv.Load()

	// Valores sensíveis NÃO devem ter fallback - devem ser obrigatórios via variáveis de ambiente
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		log.Fatal("ERRO: Variável de ambiente DB_PASSWORD é obrigatória. Configure o arquivo .env")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("ERRO: Variável de ambiente JWT_SECRET é obrigatória. Configure o arquivo .env")
	}

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: dbPassword,
		DBName:     getEnv("DB_NAME", "gestor"),
		ServerPort: getEnv("SERVER_PORT", "9000"),
		JWTSecret:  jwtSecret,
		DataDir:    getEnv("DATA_DIR", "data"),
		FotosDir:   getEnv("FOTOS_DIR", "../Fotos"),
		APKDir:     getEnv("APK_DIR", "../apk"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
