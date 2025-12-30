import React from 'react';
import { AlertTriangle, X, Save } from 'lucide-react';

interface SaveConfirmDialogProps {
  isOpen: boolean;
  bumpType: 'major' | 'patch';
  keepVersion: boolean;
  onConfirm: (bumpType: 'major' | 'patch', keepVersion: boolean) => void;
  onCancel: () => void;
  onBumpTypeChange: (type: 'major' | 'patch') => void;
  onKeepVersionChange: (keep: boolean) => void;
}

export const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  isOpen,
  bumpType,
  keepVersion,
  onConfirm,
  onCancel,
  onBumpTypeChange,
  onKeepVersionChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl mr-4 bg-yellow-50">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">保存更改</h3>
            </div>
            <button 
              onClick={onCancel} 
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-600 leading-relaxed mb-6 ml-1">
            您有未保存的更改，是否要保存后再退出编辑？
          </p>

          {/* 版本选择选项 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700 block mb-3">升级类型:</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                    checked={bumpType === 'patch'}
                    onChange={() => onBumpTypeChange('patch')}
                    disabled={keepVersion}
                  />
                  小幅修正 (Patch)
                </label>
                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                    checked={bumpType === 'major'}
                    onChange={() => onBumpTypeChange('major')}
                    disabled={keepVersion}
                  />
                  大版本更新 (Major)
                </label>
              </div>
            </div>
            
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={keepVersion}
                onChange={(e) => onKeepVersionChange(e.target.checked)}
              />
              保持当前版本号不变
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              不保存
            </button>
            <button
              onClick={() => onConfirm(bumpType, keepVersion)}
              className="px-5 py-2.5 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {keepVersion ? '保存当前版本' : '保存并退出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

