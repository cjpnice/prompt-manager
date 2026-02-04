import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';

type ProviderType = 'aliyun' | 'deepseek' | 'doubao' | 'glm' | 'kimi';

interface ProviderConfig {
  name: string;
  displayName: string;
  api_url: string;
  model: string;
}

const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  aliyun: {
    name: 'aliyun',
    displayName: '阿里云',
    api_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
  },
  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    api_url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
  doubao: {
    name: 'doubao',
    displayName: '豆包',
    api_url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-pro-4k',
  },
  glm: {
    name: 'glm',
    displayName: 'GLM (智谱)',
    api_url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4',
  },
  kimi: {
    name: 'kimi',
    displayName: 'Kimi (月之暗面)',
    api_url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
  },
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Set<ProviderType>>(new Set(['aliyun']));
  const [formData, setFormData] = useState<Record<string, string>>({
    aliyun_api_key: '',
    aliyun_api_url: PROVIDERS.aliyun.api_url,
    aliyun_model: PROVIDERS.aliyun.model,
    aliyun_system_prompt: '',
    deepseek_api_key: '',
    deepseek_api_url: PROVIDERS.deepseek.api_url,
    deepseek_model: PROVIDERS.deepseek.model,
    doubao_api_key: '',
    doubao_api_url: PROVIDERS.doubao.api_url,
    doubao_model: PROVIDERS.doubao.model,
    glm_api_key: '',
    glm_api_url: PROVIDERS.glm.api_url,
    glm_model: PROVIDERS.glm.model,
    kimi_api_key: '',
    kimi_api_url: PROVIDERS.kimi.api_url,
    kimi_model: PROVIDERS.kimi.model,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const settings = await apiService.getSettings();
      setFormData(prev => ({
        ...prev,
        ...settings,
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.updateSettings(formData);
      alert('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = (provider: ProviderType) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  const renderProviderSection = (provider: ProviderType) => {
    const config = PROVIDERS[provider];
    const isExpanded = expandedProviders.has(provider);

    return (
      <div key={provider} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleProvider(provider)}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium text-gray-900 dark:text-white">{config.displayName}</span>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        
        {isExpanded && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API URL (兼容 OpenAI 接口地址)
              </label>
              <input
                type="text"
                value={formData[`${provider}_api_url`] || ''}
                onChange={(e) => setFormData({ ...formData, [`${provider}_api_url`]: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={config.api_url}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={formData[`${provider}_api_key`] || ''}
                onChange={(e) => setFormData({ ...formData, [`${provider}_api_key`]: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                模型名称
              </label>
              <input
                type="text"
                value={formData[`${provider}_model`] || ''}
                onChange={(e) => setFormData({ ...formData, [`${provider}_model`]: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={config.model}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">默认: {config.model}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-300 hover:text-white transition-colors mb-6 group"
              >
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                返回首页
              </button>

              <div className="flex items-center mb-2">
                <div className="p-2 bg-white/10 rounded-lg mr-3 backdrop-blur-sm">
                  <SettingsIcon className="w-6 h-6 text-gray-300" />
                </div>
                <h1 className="text-3xl font-bold">系统设置</h1>
              </div>
              <p className="text-gray-400 max-w-2xl text-lg leading-relaxed ml-12">
                配置全局系统参数和第三方服务集成。
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600 dark:border-gray-400"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">模型供应商配置</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  配置多个 AI 模型供应商的 API 信息。点击供应商名称展开或折叠配置面板。
                </p>
                <div className="space-y-3">
                  {(Object.keys(PROVIDERS) as ProviderType[]).map(renderProviderSection)}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">提示词优化配置</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    默认优化提示词 (System Prompt)
                  </label>
                  <textarea
                    value={formData.aliyun_system_prompt || ''}
                    onChange={(e) => setFormData({ ...formData, aliyun_system_prompt: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="你是一个专业的提示词优化助手..."
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    此提示词将作为系统指令，指导大模型如何优化用户的提示词。
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? '保存中...' : '保存设置'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
