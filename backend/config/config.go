package config

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Logging  LoggingConfig  `yaml:"logging"`
}

type ServerConfig struct {
	Port int    `yaml:"port"`
	Host string `yaml:"host"`
}

type DatabaseConfig struct {
	Type     string `yaml:"type"`
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Name     string `yaml:"name"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Output string `yaml:"output"`
}

// LoadConfig 从配置文件加载配置
func LoadConfig() *Config {
	cfg := &Config{
		Server: ServerConfig{
			Port: 7788,
			Host: "0.0.0.0",
		},
	}

	// 尝试从配置文件加载
	if configData, err := loadConfigFile(); err == nil {
		// 配置文件存在，解析配置
		if err := yaml.Unmarshal(configData, cfg); err != nil {
			slog.Error("LoadConfig", "Unmarshal", err)
			fmt.Printf("Warning: failed to parse config file, using defaults: %v\n", err)
			cfg = defaultConfig()
		}
	} else {
		slog.Error("defaultConfig", "defaultConfig", err)
		// 配置文件不存在，使用默认配置
		cfg = defaultConfig()
	}

	return cfg
}

// loadConfigFile 尝试加载配置文件
// 查找路径: 可执行文件所在目录/config.yaml -> 当前工作目录/config.yaml
func loadConfigFile() ([]byte, error) {
	// 获取可执行文件所在目录
	execPath, err := os.Executable()
	if err != nil {
		slog.Warn("loadConfigFile", "get executable path error", err)
	} else {
		execDir := filepath.Dir(execPath)
		execConfigPath := filepath.Join(execDir, "config.yaml")
		if data, err := os.ReadFile(execConfigPath); err == nil {
			slog.Info("loadConfigFile", "file", execConfigPath)
			return data, nil
		}
	}

	// 尝试当前工作目录
	wd, err := os.Getwd()
	if err == nil {
		wdConfigPath := filepath.Join(wd, "config.yaml")
		if data, err := os.ReadFile(wdConfigPath); err == nil {
			slog.Info("loadConfigFile", "file", wdConfigPath)
			return data, nil
		}
	}

	return nil, fmt.Errorf("no config file found")
}

// defaultConfig 返回默认配置
func defaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: 7788,
			Host: "0.0.0.0",
		},
		Database: DatabaseConfig{
			Type:     "sqlite",
			Name:     "prompt_manager",
			Host:     "localhost",
			Port:     3306,
			User:     "",
			Password: "",
		},
		Logging: LoggingConfig{
			Level:  "info",
			Output: "stdout",
		},
	}
}
