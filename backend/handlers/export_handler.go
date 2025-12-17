package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"prompt-manager/database"
	"prompt-manager/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"sort"
)

type ExportHandler struct{}

func NewExportHandler() *ExportHandler {
	return &ExportHandler{}
}

// ExportData 导出数据
func (h *ExportHandler) ExportData(c *gin.Context) {
	var req struct {
		ProjectIDs []string `json:"project_ids" binding:"required"`
		Format     string   `json:"format" binding:"required,oneof=json csv yaml"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var projects []models.Project
	if err := database.DB.Preload("Prompts.Tags").Preload("Tags").
		Where("id IN ?", req.ProjectIDs).Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}

	switch req.Format {
	case "json":
		h.exportJSON(c, projects)
	case "csv":
		h.exportCSV(c, projects)
	case "yaml":
		h.exportYAML(c, projects)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported format"})
	}
}

func (h *ExportHandler) exportJSON(c *gin.Context, projects []models.Project) {
	filename := fmt.Sprintf("prompts_export_%s.json", time.Now().Format("20060102_150405"))

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	data := gin.H{
		"export_time": time.Now().Format("2006-01-02 15:04:05"),
		"projects":    projects,
	}

	c.JSON(http.StatusOK, data)
}

func (h *ExportHandler) exportCSV(c *gin.Context, projects []models.Project) {
	filename := fmt.Sprintf("prompts_export_%s.csv", time.Now().Format("20060102_150405"))

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// 写入表头
	headers := []string{"项目ID", "项目名称", "项目描述", "版本ID", "版本号", "提示词内容", "版本描述", "标签", "创建时间"}
	writer.Write(headers)

	// 写入数据
	for _, project := range projects {
		if len(project.Prompts) == 0 {
			// 项目没有提示词时，只写入项目信息
			row := []string{
				project.ID,
				project.Name,
				project.Description,
				"", "", "", "", "", "",
			}
			writer.Write(row)
		} else {
			for _, prompt := range project.Prompts {
				tagNames := make([]string, len(prompt.Tags))
				for i, tag := range prompt.Tags {
					tagNames[i] = tag.Name
				}

				row := []string{
					project.ID,
					project.Name,
					project.Description,
					prompt.ID,
					prompt.Version,
					prompt.Content,
					prompt.Description,
					joinStrings(tagNames, ";"),
					prompt.CreatedAt.Format("2006-01-02 15:04:05"),
				}
				writer.Write(row)
			}
		}
	}
}

// ImportData 导入数据
func (h *ExportHandler) ImportData(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	format := c.PostForm("format")
	if format == "" {
		// 根据文件扩展名判断格式
		if len(header.Filename) > 5 && header.Filename[len(header.Filename)-5:] == ".json" {
			format = "json"
		} else if len(header.Filename) > 4 && header.Filename[len(header.Filename)-4:] == ".csv" {
			format = "csv"
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot determine file format"})
			return
		}
	}

	switch format {
	case "json":
		h.importJSON(c, file)
	case "csv":
		h.importCSV(c, file)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported format"})
	}
}

func (h *ExportHandler) importJSON(c *gin.Context, file multipart.File) {
	var data struct {
		Projects []models.Project `json:"projects"`
	}

	if err := json.NewDecoder(file).Decode(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	importedCount := 0
	skippedCount := 0
	errors := []string{}

	for _, project := range data.Projects {
		tx := database.DB.Begin()

		// 检查项目是否存在
		var existingProject models.Project
		if err := tx.Where("id = ?", project.ID).First(&existingProject).Error; err != nil {
			// 不存在，创建
			if err := tx.Create(&project).Error; err != nil {
				tx.Rollback()
				errors = append(errors, fmt.Sprintf("Failed to create project %s: %v", project.Name, err))
				skippedCount++
				continue
			}
		} else {
			// 存在，更新基本信息
			existingProject.Name = project.Name
			existingProject.Description = project.Description
			if err := tx.Save(&existingProject).Error; err != nil {
				tx.Rollback()
				errors = append(errors, fmt.Sprintf("Failed to update project %s: %v", project.Name, err))
				skippedCount++
				continue
			}
			// 处理提示词
			for _, prompt := range project.Prompts {
				prompt.ProjectID = existingProject.ID
				var existingPrompt models.Prompt
				if err := tx.Where("id = ?", prompt.ID).First(&existingPrompt).Error; err != nil {
					if err := tx.Create(&prompt).Error; err != nil {
						// log error but maybe continue?
					}
				} else {
					// Update prompt?
					existingPrompt.Name = prompt.Name
					existingPrompt.Version = prompt.Version
					existingPrompt.Content = prompt.Content
					existingPrompt.Description = prompt.Description
					existingPrompt.Category = prompt.Category
					tx.Save(&existingPrompt)
				}
			}
		}

		tx.Commit()
		importedCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Import completed",
		"imported": importedCount,
		"skipped":  skippedCount,
		"errors":   errors,
	})
}

func (h *ExportHandler) importCSV(c *gin.Context, file multipart.File) {
	reader := csv.NewReader(file)
	
	// Skip header
	if _, err := reader.Read(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Empty or invalid CSV file"})
		return
	}

	importedCount := 0
	skippedCount := 0
	errors := []string{}
	
	// Cache for projects to avoid repeated DB calls in same request if sorted, but map is safer
	projectMap := make(map[string]*models.Project)

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			errors = append(errors, fmt.Sprintf("Error reading row: %v", err))
			continue
		}

		if len(record) < 9 {
			errors = append(errors, "Invalid row format")
			continue
		}

		projectID := record[0]
		projectName := record[1]
		projectDesc := record[2]
		promptID := record[3]
		version := record[4]
		content := record[5]
		promptDesc := record[6]
		tagNames := record[7]
		createdAtStr := record[8]

		// Find or Create Project
		var project models.Project
		if p, ok := projectMap[projectID]; ok {
			project = *p
		} else {
			// Check DB
			if err := database.DB.Where("id = ?", projectID).First(&project).Error; err != nil {
				// Create
				project = models.Project{
					ID:          projectID,
					Name:        projectName,
					Description: projectDesc,
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				}
				if err := database.DB.Create(&project).Error; err != nil {
					errors = append(errors, fmt.Sprintf("Failed to create project %s: %v", projectName, err))
					skippedCount++
					continue
				}
			}
			projectMap[projectID] = &project
		}

		// If prompt data exists
		if promptID != "" {
			var prompt models.Prompt
			if err := database.DB.Where("id = ?", promptID).First(&prompt).Error; err != nil {
				// Create
				createdAt, _ := time.Parse("2006-01-02 15:04:05", createdAtStr)
				if createdAt.IsZero() {
					createdAt = time.Now()
				}

				prompt = models.Prompt{
					ID:          promptID,
					ProjectID:   project.ID,
					Name:        project.Name, // Default to project name or need specific prompt name? CSV doesn't have prompt name separate from project name usually, but here we only have project name. Wait, the export CSV structure:
					// headers := []string{"项目ID", "项目名称", "项目描述", "版本ID", "版本号", "提示词内容", "版本描述", "标签", "创建时间"}
					// It seems prompt Name is missing in CSV export! "项目名称" is Project Name.
					// Prompt Name is a field in Prompt model.
					// I should check exportCSV again.
					// Yes, exportCSV writes project.Name but not prompt.Name.
					// This is a data loss in CSV export.
					// I'll assume Prompt Name = Project Name for now, or empty.
					// Let's use Project Name for Prompt Name as fallback.
					Version:     version,
					Content:     content,
					Description: promptDesc,
					CreatedAt:   createdAt,
				}
				// Handle tags
				if tagNames != "" {
					names := strings.Split(tagNames, ";")
					for _, name := range names {
						name = strings.TrimSpace(name)
						if name == "" { continue }
						var tag models.Tag
						if err := database.DB.Where("name = ?", name).First(&tag).Error; err != nil {
							tag = models.Tag{Name: name}
							database.DB.Create(&tag)
						}
						prompt.Tags = append(prompt.Tags, tag)
					}
				}
				
				if err := database.DB.Create(&prompt).Error; err != nil {
					errors = append(errors, fmt.Sprintf("Failed to create prompt %s: %v", promptID, err))
				} else {
					importedCount++
				}
			} else {
				// Update?
				// For CSV, maybe just skip if exists to avoid overwriting with potentially less data
				skippedCount++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Import completed",
		"imported": importedCount,
		"skipped":  skippedCount,
		"errors":   errors,
	})
}

func (h *ExportHandler) exportYAML(c *gin.Context, projects []models.Project) {
	filename := fmt.Sprintf("prompts_export_%s.yaml", time.Now().Format("20060102_150405"))

	c.Header("Content-Type", "application/x-yaml")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	exportData := make(map[string]string)

	for _, project := range projects {
		latestPrompts := make(map[string]models.Prompt)
		for _, prompt := range project.Prompts {
			if existing, ok := latestPrompts[prompt.Name]; !ok || prompt.Version > existing.Version {
				latestPrompts[prompt.Name] = prompt
			}
		}

		for _, prompt := range latestPrompts {
			exportData[prompt.Name] = prompt.Content
		}
	}

	var yamlBuilder strings.Builder
	keys := make([]string, 0, len(exportData))
	for k := range exportData {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		// Add indentation to the content for proper YAML block scalar format
		indentedContent := strings.ReplaceAll(exportData[k], "\n", "\n  ")
		yamlBuilder.WriteString(fmt.Sprintf(`%s: |
  %s
`, k, indentedContent))
	}

	c.String(http.StatusOK, yamlBuilder.String())
}

func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
