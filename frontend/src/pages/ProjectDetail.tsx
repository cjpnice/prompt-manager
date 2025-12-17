import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft, ArrowRightLeft, Tag as TagIcon, Calendar, FileText, Trash2, Grid, ChevronDown, ChevronRight, FolderOpen, MoreHorizontal, Download } from 'lucide-react';
import { apiService } from '../services/api';
import { Project, Prompt } from '../types/models';
import { CreatePromptModal } from '../components/CreatePromptModal';
import { PromptCard } from '../components/PromptCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [collapsedCategories, setCollapseCategories] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (id) {
      loadProject();
      loadPrompts();
    }
  }, [id]);

  const promptCount = React.useMemo(() => {
    if (!project?.prompts) return 0;
    const uniqueNames = new Set(project.prompts.map(p => p.name));
    return uniqueNames.size;
  }, [project?.prompts]);

  const loadProject = async () => {
    try {
      const projectData = await apiService.getProject(id!);
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPrompts(id!);
      setPrompts(response.data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryCount = React.useMemo(() => {
    if (!prompts) return 0;
    const uniqueCategories = new Set(prompts.map(p => p.category?.trim() || '未分类'));
    return uniqueCategories.size;
  }, [prompts]);

  const handleExportYAML = async () => {
    try {
      const yamlData = await apiService.exportProject(id!, 'yaml');
      const blob = new Blob([yamlData], { type: 'application/x-yaml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name}_prompts.yaml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export YAML:', error);
      alert('导出失败，请重试');
    }
  };

  const handleCreatePrompt = async (data: { name: string; content: string; tag_ids?: string[]; category?: string; description?: string }) => {
    try {
      const newPrompt = await apiService.createPrompt(id!, data);
      setPrompts([newPrompt, ...prompts]);
    } catch (error) {
      console.error('Failed to create prompt:', error);
      throw error;
    }
  };

  const handlePromptClick = (prompt: Prompt) => {
    navigate(`/version/${prompt.id}`);
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByCategory: Record<string, Prompt[]> = filteredPrompts.reduce((acc, p) => {
    const key = (p.category && p.category.trim()) ? p.category.trim() : '未分类';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, Prompt[]>);

  const toggleCategory = (category: string) => {
    setCollapseCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const pickLatestByName = (list: Prompt[]) => {
    const map = new Map<string, Prompt>();
    for (const p of list) {
      const key = p.name || '未命名';
      const existing = map.get(key);
      if (!existing) {
        map.set(key, p);
      } else {
        const a = new Date(existing.created_at).getTime();
        const b = new Date(p.created_at).getTime();
        if (b > a) map.set(key, p);
      }
    }
    return Array.from(map.values());
  };
  const groupedEntries = Object.entries(groupedByCategory).sort((a, b) => {
    // 保证“未分类”在最后
    if (a[0] === '未分类') return 1;
    if (b[0] === '未分类') return -1;
    return a[0].localeCompare(b[0], 'zh-CN');
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-indigo-200 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            返回项目列表
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <div className="p-2 bg-white/10 rounded-lg mr-3 backdrop-blur-sm">
                  <FolderOpen className="w-6 h-6 text-indigo-300" />
                </div>
                <h1 className="text-3xl font-bold">{project.name}</h1>
              </div>
              <p className="text-indigo-200 max-w-2xl text-lg leading-relaxed ml-12">
                {project.description || '暂无项目描述'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 flex items-center">
            <div className="p-3 bg-blue-50 rounded-xl mr-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">总提示词数</p>
              <p className="text-2xl font-bold text-gray-900">{promptCount}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 flex items-center">
            <div className="p-3 bg-green-50 rounded-xl mr-4">
              <Grid className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">类别数</p>
              <p className="text-2xl font-bold text-gray-900">{categoryCount}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 flex items-center">
            <div className="p-3 bg-purple-50 rounded-xl mr-4">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">创建时间</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(project.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索版本、内容或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => navigate('/import-export')}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all shadow-sm"
                title="导入/导出数据"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200"></div>
              <button
                onClick={handleExportYAML}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all shadow-sm"
                title="导出为 YAML"
              >
                <Download className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200"></div>
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: '删除项目',
                    message: '确定删除该项目及其所有提示词版本吗？此操作无法撤销。',
                    onConfirm: async () => {
                      try {
                        await apiService.deleteProject(id!);
                        navigate('/');
                      } catch (error) {
                        console.error('删除项目失败:', error);
                        alert('删除失败，请重试');
                      }
                      closeConfirmDialog();
                    },
                  });
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-md transition-all shadow-sm"
                title="删除项目"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              新建版本
            </button>
          </div>
        </div>

        {/* Prompts List */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-500">正在加载提示词...</p>
            </div>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm ? '没有找到匹配的提示词版本' : '还没有提示词'}
            </h3>
            <p className="text-gray-500 mb-8">
              {searchTerm ? '尝试使用不同的搜索词' : '创建您的第一个提示词版本来开始管理'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center mx-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                创建提示词版本
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEntries.map(([category, items]) => (
              <div key={category} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center">
                    <div className={`mr-3 p-1 rounded-md transition-transform duration-200 ${collapsedCategories.has(category) ? '' : 'rotate-90'}`}>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">
                      {category}
                    </h2>
                    <span className="ml-3 px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-500 shadow-sm">
                      {pickLatestByName(items).length}
                    </span>
                  </div>
                </button>
                
                {!collapsedCategories.has(category) && (
                  <div className="p-6 bg-white">
                    <div className="grid grid-cols-1 gap-4">
                      {pickLatestByName(items).map((prompt) => (
                        <PromptCard
                          key={prompt.id}
                          prompt={prompt}
                          onClick={() => handlePromptClick(prompt)}
                          onDelete={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: '删除提示词',
                              message: '确定删除该提示词当前版本吗？此操作无法撤销。',
                              onConfirm: async () => {
                                try {
                                  await apiService.deletePrompt(prompt.id);
                                  await loadPrompts();
                                } catch (error) {
                                  console.error('删除提示词失败:', error);
                                  alert('删除失败，请重试');
                                }
                                closeConfirmDialog();
                              },
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Prompt Modal */}
        <CreatePromptModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreatePrompt}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="确认删除"
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirmDialog}
        />
      </div>
    </div>
  );
};
