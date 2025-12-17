import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Code, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export const IntegrationTutorial: React.FC = () => {
  const navigate = useNavigate();

  const markdownContent = `
# 提示词集成教程

本教程将指导您如何在应用程序中集成 Prompt Manager，动态获取最新的提示词。

## API 接口说明

**Endpoint:** \`GET /api/projects/{project_id}/sdk/prompt\`

**参数:**
- \`name\`: (必填) 提示词名称
- \`version\`: (可选) 特定版本号，如果不传则返回最新版本
- \`tag\`: (可选) 标签筛选

**响应:**
\`\`\`json
{
  "content": "您的提示词内容..."
}
\`\`\`

---

## 1. Python 集成示例

使用 \`requests\` 库获取提示词内容。

\`\`\`python
import requests

def get_prompt_content(project_id, prompt_name, version=None, tag=None):
    base_url = "http://localhost:8080/api"  # 请根据实际部署地址修改
    url = f"{base_url}/projects/{project_id}/sdk/prompt"
    
    params = {
        "name": prompt_name
    }
    if version:
        params["version"] = version
    if tag:
        params["tag"] = tag
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        return data.get("content")
            
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        return None

# 使用示例
project_id = "your_project_id"
prompt_name = "welcome_message"

# 获取最新版本
content = get_prompt_content(project_id, prompt_name)
if content:
    print(f"提示词内容: {content}")

# 获取特定版本
v1_content = get_prompt_content(project_id, prompt_name, version="1.0.0")
\`\`\`

## 2. Go 集成示例

使用标准库 \`net/http\` 获取提示词内容。

\`\`\`go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type PromptResponse struct {
	Content string \`json:"content"\`
}

func GetPromptContent(projectID, promptName, version, tag string) (string, error) {
	baseURL := "http://localhost:8080/api" // 请根据实际部署地址修改
	endpoint := fmt.Sprintf("%s/projects/%s/sdk/prompt", baseURL, projectID)

	// 构建查询参数
	params := url.Values{}
	params.Add("name", promptName)
	if version != "" {
		params.Add("version", version)
	}
	if tag != "" {
		params.Add("tag", tag)
	}

	resp, err := http.Get(endpoint + "?" + params.Encode())
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result PromptResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return result.Content, nil
}

func main() {
	projectID := "your_project_id"
	promptName := "welcome_message"

	// 获取最新版本
	content, err := GetPromptContent(projectID, promptName, "", "")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("提示词内容: %s\n", content)
}
\`\`\`

## 3. JavaScript/TypeScript 集成示例

\`\`\`typescript
async function getPromptContent(
  projectId: string, 
  name: string, 
  options?: { version?: string; tag?: string }
): Promise<string | null> {
  const baseUrl = 'http://localhost:8080/api';
  const url = new URL(\`\${baseUrl}/projects/\${projectId}/sdk/prompt\`);
  
  url.searchParams.append('name', name);
  if (options?.version) url.searchParams.append('version', options.version);
  if (options?.tag) url.searchParams.append('tag', options.tag);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
    return null;
  }
}

// 使用示例
getPromptContent('your_project_id', 'welcome_message').then(content => {
  console.log('Prompt content:', content);
});
\`\`\`

## 最佳实践

1. **缓存**: 建议在应用端对提示词进行适当缓存（例如 5-10 分钟），避免频繁请求 API。
2. **错误处理**: 在网络请求失败时，应有默认的提示词作为后备 (Fallback)。
3. **版本控制**: 生产环境建议指定 \`version\` 参数以锁定特定版本的提示词，避免意外变更。
`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-indigo-200 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            返回首页
          </button>

          <div className="flex items-center mb-4">
            <div className="p-3 bg-white/10 rounded-xl mr-4 backdrop-blur-sm">
              <BookOpen className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">集成指南</h1>
              <p className="text-indigo-200 mt-2 text-lg">
                学习如何在您的项目中集成 Prompt Manager SDK
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8">
            <article className="prose prose-indigo max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {markdownContent}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTutorial;
