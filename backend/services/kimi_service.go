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

type KimiProvider struct {
	BaseModelProvider
}

func NewKimiProvider() *KimiProvider {
	return &KimiProvider{
		BaseModelProvider: BaseModelProvider{
			defaultModel: "moonshot-v1-8k",
			defaultAPIURL: "https://api.moonshot.cn/v1/chat/completions",
		},
	}
}

func (p *KimiProvider) NormalizeAPIURL(url string) string {
	url = strings.TrimSpace(url)
	if url == "" {
		return p.defaultAPIURL
	}

	if strings.HasSuffix(url, "/chat/completions") {
		return url
	}

	if strings.HasSuffix(url, "/") {
		return url + "chat/completions"
	}

	return url + "/chat/completions"
}

func (p *KimiProvider) CallChat(apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage) (string, error) {
	apiURL = p.NormalizeAPIURL(apiURL)

	if options.Model == "" {
		options.Model = p.defaultModel
	}

	reqBody := OpenAIRequest{
		Model:       options.Model,
		Messages:    messages,
		Stream:      false,
		Temperature: options.Temperature,
		TopP:        options.TopP,
		MaxTokens:   options.MaxTokens,
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
		return "", fmt.Errorf("Kimi API request failed with status %d: %s", resp.StatusCode, string(body))
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

func (p *KimiProvider) CallChatStream(apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage, callback func(string) error) error {
	apiURL = p.NormalizeAPIURL(apiURL)

	if options.Model == "" {
		options.Model = p.defaultModel
	}

	reqBody := OpenAIRequest{
		Model:       options.Model,
		Messages:    messages,
		Stream:      true,
		Temperature: options.Temperature,
		TopP:        options.TopP,
		MaxTokens:   options.MaxTokens,
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
		return fmt.Errorf("Kimi API request failed with status %d: %s", resp.StatusCode, string(body))
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
