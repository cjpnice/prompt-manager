package handlers

import (
	"net/http"
	"prompt-manager/database"
	"prompt-manager/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TagHandler struct{}

func NewTagHandler() *TagHandler {
	return &TagHandler{}
}

// GetTags 获取所有标签
func (h *TagHandler) GetTags(c *gin.Context) {
	var tags []models.Tag
	
	if err := database.DB.Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": tags,
		"total": len(tags),
	})
}

// GetTag 获取单个标签
func (h *TagHandler) GetTag(c *gin.Context) {
	id := c.Param("id")
	
	var tag models.Tag
	if err := database.DB.First(&tag, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tag"})
		return
	}
	
	c.JSON(http.StatusOK, tag)
}

// CreateTag 创建新标签
func (h *TagHandler) CreateTag(c *gin.Context) {
	var req struct {
		Name  string `json:"name" binding:"required"`
		Color string `json:"color"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if req.Color == "" {
		req.Color = "#3b82f6"
	}
	
	tag := models.Tag{
		Name:      req.Name,
		Color:     req.Color,
		CreatedAt: time.Now(),
	}
	
	if err := database.DB.Create(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tag"})
		return
	}
	
	c.JSON(http.StatusCreated, tag)
}

// UpdateTag 更新标签
func (h *TagHandler) UpdateTag(c *gin.Context) {
	id := c.Param("id")
	
	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	var tag models.Tag
	if err := database.DB.First(&tag, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tag"})
		return
	}
	
	if req.Name != "" {
		tag.Name = req.Name
	}
	if req.Color != "" {
		tag.Color = req.Color
	}
	
	if err := database.DB.Save(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tag"})
		return
	}
	
	c.JSON(http.StatusOK, tag)
}

// DeleteTag 删除标签
func (h *TagHandler) DeleteTag(c *gin.Context) {
	id := c.Param("id")
	
	if err := database.DB.Delete(&models.Tag{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tag"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted successfully"})
}