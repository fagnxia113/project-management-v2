import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../../config/api'
import { FormField } from '../../types/workflow'
import {
  Plus,
  Save,
  ArrowLeft,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings,
  Eye,
  Edit2
} from 'lucide-react'

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'currency', label: '金额' },
  { value: 'textarea', label: '多行文本' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期' },
  { value: 'checkbox', label: '复选框' },
  { value: 'radio', label: '单选' },
  { value: 'user', label: '用户选择' },
  { value: 'department', label: '部门选择' },
  { value: 'file', label: '文件上传' },
  { value: 'phone', label: '电话' },
  { value: 'email', label: '邮箱' },
  { value: 'array', label: '数组' }
]

const FormDesignerPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [layoutType, setLayoutType] = useState<'single' | 'tabs' | 'steps'>('single')
  const [layoutColumns, setLayoutColumns] = useState(2)
  const [fields, setFields] = useState<FormField[]>([])
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate()
    }
  }, [id])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/form-templates/templates/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          const template = data.data
          setTemplateName(template.name)
          setLayoutType(template.layout.type)
          setLayoutColumns(template.layout.columns)
          setFields(template.fields || [])
        }
      }
    } catch (error) {
      console.error('加载表单模板失败:', error)
      alert('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = () => {
    const newField: FormField = {
      name: `field_${fields.length + 1}`,
      label: `字段 ${fields.length + 1}`,
      type: 'text',
      required: false,
      layout: { width: 'half' },
      permissions: {
        default: {
          visible: true,
          editable: true,
          required: false
        }
      }
    }
    setFields([...fields, newField])
    setSelectedFieldIndex(fields.length)
  }

  const handleFieldChange = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= fields.length) return
    
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    setFields(newFields)
    
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(targetIndex)
    } else if (selectedFieldIndex === targetIndex) {
      setSelectedFieldIndex(index)
    }
  }

  const handleDeleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index)
    setFields(newFields)
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(null)
    } else if (selectedFieldIndex !== null && selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1)
    }
  }

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('请输入模板名称')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const templateData = {
        name: templateName,
        layout: {
          type: layoutType,
          columns: layoutColumns,
          labelPosition: 'left' as const
        },
        fields: fields,
        style: {
          theme: 'default',
          size: 'medium',
          labelAlign: 'left'
        }
      }

      let res
      if (id && id !== 'new') {
        res = await fetch(`${API_URL.BASE}/api/form-templates/templates/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(templateData)
        })
      } else {
        res = await fetch(`${API_URL.BASE}/api/form-templates/templates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(templateData)
        })
      }

      if (res.ok) {
        alert('保存成功')
        navigate('/forms/templates')
      } else {
        const data = await res.json()
        alert(data.error || '保存失败')
      }
    } catch (error) {
      console.error('保存表单模板失败:', error)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const renderFieldEditor = () => {
    if (selectedFieldIndex === null || !fields[selectedFieldIndex]) {
      return (
        <div className="text-center text-gray-500 py-12">
          <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>选择一个字段进行编辑</p>
        </div>
      )
    }

    const field = fields[selectedFieldIndex]

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">字段名称</label>
          <input
            type="text"
            value={field.name}
            onChange={(e) => handleFieldChange(selectedFieldIndex, { name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">字段标签</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => handleFieldChange(selectedFieldIndex, { label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">字段类型</label>
          <select
            value={field.type}
            onChange={(e) => handleFieldChange(selectedFieldIndex, { type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">字段宽度</label>
          <select
            value={field.layout?.width || 'half'}
            onChange={(e) => handleFieldChange(selectedFieldIndex, { 
              layout: { ...field.layout, width: e.target.value as any }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="full">全宽</option>
            <option value="half">半宽</option>
            <option value="third">三分之一</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="required"
            checked={field.required || false}
            onChange={(e) => handleFieldChange(selectedFieldIndex, { required: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="required" className="ml-2 text-sm text-gray-700">必填字段</label>
        </div>

        {(field.type === 'select' || field.type === 'radio') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选项（每行一个）</label>
            <textarea
              value={field.options?.join('\n') || ''}
              onChange={(e) => handleFieldChange(selectedFieldIndex, { 
                options: e.target.value.split('\n').filter(o => o.trim())
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="选项1&#10;选项2&#10;选项3"
            />
          </div>
        )}

        {field.type === 'number' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最小值</label>
              <input
                type="number"
                value={field.validation?.min || ''}
                onChange={(e) => handleFieldChange(selectedFieldIndex, { 
                  validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大值</label>
              <input
                type="number"
                value={field.validation?.max || ''}
                onChange={(e) => handleFieldChange(selectedFieldIndex, { 
                  validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">字段权限</h4>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="defaultVisible"
                checked={field.permissions?.default?.visible ?? true}
                onChange={(e) => handleFieldChange(selectedFieldIndex, { 
                  permissions: { 
                    ...field.permissions,
                    default: { 
                      ...field.permissions?.default,
                      visible: e.target.checked,
                      editable: field.permissions?.default?.editable ?? true,
                      required: field.permissions?.default?.required ?? field.required ?? false
                    }
                  }
                })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="defaultVisible" className="ml-2 text-sm text-gray-700">默认可见</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="defaultEditable"
                checked={field.permissions?.default?.editable ?? true}
                onChange={(e) => handleFieldChange(selectedFieldIndex, { 
                  permissions: { 
                    ...field.permissions,
                    default: { 
                      ...field.permissions?.default,
                      visible: field.permissions?.default?.visible ?? true,
                      editable: e.target.checked,
                      required: field.permissions?.default?.required ?? field.required ?? false
                    }
                  }
                })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="defaultEditable" className="ml-2 text-sm text-gray-700">默认可编辑</label>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-3">占位符</h4>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => handleFieldChange(selectedFieldIndex, { placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="请输入占位符文本"
          />
        </div>
      </div>
    )
  }

  const renderPreview = () => {
    return (
      <div className="space-y-4">
        {fields.map((field, index) => {
          const value = previewData[field.name] || ''
          
          return (
            <div 
              key={index}
              className={`${field.layout?.width === 'full' ? 'col-span-2' : field.layout?.width === 'third' ? 'col-span-1' : 'col-span-1'}`}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'text' || field.type === 'phone' || field.type === 'email' ? (
                <input
                  type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                  value={value}
                  onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === 'number' || field.type === 'currency' ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  value={value}
                  onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === 'select' ? (
                <select
                  value={value}
                  onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {field.options?.map((option, i) => {
                    const optLabel = typeof option === 'object' ? option.label : option
                    const optValue = typeof option === 'object' ? option.value : option
                    return <option key={i} value={optValue}>{optLabel}</option>
                  })}
                </select>
              ) : field.type === 'date' ? (
                <input
                  type="date"
                  value={value}
                  onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === 'checkbox' ? (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{field.label}</span>
                </div>
              ) : field.type === 'radio' ? (
                <div className="space-y-2">
                  {field.options?.map((option, i) => {
                    const optLabel = typeof option === 'object' ? option.label : option
                    const optValue = typeof option === 'object' ? option.value : option
                    return (
                      <label key={i} className="flex items-center">
                        <input
                          type="radio"
                          name={field.name}
                          value={optValue}
                          checked={value === optValue}
                          onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{optLabel}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setPreviewData({ ...previewData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/forms/templates')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="表单模板名称"
              className="text-xl font-semibold border-none focus:outline-none focus:ring-0"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                previewMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {previewMode ? <Edit2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? '编辑模式' : '预览模式'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!previewMode && (
          <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="font-medium text-gray-900 mb-3">布局设置</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">布局类型</label>
                  <select
                    value={layoutType}
                    onChange={(e) => setLayoutType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single">单页</option>
                    <option value="tabs">标签页</option>
                    <option value="steps">分步</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">列数</label>
                  <select
                    value={layoutColumns}
                    onChange={(e) => setLayoutColumns(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1列</option>
                    <option value={2}>2列</option>
                    <option value={3}>3列</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">字段列表</h3>
                <button
                  onClick={handleAddField}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedFieldIndex(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFieldIndex === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{field.label}</div>
                        <div className="text-xs text-gray-500">{field.type} · {field.name}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveField(index, 'up')
                          }}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveField(index, 'down')
                          }}
                          disabled={index === fields.length - 1}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteField(index)
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">暂无字段</p>
                    <button
                      onClick={handleAddField}
                      className="mt-2 text-blue-600 text-sm hover:underline"
                    >
                      添加第一个字段
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {previewMode ? (
              renderPreview()
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">字段配置</h3>
                  {renderFieldEditor()}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">实时预览</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {selectedFieldIndex !== null && fields[selectedFieldIndex] ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {fields[selectedFieldIndex].label}
                          {fields[selectedFieldIndex].required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="text-sm text-gray-500 mb-2">
                          类型: {fields[selectedFieldIndex].type} | 
                          宽度: {fields[selectedFieldIndex].layout?.width || 'half'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        选择字段查看预览
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormDesignerPage
