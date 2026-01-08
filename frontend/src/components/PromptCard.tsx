import React from 'react';
import { Prompt } from '../types/models';
import { Calendar, Tag as TagIcon, FileText, GitCommit, Trash2, Play } from 'lucide-react';

interface PromptCardProps {
  prompt: Prompt;
  onClick: () => void;
  onDelete?: () => void;
  onTest?: () => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick, onDelete, onTest }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-900"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
            <GitCommit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center">
              {prompt.name}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                v{prompt.version}
              </span>
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDateTime(prompt.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onTest && (
            <button
              onClick={(e) => { e.stopPropagation(); onTest(); }}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100"
              title="测试提示词"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100"
              title="删除该版本"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {prompt.description && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
          {prompt.description}
        </p>
      )}

      <div className="bg-gray-50/50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
          <FileText className="w-3 h-3 mr-1.5" />
          内容预览
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {truncateContent(prompt.content)}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {prompt.tags && prompt.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2.5 py-0.5 text-xs font-medium rounded-full text-white shadow-sm"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        {prompt.category && (
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
            {prompt.category}
          </span>
        )}
      </div>
    </div>
  );
};
