import React, { useState, useEffect } from 'react';
import { Search, Plus, FolderOpen, Tag as TagIcon, Upload, Folder, BookOpen, Sparkles, Command, Settings } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-900 text-white pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center p-2 bg-indigo-800/50 rounded-full mb-6 backdrop-blur-sm border border-indigo-700/50">
              <Sparkles className="w-4 h-4 text-yellow-300 mr-2" />
              <span className="text-sm font-medium text-indigo-100">高效管理您的 AI 提示词资产</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              Prompt Manager
            </h1>
            <p className="text-lg text-indigo-200 mb-10 leading-relaxed">
              集中化管理、版本控制与智能优化，让每一个提示词都发挥最大价值。
              支持多版本对比、在线测试、AI 辅助优化与标签分类。
            </p>

            {/* 搜索框 */}
            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute inset-0 bg-blue-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-200"></div>
              <div className="relative flex items-center bg-white rounded-xl shadow-2xl p-2">
                <Search className="ml-4 text-gray-400 w-6 h-6" />
                <input
                  type="text"
                  placeholder="搜索项目、描述或关键词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-transparent border-none focus:ring-0 text-lg"
                />

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Overlapping the Hero */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 w-full pb-12">
        
        {/* Quick Actions Toolbar */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => navigate('/tags')}
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap"
            >
              <TagIcon className="w-4 h-4 mr-2" />
              标签管理
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <button
              onClick={() => navigate('/categories')}
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap"
            >
              <Folder className="w-4 h-4 mr-2" />
              分类管理
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <button
              onClick={() => navigate('/import-export')}
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-2" />
              导入导出
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <button
              onClick={() => navigate('/tutorial')}
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              集成教程
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all font-medium text-sm whitespace-nowrap"
            >
              <Settings className="w-4 h-4 mr-2" />
              系统设置
            </button>
          </div>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            新建项目
          </button>
        </div>

        {/* Project Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FolderOpen className="w-5 h-5 mr-2 text-indigo-600" />
            我的项目
            <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredProjects.length}
            </span>
          </h2>
          
          {/* View Options (Placeholder) */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {/* Can add sort/filter dropdowns here later */}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-500">正在加载项目数据...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm ? '没有找到匹配的项目' : '还没有创建任何项目'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {searchTerm ? '尝试使用不同的关键词搜索，或者清除搜索条件。' : '创建您的第一个项目，开始高效管理 AI 提示词版本。'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center mx-auto font-medium text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                立即创建项目
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
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
      <footer className="mt-auto py-8 text-center text-gray-400 text-sm">
        <p>© 2025 Prompt Manager. All rights reserved.</p>
      </footer>
    </div>
  );
};
