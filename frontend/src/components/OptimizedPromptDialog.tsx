import React from 'react';
import { X, Copy, Check, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface OptimizedPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalPrompt: string;
  optimizedPrompt: string;
  onApply: () => void;
}

export const OptimizedPromptDialog: React.FC<OptimizedPromptDialogProps> = ({
  isOpen,
  onClose,
  originalPrompt,
  optimizedPrompt,
  onApply,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(optimizedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[85vh] animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mr-3 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            AI 优化结果
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Prompt */}
          <div className="flex flex-col h-full min-h-[300px]">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">原始提示词</h3>
            <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-y-auto font-mono text-sm text-gray-600 whitespace-pre-wrap">
              {originalPrompt}
            </div>
          </div>

          {/* Optimized Prompt */}
          <div className="flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wider">优化建议</h3>
              <button
                onClick={handleCopy}
                className="text-xs flex items-center text-gray-500 hover:text-purple-600 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? '已复制' : '复制内容'}
              </button>
            </div>
            <div className="flex-1 bg-purple-50/50 rounded-xl p-4 border border-purple-100 overflow-y-auto text-sm text-gray-800 prose prose-sm prose-purple max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {optimizedPrompt}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center transition-all transform hover:-translate-y-0.5"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            应用优化结果
          </button>
        </div>
      </div>
    </div>
  );
};
