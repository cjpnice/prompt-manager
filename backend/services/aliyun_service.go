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
