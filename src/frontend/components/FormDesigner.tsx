import React, { useState, useCallback } from 'react'
import {
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Textarea,
  Mail,
  Phone,
  Upload,
  Save,
  Download,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Settings,
  X
} from 'lucide-react'

interface FormField {
  id: string
  name: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  defaultValue?: any
  options?: { label: string; value: string }[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
  linkage?: {
    showWhen?: string
    showValue?: any
    hideWhen?: string
    hideValue?: any
  }
  description?: string
}

interface FormDesignerProps {
  initialFields?: FormField[]
  onSave?: (fields: FormField[]) => void
  onExport?: (data: any) => void
}

const FIELD_TYPES = [
  { type: 'text', label: '单行文本', icon: Type },
  { type: 'number', label: '数字', icon: Hash },
  { type: 'date', label: '日期', icon: Calendar },
  { type: 'select', label: '下拉选择', icon: List },
  { type: 'multiselect', label: '多选', icon: CheckSquare },
  { type: 'textarea', label: '多行文本', icon: Textarea },
  { type: 'email', label: '邮箱', icon: Mail },
  { type: 'phone', label: '电话', icon: Phone },
  { type: 'file', label: '文件上传', icon: Upload }
]

const FormDesigner: React.FC<FormDesignerProps> = ({
  initialFields = [],
  onSave,
  onExport
}) => {
  const [fields, setFields] = useState<FormField[]>(initialFields)
  const [selectedField, setSelectedField] = useState<FormField | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const addField = useCallback((type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field_${fields.length + 1}`,
      label: FIELD_TYPES.find(t => t.type === type)?.label || '新字段',
      type,
      required: false,
      placeholder: ''
    }
    setFields(prev => [...prev, newField])
    setSelectedField(newField)
    setShowConfig(true)
  }, [fields.length])

  const deleteField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    if (selectedField?.id === fieldId) {
      setSelectedField(null)
      setShowConfig(false)
    }
  }, [selectedField])

  const duplicateField = useCallback((field: FormField) => {
    const newField: FormField = {
      ...field,
      id: `field_${Date.now()}`,
      name: `${field.name}_copy`
    }
    setFields(prev => [...prev, newField])
  }, [])

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setFields(prev => {
        const newFields = [...prev]
        ;[newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]]
        return newFields
      })
    } else if (direction === 'down' && index < fields.length - 1) {
      setFields(prev => {
        const newFields = [...prev]
        ;[newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
        return newFields
      })
    }
  }, [fields.length])

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFields(prev =>
      prev.map(field => {
        if (field.id === fieldId) {
          return { ...field, ...updates }
        }
        return field
      })
    )
    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, ...updates } : null)
    }
  }, [selectedField])

  const handleSave = useCallback(() => {
    const formData = {
      fields: fields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        defaultValue: field.defaultValue,
        options: field.options,
        validation: field.validation,
        linkage: field.linkage,
        description: field.description
      }))
    }
    onSave?.(fields)
    onExport?.(formData)
  }, [fields, onSave, onExport])

  const renderFieldPreview = (field: FormField, index: number) => {
    const isSelected = selectedField?.id === field.id

    return (
      <div
        key={field.id}
        className={`p-4 bg-white border rounded-lg mb-3 cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-blue-300'
        }`}
        onClick={() => {
          setSelectedField(field)
          setShowConfig(true)
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getFieldIcon(field.type)}
            <span className="font-medium text-gray-900">{field.label}</span>
            {field.required && (
              <span className="text-red-500 text-sm">*</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                moveField(index, 'up')
              }}
              disabled={index === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ArrowUp className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                moveField(index, 'down')
              }}
              disabled={index === fields.length - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ArrowDown className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                duplicateField(field)
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteField(field.id)
              }}
              className="p-1 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          字段名：{field.name} | 类型：{FIELD_TYPES.find(t => t.type === field.type)?.label}
        </div>
      </div>
    )
  }

  const getFieldIcon = (type: string) => {
    const field = FIELD_TYPES.find(t => t.type === type)
    const Icon = field?.icon || Type
    return <Icon className="w-4 h-4 text-blue-500" />
  }

  const renderPreviewField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        )
      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        )
      case 'date':
        return (
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        )
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          >
            <option value="">{field.placeholder || '请选择'}</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="checkbox" disabled />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled
          />
        )
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">点击或拖拽文件到此处上传</p>
          </div>
        )
      default:
        return <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">字段工具箱</h3>
        <div className="space-y-2">
          {FIELD_TYPES.map(fieldType => (
            <button
              key={fieldType.type}
              onClick={() => addField(fieldType.type)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <fieldType.icon className="w-4 h-4 text-blue-500" />
              {fieldType.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {previewMode ? '表单预览' : '表单设计'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {previewMode ? '预览表单的实际效果' : '拖拽字段设计表单'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              {previewMode ? '编辑模式' : '预览模式'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>

        {previewMode ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              {fields.map((field, index) => (
                <div key={field.id} className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderPreviewField(field)}
                  {field.description && (
                    <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                  )}
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  暂无字段，请从左侧工具箱添加
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {fields.map((field, index) => renderFieldPreview(field, index))}
            {fields.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-2">暂无字段</p>
                <p className="text-sm text-gray-400">请从左侧工具箱拖拽添加字段</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showConfig && selectedField && (
        <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">字段配置</h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字段标签 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入字段标签"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字段名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={selectedField.name}
                  onChange={(e) => updateField(selectedField.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入字段名称（英文）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  占位符
                </label>
                <input
                  type="text"
                  value={selectedField.placeholder || ''}
                  onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入占位符"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={selectedField.required}
                  onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="required" className="text-sm font-medium text-gray-700">
                  必填字段
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  默认值
                </label>
                <input
                  type="text"
                  value={selectedField.defaultValue || ''}
                  onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入默认值"
                />
              </div>

              {(selectedField.type === 'select' || selectedField.type === 'multiselect') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选项配置
                  </label>
                  <div className="space-y-2">
                    {selectedField.options?.map((opt, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const newOptions = [...(selectedField.options || [])]
                            newOptions[index] = { ...newOptions[index], label: e.target.value, value: e.target.value }
                            updateField(selectedField.id, { options: newOptions })
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="选项标签"
                        />
                        <button
                          onClick={() => {
                            const newOptions = selectedField.options?.filter((_, i) => i !== index) || []
                            updateField(selectedField.id, { options: newOptions })
                          }}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOptions = [...(selectedField.options || []), { label: '新选项', value: 'new_option' }]
                        updateField(selectedField.id, { options: newOptions })
                      }}
                      className="w-full px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                    >
                      + 添加选项
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字段说明
                </label>
                <textarea
                  value={selectedField.description || ''}
                  onChange={(e) => updateField(selectedField.id, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="请输入字段说明"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">验证规则</h4>
                <div className="space-y-3">
                  {(selectedField.type === 'text' || selectedField.type === 'email' || selectedField.type === 'phone') && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">最小长度</label>
                      <input
                        type="number"
                        value={selectedField.validation?.minLength || ''}
                        onChange={(e) => updateField(selectedField.id, { 
                          validation: { ...selectedField.validation, minLength: parseInt(e.target.value) || undefined }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="最小长度"
                      />
                    </div>
                  )}
                  {(selectedField.type === 'text' || selectedField.type === 'email' || selectedField.type === 'phone') && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">最大长度</label>
                      <input
                        type="number"
                        value={selectedField.validation?.maxLength || ''}
                        onChange={(e) => updateField(selectedField.id, { 
                          validation: { ...selectedField.validation, maxLength: parseInt(e.target.value) || undefined }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="最大长度"
                      />
                    </div>
                  )}
                  {selectedField.type === 'number' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">最小值</label>
                        <input
                          type="number"
                          value={selectedField.validation?.min || ''}
                          onChange={(e) => updateField(selectedField.id, { 
                            validation: { ...selectedField.validation, min: parseFloat(e.target.value) || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="最小值"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">最大值</label>
                        <input
                          type="number"
                          value={selectedField.validation?.max || ''}
                          onChange={(e) => updateField(selectedField.id, { 
                            validation: { ...selectedField.validation, max: parseFloat(e.target.value) || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="最大值"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">字段联动</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">显示条件</label>
                    <select
                      value={selectedField.linkage?.showWhen || ''}
                      onChange={(e) => updateField(selectedField.id, { 
                        linkage: { ...selectedField.linkage, showWhen: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">无</option>
                      {fields.filter(f => f.id !== selectedField.id).map(f => (
                        <option key={f.id} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedField.linkage?.showWhen && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">显示值</label>
                      <input
                        type="text"
                        value={selectedField.linkage?.showValue || ''}
                        onChange={(e) => updateField(selectedField.id, { 
                          linkage: { ...selectedField.linkage, showValue: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="当字段值等于此值时显示"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormDesigner