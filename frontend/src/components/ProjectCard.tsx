import React from 'react';
import { Project } from '../types/models';
import { Calendar, FileText, Tag as TagIcon, Trash2, Copy, Check } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete }) => {
  const [copied, setCopied] = React.useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const promptCount = React.useMemo(() => {
    if (!project.prompts) return 0;
    // 使用 Set 去重 prompt.name，计算不重复的提示词数量
    const uniqueNames = new Set(project.prompts.map(p => p.name));
    return uniqueNames.size;
  }, [project.prompts]);
  
  const tagCount = project.tags?.length || 0;

  return (
    <div 
      className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden flex flex-col h-full"
      onClick={onClick}
    >
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyId}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="复制项目 ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="删除项目"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <p className="text-gray-500 text-sm mb-6 line-clamp-2 flex-1 leading-relaxed">
          {project.description || '暂无描述'}
        </p>
        
        {project.tags && project.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-0.5 text-xs font-medium rounded-full text-white shadow-sm"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
        <div className="flex items-center">
          <span className="bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
            {promptCount} 个提示词
          </span>
        </div>
        <div className="flex items-center text-gray-400">
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          <span>{formatDate(project.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
