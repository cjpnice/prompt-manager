import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Folder, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const CategoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1' });

  const palette = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

  const load = async () => {
    try {
      const res = await apiService.getCategories();
      setCategories(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editing) {
      await apiService.updateCategory(editing.id, { name: formData.name, color: formData.color });
    } else {
      await apiService.createCategory({ name: formData.name, color: formData.color });
    }
    setShowModal(false);
    setEditing(null);
    setFormData({ name: '', color: '#6366f1' });
    await load();
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-indigo-200 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
            返回首页
          </button>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <div className="p-2 bg-white/10 rounded-lg mr-3 backdrop-blur-sm">
                  <Folder className="w-6 h-6 text-indigo-300" />
                </div>
                <h1 className="text-3xl font-bold">分类管理</h1>
              </div>
              <p className="text-indigo-200 max-w-2xl text-lg leading-relaxed ml-12">
                为提示词维护统一的分类库，让项目结构井井有条。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 w-full pb-12">
        {/* Action Toolbar */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索分类..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            新建分类
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">暂无分类</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((c) => (
                <div key={c.id} className="group border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-white hover:border-indigo-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full mr-3 shadow-sm border-2 border-white ring-1 ring-gray-100" style={{ backgroundColor: c.color }} />
                      <h3 className="font-bold text-gray-900">{c.name}</h3>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditing(c); setFormData({ name: c.name, color: c.color }); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={async () => { await apiService.deleteCategory(c.id); await load(); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-medium">创建于 {new Date(c.created_at).toLocaleDateString('zh-CN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl transform transition-all">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editing ? '编辑分类' : '新建分类'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">分类名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  placeholder="请输入分类名称"
                />
              </div>
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">颜色标记</label>
                <div className="flex flex-wrap gap-3 mb-4">
                  {palette.map((color) => (
                    <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 shadow-sm' : 'hover:shadow-sm'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="flex items-center">
                   <div className="w-6 h-6 rounded-full border border-gray-200 mr-2" style={{ backgroundColor: formData.color }}></div>
                   <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); setFormData({ name: '', color: '#6366f1' }); }} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm hover:shadow transition-all">{editing ? '更新' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
