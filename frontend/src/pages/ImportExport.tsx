import React, { useState, useEffect } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
}

const ImportExport: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportProject, setExportProject] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await apiService.getProjects();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setLoading(true);

    try {
      const result = await apiService.importData(importFile, importFile.name.endsWith('.csv') ? 'csv' : 'json');
      
      setImportResult({
        success: result.success,
        message: result.message,
        imported: result.imported || 0,
        skipped: result.skipped || 0,
        errors: result.errors || []
      });
    } catch (error: any) {
      setImportResult({
        success: false,
        message: '导入失败',
        imported: 0,
        skipped: 0,
        errors: [error.message || '网络错误']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      let projectIds: string[] = [];
      if (exportProject === 'all') {
        projectIds = projects.map(p => p.id);
      } else {
        projectIds = [exportProject];
      }

      const blob = await apiService.exportData(projectIds, exportFormat);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-purple-200 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            返回首页
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <div className="p-2 bg-white/10 rounded-lg mr-3 backdrop-blur-sm">
                  <RefreshCw className="w-6 h-6 text-purple-300" />
                </div>
                <h1 className="text-3xl font-bold">导入导出</h1>
              </div>
              <p className="text-purple-200 max-w-2xl text-lg leading-relaxed ml-12">
                批量导入或导出您的提示词数据，轻松实现数据迁移与备份。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('import')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                  activeTab === 'import'
                    ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Upload className="w-4 h-4 mr-2" />
                  导入数据
                </div>
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors ${
                  activeTab === 'export'
                    ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Download className="w-4 h-4 mr-2" />
                  导出数据
                </div>
              </button>
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'import' && (
              <div className="space-y-8">
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-bold mb-2">导入说明：</p>
                      <ul className="space-y-1.5 text-blue-700 list-disc list-inside">
                        <li>支持 JSON 和 CSV 格式文件</li>
                        <li>导入时会自动检测重复项目</li>
                        <li>已存在的项目可以选择跳过或更新</li>
                        <li>建议先导出备份现有数据</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-all group">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <FileText className="w-8 h-8 text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </div>
                  <p className="text-gray-900 font-medium mb-2">拖拽文件到此处，或点击选择文件</p>
                  <p className="text-gray-500 text-sm mb-6">支持 .json, .csv 格式</p>
                  
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="inline-flex items-center px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-all shadow-sm hover:shadow font-medium"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </label>
                  {importFile && (
                    <div className="mt-6 flex items-center justify-center text-sm text-purple-700 bg-purple-50 py-2 px-4 rounded-lg inline-block">
                      <FileText className="w-4 h-4 mr-2 inline" />
                      已选择: <span className="font-semibold">{importFile.name}</span>
                    </div>
                  )}
                </div>

                {importFile && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={handleImport}
                      disabled={loading}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium text-lg flex items-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          正在导入...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          开始导入
                        </>
                      )}
                    </button>
                  </div>
                )}

                {importResult && (
                  <div className={`border rounded-xl p-5 animate-fade-in ${
                    importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start">
                      {importResult.success ? (
                        <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-bold text-lg mb-2 ${
                          importResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {importResult.message}
                        </p>
                        {importResult.success && (
                          <div className="mt-2 text-sm text-green-700 bg-white/50 rounded-lg p-3 inline-block border border-green-100">
                            <p className="font-medium">成功导入: {importResult.imported} 个项目</p>
                            <p className="text-green-600">跳过重复: {importResult.skipped} 个项目</p>
                          </div>
                        )}
                        {importResult.errors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-bold text-red-800 mb-1">错误详情：</p>
                            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside bg-white/50 rounded-lg p-3 border border-red-100">
                              {importResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-8">
                <div className="bg-green-50/80 border border-green-100 rounded-xl p-5">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-bold mb-2">导出说明：</p>
                      <ul className="space-y-1.5 text-green-700 list-disc list-inside">
                        <li>支持 JSON 和 CSV 格式导出</li>
                        <li>JSON 格式包含完整的项目结构</li>
                        <li>CSV 格式适合在表格软件中查看</li>
                        <li>可以选择导出特定项目或全部数据</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 max-w-lg mx-auto">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-4">
                      导出格式
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                        exportFormat === 'json' 
                          ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500' 
                          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          value="json"
                          checked={exportFormat === 'json'}
                          onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                          className="sr-only"
                        />
                        <span className="font-medium">JSON 格式</span>
                      </label>
                      <label className={`flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                        exportFormat === 'csv' 
                          ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500' 
                          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          value="csv"
                          checked={exportFormat === 'csv'}
                          onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                          className="sr-only"
                        />
                        <span className="font-medium">CSV 格式</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-4">
                      导出范围
                    </label>
                    <select
                      value={exportProject}
                      onChange={(e) => setExportProject(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="all">所有项目</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleExport}
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium text-lg flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        正在导出...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        开始导出
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
