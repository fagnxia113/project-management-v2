/**
 * 流程表单启动器组件
 * 基于流程表单预设，自动加载表单字段并处理流程启动
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, parseJWTToken } from '../config/api'

interface ProcessFormLauncherProps {
  presetId: string
  onSuccess?: (processInstanceId: string) => void
  onCancel?: () => void
}

interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'user' | 'boolean' | 'lookup' | 'reference'
  required: boolean
  placeholder?: string
  defaultValue?: any
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  options?: { label: string; value: any }[]
  rows?: number
  cols?: number
  disabled?: boolean
  readonly?: boolean
  hidden?: boolean
  group?: string
  dependencies?: {
    field: string
    value: any
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains'
  }[]
  validation?: {
    message?: string
    custom?: string
  }
  businessConfig?: {
    module?: string
    entityType?: string
    lookupField?: string
    displayField?: string
    filter?: Record<string, any>
    autoFill?: boolean
  }
  dynamicOptions?: 'department' | 'position' | 'employee' | 'project' | 'warehouse'
  dynamicOptionsConfig?: {
    source: string
    labelField: string
    valueField: string
    filter?: Record<string, any>
  }
  refEntity?: string
  refLabel?: string
  refValue?: string
  cascadeFrom?: string
  cascadeField?: string
}

interface ProcessFormPreset {
  id: string
  name: string
  category: string
  description: string
  formTemplateKey: string
  workflowTemplateId: string
  businessType: string
  status: 'active' | 'inactive'
  defaultVariables: Record<string, any>
  version: string
}

const ProcessFormLauncher: React.FC<ProcessFormLauncherProps> = ({ presetId, onSuccess, onCancel }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [preset, setPreset] = useState<ProcessFormPreset | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string; value: any }[]>>({})
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})

  // 加载级联选项
  const loadCascadeOptions = async (field: FormField, parentValue: any) => {
    if (!field.refEntity || !field.cascadeField) return
    
    try {
      const queryParam = field.cascadeField === 'department_id' ? 'department_id' : field.cascadeField
      let url = `${API_URL.BASE}/api/organization/${field.refEntity}`
      if (parentValue) {
        url += `?${queryParam}=${encodeURIComponent(parentValue)}`
      }
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        const labelField = field.refLabel || 'name'
        const valueField = field.refValue || 'id'
        
        setDynamicOptions(prev => ({
          ...prev,
          [field.name]: data.data.map((item: any) => ({
            label: item[labelField],
            value: item[valueField]
          }))
        }))
      }
    } catch (error) {
      console.error(`加载${field.label}选项失败:`, error)
    }
  }

  // 加载动态选项
  const loadDynamicOptions = async (fields: FormField[]) => {
    const options: Record<string, { label: string; value: any }[]> = {}

    for (const field of fields) {
      if (field.dynamicOptions && field.dynamicOptionsConfig) {
        try {
          const url = `${API_URL.BASE}${field.dynamicOptionsConfig.source}`

          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          const data = await response.json()

          if (data.success && Array.isArray(data.data)) {
            options[field.name] = data.data.map((item: any) => ({
              label: item[field.dynamicOptionsConfig!.labelField],
              value: item[field.dynamicOptionsConfig!.valueField]
            }))
          }
        } catch (error) {
          console.error(`加载${field.label}选项失败:`, error)
          options[field.name] = []
        }
      } else if (field.businessConfig) {
        try {
          const entity = field.businessConfig.entityType || ''
          const response = await fetch(`${API_URL.BASE}/api/data/${entity}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          const data = await response.json()
          const items = data.success ? data.data : (Array.isArray(data.data) ? data.data : [])
          if (Array.isArray(items)) {
            const labelField = field.businessConfig.displayField || 'name'
            const valueField = field.businessConfig.lookupField || 'id'
            options[field.name] = items.map((item: any) => ({
              label: item[labelField],
              value: item[valueField]
            }))
          }
        } catch (error) {
          console.error(`加载${field.label}业务选项失败:`, error)
          options[field.name] = []
        }
      } else if (field.type === 'user') {
        try {
          const response = await fetch(`${API_URL.BASE}/api/data/Employee`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          const data = await response.json()
          const items = data.success ? data.data : (Array.isArray(data.data) ? data.data : [])
          if (Array.isArray(items) && items.length > 0) {
            options[field.name] = items.map((item: any) => ({
              label: `${item.name} (${item.position_name || item.department_name || item.position || ''})`,
              value: item.id
            }))
          }
        } catch (error) {
          console.error(`加载${field.label}选项失败:`, error)
          options[field.name] = []
        }
      } else if (field.type === 'reference' && field.refEntity) {
        try {
          let url = `${API_URL.BASE}/api/organization/${field.refEntity}`
          if (field.cascadeFrom && formData[field.cascadeFrom]) {
            const queryParam = field.cascadeField === 'department_id' ? 'department_id' : field.cascadeField
            url += `?${queryParam}=${encodeURIComponent(formData[field.cascadeFrom])}`
          }
          
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          const data = await response.json()

          if (data.success && Array.isArray(data.data)) {
            const labelField = field.refLabel || 'name'
            const valueField = field.refValue || 'id'
            options[field.name] = data.data.map((item: any) => ({
              label: item[labelField],
              value: item[valueField]
            }))
          }
        } catch (error) {
          console.error(`加载${field.label}选项失败:`, error)
          options[field.name] = []
        }
      }
    }

    setDynamicOptions(options)
  }

  // 加载流程表单预设和字段
  useEffect(() => {
    const loadPresetAndFields = async () => {
      try {
        setLoading(true)

        const [presetResponse, fieldsResponse, defaultValuesResponse] = await Promise.all([
          fetch(API_URL.WORKFLOW.FORM_PRESET_DETAIL(presetId), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          fetch(API_URL.WORKFLOW.FORM_PRESET_FORM_FIELDS(presetId), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          fetch(API_URL.WORKFLOW.FORM_PRESET_DEFAULT_VALUES(presetId), {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ])

        const presetData = await presetResponse.json()
        const fieldsData = await fieldsResponse.json()
        const defaultValuesData = await defaultValuesResponse.json()

        if (presetData.success && fieldsData.success && defaultValuesData.success) {
          setPreset(presetData.data)
          setFormFields(fieldsData.data)
          setFormData(defaultValuesData.data)
          setErrors({})
          await loadDynamicOptions(fieldsData.data)
        } else {
          throw new Error('加载流程表单预设失败')
        }
      } catch (error) {
        console.error('[ProcessFormLauncher] 加载流程表单预设失败:', error)
        alert('加载流程表单失败，请重试')
        onCancel?.()
      } finally {
        setLoading(false)
      }
    }

    if (presetId) {
      loadPresetAndFields()
    }
  }, [presetId])

  // 检查字段是否可见
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.dependencies || field.dependencies.length === 0) {
      return true
    }
    return field.dependencies.every(dep => {
      const fieldValue = formData[dep.field]
      switch (dep.operator) {
        case 'equals': return fieldValue === dep.value
        case 'notEquals': return fieldValue !== dep.value
        case 'greaterThan': return fieldValue > dep.value
        case 'lessThan': return fieldValue < dep.value
        case 'contains': return Array.isArray(fieldValue) ? fieldValue.includes(dep.value) : String(fieldValue).includes(String(dep.value))
        case 'notContains': return Array.isArray(fieldValue) ? !fieldValue.includes(dep.value) : !String(fieldValue).includes(String(dep.value))
        default: return true
      }
    })
  }

  // 处理业务数据联动
  const handleBusinessLink = async (fieldName: string, value: any) => {
    if (!preset || !value) return
    const triggerField = formFields.find(field => field.name === fieldName)
    if (!triggerField?.businessConfig?.autoFill) return

    try {
      const formTemplateId = preset.formTemplateKey
      const response = await fetch(API_URL.WORKFLOW.FORM_TEMPLATE_LINK(formTemplateId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ formData: { ...formData, [fieldName]: value } })
      })
      const responseData = await response.json()
      if (responseData.success && responseData.data.success) {
        setFormData(prev => ({ ...prev, ...responseData.data.data }))
      }
    } catch (error) {
      console.error('处理业务数据联动失败:', error)
    }
  }

  // 处理表单输入变化
  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
    const cascadeFields = formFields.filter(f => f.cascadeFrom === fieldName)
    for (const cascadeField of cascadeFields) {
      if (cascadeField.type === 'reference' && cascadeField.refEntity && cascadeField.cascadeField) {
        loadCascadeOptions(cascadeField, value)
      }
    }
    handleBusinessLink(fieldName, value)
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    formFields.forEach(field => {
      if (!isFieldVisible(field)) return
      const value = formData[field.name]
      if (field.required && !value && value !== false) {
        newErrors[field.name] = `${field.label}是必填字段`
        return
      }
      if (value) {
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) newErrors[field.name] = `${field.label}必须是数字`
            break
          case 'date':
            if (isNaN(new Date(value).getTime())) newErrors[field.name] = `${field.label}日期格式不正确`
            break
        }
        if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
          if (field.minLength && value.length < field.minLength) newErrors[field.name] = `${field.label}长度不能小于${field.minLength}个字符`
          if (field.maxLength && value.length > field.maxLength) newErrors[field.name] = `${field.label}长度不能大于${field.maxLength}个字符`
        }
        if (field.type === 'number' && typeof value === 'number') {
          if (field.min !== undefined && value < field.min) newErrors[field.name] = `${field.label}不能小于${field.min}`
          if (field.max !== undefined && value > field.max) newErrors[field.name] = `${field.label}不能大于${field.max}`
        }
        if (field.pattern && typeof value === 'string') {
          if (!new RegExp(field.pattern).test(value)) newErrors[field.name] = field.validation?.message || `${field.label}格式不正确`
        }
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      alert('表单数据验证失败，请检查填写内容')
      return
    }
    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      let userInfo = { id: 'current-user', name: '当前用户' }
      if (token) {
        try {
          const payload = parseJWTToken(token)
          if (payload) {
            userInfo = { 
              id: payload.userId || payload.id || 'current-user', 
              name: payload.name || payload.username || payload.sub || '当前用户' 
            }
          }
        } catch (e) {
          console.warn('Token解析失败，使用默认用户信息')
        }
      }

      const response = await fetch(API_URL.WORKFLOW.FORM_PRESET_START(presetId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ formData, initiator: userInfo })
      })
      const responseData = await response.json()

      if (responseData.success) {
        const processInstanceId = responseData.data.processInstanceId
        alert('流程启动成功！')
        if (onSuccess) {
          onSuccess(processInstanceId)
        } else {
          navigate(-1)
        }
      } else {
        alert(responseData.error || '流程启动失败')
        if (responseData.data?.formValidation?.errors) {
          const validationErrors: Record<string, string> = {}
          responseData.data.formValidation.errors.forEach((error: any) => {
            validationErrors[error.field] = error.message
          })
          setErrors(validationErrors)
        }
      }
    } catch (error) {
      console.error('启动流程失败:', error)
      alert('流程启动失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 渲染单个字段
  const renderField = (field: FormField) => {
    if (!isFieldVisible(field)) return null

    const hasError = !!errors[field.name];

    return (
      <div key={field.name} className="form-group animate-fade-in group/field">
        <label htmlFor={field.name} className={`form-label ${field.required ? 'after:content-["*"] after:ml-1 after:text-red-500' : ''} ${hasError ? 'text-red-600' : 'group-focus-within/field:text-blue-600'}`}>
          {field.label}
        </label>
        <div className="relative">
          {field.type === 'text' && (
            <input type="text" id={field.name} name={field.name}
              className={`form-control ${hasError ? 'form-control-error' : ''}`}
              placeholder={field.placeholder} defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled} readOnly={field.readonly}
              minLength={field.minLength} maxLength={field.maxLength} pattern={field.pattern} />
          )}
          {field.type === 'number' && (
            <input type="number" id={field.name} name={field.name}
              className={`form-control ${hasError ? 'form-control-error' : ''}`}
              placeholder={field.placeholder} defaultValue={field.defaultValue}
              value={formData[field.name] !== undefined ? formData[field.name] : ''}
              onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value) || '')}
              disabled={field.disabled} readOnly={field.readonly} min={field.min} max={field.max} />
          )}
          {field.type === 'date' && (
            <input type="date" id={field.name} name={field.name}
              className={`form-control ${hasError ? 'form-control-error' : ''}`}
              defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled} readOnly={field.readonly} />
          )}
          {(field.type === 'select' || field.type === 'reference' || field.type === 'user' || field.type === 'lookup') && (
            <div className="relative group/select">
              <select id={field.name} name={field.name}
                className={`form-control appearance-none ${hasError ? 'form-control-error' : ''}`}
                defaultValue={field.defaultValue} value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                disabled={field.disabled || field.readonly}>
                <option value="">{field.placeholder || `请选择${field.label}`}</option>
                {(dynamicOptions[field.name] || field.options || []).map((option: any, idx: number) => (
                  <option key={option.value || idx} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within/select:text-blue-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          {field.type === 'textarea' && (
            <textarea id={field.name} name={field.name} rows={field.rows || 4}
              className={`form-control min-h-[120px] resize-none ${hasError ? 'form-control-error' : ''}`}
              placeholder={field.placeholder} defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled} readOnly={field.readonly}
              minLength={field.minLength} maxLength={field.maxLength} />
          )}
          {field.type === 'boolean' && (
            <div className="flex items-center gap-3 p-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id={field.name} name={field.name}
                  className="sr-only peer"
                  defaultChecked={field.defaultValue || false} checked={formData[field.name] || false}
                  onChange={(e) => handleInputChange(field.name, e.target.checked)}
                  disabled={field.disabled} readOnly={field.readonly} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-700">{field.label}</span>
              </label>
            </div>
          )}
          
          {hasError && (
            <div className="flex items-center gap-1.5 mt-1.5 ml-1 text-red-500 animate-in fade-in slide-in-from-top-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-tight">{errors[field.name]}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full animate-pulse"></div>
          </div>
        </div>
        <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">正在构建智能表单...</span>
      </div>
    )
  }

  if (!preset) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="premium-card p-10 text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">配置加载失败</h3>
          <p className="text-slate-500 text-sm mt-2">流程表单预设不存在或已失效</p>
          <button className="btn-secondary w-full mt-6" onClick={onCancel}>返回控制台</button>
        </div>
      </div>
    )
  }

  if (preset.status !== 'active') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="premium-card p-10 text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">业务已停用</h3>
          <p className="text-slate-500 text-sm mt-2">该流程表单预设目前处于非活动状态</p>
          <button className="btn-secondary w-full mt-6" onClick={onCancel}>返回控制台</button>
        </div>
      </div>
    )
  }

  // 按分组组织表单字段
  const groupedFields = formFields.reduce((groups, field) => {
    const group = field.group || '基本信息'
    if (!groups[group]) groups[group] = []
    groups[group].push(field)
    return groups
  }, {} as Record<string, FormField[]>)

  // 分组顺序
  const groupOrder = ['基本信息', '项目规模', '技术架构', '商务信息', '项目阶段']
  // 添加其他未在顺序中的分组
  Object.keys(groupedFields).forEach(group => {
    if (!groupOrder.includes(group)) groupOrder.push(group)
  })

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="relative">
        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-blue-600 rounded-full"></div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{preset.name}</h2>
        <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          {preset.description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {groupOrder.map(groupName => {
          const fields = groupedFields[groupName]
          const visibleFields = fields?.filter(isFieldVisible)
          if (!visibleFields || visibleFields.length === 0) return null
          
          return (
            <div key={groupName} className="premium-card p-10 relative overflow-hidden group/card">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/card:opacity-[0.05] transition-opacity pointer-events-none">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2i-2h-2v-2h2v-2h-2v-2h2V7h2v2h2v2h-2v2h2v2z"/>
                </svg>
              </div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                  {groupOrder.indexOf(groupName) + 1}
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{groupName}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                {fields.map(renderField)}
              </div>
            </div>
          )
        })}

        <div className="flex justify-between items-center bg-white/50 backdrop-blur-md sticky bottom-0 -mx-10 px-10 py-6 border-t border-slate-200/60 z-10 transition-all hover:bg-white/80">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            请确保以上所有 <span className="text-red-500">*</span> 必填项已准确填写
          </p>
          <div className="flex gap-4">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>取消操作</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  数据处理中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  校验并启动流程
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ProcessFormLauncher