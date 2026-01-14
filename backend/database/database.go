package database

import (
	"fmt"
	"os"
	"path/filepath"
	"prompt-manager/config"
	"prompt-manager/models"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) error {
	var err error
	var dialector gorm.Dialector

	switch cfg.Database.Type {
	case "mysql":
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			cfg.Database.User, cfg.Database.Password, cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
		dialector = mysql.Open(dsn)
	case "sqlite":
		// 获取可执行文件所在目录
		execPath, err := os.Executable()
		dbPath := cfg.Database.Name + ".db"
		if err == nil {
			execDir := filepath.Dir(execPath)
			dbPath = filepath.Join(execDir, cfg.Database.Name+".db")
		}
		dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)", dbPath)
		dialector = sqlite.Open(dsn)
	default:
		return fmt.Errorf("unsupported database type: %s", cfg.Database.Type)
	}

	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	// 自动迁移表结构
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("failed to migrate database: %v", err)
	}

	return nil
}

func autoMigrate() error {
	return DB.AutoMigrate(
		&models.Project{},
		&models.Prompt{},
		&models.Tag{},
		&models.Category{},
		&models.PromptHistory{},
		&models.Setting{},
	)
}

func CloseDB() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
