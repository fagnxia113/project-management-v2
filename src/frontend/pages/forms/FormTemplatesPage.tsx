import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Eye
} from 'lucide-react'

interface FormTemplate {
  id: string
  key: string
  name: string
  category: string
  description: string
  form_schema: any
  status: 'active' | 'inactive'
  version: number
  created_at: string
  updated_at: string
}

const FormTemplatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FormTemplate | null>(null)

  const categories = ['hr', 'equipment', 'project', 'purchase', 'finance', 'general']
  const categoryLabels: Record<string, string> = {
    hr: '人事管理',
    equipment: '设备管理',
    project: '项目管理',
    purchase: '采购管理',
    finance: '财务管理',
    general: '通用表单'
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/forms/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTemplates(data.data || [])
        }
      }
    } catch (error) {
      console.error('加载表单模板失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchKeyword === '' || 
      template.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      template.key.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      template.description.toLowerCase().includes(searchKeyword.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/forms/templates/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          alert('删除成功')
          setShowDeleteDialog(false)
          setDeleteTarget(null)
          loadTemplates()
        } else {
          alert('删除失败: ' + (data.error || '未知错误'))
        }
      }
    } catch (error) {
      console.error('删除表单模板失败:', error)
      alert('删除失败，请重试')
    }
  }

  const handleDuplicate = async (template: FormTemplate) => {
    try {
      const token = localStorage.getItem('token')
      const payload = {
        key: `${template.key}_copy_${Date.now()}`,
        name: `${template.name} (副本)`,
        category: template.category,
        description: template.description,
        form_schema: template.form_schema,
        created_by: 'admin'
      }

      const res = await fetch(`${API_URL.BASE}/api/forms/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          alert('复制成功')
          loadTemplates()
        } else {
          alert('复制失败: ' + (data.error || '未知错误'))
        }
      }
    } catch (error) {
      console.error('复制表单模板失败:', error)
      alert('复制失败，请重试')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">表单管理</h1>
              <p className="text-gray-500 mt-1">管理表单模板和设计业务表单</p>
            </div>
            <button
              onClick={() => navigate('/forms/designer/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              新建表单
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索表单名称、标识或描述..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部分类</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">表单名称</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">表单标识</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">分类</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">描述</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">状态</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">版本</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">更新时间</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map(template => (
                    <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-900">{template.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{template.key}</td>
                      <td className="py-3 px-4 text-gray-600">{categoryLabels[template.category]}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm max-w-xs truncate">{template.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          template.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {template.status === 'active' ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">v{template.version}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(template.updated_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/forms/designer/${template.id}`)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            title="复制"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(template)
                              setShowDeleteDialog(true)
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无表单模板</p>
                  <p className="text-sm text-gray-400 mt-1">点击"新建表单"开始创建</p>
                </div>
              )}
            </div>
          </div>

          {showDeleteDialog && deleteTarget && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600">
                    确定要删除表单模板 <span className="font-semibold text-gray-900">{deleteTarget.name}</span> 吗？
                  </p>
                  <p className="text-sm text-red-500 mt-2">此操作不可恢复</p>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteDialog(false)
                      setDeleteTarget(null)
                    }}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FormTemplatesPage