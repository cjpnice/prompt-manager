import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    aliyun_api_key: '',
    aliyun_api_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    aliyun_model: 'qwen3-max',
    aliyun_system_prompt: '',
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>

      <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">阿里云大模型配置</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API URL (兼容 OpenAI 接口地址)
                    </label>
                    <input
                      type="text"
                      value={formData.aliyun_api_url}
                      onChange={(e) => setFormData({ ...formData, aliyun_api_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      默认为阿里云百炼兼容接口，也可配置为其他 OpenAI 兼容接口。
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.aliyun_api_key}
                      onChange={(e) => setFormData({ ...formData, aliyun_api_key: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="sk-..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={formData.aliyun_model}
                      onChange={(e) => setFormData({ ...formData, aliyun_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="qwen-turbo"
                    />
                    <p className="text-sm text-gray-500 mt-1">默认: qwen-turbo</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认优化提示词 (System Prompt)
                    </label>
                    <textarea
                      value={formData.aliyun_system_prompt}
                      onChange={(e) => setFormData({ ...formData, aliyun_system_prompt: e.target.value })}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="你是一个专业的提示词优化助手..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      此提示词将作为系统指令，指导大模型如何优化用户的提示词。
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm hover:shadow transition-all disabled:opacity-50"
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
