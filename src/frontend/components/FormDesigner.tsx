import React, { useState, useCallback } from 'react'
import {
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  AlignLeft,
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
  { type: 'textarea', label: '多行文本', icon: AlignLeft },
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
        className={`group/field relative p-6 bg-white border-2 rounded-2xl mb-4 cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'border-blue-500 shadow-xl shadow-blue-500/10 -translate-y-1' 
            : 'border-slate-100 hover:border-slate-200 hover:shadow-lg'
        }`}
        onClick={() => {
          setSelectedField(field)
          setShowConfig(true)
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400 group-hover/field:bg-blue-50 group-hover/field:text-blue-500 transition-colors'}`}>
              {getFieldIcon(field.type)}
            </div>
            <div>
              <span className="font-black text-slate-800 tracking-tight">{field.label}</span>
              {field.required && (
                <span className="text-red-500 ml-1 font-black">*</span>
              )}
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                NAME: {field.name}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/field:opacity-100'}`}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                moveField(index, 'up')
              }}
              disabled={index === 0}
              className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl disabled:opacity-30"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                moveField(index, 'down')
              }}
              disabled={index === fields.length - 1}
              className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl disabled:opacity-30"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                duplicateField(field)
              }}
              className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteField(field.id)
              }}
              className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Mock Content */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-dashed border-slate-200">
          <div className="h-4 w-full bg-slate-200/50 rounded-full animate-pulse-subtle"></div>
        </div>
      </div>
    )
  }

  const getFieldIcon = (type: string) => {
    const field = FIELD_TYPES.find(t => t.type === type)
    const Icon = field?.icon || Type
    return <Icon className="w-5 h-5" />
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
            className="form-control"
            disabled
          />
        )
      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder}
            className="form-control"
            disabled
          />
        )
      case 'date':
        return (
          <input
            type="date"
            className="form-control"
            disabled
          />
        )
      case 'select':
        return (
          <div className="relative">
            <select
              className="form-control appearance-none"
              disabled
            >
              <option value="">{field.placeholder || '请选择'}</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
        )
      case 'multiselect':
        return (
          <div className="grid grid-cols-2 gap-3">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-60">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" disabled />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            rows={4}
            className="form-control resize-none"
            disabled
          />
        )
      case 'file':
        return (
          <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center bg-slate-50/30 group-hover:bg-white transition-colors">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm font-black text-slate-800 uppercase tracking-widest">DRAG AND DROP</p>
            <p className="text-xs text-slate-400 mt-1">支持 JPG, PNG, PDF (最大 10MB)</p>
          </div>
        )
      default:
        return <input type="text" disabled className="form-control" />
    }
  }

  return (
    <div className="flex h-full bg-[#f8fafc] -m-6 rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-inner">
      {/* Toolbox Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200/60 flex flex-col">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Field Library</h3>
          <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">工具组件库</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-2">
          {FIELD_TYPES.map(fieldType => (
            <button
              key={fieldType.type}
              onClick={() => addField(fieldType.type)}
              className="w-full group flex items-center gap-4 px-5 py-4 bg-white border border-slate-100 rounded-[1.25rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-blue-500 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <fieldType.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{fieldType.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Designer Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
        <div className="px-10 py-8 flex justify-between items-center bg-white/50 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <Settings className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                {previewMode ? '表单预览体验' : '可视化表单构造器'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 px-1">
              {previewMode ? 'VALIDATE YOUR FORM UX HERE' : 'BUILD HIGH QUALITY FORMS BY DRAGGING FIELDS'}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="btn-secondary"
            >
              {previewMode ? (
                <><X className="w-4 h-4" /> 退出预览</>
              ) : (
                <><CheckSquare className="w-4 h-4" /> 实时预览</>
              )}
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              <Save className="w-5 h-5" />
              发布表单
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
          {previewMode ? (
            <div className="max-w-3xl mx-auto">
              <div className="premium-card p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="mb-10 text-center">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">新业务流程申请</h3>
                  <p className="text-slate-400 font-bold tracking-widest uppercase text-xs mt-2">New Process Application Form Template</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {fields.map((field) => (
                    <div key={field.id} className={`form-group ${field.type === 'textarea' || field.type === 'file' ? 'md:col-span-2' : ''}`}>
                      <label className="form-label">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                      </label>
                      {renderPreviewField(field)}
                      {field.description && (
                        <p className="mt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1.5 ml-1">
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          {field.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {fields.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <X className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">还没有添加任何字段</p>
                  </div>
                )}
                
                <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
                   <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                     System Auto-Generated Form • V1.0
                   </div>
                   <div className="flex gap-4">
                     <button className="btn-secondary" disabled>取消</button>
                     <button className="btn-primary" disabled>提交预览</button>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {fields.map((field, index) => renderFieldPreview(field, index))}
              {fields.length === 0 && (
                <div className="text-center py-32 border-4 border-dashed border-slate-100 bg-white/50 rounded-[3rem] animate-pulse-subtle">
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mx-auto mb-8 border border-slate-50">
                    <Copy className="w-10 h-10 text-blue-200" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-300 tracking-tighter">画布为空</h4>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-3">Drag components from the library to build your form</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className={`fixed inset-y-0 right-0 w-[450px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.05)] z-[60] transform transition-transform duration-500 ease-out border-l border-slate-100 ${showConfig && selectedField ? 'translate-x-0' : 'translate-x-full'}`}>
         {selectedField && (
           <div className="flex flex-col h-full bg-mesh">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
               <div>
                 <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Properties</div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">组件属性控制</h3>
               </div>
               <button
                 onClick={() => setShowConfig(false)}
                 className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
               <div className="space-y-6">
                 <div className="form-group">
                   <label className="form-label">字段显示标签</label>
                   <input
                     type="text"
                     value={selectedField.label}
                     onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                     className="form-control"
                     placeholder="例如: 项目名称"
                   />
                 </div>

                 <div className="form-group">
                   <label className="form-label uppercase tracking-widest text-[10px]">Database Variable Name</label>
                   <input
                     type="text"
                     value={selectedField.name}
                     onChange={(e) => updateField(selectedField.id, { name: e.target.value })}
                     className="form-control font-mono text-xs bg-slate-50"
                     placeholder="project_name"
                   />
                 </div>

                 <div className="form-group">
                   <label className="form-label">提示占位文字</label>
                   <input
                     type="text"
                     value={selectedField.placeholder || ''}
                     onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                     className="form-control"
                     placeholder="输入框引导说明"
                   />
                 </div>

                 <div className="premium-card p-6 bg-blue-50/50 border-blue-100">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={selectedField.required}
                        onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-black text-slate-800 tracking-tight">必须填写的字段</span>
                    </label>
                 </div>

                 {(selectedField.type === 'select' || selectedField.type === 'multiselect') && (
                   <div className="space-y-4">
                     <p className="form-label">数据选项配置</p>
                     <div className="space-y-2">
                       {selectedField.options?.map((opt, index) => (
                         <div key={index} className="flex gap-2 group/opt animate-slide-up">
                           <input
                             type="text"
                             value={opt.label}
                             onChange={(e) => {
                               const newOptions = [...(selectedField.options || [])]
                               newOptions[index] = { ...newOptions[index], label: e.target.value, value: e.target.value }
                               updateField(selectedField.id, { options: newOptions })
                             }}
                             className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                             placeholder="选项文本"
                           />
                           <button
                             onClick={() => {
                               const newOptions = selectedField.options?.filter((_, i) => i !== index) || []
                               updateField(selectedField.id, { options: newOptions })
                             }}
                             className="p-3 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover/opt:opacity-100 transition-all hover:bg-red-100"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                       <button
                         onClick={() => {
                           const newOptions = [...(selectedField.options || []), { label: '新选项', value: 'new_option' }]
                           updateField(selectedField.id, { options: newOptions })
                         }}
                         className="w-full py-3 bg-blue-50 text-blue-600 border border-dashed border-blue-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                       >
                         + Add New Option
                       </button>
                     </div>
                   </div>
                 )}

                 <div className="form-group">
                   <label className="form-label">字段业务描述</label>
                   <textarea
                     value={selectedField.description || ''}
                     onChange={(e) => updateField(selectedField.id, { description: e.target.value })}
                     className="form-control min-h-[100px] bg-slate-50"
                     rows={3}
                     placeholder="向填单人解释此字段的用途"
                   />
                 </div>
               </div>

               <div className="pt-8 border-t border-slate-200/60">
                 <div className="flex items-center gap-2 mb-6 text-slate-400">
                    <Settings className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logic & Validation</span>
                 </div>
                 
                 <div className="space-y-6">
                    {/* Simplified for demo, can be expanded */}
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 opacity-10">
                          <CheckSquare className="w-24 h-24" />
                       </div>
                       <p className="text-white font-black text-lg tracking-tight relative z-10">验证逻辑已托管</p>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 relative z-10">Built-in Intelligence</p>
                       <div className="mt-4 flex gap-2 relative z-10">
                         <span className="px-2 py-1 bg-white/10 rounded-md text-[8px] font-black">XSS PROTECTION</span>
                         <span className="px-2 py-1 bg-white/10 rounded-md text-[8px] font-black">ASYNC VALIDATE</span>
                       </div>
                    </div>
                 </div>
               </div>
             </div>
             
             <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
                <button className="btn-primary w-full" onClick={() => setShowConfig(false)}>完成配置</button>
             </div>
           </div>
         )}
      </div>
    </div>
  )
}

export default FormDesigner