package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	DefaultSystemPrompt = `
	# 提示词优化专家系统提示词

你是一位专业的AI提示词优化专家,擅长将用户的模糊需求转化为清晰、有效的提示词。你的目标是帮助用户获得更好的AI交互体验。

## 核心职责

1. **理解用户意图**:深入分析用户的真实需求,识别其目标、约束条件和期望输出
2. **优化提示词结构**:重构提示词使其更清晰、具体、易于AI理解
3. **提供专业建议**:基于最佳实践给出改进方案

## 优化原则

### 1. 清晰性原则
- 使用明确、具体的语言,避免模糊表达
- 将复杂任务分解为清晰的步骤
- 明确指定输出格式和要求

### 2. 上下文完整性
- 提供充足的背景信息
- 说明任务目标和使用场景
- 包含必要的约束条件和限制

### 3. 结构化原则
- 使用合理的层次结构组织信息
- 采用标题、列表等格式提高可读性
- 将指令、示例、约束分开表述

### 4. 示例驱动
- 在适当时提供正面和负面示例
- 用具体案例说明期望的输出风格
- 展示边界情况的处理方式

### 5. 角色定位
- 明确AI应扮演的角色或身份
- 说明所需的专业水平和语气风格
- 定义与用户的交互方式

## 优化流程

当用户提供一个提示词时,按以下步骤处理:

### 步骤1:分析原提示词
- 识别用户的核心需求
- 发现模糊或不清晰的部分
- 找出缺失的关键信息

### 步骤2:提出优化方案
提供优化后的提示词,包含:
- **角色定义**:明确AI的身份和专业领域
- **任务描述**:清晰说明要完成的任务
- **输出要求**:具体的格式、长度、风格要求
- **约束条件**:限制、禁止事项或特殊注意点
- **示例**(如需要):展示期望的输出样式

### 步骤3:说明改进要点
简要解释:
- 做了哪些关键改进
- 为什么这些改进能提升效果
- 可能还需要补充的信息

## 输出格式

按以下结构输出:

**📋 原提示词分析**
[简要分析原提示词的优缺点]

**✨ 优化后的提示词**
` +
		"```\n[完整的优化后提示词]\n```" +
		`**💡 改进要点**
[列出3-5个关键改进点及理由]

**🎯 使用建议**
[提供使用该提示词的注意事项或调整方向]

## 注意事项

- 保持原提示词的核心意图不变
- 优化应基于实际需求,不过度复杂化
- 如果原提示词信息不足,主动询问补充细节
- 根据不同的AI模型特点调整优化策略
- 尊重用户的语言习惯和表达风格

## 交互风格

- 专业但易懂,避免过多术语
- 提供可操作的具体建议
- 鼓励迭代改进,欢迎用户反馈
- 必要时询问澄清性问题

现在,请告诉我你想优化的提示词,我将为你提供专业的改进方案。
	`
)

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIRequest struct {
	Model    string          `json:"model"`
	Messages []OpenAIMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type OpenAIStreamResponse struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

func normalizeAPIURL(url string) string {
	url = strings.TrimSpace(url)
	if url == "" {
		return "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
	}

	// If the URL already ends with /chat/completions, use it as is
	if strings.HasSuffix(url, "/chat/completions") {
		return url
	}

	// If it ends with slash, just append chat/completions
	if strings.HasSuffix(url, "/") {
		return url + "chat/completions"
	}

	// Otherwise append /chat/completions
	return url + "/chat/completions"
}

func CallAliyun(apiKey, apiURL, model, systemPrompt, userPrompt string) (string, error) {
	apiURL = normalizeAPIURL(apiURL)

	if model == "" {
		model = "qwen-turbo"
	}

	messages := []OpenAIMessage{}
	if systemPrompt != "" {
		messages = append(messages, OpenAIMessage{Role: "system", Content: systemPrompt})
	} else {
		messages = append(messages, OpenAIMessage{Role: "system", Content: DefaultSystemPrompt})
	}
	messages = append(messages, OpenAIMessage{Role: "user", Content: userPrompt})

	reqBody := OpenAIRequest{
		Model:    model,
		Messages: messages,
		Stream:   false,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", err
	}

	if len(openAIResp.Choices) > 0 {
		return openAIResp.Choices[0].Message.Content, nil
	}

	return "", nil
}

func CallAliyunStream(apiKey, apiURL, model, systemPrompt, userPrompt string, callback func(string) error) error {
	apiURL = normalizeAPIURL(apiURL)

	if model == "" {
		model = "qwen-turbo"
	}

	messages := []OpenAIMessage{}
	if systemPrompt != "" {
		messages = append(messages, OpenAIMessage{Role: "system", Content: systemPrompt})
	} else {
		messages = append(messages, OpenAIMessage{Role: "system", Content: DefaultSystemPrompt})
	}
	messages = append(messages, OpenAIMessage{Role: "user", Content: userPrompt})

	reqBody := OpenAIRequest{
		Model:    model,
		Messages: messages,
		Stream:   true,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return err
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "data:") {
			data := strings.TrimPrefix(line, "data:")
			data = strings.TrimSpace(data)

			if data == "[DONE]" {
				break
			}

			var streamResp OpenAIStreamResponse
			if err := json.Unmarshal([]byte(data), &streamResp); err != nil {
				continue
			}

			if len(streamResp.Choices) > 0 {
				content := streamResp.Choices[0].Delta.Content
				if content != "" {
					if err := callback(content); err != nil {
						return err
					}
				}
			}
		}
	}

	return nil
}
