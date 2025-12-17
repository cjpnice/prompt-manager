package handlers

import (
	"net/http"
	"prompt-manager/database"
	"prompt-manager/models"
	"prompt-manager/services"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProjectHandler struct {
	versionService *services.VersionService
}

func NewProjectHandler() *ProjectHandler {
	return &ProjectHandler{
		versionService: services.NewVersionService(),
	}
}

// GetProjects 获取项目列表
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	var projects []models.Project
	
	query := database.DB.Preload("Tags").Preload("Prompts", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "project_id", "created_at", "name") // 只查必要字段
	})
	
	// 搜索过滤
	if search := c.Query("search"); search != "" {
		query = query.Where("name LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	
	if err := query.Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": projects,
		"total": len(projects),
	})
}

// GetProject 获取单个项目详情
func (h *ProjectHandler) GetProject(c *gin.Context) {
	id := c.Param("id")
	
	var project models.Project
	if err := database.DB.Preload("Tags").Preload("Prompts", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "project_id", "created_at", "name").Order("created_at DESC")
	}).First(&project, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
		return
	}
	
	c.JSON(http.StatusOK, project)
}

// CreateProject 创建新项目
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	project := models.Project{
		Name:        req.Name,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	
	if err := database.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}
	
	c.JSON(http.StatusCreated, project)
}

// UpdateProject 更新项目
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	var project models.Project
	if err := database.DB.First(&project, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
		return
	}
	
	if req.Name != "" {
		project.Name = req.Name
	}
	if req.Description != "" {
		project.Description = req.Description
	}
	project.UpdatedAt = time.Now()
	
	if err := database.DB.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}
	
	c.JSON(http.StatusOK, project)
}

// DeleteProject 删除项目
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	id := c.Param("id")
	
	tx := database.DB.Begin()
	
	// 1. 获取该项目下的所有 Prompt IDs
	var promptIDs []string
	if err := tx.Model(&models.Prompt{}).Where("project_id = ?", id).Pluck("id", &promptIDs).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project prompts"})
		return
	}
	
	// 2. 删除 prompt_tags 中关联的记录
	if len(promptIDs) > 0 {
		if err := tx.Exec("DELETE FROM prompt_tags WHERE prompt_id IN ?", promptIDs).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete prompt tags"})
			return
		}
		// 3. 删除 prompt_history 记录 (虽然设置了级联，但手动清理更保险)
		// 注意：表名可能是 prompt_histories
		if err := tx.Exec("DELETE FROM prompt_histories WHERE prompt_id IN ?", promptIDs).Error; err != nil {
			// 忽略错误，因为可能是表名不同或已被级联删除
		}
	}
	
	// 4. 删除 project_tags 关联 (如果存在)
	if err := tx.Exec("DELETE FROM project_tags WHERE project_id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project tags"})
		return
	}
	
	// 5. 删除项目 (级联删除 Prompts)
	if err := tx.Delete(&models.Project{}, "id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project: " + err.Error()})
		return
	}
	
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}