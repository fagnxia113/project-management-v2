import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api';
import { 
  Plus, 
  Edit2, 
  Play, 
  Pause, 
  Archive, 
  ChevronRight,
  Settings,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface WorkflowDefinition {
  id: string;
  key: string;
  name: string;
  version: number;
  category: string;
  entity_type: string;
  status: 'draft' | 'active' | 'suspended' | 'archived';
  node_config: any;
  form_schema?: any[];
  variables?: any[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; icon: any }> = {
  'hr': { label: '人力资源', color: 'blue', icon: Users },
  'project': { label: '项目管理', color: 'green', icon: FileText },
  'equipment': { label: '设备管理', color: 'orange', icon: Settings },
  'purchase': { label: '采购管理', color: 'purple', icon: FileText },
  'task': { label: '任务管理', color: 'cyan', icon: CheckCircle },
  'general': { label: '通用流程', color: 'gray', icon: FileText }
};

const STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  'draft': { label: '草稿', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  'active': { label: '已激活', color: 'text-green-600', bgColor: 'bg-green-100' },
  'suspended': { label: '已暂停', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  'archived': { label: '已归档', color: 'text-gray-500', bgColor: 'bg-gray-50' }
};

export default function WorkflowDefinitionListPage() {
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDefinitions();
  }, []);

  const loadDefinitions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL.BASE}/api/workflow/definitions?pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDefinitions(data.data);
        }
      }
    } catch (error) {
      console.error('加载流程定义失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const url = newStatus === 'active' 
        ? `${API_URL.BASE}/api/workflow/definitions/${id}/activate`
        : `${API_URL.BASE}/api/workflow/definitions/${id}/suspend`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadDefinitions();
      }
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此流程定义吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL.BASE}/api/workflow/definitions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadDefinitions();
      }
    } catch (error) {
      console.error('删除流程定义失败:', error);
    }
  };

  // 过滤流程定义
  const filteredDefinitions = definitions.filter(def => {
    if (filterCategory !== 'all' && def.category !== filterCategory) return false;
    if (filterStatus !== 'all' && def.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        def.name.toLowerCase().includes(query) ||
        def.key.toLowerCase().includes(query) ||
        def.entity_type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 统计信息
  const stats = {
    total: definitions.length,
    active: definitions.filter(d => d.status === 'active').length,
    draft: definitions.filter(d => d.status === 'draft').length,
    suspended: definitions.filter(d => d.status === 'suspended').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">流程定义管理</h1>
        <p className="text-gray-500 mt-1">查看和管理系统中所有已配置的审批流程</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">流程总数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-500">已激活</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          <div className="text-sm text-gray-500">草稿</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.suspended}</div>
          <div className="text-sm text-gray-500">已暂停</div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索 */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索流程名称、标识或实体类型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 分类过滤 */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有分类</option>
            <option value="hr">人力资源</option>
            <option value="project">项目管理</option>
            <option value="equipment">设备管理</option>
            <option value="purchase">采购管理</option>
            <option value="task">任务管理</option>
          </select>

          {/* 状态过滤 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有状态</option>
            <option value="active">已激活</option>
            <option value="draft">草稿</option>
            <option value="suspended">已暂停</option>
            <option value="archived">已归档</option>
          </select>

          {/* 新建按钮 */}
          <button
            onClick={() => navigate('/workflow/designer/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建流程
          </button>
        </div>
      </div>

      {/* 流程列表 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            加载中...
          </div>
        ) : filteredDefinitions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无流程定义</p>
            <p className="text-sm mt-1">点击"新建流程"创建第一个流程</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDefinitions.map((def) => {
              const category = CATEGORY_MAP[def.category] || CATEGORY_MAP['general'];
              const status = STATUS_MAP[def.status] || STATUS_MAP['draft'];
              const CategoryIcon = category.icon;

              return (
                <div key={def.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-${category.color}-100 text-${category.color}-700 flex items-center gap-1`}>
                          <CategoryIcon className="w-3 h-3" />
                          {category.label}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          版本 {def.version}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {def.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        标识: {def.key} | 实体类型: {def.entity_type}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          创建: {new Date(def.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Edit2 className="w-3 h-3" />
                          更新: {new Date(def.updated_at).toLocaleDateString()}
                        </span>
                        {def.node_config?.nodes && (
                          <span className="flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            {def.node_config.nodes.length} 个节点
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {/* 编辑按钮 */}
                      <button
                        onClick={() => navigate(`/workflow/designer/${def.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="编辑流程"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* 启停按钮 */}
                      <button
                        onClick={() => handleToggleStatus(def.id, def.status)}
                        className={`p-2 rounded-lg ${
                          def.status === 'active' 
                            ? 'text-yellow-600 hover:bg-yellow-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={def.status === 'active' ? '暂停流程' : '激活流程'}
                      >
                        {def.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      {/* 删除按钮 */}
                      <button
                        onClick={() => handleDelete(def.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除流程"
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 提示信息 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">提示</p>
            <p className="mt-1">
              • 只有状态为"已激活"的流程才能被用户发起<br/>
              • 修改流程定义后需要重新激活才能生效<br/>
              • 删除流程定义会先将其归档（状态变为"已归档"）<br/>
              • 已归档的流程定义再次点击删除会真正从数据库中删除<br/>
              • 已归档的流程无法恢复，请谨慎操作
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
