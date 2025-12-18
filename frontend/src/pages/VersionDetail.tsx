import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCommit, Calendar, FileText, RotateCcw, Copy, Eye, Code, GitCompare, Edit, Save, Trash2, Clock, ArrowRightLeft, ChevronDown, Grid, Tag as TagIcon, Wand2, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { apiService } from '../services/api';
import { Prompt, Tag } from '../types/models';
import DiffViewer from '../components/DiffViewer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OptimizedPromptDialog } from '../components/OptimizedPromptDialog';

export const VersionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'source' | 'preview' | 'diff'>('split');
  const [copySuccess, setCopySuccess] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<Prompt | null>(null);
  const [allVersions, setAllVersions] = useState<Prompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [bumpType, setBumpType] = useState<'major' | 'patch'>('patch');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    original: string;
    optimized: string;
    isOpen: boolean;
  }>({
    original: '',
    optimized: '',
    isOpen: false,
  });

  const markdownComponents = {
    h1: ({ node, ...props }: any) => (
      <h1 {...props} className={clsx('text-2xl font-bold mt-4 mb-2', (props as any).className)} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 {...props} className={clsx('text-xl font-bold mt-3 mb-2', (props as any).className)} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 {...props} className={clsx('text-lg font-semibold mt-2 mb-2', (props as any).className)} />
    ),
    p: ({ node, ...props }: any) => (
      <p {...props} className={clsx('my-2 leading-7 text-gray-800', (props as any).className)} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul {...props} className={clsx('list-disc ml-6 my-2', (props as any).className)} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol {...props} className={clsx('list-decimal ml-6 my-2', (props as any).className)} />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote {...props} className={clsx('border-l-4 pl-4 my-2 text-gray-700', (props as any).className)} />
    ),
    hr: ({ node, ...props }: any) => (
      <hr {...props} className={clsx('my-4 border-gray-200', (props as any).className)} />
    ),
    a: ({ node, ...props }: any) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    ),
    div: ({ node, ...props }: any) => (
      <div {...props} className={clsx('my-2', (props as any).className)} />
    ),
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto">
        <table {...props} className={clsx('table-auto', (props as any).className)} />
      </div>
    ),
    code: ({ node, inline, className, children, ...props }: any) => (
      <code className={clsx(inline ? '' : 'block', className)} {...props}>
        {children}
      </code>
    ),
  } as any;

  const [allCategories, setAllCategories] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    if (id) {
      loadPrompt();
      loadTags();
      loadCategories();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const response = await apiService.getCategories();
      setAllCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await apiService.getTags();
      setAllTags(response.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadPrompt = async () => {
    try {
      setLoading(true);
      const promptData = await apiService.getPrompt(id!);
      setPrompt(promptData);
      setEditContent(promptData.content || '');
      setEditCategory(promptData.category || '');
      setEditDescription(promptData.description || '');
      setEditTagIds(promptData.tags?.map(t => t.id) || []);
      
      // 加载前一个版本用于对比
      if (promptData.project_id) {
        try {
          const response = await apiService.getPrompts(promptData.project_id);
          const versions = (response.data || []).filter((v: Prompt) => v.name === promptData.name);
          // 排序最新在前
          versions.sort((a: Prompt, b: Prompt) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setAllVersions(versions);
          const currentIndex = versions.findIndex((v: Prompt) => v.id === promptData.id);
          if (currentIndex >= 0 && currentIndex < versions.length - 1) {
            setPreviousVersion(versions[currentIndex + 1]);
          } else {
            setPreviousVersion(null);
          }
        } catch (error) {
          console.error('Failed to load previous version:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = async () => {
    if (prompt?.content) {
      try {
        await navigator.clipboard.writeText(prompt.content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy content:', error);
      }
    }
  };

  const handleRollback = async () => {
    if (!prompt) return;
    
    if (window.confirm('确定要回滚到这个版本吗？这将创建一个新的版本。')) {
      try {
        await apiService.rollbackPrompt(prompt.id);
        // 刷新当前页面或导航到项目页面
        navigate(`/project/${prompt.project_id}`);
      } catch (error) {
        console.error('Failed to rollback:', error);
        alert('回滚失败，请重试');
      }
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const handleSaveEdit = async () => {
    if (!prompt) return;
    try {
      const updated = await apiService.updatePrompt(prompt.id, {
        content: editContent,
        category: editCategory,
        description: editDescription,
        tag_ids: editTagIds,
        bump: bumpType,
      });
      setPrompt(updated);
      setIsEditing(false);
      // 如果创建了新版本（即内容发生变化），我们需要导航到新版本的页面
      if (updated.id !== prompt.id) {
        navigate(`/version/${updated.id}`);
      } else {
        // 如果只是元数据更新，重新加载当前版本
        await loadPrompt();
      }
    } catch (error) {
      console.error('Failed to update prompt:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async () => {
    if (!prompt) return;
    try {
      await apiService.deletePrompt(prompt.id);
      navigate(`/project/${prompt.project_id}`);
    } catch (error) {
      console.error('删除提示词失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleOptimize = async () => {
    if (!editContent.trim()) return;
    
    setOptimizationResult({
      original: editContent,
      optimized: '',
      isOpen: true,
    });
    setIsOptimizing(true);

    apiService.optimizePromptStream(
      editContent,
      (text) => {
        setOptimizationResult(prev => ({
          ...prev,
          optimized: prev.optimized + text
        }));
      },
      (error) => {
        console.error('Optimization failed:', error);
        alert('优化失败，请检查系统设置中的 API Key 配置');
        setIsOptimizing(false);
      }
    );
    setIsOptimizing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">未找到版本信息</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-300 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            返回上一页
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <div className="p-2 bg-white/10 rounded-lg mr-3 backdrop-blur-sm">
                  <GitCommit className="w-6 h-6 text-indigo-300" />
                </div>
                <h1 className="text-3xl font-bold flex items-center">
                  {prompt.name}
                  <div className="ml-4 relative">
                    <select
                      className="appearance-none bg-white/10 hover:bg-white/20 text-indigo-100 text-lg font-normal px-4 py-1.5 rounded-full border border-white/10 focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer pr-9 transition-colors"
                      value={prompt.id}
                      onChange={(e) => navigate(`/version/${e.target.value}`)}
                    >
                      {allVersions.length > 0 ? (
                        allVersions.map(v => (
                          <option key={v.id} value={v.id} className="text-gray-900">
                            v{v.version} {v.id === prompt.id ? '(当前)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value={prompt.id} className="text-gray-900">
                          v{prompt.version}
                        </option>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-indigo-200 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </h1>
              </div>
              <div className="flex items-center text-indigo-200 ml-12 space-x-4 text-sm">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatDateTime(prompt.created_at)}
                </span>
                <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
                <span>{prompt.project?.name || '未知项目'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/test-prompt/${prompt.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center shadow-md hover:shadow-lg border border-transparent"
              >
                <Play className="w-4 h-4 mr-2" />
                测试
              </button>
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center backdrop-blur-sm border border-white/10"
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? '取消编辑' : '编辑'}
              </button>
              <button
                onClick={handleCopyContent}
                className={`px-4 py-2 rounded-lg flex items-center transition-colors backdrop-blur-sm border border-white/10 ${
                  copySuccess 
                    ? 'bg-green-500/20 text-green-200 border-green-500/30' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Copy className="w-4 h-4 mr-2" />
                {copySuccess ? '已复制' : '复制内容'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-200 px-4 py-2 rounded-lg transition-colors flex items-center backdrop-blur-sm border border-red-500/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除版本"
        message="确定要删除该提示词版本吗？此操作无法撤销。"
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        {/* Stats & Meta Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <GitCommit className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">当前版本</p>
                <p className="text-lg font-bold text-gray-900">{prompt.version}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">创建时间</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDateTime(prompt.created_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">内容长度</p>
                <p className="text-lg font-bold text-gray-900">
                  {prompt.content.length} 字符
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-6">
            {prompt.category && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">分类:</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {prompt.category}
                </span>
              </div>
            )}
            
            {prompt.tags && prompt.tags.length > 0 && (
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">标签:</span>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 text-sm rounded-full text-white shadow-sm"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {prompt.description && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-yellow-800 text-sm">
              <span className="font-semibold mr-2">版本描述:</span>
              {prompt.description}
            </div>
          )}
        </div>

        {/* 差异对比区域 */}
        {!isEditing && viewMode === 'diff' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <GitCompare className="w-5 h-5 mr-2 text-indigo-600" />
                版本对比
              </h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">对比对象:</span>
                <select
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={previousVersion?.id || ''}
                  onChange={(e) => {
                    const target = allVersions.find(v => v.id === e.target.value) || null;
                    setPreviousVersion(target);
                    setViewMode('diff');
                  }}
                >
                  <option value="" disabled>请选择版本</option>
                  {allVersions.filter(v => v.id !== prompt.id).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} · v{v.version}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {previousVersion ? (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <DiffViewer oldText={previousVersion.content} newText={prompt.content} />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                暂无可对比版本，请在上方选择对比版本
              </div>
            )}
          </div>
        )}

        {/* 视图模式切换 */}
        {!isEditing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-6 inline-flex">
            <button
              onClick={() => setViewMode('split')}
              className={`px-4 py-2 rounded-lg flex items-center transition-all text-sm font-medium ${
                viewMode === 'split'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              双栏显示
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded-lg flex items-center transition-all text-sm font-medium ${
                viewMode === 'preview'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              仅预览
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-4 py-2 rounded-lg flex items-center transition-all text-sm font-medium ${
                viewMode === 'source'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Code className="w-4 h-4 mr-2" />
              仅源码
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`px-4 py-2 rounded-lg flex items-center transition-all text-sm font-medium ${
                viewMode === 'diff'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <GitCompare className="w-4 h-4 mr-2" />
              版本对比
            </button>
          </div>
        )}

        {/* 编辑区域 */}
        {isEditing && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8 animate-fade-in">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Edit className="w-5 h-5 mr-2 text-indigo-600" />
                编辑提示词
              </h3>
            </div>
            <div className="space-y-8">
              {/* Metadata Panel */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 gap-6">
                  {/* Category & Tags Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                        <Grid className="w-4 h-4 mr-2 text-indigo-500" />
                        分类
                      </label>
                      {allCategories.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 inline-block">
                          暂无可用分类
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setEditCategory(cat.name)}
                              className={`px-4 py-1.5 text-sm rounded-lg transition-all shadow-sm ${
                                editCategory === cat.name 
                                  ? 'text-white ring-2 ring-offset-1 ring-indigo-500' 
                                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              style={{ backgroundColor: editCategory === cat.name ? cat.color : undefined }}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                        <TagIcon className="w-4 h-4 mr-2 text-indigo-500" />
                        标签
                      </label>
                      {allTags.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 inline-block">
                          暂无可用标签
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {allTags.map((tag) => {
                            const isSelected = editTagIds.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setEditTagIds(editTagIds.filter(id => id !== tag.id));
                                  } else {
                                    setEditTagIds([...editTagIds, tag.id]);
                                  }
                                }}
                                className={`px-4 py-1.5 text-sm rounded-lg transition-all shadow-sm ${
                                  isSelected 
                                    ? 'text-white ring-2 ring-offset-1 ring-indigo-500' 
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                style={{ 
                                  backgroundColor: isSelected ? tag.color : undefined
                                }}
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description Row */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                      版本描述
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
                      placeholder="简要描述本次修改..."
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <Code className="w-4 h-4 mr-2 text-indigo-500" />
                  提示词内容 <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex flex-col h-[600px]">
                    <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center">
                        <Code className="w-3 h-3 mr-1" /> 源码编辑
                      </div>
                      <button
                        type="button"
                        onClick={handleOptimize}
                        disabled={isOptimizing || !editContent.trim()}
                        className="flex items-center text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        {isOptimizing ? '优化中...' : 'AI 优化'}
                      </button>
                    </div>
                    <textarea
                      rows={20}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full flex-1 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm bg-white"
                      placeholder="在此输入 Markdown 内容..."
                    />
                  </div>
                  <div className="flex flex-col h-[600px]">
                    <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                      <Eye className="w-3 h-3 mr-1" /> 实时预览
                    </div>
                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-6 bg-white prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                        components={markdownComponents}
                      >
                        {editContent || '*暂无内容*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-medium text-gray-700">升级类型:</span>
                  <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      className="mr-2 text-indigo-600 focus:ring-indigo-500"
                      checked={bumpType === 'patch'}
                      onChange={() => setBumpType('patch')}
                    />
                    小幅修正 (Patch)
                  </label>
                  <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      className="mr-2 text-indigo-600 focus:ring-indigo-500"
                      checked={bumpType === 'major'}
                      onChange={() => setBumpType('major')}
                    />
                    大版本更新 (Major)
                  </label>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg flex items-center font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存并生成新版本
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 内容显示区域 */}
        {!isEditing && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-100">
                <div className="p-6 flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Code className="w-4 h-4 mr-2" />
                    Markdown 源码
                  </h3>
                  <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-200 font-mono text-sm leading-relaxed overflow-x-auto">
                    <pre className="whitespace-pre-wrap text-gray-800">
                      {prompt.content}
                    </pre>
                  </div>
                </div>
                <div className="p-6 flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    渲染效果
                  </h3>
                  <div className="flex-1 rounded-xl p-6 border border-gray-200 bg-white prose prose-indigo max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                      components={markdownComponents}
                    >
                      {prompt.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            
            {viewMode === 'source' && (
              <div className="p-8 bg-gray-50/30">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-inner">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {prompt.content}
                  </pre>
                </div>
              </div>
            )}
            
            {viewMode === 'preview' && (
              <div className="p-10">
                <div className="prose prose-indigo max-w-none mx-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                    components={markdownComponents}
                  >
                    {prompt.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <OptimizedPromptDialog
        isOpen={optimizationResult.isOpen}
        onClose={() => setOptimizationResult(prev => ({ ...prev, isOpen: false }))}
        originalPrompt={optimizationResult.original}
        optimizedPrompt={optimizationResult.optimized}
        onApply={(content) => setEditContent(content)}
      />
    </div>
  );
};
