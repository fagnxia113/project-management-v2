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
          const response = await fetch(`${API_URL.BASE}${field.dynamicOptionsConfig.source}`, {
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
        console.error('加载流程表单预设失败:', error)
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

    return (
      <div key={field.name} className="space-y-2">
        <label htmlFor={field.name} className={`block text-sm font-medium ${field.required ? 'text-red-600' : 'text-gray-700'}`}>
          {field.label}{field.required && ' *'}
        </label>
        <div className="space-y-1">
          {field.type === 'text' && (
            <input type="text" id={field.name} name={field.name}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder={field.placeholder} defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled} readOnly={field.readonly}
              minLength={field.minLength} maxLength={field.maxLength} pattern={field.pattern} />
          )}
          {field.type === 'number' && (
            <input type="number" id={field.name} name={field.name}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder={field.placeholder} defaultValue={field.defaultValue}
              value={formData[field.name] !== undefined ? formData[field.name] : ''}
              onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value) || '')}
              disabled={field.disabled} readOnly={field.readonly} min={field.min} max={field.max} />
          )}
          {field.type === 'date' && (
            <input type="date" id={field.name} name={field.name}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled} readOnly={field.readonly} />
          )}
          {(field.type === 'select' || field.type === 'reference') && (
            <select id={field.name} name={field.name}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled || field.readonly}>
              <option value="">{field.placeholder || '请选择'}</option>
              {(dynamicOptions[field.name] || field.options || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
          {field.type === 'textarea' && (
            <textarea id={field.name} name={field.name} rows={field.rows || 3} cols={field.cols || 50}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder={field.placeholder} defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled} readOnly={field.readonly}
              minLength={field.minLength} maxLength={field.maxLength} />
          )}
          {field.type === 'boolean' && (
            <div className="flex items-center">
              <input type="checkbox" id={field.name} name={field.name}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked={field.defaultValue || false} checked={formData[field.name] || false}
                onChange={(e) => handleInputChange(field.name, e.target.checked)}
                disabled={field.disabled} readOnly={field.readonly} />
              <label htmlFor={field.name} className="ml-2 block text-sm text-gray-700">{field.label}</label>
            </div>
          )}
          {field.type === 'user' && (
            <select id={field.name} name={field.name}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled || field.readonly}>
              <option value="">{field.placeholder || '请选择用户'}</option>
              {(dynamicOptions[field.name] || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
          {field.type === 'lookup' && (
            <select id={field.name} name={field.name}
              className={`w-full px-3 py-2 border ${errors[field.name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              defaultValue={field.defaultValue} value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={field.disabled || field.readonly}>
              <option value="">{field.placeholder || '请选择'}</option>
              {(dynamicOptions[field.name] || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
          {errors[field.name] && <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>}
        </div>
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

  if (!preset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600">流程表单预设不存在</h3>
          <button className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onCancel}>返回</button>
        </div>
      </div>
    )
  }

  if (preset.status !== 'active') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-yellow-600">流程表单预设已停用</h3>
          <button className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onCancel}>返回</button>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{preset.name}</h2>
        <p className="text-gray-600 mt-1">{preset.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {groupOrder.map(groupName => {
          const fields = groupedFields[groupName]
          if (!fields || fields.length === 0) return null
          
          return (
            <div key={groupName} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">{groupName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(renderField)}
              </div>
            </div>
          )
        })}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" onClick={onCancel} disabled={submitting}>取消</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" disabled={submitting}>{submitting ? '提交中...' : '提交并启动流程'}</button>
        </div>
      </form>
    </div>
  )
}

export default ProcessFormLauncher