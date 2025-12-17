import React from 'react';
import { diff_match_patch } from 'diff-match-patch';

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText }) => {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);

  const renderDiff = () => {
    return diffs.map((diff, index) => {
      const [operation, text] = diff;
      let className = '';
      let content = text;

      switch (operation) {
        case -1: // Deletion
          className = 'bg-red-100 text-red-800 line-through';
          break;
        case 0: // Equality
          className = 'text-gray-900';
          break;
        case 1: // Insertion
          className = 'bg-green-100 text-green-800 font-medium';
          break;
      }

      return (
        <span key={index} className={className}>
          {content}
        </span>
      );
    });
  };

  const calculateChangeRate = () => {
    if (oldText.length === 0) return newText.length > 0 ? 100 : 0;
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);
    
    let insertions = 0;
    let deletions = 0;
    
    diffs.forEach(([operation, text]) => {
      if (operation === 1) insertions += text.length;
      if (operation === -1) deletions += text.length;
    });
    
    const totalChanges = insertions + deletions;
    return Math.round((totalChanges / (oldText.length + newText.length)) * 100);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">差异对比</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>变更率: {calculateChangeRate()}%</span>
          <div className="flex items-center space-x-2">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-100 rounded mr-1"></span>
              新增
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-red-100 rounded mr-1"></span>
              删除
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
          {renderDiff()}
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;