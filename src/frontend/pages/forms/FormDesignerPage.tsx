import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FormDesigner from '../../components/FormDesigner'
import { API_URL } from '../../config/api'

interface FormTemplate {
  id: string
  key: string
  name: string
  category: string
  description: string
  form_schema: any
  status: 'active' | 'inactive'
  version: number
}

export default function FormDesignerPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formCategory, setFormCategory] = useState('hr')
  const [formDescription, setFormDescription] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadTemplate(id)
    }
  }, [id])

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/forms/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTemplate(data.data)
          setFormName(data.data.name)
          setFormKey(data.data.key)
          setFormCategory(data.data.category || 'hr')
          setFormDescription(data.data.description || '')
        }
      }
    } catch (error) {
      console.error('加载表单模板失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (fields: any[]) => {
    setFormData({ fields })
    setShowSaveDialog(true)
  }

  const handleExport = (data: any) => {
    console.log('导出表单数据:', data)
  }

  const confirmSave = async () => {
    if (!formName || !formKey) {
      alert('请填写表单名称和表单标识')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const payload = {
        key: formKey,
        name: formName,
        category: formCategory,
        description: formDescription,
        form_schema: formData,
        created_by: 'admin'
      }

      const url = id 
        ? `${API_URL.BASE}/api/forms/templates/${id}`
        : `${API_URL.BASE}/api/forms/templates`
      
      const method = id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      
      if (data.success) {
        alert('保存成功！')
        setShowSaveDialog(false)
        navigate('/forms/templates')
      } else {
        alert('保存失败: ' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存表单失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? '编辑表单' : '新建表单'}
          </h1>
          <p className="text-gray-500 mt-1">
            拖拽字段设计表单，点击字段配置属性
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/forms/templates')}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            返回列表
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <FormDesigner
          initialFields={template?.form_schema?.fields || []}
          onSave={handleSave}
          onExport={handleExport}
        />
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">保存表单</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表单名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入表单名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表单标识 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：personnel_onboard_form"
                  disabled={!!id}
                />
                <p className="mt-1 text-xs text-gray-500">
                  表单标识唯一标识一个表单，创建后不可修改
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表单分类
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hr">人事管理</option>
                  <option value="equipment">设备管理</option>
                  <option value="project">项目管理</option>
                  <option value="purchase">采购管理</option>
                  <option value="finance">财务管理</option>
                  <option value="general">通用表单</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表单描述
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入表单描述"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}