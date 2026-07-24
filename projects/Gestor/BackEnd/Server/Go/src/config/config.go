package config

import (
	"os"
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
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "M74E25@Ta"),
		DBName:     getEnv("DB_NAME", "gestor"),
		ServerPort: getEnv("SERVER_PORT", "9000"),
		JWTSecret:  getEnv("JWT_SECRET", "c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d"),
		DataDir:    getEnv("DATA_DIR", "data"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
