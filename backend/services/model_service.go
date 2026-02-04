package services

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIRequest struct {
	Model       string          `json:"model"`
	Messages    []OpenAIMessage `json:"messages"`
	Stream      bool            `json:"stream"`
	Temperature *float64        `json:"temperature,omitempty"`
	TopP        *float64        `json:"top_p,omitempty"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
}

type ChatOptions struct {
	Model       string
	Temperature *float64
	TopP        *float64
	MaxTokens   int
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

type ModelProvider interface {
	CallChat(apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage) (string, error)
	CallChatStream(apiKey, apiURL string, options ChatOptions, messages []OpenAIMessage, callback func(string) error) error
	GetDefaultModel() string
	GetDefaultAPIURL() string
	NormalizeAPIURL(url string) string
}

type BaseModelProvider struct {
	defaultModel  string
	defaultAPIURL string
}

func (p *BaseModelProvider) GetDefaultModel() string {
	return p.defaultModel
}

func (p *BaseModelProvider) GetDefaultAPIURL() string {
	return p.defaultAPIURL
}

func (p *BaseModelProvider) NormalizeAPIURL(url string) string {
	url = normalizeAPIURL(url)
	if url == "" {
		return p.defaultAPIURL
	}
	return url
}
