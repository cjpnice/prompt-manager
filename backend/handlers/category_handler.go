package handlers

import (
    "net/http"
    "prompt-manager/database"
    "prompt-manager/models"
    "time"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler { return &CategoryHandler{} }

// GetCategories 获取所有分类
func (h *CategoryHandler) GetCategories(c *gin.Context) {
    var categories []models.Category
    if err := database.DB.Find(&categories).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": categories, "total": len(categories)})
}

// GetCategory 获取单个分类
func (h *CategoryHandler) GetCategory(c *gin.Context) {
    id := c.Param("id")
    var category models.Category
    if err := database.DB.First(&category, "id = ?", id).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
        return
    }
    c.JSON(http.StatusOK, category)
}

// CreateCategory 创建分类
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
    var req struct {
        Name  string `json:"name" binding:"required"`
        Color string `json:"color"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    category := models.Category{
        Name:      req.Name,
        Color:     func() string { if req.Color != "" { return req.Color }; return "#6366f1" }(),
        CreatedAt: time.Now(),
    }
    if err := database.DB.Create(&category).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
        return
    }
    c.JSON(http.StatusCreated, category)
}

// UpdateCategory 更新分类
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
    id := c.Param("id")
    var req struct {
        Name  string `json:"name"`
        Color string `json:"color"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    var category models.Category
    if err := database.DB.First(&category, "id = ?", id).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
        return
    }
    if req.Name != "" { category.Name = req.Name }
    if req.Color != "" { category.Color = req.Color }
    if err := database.DB.Save(&category).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
        return
    }
    c.JSON(http.StatusOK, category)
}

// DeleteCategory 删除分类
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
    id := c.Param("id")
    if err := database.DB.Delete(&models.Category{}, "id = ?", id).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

