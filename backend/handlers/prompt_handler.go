package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"prompt-manager/database"
	"prompt-manager/models"
	"prompt-manager/services"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PromptHandler struct {
	versionService *services.VersionService
	diffService    *services.DiffService
}

func NewPromptHandler() *PromptHandler {
	return &PromptHandler{
		versionService: services.NewVersionService(),
		diffService:    services.NewDiffService(),
	}
}

// GetPrompts 获取提示词列表
func (h *PromptHandler) GetPrompts(c *gin.Context) {
	projectID := c.Param("id")

	var prompts []models.Prompt
	query := database.DB.Preload("Tags").Where("project_id = ?", projectID)

	// 标签筛选
	if tag := c.Query("tag"); tag != "" {
		query = query.Joins("JOIN prompt_tags ON prompts.id = prompt_tags.prompt_id").
			Joins("JOIN tags ON prompt_tags.tag_id = tags.id").
			Where("tags.name = ?", tag)
	}

	// 版本号筛选
	if version := c.Query("version"); version != "" {
		query = query.Where("version = ?", version)
	}
	// 名称筛选
	if name := c.Query("name"); name != "" {
		query = query.Where("name = ?", name)
	}
	// 分类筛选
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// 时间范围筛选
	if startDate := c.Query("start_date"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate := c.Query("end_date"); endDate != "" {
		query = query.Where("created_at <= ?", endDate)
	}

	if err := query.Order("created_at DESC").Find(&prompts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch prompts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  prompts,
		"total": len(prompts),
	})
}

// GetPrompt 获取单个提示词
func (h *PromptHandler) GetPrompt(c *gin.Context) {
	id := c.Param("id")

	var prompt models.Prompt
	if err := database.DB.Preload("Tags").Preload("Project").First(&prompt, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Prompt not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch prompt"})
		return
	}

	c.JSON(http.StatusOK, prompt)
}

