package config

import (
	"os"
	"strconv"
)

type Config struct {
	DBType     string
	DBHost     string
	DBPort     int
	DBName     string
	DBUser     string
	DBPassword string
	ServerPort int
	LogLevel   string
}

func LoadConfig() *Config {
	return &Config{
		DBType:     getEnv("DB_TYPE", "sqlite"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvAsInt("DB_PORT", 3306),
		DBName:     getEnv("DB_NAME", "prompt_manager.db"),
		DBUser:     getEnv("DB_USER", ""),
		DBPassword: getEnv("DB_PASSWORD", ""),
		ServerPort: getEnvAsInt("SERVER_PORT", 8080),
		LogLevel:   getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}