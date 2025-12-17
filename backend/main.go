package main

import (
	"log"
	"prompt-manager/config"
	"prompt-manager/database"
	"prompt-manager/handlers"
	"prompt-manager/middleware"
	"strconv"

	"github.com/joho/godotenv"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载env配置
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
		return
	}
	// 加载配置
	cfg := config.LoadConfig()

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

	// API路由组
	api := r.Group("/api")
	{
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
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 启动服务器
	log.Printf("Server starting on port %d...", cfg.ServerPort)
	if err := r.Run(":" + strconv.Itoa(cfg.ServerPort)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
