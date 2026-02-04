import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Trash2, Play, GripVertical, StopCircle, Calculator, Copy, Settings, X, Check, GitCompare, ChevronDown } from 'lucide-react';
import { apiService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { encode } from 'gpt-tokenizer';
import { Prompt } from '../types/models';
import { ThemeToggle } from '../components/ThemeToggle';

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type ProviderType = 'aliyun' | 'deepseek' | 'doubao' | 'glm' | 'kimi';

interface ProviderConfig {
  name: string;
  displayName: string;
  api_url: string;
  model: string;
  suggestedModels: string[];
}

const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  aliyun: {
    name: 'aliyun',
    displayName: '阿里云',
    api_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
    suggestedModels: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
  },
  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    api_url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-coder'],
  },
  doubao: {
    name: 'doubao',
    displayName: '豆包',
    api_url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-pro-4k',
    suggestedModels: ['doubao-pro-4k', 'doubao-pro-32k', 'doubao-lite-4k'],
  },
  glm: {
    name: 'glm',
    displayName: 'GLM (智谱)',
    api_url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4',
    suggestedModels: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
  },
  kimi: {
    name: 'kimi',
    displayName: 'Kimi (月之暗面)',
    api_url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    suggestedModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
};

interface ModelSettings {
  provider: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

// 对比模式组件 Props
interface CompareModeViewProps {
  selectedVersions: string[];
  availableVersions: Prompt[];
  currentCompareIndex: number;
  onSwitchVersion: () => void;
  onExitCompare: () => void;
  messages: Message[];
  copied: boolean;
  handleCopy: () => void;
  handleCompareTest: () => void;
  setMessages: (messages: Message[]) => void;
  variableValues: Record<string, string>;
  setVariableValues: (values: Record<string, string>) => void;
  variables: string[];
  compareResponses: Record<string, string>;
  compareLoading: Record<string, boolean>;
  setCompareResponses: (responses: Record<string, string>) => void;
}

export const TestPrompt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'system-1', role: 'system', content: '' },
    { id: 'user-1', role: 'user', content: '' }
  ]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 对比模式专用状态
  const [compareResponses, setCompareResponses] = useState<Record<string, string>>({});
  const [compareLoading, setCompareLoading] = useState<Record<string, boolean>>({});
  const [streamAbort, setStreamAbort] = useState<(() => void) | null>(null);
  const [tokenCount, setTokenCount] = useState(0);
  const [cost, setCost] = useState(0);
  const [showCostSettings, setShowCostSettings] = useState(false);
  const [inputPrice, setInputPrice] = useState(0.002);
  const [outputPrice, setOutputPrice] = useState(0.006);
  
  // New features state
  const [variables, setVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    provider: 'aliyun',
    model: 'qwen-turbo',
    temperature: 0.7,
    topP: 0.8,
    maxTokens: 2000
  });
  const [copied, setCopied] = useState(false);
  const [variablePrefix, setVariablePrefix] = useState('{{');
  const [variableSuffix, setVariableSuffix] = useState('}}');
  
  // 多版本对比功能状态
  const [compareMode, setCompareMode] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<Prompt[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [currentCompareIndex, setCurrentCompareIndex] = useState(0);
  const [showVersionSelector, setShowVersionSelector] = useState(false);

  // Escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  useEffect(() => {
    // Extract variables from messages
    const vars = new Set<string>();
    if (!variablePrefix || !variableSuffix) return;

    try {
        const escapedPrefix = escapeRegExp(variablePrefix);
        const escapedSuffix = escapeRegExp(variableSuffix);
        const regex = new RegExp(`${escapedPrefix}\\s*(.+?)\\s*${escapedSuffix}`, 'g');

        messages.forEach(msg => {
            const matches = msg.content.match(regex);
            if (matches) {
                // match returns full match, we need to extract groups manually or use exec
                let match;
                const globalRegex = new RegExp(`${escapedPrefix}\\s*(.+?)\\s*${escapedSuffix}`, 'g');
                while ((match = globalRegex.exec(msg.content)) !== null) {
                    if (match[1]) {
                        vars.add(match[1].trim());
                    }
                }
            }
        });
        setVariables(Array.from(vars));
    } catch (e) {
        console.error('Regex error:', e);
    }
  }, [messages, variablePrefix, variableSuffix]);

  useEffect(() => {
    calculateTokens();
  }, [messages, response, inputPrice, outputPrice]);

  const calculateTokens = () => {
    try {
      let totalTokens = 0;
      // Calculate input tokens
      messages.forEach(msg => {
        const tokens = encode(msg.content || '');
        totalTokens += tokens.length;
      });
      
      const inputTokens = totalTokens;
      
      // Calculate output tokens
      const outputTokens = encode(response || '').length;
      totalTokens += outputTokens;

      setTokenCount(totalTokens);
      
      // Calculate estimated cost
      const estimatedCost = (inputTokens / 1000 * inputPrice) + (outputTokens / 1000 * outputPrice);
      setCost(estimatedCost);
    } catch (e) {
      console.error('Token calculation error:', e);
    }
  };

  useEffect(() => {
    if (id) {
      loadPrompt(id);
      loadAvailableVersions(id);
    }
  }, [id]);

  const loadPrompt = async (promptId: string) => {
    try {
      const prompt = await apiService.getPrompt(promptId);
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[0].role === 'system') {
          newMessages[0].content = prompt.content;
        } else {
            newMessages.unshift({ id: 'system-' + Date.now(), role: 'system', content: prompt.content });
        }
        return newMessages;
      });
    } catch (error) {
      console.error('Failed to load prompt:', error);
    }
  };

  const loadAvailableVersions = async (promptId: string) => {
    try {
      const currentPrompt = await apiService.getPrompt(promptId);
      if (currentPrompt.project_id) {
        const response = await apiService.getPrompts(currentPrompt.project_id);
        const versions = (response.data || [])
          .filter((p: Prompt) => p.name === currentPrompt.name)
          .sort((a: Prompt, b: Prompt) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAvailableVersions(versions);
      }
    } catch (error) {
      console.error('Failed to load available versions:', error);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(messages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setMessages(items);
  };

  const updateMessage = (id: string, content: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, content } : m));
  };

  const addMessage = (role: 'user' | 'assistant') => {
    setMessages([...messages, { id: role + '-' + Date.now(), role, content: '' }]);
  };

  const removeMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  const handleCopy = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 对比模式下的并行测试
  const handleCompareTest = async () => {
    if (selectedVersions.length !== 2) return;
    
    // 重置所有响应状态
    setCompareResponses({});
    setCompareLoading({});
    
    // 为每个版本并行测试
    selectedVersions.forEach(async (versionId) => {
      const version = availableVersions.find(v => v.id === versionId);
      if (!version) return;
      
      // 设置加载状态
      setCompareLoading(prev => ({ ...prev, [versionId]: true }));
      
      // 准备消息，替换系统消息为当前版本的提示词内容
      const apiMessages = messages.map(({ role, content }) => {
        let newContent = content;
        
        // 如果是系统提示词，使用当前版本的内容
        if (role === 'system') {
          newContent = version.content;
        }
        
        // 变量替换
        if (variablePrefix && variableSuffix) {
          const escapedPrefix = escapeRegExp(variablePrefix);
          const escapedSuffix = escapeRegExp(variableSuffix);
          
          variables.forEach(v => {
            try {
              const regex = new RegExp(`${escapedPrefix}\\s*${escapeRegExp(v)}\\s*${escapedSuffix}`, 'g');
              newContent = newContent.replace(regex, variableValues[v] || '');
            } catch (e) {
              console.error('Replace error:', e);
            }
          });
        }
        
        return { role, content: newContent };
      });
      
      try {
        let fullResponse = '';
        
        const abort = apiService.testPromptStream(
          apiMessages,
          (text) => {
            fullResponse += text;
            setCompareResponses(prev => ({ ...prev, [versionId]: fullResponse }));
          },
          (error) => {
            console.error(`Stream error for version ${versionId}:`, error);
            setCompareResponses(prev => ({ 
              ...prev, 
              [versionId]: `生成出错: ${error}` 
            }));
          },
          () => {
            setCompareLoading(prev => ({ ...prev, [versionId]: false }));
          },
          modelSettings
        );
        
        // 存储abort函数以便后续取消
        if (abort) {
          // 可以在这里存储abort函数，如果需要取消功能
        }
      } catch (error) {
        console.error(`Test error for version ${versionId}:`, error);
        setCompareResponses(prev => ({ 
          ...prev, 
          [versionId]: `测试出错: ${error}` 
        }));
        setCompareLoading(prev => ({ ...prev, [versionId]: false }));
      }
    });
  };

  const handleTest = async () => {
    if (loading) {
        // Stop generation
        if (streamAbort) {
            streamAbort();
            setStreamAbort(null);
        }
        setLoading(false);
        return;
    }

    setLoading(true);
    setResponse('');
    
    // Replace variables
    const currentPromptContent = getCurrentPromptContent();
    const apiMessages = messages.map(({ role, content }) => {
      let newContent = content;
      
      // 如果是系统提示词，使用当前选中的版本内容
      if (role === 'system' && currentPromptContent) {
        newContent = currentPromptContent;
      }
      
      if (variablePrefix && variableSuffix) {
          const escapedPrefix = escapeRegExp(variablePrefix);
          const escapedSuffix = escapeRegExp(variableSuffix);
          
          variables.forEach(v => {
            try {
                const regex = new RegExp(`${escapedPrefix}\\s*${escapeRegExp(v)}\\s*${escapedSuffix}`, 'g');
                newContent = newContent.replace(regex, variableValues[v] || '');
            } catch (e) {
                console.error('Replace error:', e);
            }
          });
      }
      return { role, content: newContent };
    });
    
    // Prepare request options (passing model settings if supported by API service wrapper)
    const abort = apiService.testPromptStream(
      apiMessages,
      (text) => {
        setResponse(prev => prev + text);
      },
      (error) => {
        console.error('Stream error:', error);
        setLoading(false);
        setStreamAbort(null);
        alert('生成出错: ' + error);
      },
      () => {
          setLoading(false);
          setStreamAbort(null);
      },
      modelSettings // Passing settings
    );
    
    setStreamAbort(() => abort);
  };

  const handleVersionSelect = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    }
  };

  const startCompare = () => {
    if (selectedVersions.length === 2) {
      setCompareMode(true);
      setCurrentCompareIndex(0);
      setShowVersionSelector(false);
    }
  };

  // 切换对比版本
  const switchCompareVersion = () => {
    const newIndex = currentCompareIndex === 0 ? 1 : 0;
    setCurrentCompareIndex(newIndex);
    
    // 获取新版本的信息
    const newVersionId = selectedVersions[newIndex];
    const newVersion = availableVersions.find(v => v.id === newVersionId);
    
    // 更新系统消息为当前版本的提示词内容
    if (newVersion) {
      const updatedMessages = messages.map(msg => 
        msg.role === 'system' 
          ? { ...msg, content: newVersion.content }
          : msg
      );
      setMessages(updatedMessages);
      
      // 清空当前测试结果，让用户重新测试新版本
      setResponse('');
    }
  };

  const getCurrentComparePrompt = () => {
    if (!compareMode || selectedVersions.length !== 2) return null;
    return availableVersions.find(v => v.id === selectedVersions[currentCompareIndex]);
  };

  // 根据当前模式获取要使用的提示词内容
  const getCurrentPromptContent = () => {
    const comparePrompt = getCurrentComparePrompt();
    if (comparePrompt) {
      return comparePrompt.content;
    }
    // 默认模式：使用messages中的系统提示词
    const systemMessage = messages.find(m => m.role === 'system');
    return systemMessage?.content || '';
  };

  // 退出对比模式
  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedVersions([]);
    setCurrentCompareIndex(0);
    setShowVersionSelector(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">提示词测试</h1>
            </div>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
            
            <div className="flex items-center space-x-2">
              {/* Version Compare Button */}
              <div className="relative">
                <button
                  onClick={() => setShowVersionSelector(!showVersionSelector)}
                  className={`px-3 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
                    showVersionSelector
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title="版本对比"
                >
                  <GitCompare className="w-4 h-4" />
                  <span className="text-sm">版本对比</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showVersionSelector && (
                  <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-80 z-20">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">选择版本对比</h3>
                      <button onClick={() => setShowVersionSelector(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableVersions.map((version) => (
                        <div key={version.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedVersions.includes(version.id)}
                            onChange={() => handleVersionSelect(version.id)}
                            disabled={!selectedVersions.includes(version.id) && selectedVersions.length >= 2}
                            className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{version.version}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(version.created_at).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">已选择 {selectedVersions.length}/2</span>
                      <button
                        onClick={startCompare}
                        disabled={selectedVersions.length !== 2}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedVersions.length === 2
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        开始对比
                      </button>
                    </div>
                  </div>
                )}
                {showVersionSelector && (
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowVersionSelector(false)}
                  />
                )}
              </div>

              {/* Model Settings Button */}
              <div className="relative">
                <button
                    onClick={() => setShowModelSettings(!showModelSettings)}
                    className={`p-2 rounded-lg border transition-colors ${
                        showModelSettings
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title="模型设置"
                >
                    <Settings className="w-5 h-5" />
                </button>
                {showModelSettings && (
                    <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-72 z-20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">模型参数设置</h3>
                            <button onClick={() => setShowModelSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">供应商 (Provider)</label>
                                <select
                                    value={modelSettings.provider}
                                    onChange={(e) => {
                                        const newProvider = e.target.value as ProviderType;
                                        setModelSettings({
                                            ...modelSettings,
                                            provider: newProvider,
                                            model: PROVIDERS[newProvider].model
                                        });
                                    }}
                                    className="w-full text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500"
                                >
                                    {Object.entries(PROVIDERS).map(([key, config]) => (
                                        <option key={key} value={key}>{config.displayName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">模型 (Model)</label>
                                <input
                                    type="text"
                                    value={modelSettings.model}
                                    onChange={(e) => setModelSettings({...modelSettings, model: e.target.value})}
                                    className="w-full text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 mb-2"
                                    placeholder="输入模型名称..."
                                />
                                <div className="flex flex-wrap gap-2">
                                    {PROVIDERS[modelSettings.provider as ProviderType]?.suggestedModels.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setModelSettings({...modelSettings, model: m})}
                                            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                                                modelSettings.model === m
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-medium'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">随机性 (Temperature)</label>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{modelSettings.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={modelSettings.temperature}
                                    onChange={(e) => setModelSettings({...modelSettings, temperature: parseFloat(e.target.value)})}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">核采样 (Top P)</label>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{modelSettings.topP}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={modelSettings.topP}
                                    onChange={(e) => setModelSettings({...modelSettings, topP: parseFloat(e.target.value)})}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">最大Token数</label>
                                <input
                                    type="number"
                                    value={modelSettings.maxTokens}
                                    onChange={(e) => setModelSettings({...modelSettings, maxTokens: parseInt(e.target.value)})}
                                    className="w-full text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {showModelSettings && (
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowModelSettings(false)}
                    />
                )}
              </div>

              {/* Cost Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowCostSettings(!showCostSettings)}
                  className="flex flex-col items-end px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                  title="点击设置模型单价"
                >
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-2">
                    <Calculator className="w-3 h-3" />
                    <span>Tokens: {tokenCount}</span>
                  </div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    ≈ ¥{cost.toFixed(5)}
                  </div>
                </button>

                {showCostSettings && (
                  <div className="absolute top-full right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-64 z-20">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">模型价格设置 (每1k tokens)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">输入价格 (Input)</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs">¥</span>
                          <input
                            type="number"
                            step="0.001"
                            value={inputPrice}
                            onChange={(e) => setInputPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">输出价格 (Output)</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs">¥</span>
                          <input
                            type="number"
                            step="0.001"
                            value={outputPrice}
                            onChange={(e) => setOutputPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 text-center">
                      点击外部关闭设置
                    </div>
                  </div>
                )}
                {showCostSettings && (
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowCostSettings(false)}
                  />
                )}
              </div>

              {!compareMode && (
                <button
                  onClick={handleTest}
                  className={`px-4 py-2 rounded-lg flex items-center font-medium transition-all ${
                    loading
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {loading ? (
                    <>
                      <StopCircle className="w-4 h-4 mr-2" />
                      停止生成
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      开始测试
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full bg-gray-50 dark:bg-gray-900">
        {compareMode ? (
          <CompareModeView
            selectedVersions={selectedVersions}
            availableVersions={availableVersions}
            currentCompareIndex={currentCompareIndex}
            onSwitchVersion={switchCompareVersion}
            onExitCompare={exitCompareMode}
            messages={messages}
            copied={copied}
            handleCopy={handleCopy}
            handleCompareTest={handleCompareTest}
            setMessages={setMessages}
            variableValues={variableValues}
            setVariableValues={setVariableValues}
            variables={variables}
            compareResponses={compareResponses}
            compareLoading={compareLoading}
            setCompareResponses={setCompareResponses}
          />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
          {/* Left Column: Chat Config */}
          <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">对话消息配置</h2>
              <div className="space-x-2">
                <button
                    onClick={() => addMessage('user')}
                    className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                >
                    + 用户
                </button>
                <button
                    onClick={() => addMessage('assistant')}
                    className="text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                >
                    + 助手
                </button>
              </div>
            </div>

            {/* Variables Section */}
            {(variables.length > 0 || true) && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-yellow-50/30 dark:bg-yellow-900/20">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2"></span>
                            变量设置
                        </h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">变量格式:</span>
                            <div className="flex items-center space-x-1">
                                <input
                                    type="text"
                                    value={variablePrefix}
                                    onChange={(e) => setVariablePrefix(e.target.value)}
                                    className="w-12 text-xs border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded py-0.5 px-1 text-center focus:ring-yellow-400 dark:focus:ring-yellow-500 focus:border-yellow-400"
                                    placeholder="前缀"
                                />
                                <span className="text-xs text-gray-400 dark:text-gray-500">变量名</span>
                                <input
                                    type="text"
                                    value={variableSuffix}
                                    onChange={(e) => setVariableSuffix(e.target.value)}
                                    className="w-12 text-xs border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded py-0.5 px-1 text-center focus:ring-yellow-400 dark:focus:ring-yellow-500 focus:border-yellow-400"
                                    placeholder="后缀"
                                />
                            </div>
                        </div>
                    </div>
                    {variables.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {variables.map(v => (
                                <div key={v} className="flex items-center space-x-2">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[60px] text-right truncate" title={v}>{v}:</label>
                                    <input
                                        type="text"
                                        value={variableValues[v] || ''}
                                        onChange={(e) => setVariableValues({...variableValues, [v]: e.target.value})}
                                        placeholder={`输入 ${variablePrefix}${v}${variableSuffix} 的值...`}
                                        className="flex-1 text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 py-1.5"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                            未检测到变量。尝试在提示词中使用 {variablePrefix}变量名{variableSuffix}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="messages">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {messages.map((msg, index) => (
                        <Draggable key={msg.id} draggableId={msg.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white dark:bg-gray-700 border rounded-lg p-3 transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg border-indigo-300 dark:border-indigo-600 ring-1 ring-indigo-200 dark:ring-indigo-700' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                    msg.role === 'system' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                    msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  }`}>
                                    {msg.role}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeMessage(msg.id)}
                                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                  title="删除消息"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                value={msg.content}
                                onChange={(e) => updateMessage(msg.id, e.target.value)}
                                placeholder={`输入${msg.role === 'system' ? '系统提示词' : msg.role === 'user' ? '用户消息' : '助手消息'}...`}
                                className="w-full text-sm border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 min-h-[80px] resize-y placeholder-gray-400 dark:placeholder-gray-500"
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>

          {/* Right Column: Response */}
          <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">模型响应</h2>
              <button
                onClick={handleCopy}
                disabled={!response}
                className={`p-1.5 rounded-md transition-all ${
                    copied
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                } ${!response ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="复制响应"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
              {response ? (
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                        code({node, inline, className, children, ...props}: any) {
                            return !inline ? (
                                <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 dark:text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                                    <code {...props} className={className}>
                                        {children}
                                    </code>
                                </pre>
                            ) : (
                                <code {...props} className="bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm font-mono">
                                    {children}
                                </code>
                            )
                        }
                    }}
                  >
                    {response}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  {loading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mb-2"></div>
                        <p>正在生成响应...</p>
                    </div>
                  ) : (
                    <>
                      <Play className="w-12 h-12 mb-2 opacity-20" />
                      <p>点击"开始测试"查看效果</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  </div>
  );
};

const CompareModeView: React.FC<CompareModeViewProps> = ({
  selectedVersions,
  availableVersions,
  currentCompareIndex,
  onSwitchVersion,
  onExitCompare,
  messages,
  copied,
  handleCopy,
  handleCompareTest,
  setMessages,
  variableValues,
  setVariableValues,
  variables,
  compareResponses,
  compareLoading,
  setCompareResponses
}) => {
    const currentVersion = availableVersions.find(v => v.id === selectedVersions[currentCompareIndex]);
    const version1 = availableVersions.find(v => v.id === selectedVersions[0]);
    const version2 = availableVersions.find(v => v.id === selectedVersions[1]);

    // 获取当前版本的响应
    const currentResponse = compareResponses[selectedVersions[currentCompareIndex]] || '';

    // 添加清空函数
    const clearAllResponses = () => {
      setCompareResponses({});
    };

    // 当版本切换时，更新系统消息
    useEffect(() => {
      if (currentVersion) {
        const updatedMessages = messages.map(msg => 
          msg.role === 'system' 
            ? { ...msg, content: currentVersion.content }
            : msg
        );
        setMessages(updatedMessages);
      }
    }, [currentCompareIndex, currentVersion]);

  // 更新消息内容
  const updateMessage = (index: number, content: string) => {
    const newMessages = [...messages];
    newMessages[index].content = content;
    setMessages(newMessages);
  };

  // 更新系统消息内容
  const updateSystemMessage = (content: string) => {
    const updatedMessages = messages.map(msg => 
      msg.role === 'system' 
        ? { ...msg, content: content }
        : msg
    );
    setMessages(updatedMessages);
  };

  // 添加消息
  const addMessage = () => {
    const newMessage: Message = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      content: '' 
    };
    setMessages([...messages, newMessage]);
  };

  // 删除消息
  const deleteMessage = (index: number) => {
    if (messages.length > 1) {
      const newMessages = messages.filter((_, i) => i !== index);
      setMessages(newMessages);
    }
  };

  return (
    <div className="min-h-full">
      {/* 对比模式头部 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">多版本效果对比</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">当前测试:</span>
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm font-medium">
                {currentVersion?.version}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* 版本切换按钮 - 移到更显眼的位置并优化样式 */}
            <button
              onClick={onSwitchVersion}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 font-medium"
              title="切换到另一个版本"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>切换版本</span>
            </button>
            <button
              onClick={onExitCompare}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              退出对比
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>对比版本:</span>
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            {availableVersions.find(v => v.id === selectedVersions[0])?.version}
          </span>
          <span className="text-gray-400 dark:text-gray-500">vs</span>
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
            {availableVersions.find(v => v.id === selectedVersions[1])?.version}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
        {/* 左侧: 对话配置 */}
        <div className="xl:col-span-2 space-y-6">
          {/* 提示词内容显示 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">当前版本提示词</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentVersion?.version}</p>
            </div>
            <div className="p-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                  {currentVersion?.content || '无内容'}
                </pre>
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-medium">提示：</span>
                  系统消息已自动替换为当前版本的提示词内容
                </p>
              </div>
            </div>
          </div>

          {/* 对话消息 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">对话配置</h3>
              <button
                onClick={addMessage}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                添加消息
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <select
                      value={message.role}
                      onChange={(e) => {
                        const newMessages = [...messages];
                        newMessages[index].role = e.target.value as 'system' | 'user' | 'assistant';
                        setMessages(newMessages);
                      }}
                      className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                    >
                      <option value="system">系统</option>
                      <option value="user">用户</option>
                      <option value="assistant">助手</option>
                    </select>
                    {messages.length > 1 && (
                      <button
                        onClick={() => deleteMessage(index)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <textarea
                    value={message.content}
                    onChange={(e) => updateMessage(index, e.target.value)}
                    placeholder="输入消息内容..."
                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md resize-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧: 变量和测试 */}
        <div className="space-y-6">
          {/* 变量替换 */}
          {variables.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">变量替换</h3>
              </div>
              <div className="p-4 space-y-3">
                {variables.map((variable) => (
                  <div key={variable}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {variable}
                    </label>
                    <input
                      type="text"
                      value={variableValues[variable] || ''}
                      onChange={(e) => setVariableValues({ ...variableValues, [variable]: e.target.value })}
                      placeholder={`输入${variable}的值`}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 测试控制 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">测试控制</h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={handleCompareTest}
                disabled={Object.values(compareLoading).some(Boolean)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {Object.values(compareLoading).some(Boolean) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>并行测试中...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>同时测试两个版本</span>
                  </>
                )}
              </button>
              <button
                  onClick={clearAllResponses}
                  disabled={Object.keys(compareResponses || {}).length === 0}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                清空所有响应
              </button>
            </div>
          </div>

          {/* 对比结果 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                  对比结果 - {currentCompareIndex === 0 ? version1?.version : version2?.version}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {currentCompareIndex === 0 ? '版本 A' : '版本 B'}
                  </span>
                  <button
                    onClick={handleCopy}
                    disabled={!currentResponse}
                    className={`p-1.5 rounded-md transition-all ${
                      copied
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                    } ${!currentResponse ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="复制响应"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>


              {/* 测试状态指示器 */}
              <div className="flex space-x-2 text-xs">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                  compareLoading[selectedVersions[0]]
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : compareResponses[selectedVersions[0]]
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    compareLoading[selectedVersions[0]] ? 'bg-yellow-400 animate-pulse' :
                    compareResponses[selectedVersions[0]] ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                  <span>{version1?.version}</span>
                  {compareLoading[selectedVersions[0]] && <span>测试中...</span>}
                </div>

                <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                  compareLoading[selectedVersions[1]]
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : compareResponses[selectedVersions[1]]
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    compareLoading[selectedVersions[1]] ? 'bg-yellow-400 animate-pulse' :
                    compareResponses[selectedVersions[1]] ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                  <span>{version2?.version}</span>
                  {compareLoading[selectedVersions[1]] && <span>测试中...</span>}
                </div>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-64">
              {currentResponse ? (
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        return !inline ? (
                          <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 dark:text-gray-100 p-3 rounded-lg overflow-x-auto my-3 text-sm">
                            <code {...props} className={className}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code {...props} className="bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {currentResponse}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-8">
                  <Play className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">点击"同时测试两个版本"查看对比效果</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};