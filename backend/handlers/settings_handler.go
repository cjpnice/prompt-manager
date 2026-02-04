package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"prompt-manager/database"
	"prompt-manager/models"
	"prompt-manager/services"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct{}

func NewSettingsHandler() *SettingsHandler {
	return &SettingsHandler{}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings []models.Setting
	if err := database.DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}
	c.JSON(http.StatusOK, settingsMap)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var input map[string]string
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	for k, v := range input {
		// Using Clauses to handle upsert if needed, or just manual check
		var setting models.Setting
		if err := tx.Where("`key` = ?", k).First(&setting).Error; err != nil {
			// Create
			setting = models.Setting{Key: k, Value: v}
			if err := tx.Create(&setting).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			// Update
			setting.Value = v
			if err := tx.Save(&setting).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (h *SettingsHandler) OptimizePrompt(c *gin.Context) {
	type OptimizeRequest struct {
		Prompt   string `json:"prompt"`
		Stream   bool   `json:"stream"`
		Provider string `json:"provider"`
	}
	var req OptimizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	provider := services.ProviderType(req.Provider)
	if provider == "" {
		provider = services.ProviderAliyun
	}

	// Get provider-specific settings
	apiKeyKey := services.GetProviderSettingsKey(provider)
	apiURLKey := services.GetProviderURLKey(provider)
	modelKey := services.GetProviderModelKey(provider)

	var apiKeySetting models.Setting
	database.DB.Where("`key` = ?", apiKeyKey).First(&apiKeySetting)

	var apiURLSetting models.Setting
	database.DB.Where("`key` = ?", apiURLKey).First(&apiURLSetting)

	var modelSetting models.Setting
	database.DB.Where("`key` = ?", modelKey).First(&modelSetting)

	if apiKeySetting.Value == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%s API Key not configured", provider)})
		return
	}

	model := modelSetting.Value
	if model == "" {
		providerObj, err := services.GetProvider(provider)
		if err == nil {
			model = providerObj.GetDefaultModel()
		} else {
			model = "qwen-turbo"
		}
	}

	options := services.ChatOptions{
		Model:       model,
		Temperature: nil,
		TopP:        nil,
		MaxTokens:   0,
	}

	messages := []services.OpenAIMessage{
		{Role: "user", Content: req.Prompt},
	}

	if req.Stream {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Transfer-Encoding", "chunked")

		err := services.CallModelStream(provider, apiKeySetting.Value, apiURLSetting.Value, options, messages, func(text string) error {
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

	optimized, err := services.CallModel(provider, apiKeySetting.Value, apiURLSetting.Value, options, messages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"optimized_prompt": optimized})
}
