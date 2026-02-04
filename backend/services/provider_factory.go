package services

import (
	"fmt"
	"sync"
)

type ProviderType string

const (
	ProviderAliyun  ProviderType = "aliyun"
	ProviderDeepSeek ProviderType = "deepseek"
	ProviderDoubao  ProviderType = "doubao"
	ProviderGLM     ProviderType = "glm"
	ProviderKimi    ProviderType = "kimi"
)

type AliyunProvider struct {
	BaseModelProvider
}

func NewAliyunProvider() *AliyunProvider {
	return &AliyunProvider{
		BaseModelProvider: BaseModelProvider{
			defaultModel: "qwen-turbo",
			defaultAPIURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
		},
	}
}

func (p *AliyunProvider) NormalizeAPIURL(url string) string {
	return normalizeAPIURL(url)
}

func (p *AliyunProvider) CallChat(apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage) (string, error) {
	return CallAliyunChat(apiKey, apiURL, options, messages)
}

func (p *AliyunProvider) CallChatStream(apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage, callback func(string) error) error {
	return CallAliyunChatStream(apiKey, apiURL, options, messages, callback)
}

var (
	providers     map[ProviderType]ModelProvider
	providersOnce sync.Once
)

func initProviders() {
	providers = make(map[ProviderType]ModelProvider)
	providers[ProviderAliyun] = NewAliyunProvider()
	providers[ProviderDeepSeek] = NewDeepSeekProvider()
	providers[ProviderDoubao] = NewDoubaoProvider()
	providers[ProviderGLM] = NewGLMProvider()
	providers[ProviderKimi] = NewKimiProvider()
}

func GetProvider(providerType ProviderType) (ModelProvider, error) {
	providersOnce.Do(initProviders)

	provider, exists := providers[providerType]
	if !exists {
		return nil, fmt.Errorf("provider %s not found", providerType)
	}

	return provider, nil
}

func RegisterProvider(providerType ProviderType, provider ModelProvider) {
	providersOnce.Do(initProviders)
	providers[providerType] = provider
}

func GetSupportedProviders() []ProviderType {
	providersOnce.Do(initProviders)
	
	types := make([]ProviderType, 0, len(providers))
	for t := range providers {
		types = append(types, t)
	}
	return types
}

func CallModel(providerType ProviderType, apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage) (string, error) {
	provider, err := GetProvider(providerType)
	if err != nil {
		return "", err
	}

	return provider.CallChat(apiKey, apiURL, options, messages)
}

func CallModelStream(providerType ProviderType, apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage, callback func(string) error) error {
	provider, err := GetProvider(providerType)
	if err != nil {
		return err
	}

	return provider.CallChatStream(apiKey, apiURL, options, messages, callback)
}

type ModelConfig struct {
	ProviderType ProviderType
	APIKey       string
	APIURL       string
	Model        string
}

func GetProviderSettingsKey(providerType ProviderType) string {
	switch providerType {
	case ProviderAliyun:
		return "aliyun_api_key"
	case ProviderDeepSeek:
		return "deepseek_api_key"
	case ProviderDoubao:
		return "doubao_api_key"
	case ProviderGLM:
		return "glm_api_key"
	case ProviderKimi:
		return "kimi_api_key"
	default:
		return ""
	}
}

func GetProviderURLKey(providerType ProviderType) string {
	switch providerType {
	case ProviderAliyun:
		return "aliyun_api_url"
	case ProviderDeepSeek:
		return "deepseek_api_url"
	case ProviderDoubao:
		return "doubao_api_url"
	case ProviderGLM:
		return "glm_api_url"
	case ProviderKimi:
		return "kimi_api_url"
	default:
		return ""
	}
}

func GetProviderModelKey(providerType ProviderType) string {
	switch providerType {
	case ProviderAliyun:
		return "aliyun_model"
	case ProviderDeepSeek:
		return "deepseek_model"
	case ProviderDoubao:
		return "doubao_model"
	case ProviderGLM:
		return "glm_model"
	case ProviderKimi:
		return "kimi_model"
	default:
		return ""
	}
}
