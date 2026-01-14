package main

import (
	"embed"
	"io/fs"
	"log"
	"log/slog"
	"net/http"
	"prompt-manager/config"
	"prompt-manager/database"
	"prompt-manager/handlers"
	"prompt-manager/middleware"
	"strconv"

	"github.com/gin-gonic/gin"
)

//go:embed all:dist
var frontendFS embed.FS

func main() {

	// 加载配置
	slog.Error("LoadConfig")
	cfg := config.LoadConfig()
	slog.Error("LoadConfig", "cfg", cfg)

	// 初始化数据库
	if err := database.InitDB(cfg); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	// 创建Gin实例
	r := gin.Default()

	// 全局中间件
	r.Use(middleware.CORS())
	r.Use(middleware.ErrorHandler())

	// 初始化处理器
	projectHandler := handlers.NewProjectHandler()
	promptHandler := handlers.NewPromptHandler()
	tagHandler := handlers.NewTagHandler()
	categoryHandler := handlers.NewCategoryHandler()
	exportHandler := handlers.NewExportHandler()
	settingsHandler := handlers.NewSettingsHandler()

	// API路由组
	api := r.Group("/api")
	{
		// 设置管理
		api.GET("/settings", settingsHandler.GetSettings)
		api.POST("/settings", settingsHandler.UpdateSettings)
		api.POST("/optimize-prompt", settingsHandler.OptimizePrompt)

		// 项目管理
		api.GET("/projects", projectHandler.GetProjects)
		api.POST("/projects", projectHandler.CreateProject)
		api.GET("/projects/:id", projectHandler.GetProject)
		api.PUT("/projects/:id", projectHandler.UpdateProject)
		api.DELETE("/projects/:id", projectHandler.DeleteProject)

		// 提示词管理
		api.GET("/projects/:id/prompts", promptHandler.GetPrompts) // 使用:id而不是:project_id
		api.POST("/projects/:id/prompts", promptHandler.CreatePrompt)
		api.GET("/prompts/:id", promptHandler.GetPrompt)
		api.PUT("/prompts/:id", promptHandler.UpdatePrompt)
		api.DELETE("/prompts/:id", promptHandler.DeletePrompt)
		api.GET("/prompts/:id/diff/:target_id", promptHandler.GetPromptDiff)
		api.POST("/prompts/:id/rollback", promptHandler.RollbackPrompt)
		// SDK 获取提示词内容接口
		api.GET("/projects/:id/sdk/prompt", promptHandler.GetSDKPrompt)

		// 标签管理
		api.GET("/tags", tagHandler.GetTags)
		api.GET("/tags/:id", tagHandler.GetTag)
		api.POST("/tags", tagHandler.CreateTag)
		api.PUT("/tags/:id", tagHandler.UpdateTag)
		api.DELETE("/tags/:id", tagHandler.DeleteTag)

		// 分类管理
		api.GET("/categories", categoryHandler.GetCategories)
		api.GET("/categories/:id", categoryHandler.GetCategory)
		api.POST("/categories", categoryHandler.CreateCategory)
		api.PUT("/categories/:id", categoryHandler.UpdateCategory)
		api.DELETE("/categories/:id", categoryHandler.DeleteCategory)

		// 导入导出
		api.POST("/export", exportHandler.ExportData)
		api.POST("/import", exportHandler.ImportData)

		// 测试提示词
		api.POST("/test-prompt", promptHandler.TestPrompt)
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 前端静态文件服务
	frontendDist, err := fs.Sub(frontendFS, "dist")
	if err != nil {
		// 如果前端未构建，返回空文件系统（允许仅API模式运行）
		frontendDist = emptystorage{}
		log.Printf("Warning: frontend assets not found, running in API-only mode")
	}
	r.NoRoute(func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(frontendDist))
	})

	// 启动服务器
	log.Printf("Server starting on port %d...", cfg.Server.Port)
	if err := r.Run(":" + strconv.Itoa(cfg.Server.Port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// emptystorage 空文件系统，用于前端未构建时
type emptystorage struct{}

func (emptystorage) Open(name string) (fs.File, error) {
	return nil, fs.ErrNotExist
}
