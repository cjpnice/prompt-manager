package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Project struct {
	ID          string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Name        string    `json:"name" gorm:"type:varchar(100);not null"`
	Description string    `json:"description" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Prompts     []Prompt  `json:"prompts" gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE"`
	Tags        []Tag     `json:"tags" gorm:"many2many:project_tags"`
}

type Prompt struct {
    ID          string         `json:"id" gorm:"primaryKey;type:varchar(36)"`
    ProjectID   string         `json:"project_id" gorm:"type:varchar(36);not null;index"`
    Name        string         `json:"name" gorm:"type:varchar(100);default:'';index"`
    Version     string         `json:"version" gorm:"type:varchar(20);not null;index"`
    Content     string         `json:"content" gorm:"type:text;not null"`
    Description string         `json:"description" gorm:"type:text"`
    Category    string         `json:"category" gorm:"type:varchar(50);index"`
    CreatedAt   time.Time      `json:"created_at"`
    Project     Project        `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
    Tags        []Tag          `json:"tags,omitempty" gorm:"many2many:prompt_tags"`
    History     []PromptHistory `json:"history,omitempty" gorm:"foreignKey:PromptID;constraint:OnDelete:CASCADE"`
}

type Tag struct {
    ID        string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
    Name      string    `json:"name" gorm:"type:varchar(50);not null;unique"`
    Color     string    `json:"color" gorm:"type:varchar(7);default:'#3b82f6'"`
    CreatedAt time.Time `json:"created_at"`
    Projects  []Project `json:"projects,omitempty" gorm:"many2many:project_tags"`
    Prompts   []Prompt  `json:"prompts,omitempty" gorm:"many2many:prompt_tags"`
}

type Category struct {
    ID        string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
    Name      string    `json:"name" gorm:"type:varchar(50);not null;unique"`
    Color     string    `json:"color" gorm:"type:varchar(7);default:'#6366f1'"`
    CreatedAt time.Time `json:"created_at"`
}

type PromptHistory struct {
	ID         string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	PromptID   string    `json:"prompt_id" gorm:"type:varchar(36);not null;index"`
	Operation  string    `json:"operation" gorm:"type:varchar(20);not null"`
	OldContent string    `json:"old_content" gorm:"type:text"`
	NewContent string    `json:"new_content" gorm:"type:text"`
	CreatedAt  time.Time `json:"created_at"`
	Prompt     Prompt    `json:"prompt,omitempty" gorm:"foreignKey:PromptID"`
}

type Setting struct {
	Key         string    `json:"key" gorm:"primaryKey;type:varchar(50)"`
	Value       string    `json:"value" gorm:"type:text"`
	Description string    `json:"description" gorm:"type:varchar(255)"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

func (p *Prompt) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
    if t.ID == "" {
        t.ID = uuid.New().String()
    }
    return nil
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
    if c.ID == "" {
        c.ID = uuid.New().String()
    }
    return nil
}

func (ph *PromptHistory) BeforeCreate(tx *gorm.DB) error {
	if ph.ID == "" {
		ph.ID = uuid.New().String()
	}
	return nil
}
