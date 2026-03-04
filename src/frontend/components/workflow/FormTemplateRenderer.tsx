import React from 'react'
import { FormField, FieldPermissionConfig } from '../../types/workflow'

interface FormTemplateRendererProps {
  fields: FormField[]
  data: Record<string, any>
  onChange: (name: string, value: any) => void
  nodeId?: string
  mode?: 'create' | 'edit' | 'view'
  userMap?: Record<string, string>
  departmentMap?: Record<string, string>
  warehouseMap?: Record<string, string>
  projectMap?: Record<string, string>
  positionMap?: Record<string, string>
}

const FormTemplateRenderer: React.FC<FormTemplateRendererProps> = ({
  fields,
  data,
  onChange,
  nodeId,
  mode = 'create',
  userMap = {},
  departmentMap = {},
  warehouseMap = {},
  projectMap = {},
  positionMap = {}
}) => {
  const getFieldPermissions = (field: FormField): {
    visible: boolean
    editable: boolean
    required: boolean
  } => {
    if (!field.permissions) {
      return {
        visible: true,
        editable: mode !== 'view',
        required: field.required || false
      }
    }

    if (nodeId && field.permissions.nodePermissions && field.permissions.nodePermissions[nodeId]) {
      return {
        visible: field.permissions.nodePermissions[nodeId].visible,
        editable: field.permissions.nodePermissions[nodeId].editable && mode !== 'view',
        required: field.permissions.nodePermissions[nodeId].required ?? field.required ?? false
      }
    }

    if (field.permissions.default) {
      return {
        visible: field.permissions.default.visible,
        editable: field.permissions.default.editable && mode !== 'view',
        required: field.permissions.default.required ?? field.required ?? false
      }
    }

    return {
      visible: true,
      editable: mode !== 'view',
      required: field.required || false
    }
  }

  const renderField = (field: FormField) => {
    const permissions = getFieldPermissions(field)
    
    if (!permissions.visible) {
      return null
    }

    const value = data[field.name] ?? ''
    const isAutoGenerate = field.autoGenerate === true
    const isReadonly = !permissions.editable || isAutoGenerate

    const fieldWrapper = (content: React.ReactNode) => (
      <div 
        key={field.name} 
        className={`mb-4 ${field.layout?.width === 'half' ? 'col-span-1' : field.layout?.width === 'third' ? 'col-span-1' : 'col-span-2'}`}
      >
        {field.displayConfig?.showLabel !== false && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {permissions.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {content}
      </div>
    )

    switch (field.type) {
      case 'text':
      case 'phone':
      case 'email':
        const placeholder = isAutoGenerate && !value ? '系统自动生成' : (field.placeholder || `请输入${field.label}`)
        return fieldWrapper(
          <input
            type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={placeholder}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        )

      case 'number':
      case 'currency':
        return fieldWrapper(
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        )

      case 'textarea':
        return fieldWrapper(
          <textarea
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            rows={4}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        )

      case 'date':
        return fieldWrapper(
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        )

      case 'select':
        const selectOptions = field.options?.map(opt => {
          if (typeof opt === 'string') {
            return { label: opt, value: opt }
          }
          return opt
        }) || []
        
        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">请选择{field.label}</option>
            {selectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'reference':
        const refOptions = field.refEntity === 'departments' || field.refEntity === 'Department' ? departmentMap :
                          field.refEntity === 'users' || field.refEntity === 'Employee' ? userMap :
                          field.refEntity === 'warehouses' || field.refEntity === 'Warehouse' ? warehouseMap :
                          field.refEntity === 'projects' || field.refEntity === 'Project' ? projectMap :
                          field.refEntity === 'positions' || field.refEntity === 'Position' ? positionMap : {}
        
        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">请选择{field.label}</option>
            {Object.entries(refOptions).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )

      case 'lookup':
        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">请选择{field.label}</option>
            {Object.entries(userMap).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return fieldWrapper(
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(field.name, e.target.checked)}
              disabled={isReadonly}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">{field.label}</span>
          </div>
        )

      case 'radio':
        const radioOptions = field.options?.map(opt => {
          if (typeof opt === 'string') {
            return { label: opt, value: opt }
          }
          return opt
        }) || []
        
        return fieldWrapper(
          <div className="space-y-2">
            {radioOptions.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  disabled={isReadonly}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'user':
        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">请选择{field.label}</option>
            {Object.entries(userMap).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )

      case 'department':
        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">请选择{field.label}</option>
            {Object.entries(departmentMap).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )

      case 'file':
        return fieldWrapper(
          <div>
            {value && (
              <div className="mb-2">
                <a 
                  href={value} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  查看已上传文件
                </a>
              </div>
            )}
            {!isReadonly && (
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Handle file upload
                    console.log('File selected:', file.name)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )

      case 'array':
        const arrayValue = Array.isArray(value) ? value : []
        return fieldWrapper(
          <div>
            {arrayValue.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newArray = [...arrayValue]
                    newArray[index] = e.target.value
                    onChange(field.name, newArray)
                  }}
                  readOnly={isReadonly}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => {
                      const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                      onChange(field.name, newArray)
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            {!isReadonly && (
              <button
                type="button"
                onClick={() => {
                  onChange(field.name, [...arrayValue, ''])
                }}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                添加项
              </button>
            )}
          </div>
        )

      default:
        return fieldWrapper(
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        )
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map(field => renderField(field))}
    </div>
  )
}

export default FormTemplateRenderer
