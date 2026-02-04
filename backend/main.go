package main

import (
	"embed"
	"io/fs"
	"log"
	"prompt-manager/config"
	"prompt-manager/database"
	"prompt-manager/handlers"
	"prompt-manager/middleware"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed dist
var frontendFS embed.FS

func main() {

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
		frontendDist = emptystorage{}
		log.Printf("Warning: frontend assets not found, running in API-only mode")
	}

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		if path == "/" || path == "" {
			c.Data(200, "text/html; charset=utf-8", getFileContent(frontendDist, "index.html"))
			return
		}

		lastDot := strings.LastIndex(path, ".")
		if lastDot > 0 && len(path) > lastDot {
			ext := path[lastDot:]
			switch ext {
			case ".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".json", ".map":
				filePath := path[1:]
				if content, err := readFileContent(frontendDist, filePath); err == nil {
					c.Data(200, getContentType(ext), content)
					return
				}
			}
		}

		c.Data(200, "text/html; charset=utf-8", getFileContent(frontendDist, "index.html"))
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

func getFileContent(fsys fs.FS, filename string) []byte {
	file, err := fsys.Open(filename)
	if err != nil {
		log.Printf("Error opening file %s: %v", filename, err)
		return []byte("<html><body><h1>File not found</h1></body></html>")
	}
	defer file.Close()

	content, err := fs.ReadFile(fsys, filename)
	if err != nil {
		log.Printf("Error reading file %s: %v", filename, err)
		return []byte("<html><body><h1>Error reading file</h1></body></html>")
	}

	return content
}

func readFileContent(fsys fs.FS, filename string) ([]byte, error) {
	return fs.ReadFile(fsys, filename)
}

func getContentType(ext string) string {
	switch ext {
	case ".js":
		return "application/javascript"
	case ".css":
		return "text/css"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".svg":
		return "image/svg+xml"
	case ".ico":
		return "image/x-icon"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".json":
		return "application/json"
	case ".map":
		return "application/json"
	default:
		return "application/octet-stream"
	}
}
