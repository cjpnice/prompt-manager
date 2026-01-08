import React, { useState, useEffect } from 'react';
import { Search, Plus, FolderOpen, Tag as TagIcon, Upload, Folder, BookOpen, Sparkles, Settings, TrendingUp, Clock, Zap, ArrowRight, LayoutGrid, List, Filter, MoreVertical, X } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiService } from '../services/api';
import { Project } from '../types/models';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'prompts'>('recent');
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
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (data: { name: string; description: string }) => {
    try {
      const newProject = await apiService.createProject(data);
      setProjects([newProject, ...projects]);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedProjects = React.useMemo(() => {
    const sorted = [...filteredProjects];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'prompts':
        return sorted.sort((a, b) => (b.prompts?.length || 0) - (a.prompts?.length || 0));
      default:
        return sorted;
    }
  }, [filteredProjects, sortBy]);

  const stats = React.useMemo(() => {
    const totalProjects = projects.length;
    const totalPrompts = projects.reduce((sum, p) => {
      const uniquePromptNames = new Set(p.prompts?.map(prompt => prompt.name) || []);
      return sum + uniquePromptNames.size;
    }, 0);

    // 统计7日内更新的提示词数（相同提示词不同版本算一个）
    const promptMap = new Map<string, { createdAt: string }>(); // promptName -> latest prompt info

    projects.forEach(project => {
      project.prompts?.forEach(prompt => {
        const existing = promptMap.get(prompt.name);
        // 如果该提示词名称不存在，或者当前版本更新，则更新记录
        if (!existing || new Date(prompt.created_at) > new Date(existing.createdAt)) {
          promptMap.set(prompt.name, {
            createdAt: prompt.created_at
          });
        }
      });
    });

    // 计算这些去重后的提示词中，有多少是在7天内创建/更新的
    const recentPrompts = Array.from(promptMap.values()).filter(prompt => {
      const daysSinceUpdate = (Date.now() - new Date(prompt.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 7;
    }).length;

    return { totalProjects, totalPrompts, recentPrompts };
  }, [projects]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0xMnY2aC02di02aDZ6bS0xMiAwdjZoLTZ2LTZoNnptMTItMTJ2NmgtNnYtNmg2em0tMTIgMHY2aC02di02aDZ6bS0xMiAwdjZoLTZ2LTZoNnptMTItMTJ2NmgtNnYtNmg2em0tMTIgMHY2aC02di02aDZ6bS0xMiAwdjZoLTZ2LTZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20 shadow-lg">
              <Sparkles className="w-4 h-4 text-yellow-300 mr-2" />
              <span className="text-sm font-medium text-white/90">高效管理您的 AI 提示词资产</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-100">
                Prompt Manager
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-indigo-100 mb-12 leading-relaxed max-w-3xl mx-auto">
              集中化管理、版本控制与智能优化，让每一个提示词都发挥最大价值。
              <br className="hidden md:block" />
              支持多版本对比、在线测试、AI 辅助优化与标签分类。
            </p>

            {/* 搜索框 */}
            <div className="relative max-w-2xl mx-auto mb-12">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition duration-300"></div>
              <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-2">
                <div className="pl-4 pr-3">
                  <Search className="text-gray-400 w-6 h-6" />
                </div>
                <input
                  type="text"
                  placeholder="搜索项目、描述或关键词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-2 py-4 text-gray-900 placeholder-gray-400 bg-transparent border-none focus:ring-0 text-lg"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* 统计数据卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <FolderOpen className="w-8 h-8 text-blue-300" />
                  <span className="text-xs font-medium text-blue-200 bg-blue-500/30 px-2 py-1 rounded-full">总计</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stats.totalProjects}</div>
                <div className="text-sm text-indigo-200">项目总数</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <Zap className="w-8 h-8 text-yellow-300" />
                  <span className="text-xs font-medium text-yellow-200 bg-yellow-500/30 px-2 py-1 rounded-full">活跃</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stats.totalPrompts}</div>
                <div className="text-sm text-indigo-200">提示词数量</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <Clock className="w-8 h-8 text-green-300" />
                  <span className="text-xs font-medium text-green-200 bg-green-500/30 px-2 py-1 rounded-full">近期</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stats.recentPrompts}</div>
                <div className="text-sm text-indigo-200">7日内更新的提示词</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {/* Quick Actions Toolbar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-1 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => navigate('/tags')}
              className="flex items-center px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap group"
            >
              <TagIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              标签管理
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate('/categories')}
              className="flex items-center px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap group"
            >
              <Folder className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              分类管理
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate('/import-export')}
              className="flex items-center px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap group"
            >
              <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              导入导出
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate('/tutorial')}
              className="flex items-center px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap group"
            >
              <BookOpen className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              集成教程
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap group"
            >
              <Settings className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              系统设置
            </button>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            新建项目
          </button>
        </div>

        {/* Project Grid Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FolderOpen className="w-6 h-6 mr-3 text-indigo-600" />
              我的项目
              <span className="ml-3 text-sm font-normal text-gray-500 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1 rounded-full border border-indigo-100">
                {filteredProjects.length} 个项目
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-9">管理和组织您的所有提示词项目</p>
          </div>
          
          {/* View Options */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-indigo-100 text-indigo-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="网格视图"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-indigo-100 text-indigo-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="列表视图"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer text-sm font-medium"
              >
                <option value="recent">最近更新</option>
                <option value="name">名称排序</option>
                <option value="prompts">提示词数量</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <p className="text-gray-600 mt-4 font-medium">正在加载项目数据...</p>
            </div>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <FolderOpen className="h-12 w-12 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchTerm ? '没有找到匹配的项目' : '还没有创建任何项目'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              {searchTerm ? '尝试使用不同的关键词搜索，或者清除搜索条件。' : '创建您的第一个项目，开始高效管理 AI 提示词版本。'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center mx-auto font-medium text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                立即创建项目
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
          }>
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
                onDelete={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: '删除项目',
                    message: '确定删除该项目及其所有提示词版本吗？此操作无法撤销。',
                    onConfirm: async () => {
                      try {
                        await apiService.deleteProject(project.id);
                        setProjects(prev => prev.filter(p => p.id !== project.id));
                      } catch (error) {
                        console.error('删除项目失败:', error);
                        alert('删除失败，请重试');
                      }
                      closeConfirmDialog();
                    },
                  });
                }}
              />
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateProject}
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
      
      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500 text-sm border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-2">
          <p className="font-medium text-gray-600">© 2025 Prompt Manager. All rights reserved.</p>
          <p className="text-xs text-gray-400">高效管理您的 AI 提示词资产</p>
        </div>
      </footer>
    </div>
  );
};