// CreatePrompt 创建提示词
func (h *PromptHandler) CreatePrompt(c *gin.Context) {
	projectID := c.Param("id")

	var req struct {
		Name        string   `json:"name" binding:"required"`
		Content     string   `json:"content" binding:"required"`
		TagIDs      []string `json:"tag_ids"`
		Category    string   `json:"category"`
		Description string   `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// 分类必须存在于分类库
	if req.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category is required"})
		return
	}
	var categoryCount int64
	if err := database.DB.Model(&models.Category{}).Where("name = ?", req.Category).Count(&categoryCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate category"})
		return
	}
	if categoryCount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category"})
		return
	}

	// 获取该名称下最新的版本号
	var lastPrompt models.Prompt
	var newVersion string
	if err := database.DB.Where("project_id = ? AND name = ?", projectID, req.Name).Order("created_at DESC").First(&lastPrompt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			newVersion = "1.0.0"
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch last prompt"})
			return
		}
	} else {
		newVersion = h.versionService.GenerateNextVersion(lastPrompt.Version, "patch")
	}

	// 创建新提示词
	prompt := models.Prompt{
		ProjectID:   projectID,
		Name:        req.Name,
		Version:     newVersion,
		Content:     req.Content,
		Category:    req.Category,
		Description: req.Description,
		CreatedAt:   time.Now(),
	}

	tx := database.DB.Begin()
	if err := tx.Create(&prompt).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create prompt"})
		return
	}

	// 处理标签
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		if err := tx.Where("id IN ?", req.TagIDs).Find(&tags).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
			return
		}
		// 校验传入的tag_ids必须都存在
		var foundCount int64
		if err := tx.Model(&models.Tag{}).Where("id IN ?", req.TagIDs).Count(&foundCount).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate tags"})
			return
		}
		if int(foundCount) != len(req.TagIDs) {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tag ids"})
			return
		}

		if err := tx.Model(&prompt).Association("Tags").Append(&tags); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate tags"})
			return
		}
	}

	// 记录操作历史
	history := models.PromptHistory{
		PromptID:   prompt.ID,
		Operation:  "create",
		NewContent: req.Content,
		CreatedAt:  time.Now(),
	}
	if err := tx.Create(&history).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create history"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusCreated, prompt)
}

// UpdatePrompt 更新提示词或创建新版本
func (h *PromptHandler) UpdatePrompt(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Content     string   `json:"content"`
		Description string   `json:"description"`
		Category    string   `json:"category"`
		TagIDs      []string `json:"tag_ids"`
		Bump        string   `json:"bump"`         // major|minor|patch|none|keep_version
		KeepVersion bool     `json:"keep_version"` // 是否保持当前版本号不变
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.Prompt
	if err := database.DB.Preload("Tags").First(&existing, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Prompt not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch prompt"})
		return
	}

	// 判断内容是否变化
	contentChanged := req.Content != "" && req.Content != existing.Content
	bump := req.Bump
	if bump == "" {
		bump = "patch"
	}

	tx := database.DB.Begin()

	// 如果内容变化但用户选择保持版本号不变，直接更新当前记录
	if contentChanged && req.KeepVersion {
		// 保存旧内容用于历史记录
		oldContent := existing.Content

		// 直接更新当前记录的content，不创建新版本
		existing.Content = req.Content
		if req.Description != "" {
			existing.Description = req.Description
		}
		if req.Category != "" {
			// 分类必须存在
			var categoryCount int64
			if err := database.DB.Model(&models.Category{}).Where("name = ?", req.Category).Count(&categoryCount).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate category"})
				return
			}
			if categoryCount == 0 {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category"})
				return
			}
			existing.Category = req.Category
		}

		// 更新标签关联
		if len(req.TagIDs) > 0 {
			var tags []models.Tag
			if err := tx.Where("id IN ?", req.TagIDs).Find(&tags).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
				return
			}
			if err := tx.Model(&existing).Association("Tags").Replace(&tags); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tags"})
				return
			}
		}

		if err := tx.Save(&existing).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update prompt"})
			return
		}

		// 记录历史（记录为update操作，但保持相同版本）
		history := models.PromptHistory{
			PromptID:   existing.ID,
			Operation:  "update_keep_version",
			OldContent: oldContent,
			NewContent: req.Content,
			CreatedAt:  time.Now(),
		}
		if err := tx.Create(&history).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create history"})
			return
		}

		tx.Commit()
		c.JSON(http.StatusOK, existing)
		return
	}

	if contentChanged {
		// 创建新版本记录
		newVersion := h.versionService.GenerateNextVersion(existing.Version, bump)
		newPrompt := models.Prompt{
			ProjectID:   existing.ProjectID,
			Name:        existing.Name,
			Version:     newVersion,
			Content:     req.Content,
			Description: req.Description,
			Category: func() string {
				if req.Category != "" {
					return req.Category
				}
				return existing.Category
			}(),
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&newPrompt).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new version"})
			return
		}
		// 更新标签关联
		if len(req.TagIDs) > 0 {
			var tags []models.Tag
			if err := tx.Where("id IN ?", req.TagIDs).Find(&tags).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
				return
			}
			if err := tx.Model(&newPrompt).Association("Tags").Replace(&tags); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tags"})
				return
			}
		}
		// 记录历史
		history := models.PromptHistory{
			PromptID:   newPrompt.ID,
			Operation:  "update",
			OldContent: existing.Content,
			NewContent: req.Content,
			CreatedAt:  time.Now(),
		}
		if err := tx.Create(&history).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create history"})
			return
		}
		tx.Commit()
		c.JSON(http.StatusOK, newPrompt)
		return
	}

	// 仅更新元信息（描述、分类、标签）
	updated := false
	if req.Description != "" {
		existing.Description = req.Description
		updated = true
	}
	if req.Category != "" {
		// 分类必须存在
		var categoryCount int64
		if err := database.DB.Model(&models.Category{}).Where("name = ?", req.Category).Count(&categoryCount).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate category"})
			return
		}
		if categoryCount == 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category"})
			return
		}
		existing.Category = req.Category
		updated = true
	}
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		if err := tx.Where("id IN ?", req.TagIDs).Find(&tags).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
			return
		}
		if err := tx.Model(&existing).Association("Tags").Replace(&tags); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tags"})
			return
		}
		updated = true
	}
	if updated {
		if err := tx.Save(&existing).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update prompt"})
			return
		}
	}
	tx.Commit()
	c.JSON(http.StatusOK, existing)
}

// DeletePrompt 删除单个提示词版本
func (h *PromptHandler) DeletePrompt(c *gin.Context) {
	id := c.Param("id")

	tx := database.DB.Begin()
	// 删除标签关联
	if err := tx.Exec("DELETE FROM prompt_tags WHERE prompt_id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete prompt tags"})
		return
	}
	// 删除历史记录由外键级联处理，但保险起见：
	if err := tx.Exec("DELETE FROM prompt_histories WHERE prompt_id = ?", id).Error; err != nil {
		// 如果表名为 prompt_history，兼容：
		_ = tx.Exec("DELETE FROM prompt_history WHERE prompt_id = ?", id).Error
	}
	// 删除提示词
	if err := tx.Delete(&models.Prompt{}, "id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete prompt"})
		return
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Prompt deleted successfully"})
}

// GetPromptDiff 获取版本差异
func (h *PromptHandler) GetPromptDiff(c *gin.Context) {
	id := c.Param("id")
	targetID := c.Param("target_id")

	var prompt1, prompt2 models.Prompt
	if err := database.DB.First(&prompt1, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Source prompt not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch source prompt"})
		return
	}

	if err := database.DB.First(&prompt2, "id = ?", targetID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Target prompt not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch target prompt"})
		return
	}

	diffResult := h.diffService.CompareTexts(prompt1.Content, prompt2.Content)

	c.JSON(http.StatusOK, gin.H{
		"source_version": prompt1.Version,
		"target_version": prompt2.Version,
		"diff":           diffResult,
	})
}

// RollbackPrompt 版本回滚
func (h *PromptHandler) RollbackPrompt(c *gin.Context) {
	id := c.Param("id")

	var sourcePrompt models.Prompt
	if err := database.DB.First(&sourcePrompt, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Source prompt not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch source prompt"})
		return
	}

	// 生成新版本号
	var lastPrompt models.Prompt
	var newVersion string
	if err := database.DB.Where("project_id = ? AND name = ?", sourcePrompt.ProjectID, sourcePrompt.Name).
		Order("created_at DESC").First(&lastPrompt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			newVersion = "1.0.0"
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch last prompt"})
			return
		}
	} else {
		newVersion = h.versionService.GenerateNextVersion(lastPrompt.Version, "patch")
	}

	// 创建回滚版本
	newPrompt := models.Prompt{
		ProjectID:   sourcePrompt.ProjectID,
		Name:        sourcePrompt.Name,
		Version:     newVersion,
		Content:     sourcePrompt.Content,
		Category:    sourcePrompt.Category,
		Description: fmt.Sprintf("Rollback to version %s", sourcePrompt.Version),
		CreatedAt:   time.Now(),
	}

	tx := database.DB.Begin()
	if err := tx.Create(&newPrompt).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rollback prompt"})
		return
	}

	// 复制标签
	var tags []models.Tag
	if err := tx.Model(&sourcePrompt).Association("Tags").Find(&tags); err == nil && len(tags) > 0 {
		if err := tx.Model(&newPrompt).Association("Tags").Append(&tags); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy tags"})
			return
		}
	}

	// 记录操作历史
	history := models.PromptHistory{
		PromptID:   newPrompt.ID,
		Operation:  "rollback",
		OldContent: "",
		NewContent: sourcePrompt.Content,
		CreatedAt:  time.Now(),
	}
	if err := tx.Create(&history).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create history"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, newPrompt)
}

// GetSDKPrompt 获取提示词内容（SDK专用接口）
func (h *PromptHandler) GetSDKPrompt(c *gin.Context) {
	projectID := c.Param("id")
	name := c.Query("name")
	version := c.Query("version")
	tag := c.Query("tag")

	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt name is required"})
		return
	}

	var prompt models.Prompt
	query := database.DB.Where("project_id = ? AND name = ?", projectID, name)

	// 标签筛选
	if tag != "" {
		query = query.Joins("JOIN prompt_tags ON prompts.id = prompt_tags.prompt_id").
			Joins("JOIN tags ON prompt_tags.tag_id = tags.id").
			Where("tags.name = ?", tag)
	}

	// 版本号筛选
	if version != "" {
		query = query.Where("version = ?", version)
	}

	// 如果没有指定版本，默认取最新版本（按创建时间倒序）
	// 注意：如果需要严格的语义版本排序，可能需要把所有版本查出来在内存排序，
	// 或者确保数据库中的 created_at 严格对应版本发布顺序。通常 created_at 是够用的。
	if err := query.Order("created_at DESC").First(&prompt).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Prompt not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch prompt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"content": prompt.Content,
	})
}

// TestPrompt 测试提示词
func (h *PromptHandler) TestPrompt(c *gin.Context) {
	type TestPromptRequest struct {
		Messages    []services.OpenAIMessage `json:"messages"`
		Stream      bool                     `json:"stream"`
		Model       string                   `json:"model"`
		Temperature *float64                 `json:"temperature"`
		TopP        *float64                 `json:"top_p"`
		MaxTokens   int                      `json:"max_tokens"`
	}
	var req TestPromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get settings
	var apiKeySetting models.Setting
	database.DB.Where("`key` = ?", "aliyun_api_key").First(&apiKeySetting)

	var apiURLSetting models.Setting
	database.DB.Where("`key` = ?", "aliyun_api_url").First(&apiURLSetting)

	var modelSetting models.Setting
	database.DB.Where("`key` = ?", "aliyun_model").First(&modelSetting)

	if apiKeySetting.Value == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aliyun API Key not configured"})
		return
	}

	model := req.Model
	if model == "" {
		model = modelSetting.Value
	}

	options := services.ChatOptions{
		Model:       model,
		Temperature: req.Temperature,
		TopP:        req.TopP,
		MaxTokens:   req.MaxTokens,
	}

	if req.Stream {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Transfer-Encoding", "chunked")

		err := services.CallAliyunChatStream(apiKeySetting.Value, apiURLSetting.Value, options, req.Messages, func(text string) error {
			data := map[string]string{"text": text}
			jsonData, _ := json.Marshal(data)
			c.SSEvent("message", string(jsonData))
			c.Writer.Flush()
			return nil
		})

		if err != nil {
			c.SSEvent("error", err.Error())
		}
		return
	}

	response, err := services.CallAliyunChat(apiKeySetting.Value, apiURLSetting.Value, options, req.Messages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"response": response})
}
