import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Search,
  Eye,
  Copy,
  Layout,
  Layers
} from 'lucide-react'

interface FormTemplate {
  id: string
  name: string
  version: number
  layout: {
    type: 'single' | 'tabs' | 'steps'
    columns: number
    labelPosition?: 'left' | 'right' | 'top'
  }
  fields: any[]
  sections?: any[]
  style?: any
  created_at: string
  updated_at: string
}

interface WorkflowDefinition {
  id: string
  key: string
  name: string
  form_template_id?: string
}

const FormTemplatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FormTemplate | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const [templatesRes, definitionsRes] = await Promise.all([
        fetch(`${API_URL.BASE}/api/form-templates/templates`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_URL.BASE}/api/workflow/definitions?pageSize=100`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])
      
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        if (data.success) {
          setTemplates(data.data || [])
        }
      }
      
      if (definitionsRes.ok) {
        const data = await definitionsRes.json()
        if (data.success) {
          setWorkflowDefinitions(data.data || [])
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    return searchKeyword === '' || 
      template.name.toLowerCase().includes(searchKeyword.toLowerCase())
  })

  const getBoundWorkflows = (templateId: string): WorkflowDefinition[] => {
    return workflowDefinitions.filter(def => def.form_template_id === templateId)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/form-templates/templates/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        await loadData()
        setShowDeleteDialog(false)
        setDeleteTarget(null)
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除表单模板失败:', error)
      alert('删除失败')
    }
  }

  const handleDuplicate = async (template: FormTemplate) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/form-templates/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `${template.name} (副本)`,
          layout: template.layout,
          fields: template.fields,
          sections: template.sections,
          style: template.style
        })
      })
      
      if (res.ok) {
        await loadData()
      } else {
        const data = await res.json()
        alert(data.error || '复制失败')
      }
    } catch (error) {
      console.error('复制表单模板失败:', error)
      alert('复制失败')
    }
  }

  const getLayoutTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'single': '单页',
      'tabs': '标签页',
      'steps': '分步'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">表单模板管理</h1>
            <p className="text-gray-500 mt-1">共 {templates.length} 个表单模板</p>
          </div>
          <button
            onClick={() => navigate('/forms/designer/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建模板
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索表单模板..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">暂无表单模板</p>
            <button
              onClick={() => navigate('/forms/designer/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建第一个表单模板
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTemplates.map(template => {
              const boundWorkflows = getBoundWorkflows(template.id)
              
              return (
                <div key={template.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                          v{template.version}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Layout className="w-4 h-4" />
                          <span>{getLayoutTypeLabel(template.layout.type)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Layers className="w-4 h-4" />
                          <span>{template.fields.length} 个字段</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{template.layout.columns} 列布局</span>
                        </div>
                      </div>

                      {boundWorkflows.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">已绑定流程:</span>
                          {boundWorkflows.map(wf => (
                            <span
                              key={wf.id}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded"
                            >
                              {wf.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/forms/designer/${template.id}`)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="复制"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(template)
                          setShowDeleteDialog(true)
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除"
                        disabled={boundWorkflows.length > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除表单模板 "{deleteTarget?.name}" 吗？此操作不可恢复。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteTarget(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormTemplatesPage
