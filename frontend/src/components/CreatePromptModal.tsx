import React, { useState, useEffect } from 'react';
import { X, Plus, Tag as TagIcon, Code, Eye } from 'lucide-react';
import { Tag } from '../types/models';
import { apiService } from '../services/api';
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

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; content: string; tag_ids?: string[]; category?: string; description?: string }) => void;
}

export const CreatePromptModal: React.FC<CreatePromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
    category: '',
    selectedTags: [] as string[],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

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

  useEffect(() => {
    if (isOpen) {
      loadTags();
      loadCategories();
    }
  }, [isOpen]);

  const loadTags = async () => {
    try {
      setLoadingTags(true);
      const response = await apiService.getTags();
      setAvailableTags(response.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await apiService.getCategories();
      setAvailableCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name,
        content: formData.content,
        description: formData.description,
        category: formData.category,
        tag_ids: formData.selectedTags,
      });
      setFormData({ name: '', content: '', description: '', category: '', selectedTags: [] });
      onClose();
    } catch (error) {
      console.error('Failed to create prompt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">创建提示词版本</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              提示词名称 *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="为提示词起一个名称，例如：产品介绍Prompt"
              required
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              提示词内容 *
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border rounded-md p-4">
              <div>
                <div className="mb-2 text-sm font-medium text-gray-500 flex items-center">
                  <Code className="w-4 h-4 mr-1" /> 编辑源码
                </div>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  className="w-full h-[500px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                  placeholder="输入提示词内容 (支持 Markdown)..."
                  required
                />
              </div>
              <div className="h-[500px] overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                <div className="mb-2 text-sm font-medium text-gray-500 flex items-center sticky top-0 bg-gray-50 pb-2 border-b">
                  <Eye className="w-4 h-4 mr-1" /> 实时预览
                </div>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                    components={markdownComponents}
                  >
                    {formData.content || '*暂无内容*'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              版本描述
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="描述这个版本的变化（可选）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分类 *
            </label>
            <div>
              {loadingCategories ? (
                <div className="text-sm text-gray-500">加载分类中...</div>
              ) : availableCategories.length === 0 ? (
                <div className="text-sm text-gray-500">暂无分类，请先到分类管理创建</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: c.name })}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        formData.category === c.name ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{ backgroundColor: formData.category === c.name ? c.color : undefined }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            {loadingTags ? (
              <div className="text-sm text-gray-500">加载标签中...</div>
            ) : availableTags.length === 0 ? (
              <div className="text-sm text-gray-500">暂无可用标签</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      formData.selectedTags.includes(tag.id)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: formData.selectedTags.includes(tag.id) ? tag.color : undefined
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.content.trim() || !formData.category.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  创建版本
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
