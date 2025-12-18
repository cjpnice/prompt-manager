import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Trash2, Play, GripVertical, StopCircle, Calculator, Copy, Settings, X, Check } from 'lucide-react';
import { apiService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { encode } from 'gpt-tokenizer';

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelSettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
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
    model: 'qwen-turbo',
    temperature: 0.7,
    topP: 0.8,
    maxTokens: 2000
  });
  const [copied, setCopied] = useState(false);
  const [variablePrefix, setVariablePrefix] = useState('{{');
  const [variableSuffix, setVariableSuffix] = useState('}}');

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
    const apiMessages = messages.map(({ role, content }) => {
      let newContent = content;
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">提示词测试</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Model Settings Button */}
              <div className="relative">
                <button
                    onClick={() => setShowModelSettings(!showModelSettings)}
                    className={`p-2 rounded-lg border transition-colors ${
                        showModelSettings 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="模型设置"
                >
                    <Settings className="w-5 h-5" />
                </button>
                {showModelSettings && (
                    <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-xl shadow-xl border border-gray-100 w-72 z-20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900">模型参数设置</h3>
                            <button onClick={() => setShowModelSettings(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">模型 (Model)</label>
                                <input
                                    type="text"
                                    value={modelSettings.model}
                                    onChange={(e) => setModelSettings({...modelSettings, model: e.target.value})}
                                    className="w-full text-sm border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                                    placeholder="输入模型名称..."
                                />
                                <div className="flex flex-wrap gap-2">
                                    {['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setModelSettings({...modelSettings, model: m})}
                                            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                                                modelSettings.model === m 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-medium' 
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-700">随机性 (Temperature)</label>
                                    <span className="text-xs text-gray-500">{modelSettings.temperature}</span>
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
                                    <label className="block text-xs font-medium text-gray-700">核采样 (Top P)</label>
                                    <span className="text-xs text-gray-500">{modelSettings.topP}</span>
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">最大Token数</label>
                                <input
                                    type="number"
                                    value={modelSettings.maxTokens}
                                    onChange={(e) => setModelSettings({...modelSettings, maxTokens: parseInt(e.target.value)})}
                                    className="w-full text-sm border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="flex flex-col items-end px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="点击设置模型单价"
                >
                  <div className="flex items-center text-xs text-gray-500 space-x-2">
                    <Calculator className="w-3 h-3" />
                    <span>Tokens: {tokenCount}</span>
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    ≈ ¥{cost.toFixed(5)}
                  </div>
                </button>
                
                {showCostSettings && (
                  <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-xl shadow-xl border border-gray-100 w-64 z-20">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">模型价格设置 (每1k tokens)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">输入价格 (Input)</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                          <input
                            type="number"
                            step="0.001"
                            value={inputPrice}
                            onChange={(e) => setInputPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">输出价格 (Output)</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                          <input
                            type="number"
                            step="0.001"
                            value={outputPrice}
                            onChange={(e) => setOutputPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
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
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
          {/* Left Column: Chat Config */}
          <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-700">对话消息配置</h2>
              <div className="space-x-2">
                <button 
                    onClick={() => addMessage('user')}
                    className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                >
                    + 用户
                </button>
                <button 
                    onClick={() => addMessage('assistant')}
                    className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                >
                    + 助手
                </button>
              </div>
            </div>
            
            {/* Variables Section */}
            {(variables.length > 0 || true) && (
                <div className="p-4 border-b border-gray-100 bg-yellow-50/30">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2"></span>
                            变量设置
                        </h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">变量格式:</span>
                            <div className="flex items-center space-x-1">
                                <input 
                                    type="text" 
                                    value={variablePrefix}
                                    onChange={(e) => setVariablePrefix(e.target.value)}
                                    className="w-12 text-xs border-gray-200 rounded py-0.5 px-1 text-center focus:ring-yellow-400 focus:border-yellow-400"
                                    placeholder="前缀"
                                />
                                <span className="text-xs text-gray-400">变量名</span>
                                <input 
                                    type="text" 
                                    value={variableSuffix}
                                    onChange={(e) => setVariableSuffix(e.target.value)}
                                    className="w-12 text-xs border-gray-200 rounded py-0.5 px-1 text-center focus:ring-yellow-400 focus:border-yellow-400"
                                    placeholder="后缀"
                                />
                            </div>
                        </div>
                    </div>
                    {variables.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {variables.map(v => (
                                <div key={v} className="flex items-center space-x-2">
                                    <label className="text-xs font-medium text-gray-600 min-w-[60px] text-right truncate" title={v}>{v}:</label>
                                    <input
                                        type="text"
                                        value={variableValues[v] || ''}
                                        onChange={(e) => setVariableValues({...variableValues, [v]: e.target.value})}
                                        placeholder={`输入 ${variablePrefix}${v}${variableSuffix} 的值...`}
                                        className="flex-1 text-sm border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 text-center py-2">
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
                              className={`bg-white border rounded-lg p-3 transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                    msg.role === 'system' ? 'bg-purple-100 text-purple-700' :
                                    msg.role === 'user' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {msg.role}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeMessage(msg.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  title="删除消息"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                value={msg.content}
                                onChange={(e) => updateMessage(msg.id, e.target.value)}
                                placeholder={`输入${msg.role === 'system' ? '系统提示词' : msg.role === 'user' ? '用户消息' : '助手消息'}...`}
                                className="w-full text-sm border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] resize-y"
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
          <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-700">模型响应</h2>
              <button
                onClick={handleCopy}
                disabled={!response}
                className={`p-1.5 rounded-md transition-all ${
                    copied 
                        ? 'bg-green-100 text-green-600' 
                        : 'hover:bg-gray-200 text-gray-500'
                } ${!response ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="复制响应"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {response ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                        code({node, inline, className, children, ...props}: any) {
                            return !inline ? (
                                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                                    <code {...props} className={className}>
                                        {children}
                                    </code>
                                </pre>
                            ) : (
                                <code {...props} className="bg-gray-100 text-red-500 px-1 py-0.5 rounded text-sm font-mono">
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
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  {loading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
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
      </div>
    </div>
  );
};