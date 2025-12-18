package handlers

import (
	"encoding/json"
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
		Prompt string `json:"prompt"`
		Stream bool   `json:"stream"`
	}
	var req OptimizeRequest
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

	var systemPromptSetting models.Setting
	database.DB.Where("`key` = ?", "aliyun_system_prompt").First(&systemPromptSetting)

	if apiKeySetting.Value == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aliyun API Key not configured"})
		return
	}

	systemPrompt := systemPromptSetting.Value

	model := modelSetting.Value
	if model == "" {
		model = "qwen-turbo"
	}

	if req.Stream {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Transfer-Encoding", "chunked")

		err := services.CallAliyunStream(apiKeySetting.Value, apiURLSetting.Value, model, systemPrompt, req.Prompt, func(text string) error {
			// Wrap text in JSON to preserve newlines and special characters when sending via SSE
			data := map[string]string{"text": text}
			jsonData, _ := json.Marshal(data)
			c.SSEvent("message", string(jsonData))
			c.Writer.Flush()
			return nil
		})

		if err != nil {
			// If error happens mid-stream, we can't really change the status code now,
			// but we can send an error event.
			c.SSEvent("error", err.Error())
		}
		return
	}

	optimized, err := services.CallAliyun(apiKeySetting.Value, apiURLSetting.Value, model, systemPrompt, req.Prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"optimized_prompt": optimized})
}
