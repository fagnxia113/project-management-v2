import React, { useState, useEffect } from 'react'
import { FormField, FieldPermissionConfig } from '../../types/workflow'
import { API_URL } from '../../config/api'

interface FormTemplateRendererProps {
  fields: FormField[]
  data?: Record<string, any>
  formData?: Record<string, any>
  onChange: (name: string, value: any) => void
  nodeId?: string
  currentNodeId?: string
  mode?: 'create' | 'edit' | 'view' | 'approval'
  isReadonly?: boolean
  userMap?: Record<string, string>
  departmentMap?: Record<string, string>
  warehouseMap?: Record<string, string>
  projectMap?: Record<string, string>
  positionMap?: Record<string, string>
  repairOrder?: any
}

interface EquipmentOption {
  equipment_name: string
  model_no: string
  category: string
}

const FormTemplateRenderer: React.FC<FormTemplateRendererProps> = ({
  fields,
  data,
  formData: formDataProp,
  onChange,
  nodeId,
  currentNodeId,
  mode = 'create',
  isReadonly: isReadonlyProp,
  userMap = {},
  departmentMap = {},
  warehouseMap = {},
  projectMap = {},
  positionMap = {},
  repairOrder
}) => {
  const formData = formDataProp || data || {}
  const effectiveNodeId = currentNodeId || nodeId || ''
  const isReadonly = isReadonlyProp ?? mode === 'view'

  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  const [customFields, setCustomFields] = useState<Record<string, boolean>>({})
  const [warehouseManager, setWarehouseManager] = useState<any>(null)
  const [selectedImageType, setSelectedImageType] = useState<Record<string, string>>({})
  const [accessoryOptions, setAccessoryOptions] = useState<any[]>([])
  const [loadingAccessory, setLoadingAccessory] = useState(false)

  useEffect(() => {
    loadEquipmentOptions()
    loadAccessoryOptions()
  }, [])

  useEffect(() => {
    if (formData.warehouse_id) {
      loadWarehouseManager(formData.warehouse_id)
    } else {
      setWarehouseManager(null)
      onChange('warehouse_manager_id', '')
    }
  }, [formData.warehouse_id])

  useEffect(() => {
    if (formData.items && Array.isArray(formData.items)) {
      const total = formData.items.reduce((sum: number, item: any) => {
        const quantity = item.quantity || 0
        const price = item.purchase_price || 0
        return sum + (quantity * price)
      }, 0)
      if (formData.total_price !== total) {
        onChange('total_price', total)
      }
    } else if (formData.total_price !== 0) {
      onChange('total_price', 0)
    }
  }, [formData.items])

  const loadWarehouseManager = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/warehouses/${warehouseId}/manager`)
      const result = await response.json()
      if (result.success && result.data) {
        setWarehouseManager(result.data)
        onChange('warehouse_manager_id', result.data.id)
      } else {
        setWarehouseManager(null)
        onChange('warehouse_manager_id', '')
      }
    } catch (error) {
      setWarehouseManager(null)
      onChange('warehouse_manager_id', '')
    }
  }

  const loadEquipmentOptions = async () => {
    try {
      setLoadingEquipment(true)
      const response = await fetch('/api/equipment/instances?page=1&pageSize=1000')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const options = result.data.map((eq: any) => ({
            equipment_name: eq.equipment_name,
            model_no: eq.model_no,
            category: eq.category
          }))
          setEquipmentOptions(options)
        } else {
          throw new Error(result.message || '加载设备数据失败')
        }
      } else {
        const text = await response.text()
        throw new Error(`服务器返回错误: ${response.status}`)
      }
    } catch (error) {
    } finally {
      setLoadingEquipment(false)
    }
  }

  const loadAccessoryOptions = async () => {
    try {
      setLoadingAccessory(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/accessories`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const result = await response.json()
      if (Array.isArray(result)) {
        setAccessoryOptions(result)
      } else if (result.success && result.data && Array.isArray(result.data)) {
        setAccessoryOptions(result.data)
      } else if (result.list && Array.isArray(result.list)) {
        setAccessoryOptions(result.list)
      } else if (result.success && result.total > 0 && Array.isArray(result.data)) {
        setAccessoryOptions(result.data)
      }
    } catch (error) {
    } finally {
      setLoadingAccessory(false)
    }
  }

  const getUniqueAccessoryNames = () => {
    const names = accessoryOptions.map(acc => acc.accessory_name || acc.name).filter(Boolean)
    return [...new Set(names)].sort()
  }

  const getUniqueAccessoryModels = (name?: string) => {
    let models: string[]
    if (name) {
      models = accessoryOptions.filter(acc => (acc.accessory_name || acc.name) === name).map(acc => acc.model_no || acc.model || acc.accessory_model).filter(Boolean)
    } else {
      models = accessoryOptions.map(acc => acc.model_no || acc.model || acc.accessory_model).filter(Boolean)
    }
    return [...new Set(models)].sort()
  }

  const getUniqueEquipmentNames = (category: string) => {
    const names = equipmentOptions
      .filter(opt => opt.category === category)
      .map(opt => opt.equipment_name)
    return [...new Set(names)].sort()
  }

  const getModelNosByEquipmentName = (equipmentName: string, category: string) => {
    const filtered = equipmentOptions.filter(opt => opt.equipment_name === equipmentName && opt.category === category)
    const modelNos = filtered.map(opt => opt.model_no)
    return [...new Set(modelNos)].sort()
  }

  const getFieldClassName = (fieldName: string) => {
    if (fieldName === 'accessory_desc' || fieldName === 'item_notes') {
      return 'col-span-2'
    }
    if (fieldName === 'total_price') {
      return 'col-span-1'
    }
    return ''
  }

  const isFieldCustom = (fieldKey: string) => {
    return customFields[fieldKey] || false
  }

  const setFieldCustom = (fieldKey: string, isCustom: boolean) => {
    setCustomFields(prev => ({ ...prev, [fieldKey]: isCustom }))
  }
  const getFieldPermissions = (field: FormField): {
    visible: boolean
    editable: boolean
    required: boolean
  } => {
    if ((field as any).hidden === true || (field as any).visible === false) {
      return {
        visible: false,
        editable: false,
        required: false
      }
    }

    if (mode === 'create') {
      if (!field.permissions) {
        return {
          visible: true,
          editable: true,
          required: field.required || false
        }
      }
      if (field.permissions.default) {
        return {
          visible: field.permissions.default.visible !== false,
          editable: field.permissions.default.editable !== false,
          required: field.permissions.default.required ?? field.required ?? false
        }
      }
      return {
        visible: true,
        editable: true,
        required: field.required || false
      }
    }

    if (mode === 'approval') {
      const visibleOn = (field as any).visibleOn
      const editableOn = (field as any).editableOn

      if (visibleOn && Array.isArray(visibleOn)) {
        const isVisible = visibleOn.includes(effectiveNodeId)
        if (!isVisible) {
          return {
            visible: false,
            editable: false,
            required: false
          }
        }
      }

      let isEditable = false
      if (editableOn && Array.isArray(editableOn)) {
        isEditable = editableOn.includes(effectiveNodeId)
      } else if (field.permissions) {
        if (effectiveNodeId && field.permissions.nodePermissions && field.permissions.nodePermissions[effectiveNodeId]) {
          const nodePerm = field.permissions.nodePermissions[effectiveNodeId]
          isEditable = nodePerm.editable === true
        } else if (field.permissions.default) {
          isEditable = field.permissions.default.editable === true
        }
      }

      return {
        visible: true,
        editable: isEditable,
        required: field.required || false
      }
    }

    if (!field.permissions) {
      return {
        visible: true,
        editable: !isReadonly,
        required: field.required || false
      }
    }

    if (effectiveNodeId && field.permissions.nodePermissions && field.permissions.nodePermissions[effectiveNodeId]) {
      return {
        visible: field.permissions.nodePermissions[effectiveNodeId].visible !== false,
        editable: field.permissions.nodePermissions[effectiveNodeId].editable === true && !isReadonly,
        required: field.permissions.nodePermissions[effectiveNodeId].required ?? field.required ?? false
      }
    }

    if (field.permissions.default) {
      return {
        visible: field.permissions.default.visible !== false,
        editable: field.permissions.default.editable === true && !isReadonly,
        required: field.permissions.default.required ?? field.required ?? false
      }
    }

    return {
      visible: true,
      editable: !isReadonly,
      required: field.required || false
    }
  }

  const renderFieldInput = (field: FormField, value: any, onChange: (name: string, value: any) => void, isReadonly: boolean) => {
    switch (field.type) {
      case 'text':
      case 'phone':
      case 'email':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            rows={field.rows || 4}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'select':
        let selectOptions: { label: string; value: any }[] = []
        let displayValue = value ?? ''

        if (field.name === 'warehouse_manager_id' && formData.warehouse_id) {
          if (warehouseManager) {
            selectOptions = [{ label: warehouseManager.name, value: warehouseManager.id }]
            if (value === warehouseManager.id) {
              displayValue = warehouseManager.name
            }
          } else {
            selectOptions = []
          }
        } else if (field.options) {
          selectOptions = Array.isArray(field.options) ? field.options.map(opt => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt }
            }
            return opt
          }) : []
          const selectedOption = selectOptions.find(opt => opt.value === value)
          if (selectedOption) {
            displayValue = selectedOption.label
          }
        } else {
          if (field.name === 'fromLocationType' && value) {
            displayValue = value === 'warehouse' ? '仓库' : value === 'project' ? '项目' : value
          } else if (field.name === 'toLocationType' && value) {
            displayValue = value === 'warehouse' ? '仓库' : value === 'project' ? '项目' : value
          } else if (field.name === 'fromLocationId' && value) {
            const locationType = (formData as any).fromLocationType
            if (locationType === 'warehouse' && warehouseMap[value]) {
              displayValue = warehouseMap[value]
            } else if (locationType === 'project' && projectMap[value]) {
              displayValue = projectMap[value]
            }
          } else if (field.name === 'toLocationId' && value) {
            const locationType = (formData as any).toLocationType
            if (locationType === 'warehouse' && warehouseMap[value]) {
              displayValue = warehouseMap[value]
            } else if (locationType === 'project' && projectMap[value]) {
              displayValue = projectMap[value]
            }
          } else if (field.name === 'fromManagerId' && value) {
            if (userMap[value]) {
              displayValue = userMap[value]
            }
          } else if (field.name === 'toManagerId' && value) {
            if (userMap[value]) {
              displayValue = userMap[value]
            }
          }
        }

        const isDisabled = isReadonly || field.disabled
        if (isDisabled) {
          return (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
              {displayValue || '-'}
            </div>
          )
        }

        return (
          <select
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isDisabled}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          >
            <option value="">{field.placeholder || `请选择${field.label}`}</option>
            {selectOptions.map((opt, idx) => (
              <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )

      case 'user':
        let userOptions: { label: string; value: any }[] = []
        let userDisplayValue = value ?? ''

        if (field.dynamicOptionsConfig?.source === 'warehouse_id' && formData.warehouse_id) {
          userOptions = Object.entries(userMap).map(([id, name]) => ({ label: name, value: id }))
        } else {
          userOptions = Object.entries(userMap).map(([id, name]) => ({ label: name, value: id }))
        }

        const selectedUser = userOptions.find(opt => opt.value === value)
        if (selectedUser) {
          userDisplayValue = selectedUser.label
        }

        if (field.name === 'fromManagerId' && value) {
          if (userMap[value]) {
            userDisplayValue = userMap[value]
          }
        } else if (field.name === 'toManagerId' && value) {
          if (userMap[value]) {
            userDisplayValue = userMap[value]
          }
        }

        if (isReadonly) {
          return (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
              {userDisplayValue || '-'}
            </div>
          )
        }

        return (
          <select
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          >
            <option value="">{field.placeholder || `请选择${field.label}`}</option>
            {userOptions.map((opt, idx) => (
              <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )

      case 'array':
        const arrayValue = Array.isArray(value) ? value : []
        const arrayConfig = field.arrayConfig
        const arrayFields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
        const isMainImages = field.name === 'main_images'
        const isAccessoryImages = field.name === 'accessory_images'
        const isAttachments = field.name === 'attachments'

        if (isMainImages || isAccessoryImages) {
          const imagesValue = Array.isArray(arrayValue) ? arrayValue : []
          const imageLabel = '设备图片'

          return (
            <div>
              {imagesValue.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  暂无{imageLabel}
                </div>
              ) : (
                imagesValue.map((imgItem: any, imgIndex: number) => (
                  <div key={imgIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{imageLabel} {imgIndex + 1}</span>
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => {
                            const newArray = imagesValue.filter((_: any, i: number) => i !== imgIndex)
                            onChange(field.name, newArray)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {arrayFields.map((subField: any) => (
                        <div key={subField.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                            {subField.label}
                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderNestedArrayFieldInput(subField, imgItem, imgIndex, (name: string, val: any) => {
                            const newArray = [...imagesValue]
                            newArray[imgIndex] = { ...newArray[imgIndex], [name]: val }
                            onChange(field.name, newArray)
                          }, isReadonly)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem: any = {}
                      ; (arrayFields || []).forEach((f: any) => {
                        newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''
                      })
                    newItem.id = `${field.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    onChange(field.name, [...imagesValue, newItem])
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + 上传设备图片
                </button>
              )}
            </div>
          )
        } else if (isAttachments) {
          const attachmentsValue = Array.isArray(arrayValue) ? arrayValue : []

          return (
            <div>
              {attachmentsValue.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  暂无附件
                </div>
              ) : (
                attachmentsValue.map((attachItem: any, attachIndex: number) => (
                  <div key={attachIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">附件 {attachIndex + 1}</span>
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => {
                            const newArray = attachmentsValue.filter((_: any, i: number) => i !== attachIndex)
                            onChange(field.name, newArray)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {arrayFields.map((subField: any) => (
                        <div key={subField.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                            {subField.label}
                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderNestedArrayFieldInput(subField, attachItem, attachIndex, (name: string, val: any) => {
                            const newArray = [...attachmentsValue]
                            newArray[attachIndex] = { ...newArray[attachIndex], [name]: val }
                            onChange(field.name, newArray)
                          }, isReadonly)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem: any = {}
                      ; (arrayFields || []).forEach((f: any) => {
                        newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''
                      })
                    newItem.id = `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    onChange(field.name, [...attachmentsValue, newItem])
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + 添加附件
                </button>
              )}
            </div>
          )
        } else {
          return fieldWrapper(
            <div>
              {arrayValue.map((item: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{field.label} {index + 1}</span>
                    {!isReadonly && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newArray = [...arrayValue]
                            newArray.splice(index, 0, { ...item, id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })
                            onChange(field.name, newArray)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          复制
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                            onChange(field.name, newArray)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {arrayFields.map((subField: any) => {
                      let colSpan = 1
                      if (subField.type === 'textarea') {
                        colSpan = 2
                      } else if (subField.name === 'accessories' || subField.name === 'item_notes' || subField.name === 'accessory_description') {
                        colSpan = 4
                      } else if (subField.name === 'images' || subField.name === 'attachments') {
                        colSpan = 2
                      }

                      let shouldShow = true
                      if (subField.visibleWhen) {
                        const { field: conditionField, equals, in: inValues } = subField.visibleWhen
                        if (inValues) {
                          shouldShow = inValues.includes(item[conditionField])
                        } else {
                          shouldShow = item[conditionField] === equals
                        }
                      }

                      if (!shouldShow) return null

                      const colSpanClass = colSpan === 2 ? 'col-span-2' : colSpan === 4 ? 'col-span-4' : ''

                      return (
                        <div key={subField.name} className={colSpanClass}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {subField.label}
                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderArrayFieldInput(subField, item, index, (subFieldName: string, subFieldValue: any) => {
                            const newArray = [...arrayValue]

                            // 当更改设备类别时，清空所有其他字段
                            if (subFieldName === 'category') {
                              // 创建一个新对象，只保留ID和类别
                              const resetItem: any = {
                                id: newArray[index].id,
                                category: subFieldValue
                              }

                              // 对于仪器类，默认数量为1
                              if (subFieldValue === 'instrument') {
                                resetItem.quantity = 1
                              }

                              newArray[index] = resetItem
                            } else {
                              newArray[index] = { ...newArray[index], [subFieldName]: subFieldValue }

                              if (subFieldName === 'purchase_price' || subFieldName === 'quantity') {
                                const price = subFieldName === 'purchase_price' ? subFieldValue : (newArray[index].purchase_price || 0)
                                const qty = subFieldName === 'quantity' ? subFieldValue : (newArray[index].quantity || 0)
                                newArray[index].total_price = price * qty
                              }
                            }

                            onChange(field.name, newArray)

                            const totalAmount = newArray.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
                            onChange('total_price', totalAmount)
                          }, isReadonly)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem: any = {}
                      ; (arrayFields || []).forEach((f: any) => {
                        newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''
                      })
                    newItem.id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    onChange(field.name, [...arrayValue, newItem])
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + 添加{field.label}
                </button>
              )}
            </div>
          )
        }

      case 'file':
        return (
          <div>
            {value && typeof value === 'string' && (
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
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const formData = new FormData()
                      formData.append('file', file)

                      const token = localStorage.getItem('token')
                      const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        body: formData
                      })

                      const result = await response.json()
                      if (result.success && result.data?.url) {
                        onChange(field.name, result.data.url)
                      } else {
                        console.error('文件上传失败:', result)
                        alert('文件上传失败，请重试')
                      }
                    } catch (error) {
                      console.error('文件上传错误:', error)
                      alert('文件上传错误，请重试')
                    }
                  }
                }}
                disabled={isReadonly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
              />
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )
    }
  }

  const renderField = (field: FormField) => {
    const permissions = getFieldPermissions(field)

    if (!permissions.visible) {
      return null
    }

    let value = formData[field.name] ?? ''

    if (repairOrder && (field.name === 'equipment_name' || field.name === 'equipment_category' || field.name === 'repair_quantity')) {
      value = repairOrder[field.name] ?? ''
    }

    const isAutoGenerate = (field as any).autoGenerate === true || field.readonly === true || (field as any).disabled === true
    const isReadonly = !permissions.editable || isAutoGenerate
    const showRequired = permissions.required && !isAutoGenerate

    const fieldWrapper = (content: React.ReactNode) => {
      const isArrayField = field.type === 'array' || field.name === 'items'
      const colSpan = isArrayField ? 'col-span-2' : (field.layout?.width === 'full' ? 'col-span-2' : 'col-span-1')

      return (
        <div
          key={field.name}
          className={`mb-4 ${colSpan}`}
        >
          {field.displayConfig?.showLabel !== false && (
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label}
              {showRequired && <span className="text-red-500 ml-1">*</span>}
              {isAutoGenerate && <span className="text-blue-500 text-xs ml-2">(系统自动生成)</span>}
            </label>
          )}
          {content}
        </div>
      )
    }

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
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'number':
      case 'currency':
        const isFieldDisabled = isReadonly || field.disabled
        if (field.name === 'total_price') {
          return fieldWrapper(
            <input
              type="text"
              value={value || '0'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          )
        }
        return fieldWrapper(
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isFieldDisabled}
            disabled={isFieldDisabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isFieldDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
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
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
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
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'select':
        let selectOptions: { label: string; value: any }[] = []
        let displayValue = value ?? ''

        // 优先使用动态选项（通过 props 传递）
        if (field.name === 'department_id') {
          if (Object.keys(departmentMap).length > 0) {
            selectOptions = Object.entries(departmentMap).map(([id, name]) => ({ label: name, value: id }))
          }
          if (value && departmentMap[value]) {
            displayValue = departmentMap[value]
          }
        } else if (field.name === 'position_id') {
          if (Object.keys(positionMap).length > 0) {
            selectOptions = Object.entries(positionMap).map(([id, name]) => ({ label: name, value: id }))
          }
          if (value && positionMap[value]) {
            displayValue = positionMap[value]
          }
        } else if (field.name === 'manager_id' || field.name === 'technical_lead_id') {
          // 项目负责人字段使用用户映射
          if (Object.keys(userMap).length > 0) {
            selectOptions = Object.entries(userMap).map(([id, name]) => ({ label: name, value: id }))
          }
        } else if (field.name === 'warehouse_id' && Object.keys(warehouseMap).length > 0) {
          // 仓库字段使用仓库映射
          selectOptions = Object.entries(warehouseMap).map(([id, name]) => ({ label: name, value: id }))
          if (value && warehouseMap[value]) {
            displayValue = warehouseMap[value]
          }
        } else if (field.name === 'fromLocationType' || field.name === 'toLocationType') {
          // 位置类型字段
          selectOptions = [
            { label: '仓库', value: 'warehouse' },
            { label: '项目', value: 'project' }
          ]
          if (value) {
            displayValue = value === 'warehouse' ? '仓库' : value === 'project' ? '项目' : value
          }
        } else if (field.name === 'fromLocationId' && value) {
          // 调出位置字段
          const locationType = (formData as any).fromLocationType
          if (locationType === 'warehouse' && warehouseMap[value]) {
            displayValue = warehouseMap[value]
          } else if (locationType === 'project' && projectMap[value]) {
            displayValue = projectMap[value]
          }
        } else if (field.name === 'toLocationId' && value) {
          // 调入位置字段
          const locationType = (formData as any).toLocationType
          if (locationType === 'warehouse' && warehouseMap[value]) {
            displayValue = warehouseMap[value]
          } else if (locationType === 'project' && projectMap[value]) {
            displayValue = projectMap[value]
          }
        } else if (field.name === 'fromManagerId' && value) {
          // 调出位置负责人字段
          if (userMap[value]) {
            displayValue = userMap[value]
          }
        } else if (field.name === 'toManagerId' && value) {
          // 调入位置负责人字段
          if (userMap[value]) {
            displayValue = userMap[value]
          }
        } else if (field.options) {
          // 回退到静态选项
          selectOptions = Array.isArray(field.options) ? field.options.map(opt => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt }
            }
            return opt
          }) : []
          const selectedOption = selectOptions.find(opt => opt.value === value)
          if (selectedOption) {
            displayValue = selectedOption.label
          }
        }

        const isDisabled = isReadonly || field.disabled
        if (isDisabled) {
          return fieldWrapper(
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
              {displayValue || '-'}
            </div>
          )
        }

        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isDisabled}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
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

      case 'user':
        let userDisplayValue = value ?? ''

        if (field.name === 'warehouse_manager_id' && warehouseManager) {
          userDisplayValue = warehouseManager.name
        } else if (field.name === 'fromManagerId' && value) {
          if (userMap[value]) {
            userDisplayValue = userMap[value]
          }
        } else if (field.name === 'toManagerId' && value) {
          if (userMap[value]) {
            userDisplayValue = userMap[value]
          }
        } else {
          const selectedUser = Object.entries(userMap).find(([id]) => id === value)
          if (selectedUser) {
            userDisplayValue = selectedUser[1]
          }
        }

        const isUserDisabled = isReadonly || field.disabled
        if (isUserDisabled) {
          return fieldWrapper(
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
              {userDisplayValue || '-'}
            </div>
          )
        }

        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isUserDisabled}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isUserDisabled ? 'bg-gray-100 cursor-not-allowed' : ''
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

      case 'reference':
      case 'lookup':
        // reference/lookup 类型字段：使用动态选项或静态选项
        let refOptions: { label: string; value: any }[] = []

        // 检查字段配置，确定使用哪个数据源
        if (field.refEntity === 'departments' || field.name === 'department_id') {
          refOptions = Object.entries(departmentMap).map(([id, name]) => ({ label: name, value: id }))
        } else if (field.refEntity === 'positions' || field.name === 'position_id') {
          refOptions = Object.entries(positionMap).map(([id, name]) => ({ label: name, value: id }))
        } else if (field.options) {
          // 使用静态选项
          refOptions = Array.isArray(field.options) ? field.options.map(opt => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt }
            }
            return opt
          }) : []
        }

        return fieldWrapper(
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          >
            <option value="">请选择{field.label}</option>
            {refOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
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
            {value && typeof value === 'string' && (
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
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const formData = new FormData()
                      formData.append('file', file)

                      const token = localStorage.getItem('token')
                      const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        body: formData
                      })

                      const result = await response.json()
                      if (result.success && result.data?.url) {
                        onChange(field.name, result.data.url)
                      } else {
                        console.error('文件上传失败:', result)
                        alert('文件上传失败，请重试')
                      }
                    } catch (error) {
                      console.error('文件上传错误:', error)
                      alert('文件上传错误，请重试')
                    }
                  }
                }}
                disabled={isReadonly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
              />
            )}
          </div>
        )

      case 'images':
        const imagesValue = Array.isArray(value) ? value : []
        const imageAccept = field.accept || 'image/*'

        return fieldWrapper(
          <div>
            {imagesValue.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {imagesValue.map((img: any, imgIndex: number) => (
                  <div key={imgIndex} className="relative group">
                    <img
                      src={typeof img === 'string' ? img : img.url}
                      alt={`图片 ${imgIndex + 1}`}
                      className="w-full h-20 object-cover rounded border border-gray-200"
                    />
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newArray = imagesValue.filter((_: any, i: number) => i !== imgIndex)
                          onChange(field.name, newArray)
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isReadonly && (
              <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <span className="text-gray-500">+ 点击上传图片</span>
                <input
                  type="file"
                  accept={imageAccept}
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) {
                      try {
                        const token = localStorage.getItem('token')
                        const uploadPromises = files.map(async (file) => {
                          const formData = new FormData()
                          formData.append('file', file)
                          const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                            method: 'POST',
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                            body: formData
                          })
                          const result = await response.json()
                          if (result.success && result.data?.url) {
                            return result.data.url
                          }
                          return null
                        })
                        const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean)
                        onChange(field.name, [...imagesValue, ...uploadedUrls])
                      } catch (error) {
                        console.error('图片上传错误:', error)
                        alert('图片上传失败，请重试')
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )

      case 'files':
        const filesValue = Array.isArray(value) ? value : []

        return fieldWrapper(
          <div>
            {filesValue.length > 0 && (
              <div className="space-y-2 mb-2">
                {filesValue.map((file: any, fileIndex: number) => (
                  <div key={fileIndex} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    <a
                      href={typeof file === 'string' ? file : file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm truncate flex-1"
                    >
                      {typeof file === 'string' ? file.split('/').pop() : file.name || file.url.split('/').pop()}
                    </a>
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newArray = filesValue.filter((_: any, i: number) => i !== fileIndex)
                          onChange(field.name, newArray)
                        }}
                        className="text-red-500 hover:text-red-700 text-sm ml-2"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isReadonly && (
              <label className="flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <span className="text-gray-500">+ 点击上传附件</span>
                <input
                  type="file"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length > 0) {
                      try {
                        const token = localStorage.getItem('token')
                        const uploadPromises = files.map(async (file) => {
                          const formData = new FormData()
                          formData.append('file', file)
                          const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                            method: 'POST',
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                            body: formData
                          })
                          const result = await response.json()
                          if (result.success && result.data?.url) {
                            return { url: result.data.url, name: file.name }
                          }
                          return null
                        })
                        const uploadedFiles = (await Promise.all(uploadPromises)).filter(Boolean)
                        onChange(field.name, [...filesValue, ...uploadedFiles])
                      } catch (error) {
                        console.error('文件上传错误:', error)
                        alert('文件上传失败，请重试')
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
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

      default:
        return fieldWrapper(
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )
    }
  }

  const renderArrayFieldInput = (field: FormField, item: any, index: number, onChange: (name: string, value: any) => void, isReadonly: boolean) => {
    const value = item[field.name] ?? ''

    switch (field.type) {
      case 'array':
        const arrayValue = Array.isArray(value) ? value : []
        const arrayConfig = field.arrayConfig
        const arrayFields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
        const isMainImages = field.name === 'main_images'
        const isAccessoryImages = field.name === 'accessory_images'
        const isAttachments = field.name === 'attachments'

        if (isMainImages || isAccessoryImages) {
          const imagesValue = Array.isArray(arrayValue) ? arrayValue : []
          const imageLabel = '设备图片'

          return (
            <div>
              {imagesValue.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  暂无{imageLabel}
                </div>
              ) : (
                imagesValue.map((imgItem: any, imgIndex: number) => (
                  <div key={imgIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{imageLabel} {imgIndex + 1}</span>
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => {
                            const newArray = imagesValue.filter((_: any, i: number) => i !== imgIndex)
                            onChange(field.name, newArray)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {arrayFields.map((subField: any) => (
                        <div key={subField.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                            {subField.label}
                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderNestedArrayFieldInput(subField, imgItem, imgIndex, (name: string, val: any) => {
                            const newArray = [...imagesValue]
                            newArray[imgIndex] = { ...newArray[imgIndex], [name]: val }
                            onChange(field.name, newArray)
                          }, isReadonly)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem: any = {}
                      ; (arrayFields || []).forEach((f: any) => {
                        newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''
                      })
                    newItem.id = `${field.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    onChange(field.name, [...imagesValue, newItem])
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + 上传设备图片
                </button>
              )}
            </div>
          )
        } else if (isAttachments) {
          const attachmentsValue = Array.isArray(arrayValue) ? arrayValue : []

          return (
            <div>
              {attachmentsValue.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  暂无附件
                </div>
              ) : (
                attachmentsValue.map((attachItem: any, attachIndex: number) => (
                  <div key={attachIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">附件 {attachIndex + 1}</span>
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => {
                            const newArray = attachmentsValue.filter((_: any, i: number) => i !== attachIndex)
                            onChange(field.name, newArray)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {arrayFields.map((subField: any) => (
                        <div key={subField.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                            {subField.label}
                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderNestedArrayFieldInput(subField, attachItem, attachIndex, (name: string, val: any) => {
                            const newArray = [...attachmentsValue]
                            newArray[attachIndex] = { ...newArray[attachIndex], [name]: val }
                            onChange(field.name, newArray)
                          }, isReadonly)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {!isReadonly && (
                <button
                  type="button"
                  onClick={() => {
                    const newItem: any = {}
                      ; (arrayFields || []).forEach((f: any) => {
                        newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''
                      })
                    newItem.id = `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    onChange(field.name, [...attachmentsValue, newItem])
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + 添加附件
                </button>
              )}
            </div>
          )
        }

        return null

      case 'text':
      case 'phone':
      case 'email':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'number':
      case 'currency':
        const isQuantityField = field.name === 'quantity'
        const isIndependent = item.is_independent_code === true || item.is_independent_code === 'true'
        const shouldLockQuantity = isQuantityField && isIndependent
        const finalValue = shouldLockQuantity ? 1 : value

        return (
          <input
            type="number"
            value={finalValue}
            onChange={(e) => {
              if (shouldLockQuantity) return
              onChange(field.name, e.target.value ? Number(e.target.value) : '')
            }}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly || shouldLockQuantity}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly || shouldLockQuantity ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            rows={field.rows || 2}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'select':
        let options: any[] = []

        if (field.name === 'unit') {
          options = Array.isArray(field.options) ? field.options : []
        } else if (field.dynamicOptionsConfig) {
          const { source, labelField, valueField, filterField } = field.dynamicOptionsConfig
          options = equipmentOptions.filter((opt: any) => {
            if (filterField && item[filterField]) {
              return opt[filterField] === item[filterField]
            }
            return true
          }).map((opt: any) => ({
            label: opt[labelField],
            value: opt[valueField]
          }))
        } else if (field.options) {
          options = Array.isArray(field.options) ? field.options.map(opt => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt }
            }
            return opt
          }) : []
        }

        const fieldKey = `${index}-${field.name}`
        const isCustom = isFieldCustom(fieldKey)

        if (field.allowCustom && isCustom) {
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={`请输入${field.label}`}
              readOnly={isReadonly}
              className={`w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
            />
          )
        }

        return (
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === '__other__') {
                setFieldCustom(fieldKey, true)
                onChange(field.name, '')
              } else {
                setFieldCustom(fieldKey, false)
                onChange(field.name, e.target.value)
                if (field.name === 'equipment_name') {
                  onChange('model_no', '')
                  setFieldCustom(`${index}-model_no`, false)
                }
              }
            }}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          >
            <option value="">请选择{field.label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {field.allowCustom && <option value="__other__">其他（手动输入）</option>}
          </select>
        )

      case 'checkbox':
        return (
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

      case 'file':
        const fileId = `nested-file-${field.name}-${index}-${Date.now()}`
        const isImageField = field.name === 'image_url'

        const handleNestedFileUpload = async (file: File, inputElement: HTMLInputElement) => {
          try {
            inputElement.disabled = true
            const label = inputElement.parentElement?.querySelector('label')
            if (label) label.textContent = '上传中...'

            const formData = new FormData()
            formData.append('file', file)

            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
              method: 'POST',
              headers: token ? { 'Authorization': `Bearer ${token}` } : {},
              body: formData
            })

            const result = await response.json()
            if (result.success && result.data?.url) {
              onChange(field.name, result.data.url)
            } else {
              throw new Error(result.error || '文件上传失败')
            }
          } catch (error) {
            console.error('文件上传失败:', error)
            alert('文件上传失败，请重试')
          } finally {
            inputElement.disabled = false
            const label = inputElement.parentElement?.querySelector('label')
            if (label) label.textContent = value ? '重新上传' : (isImageField ? '上传图片' : '上传附件')
          }
        }

        return (
          <div>
            {value && (
              <div className="mb-2">
                {isImageField ? (
                  <img src={value} alt="预览" className="w-40 h-40 object-cover rounded-lg border border-gray-300 shadow-sm" />
                ) : (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    查看已上传文件
                  </a>
                )}
              </div>
            )}
            {!isReadonly && (
              <div>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && e.target) {
                      handleNestedFileUpload(file, e.target)
                    }
                  }}
                  accept={isImageField ? "image/*" : "*"}
                  className="hidden"
                  id={fileId}
                />
                <label
                  htmlFor={fileId}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  {value ? '重新上传' : (isImageField ? '上传图片' : '上传附件')}
                </label>
              </div>
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )
    }
  }

  const renderNestedArrayFieldInput = (field: FormField, item: any, index: number, onChange: (name: string, value: any) => void, isReadonly: boolean) => {
    // 特殊处理 manage_code 字段：配件类设备在不勾选独立编码时禁用
    if (field.name === 'manage_code') {
      const isAccessoryCategory = item.category === 'accessory' || item.category === 'fake_load';
      const isIndependentCode = item.is_independent_code === true || item.is_independent_code === 'true';
      const shouldDisable = isAccessoryCategory && !isIndependentCode;

      return (
        <input
          type="text"
          className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${shouldDisable || isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          value={item.manage_code || ''}
          disabled={shouldDisable || isReadonly}
          onChange={(e) => onChange('manage_code', e.target.value)}
          placeholder={field.placeholder || ''}
        />
      );
    }
    const value = item[field.name] ?? ''

    switch (field.type) {
      case 'text':
      case 'phone':
      case 'email':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'number':
      case 'currency':
        if (field.name === 'quantity' && item.category === 'instrument') {
          return (
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
              1 {item.unit || '台'}
            </div>
          )
        }
        if (field.name === 'total_price') {
          const quantity = item.quantity || 0
          const price = item.purchase_price || 0
          const total = quantity * price
          return (
            <input
              type="text"
              value={total.toFixed(2)}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          )
        }
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            rows={field.rows || 2}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )

      case 'select':
        let options: any[] = []

        if (field.options) {
          options = Array.isArray(field.options) ? field.options.map(opt => {
            if (typeof opt === 'string') {
              return { label: opt, value: opt }
            }
            return opt
          }) : []
        }

        return (
          <select
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          >
            <option value="">请选择{field.label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'file':
        return (
          <div>
            {value && typeof value === 'string' && (
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
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const formData = new FormData()
                      formData.append('file', file)

                      const token = localStorage.getItem('token')
                      const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        body: formData
                      })

                      const result = await response.json()
                      if (result.success && result.data?.url) {
                        onChange(field.name, result.data.url)
                      } else {
                        console.error('文件上传失败:', result)
                        alert('文件上传失败，请重试')
                      }
                    } catch (error) {
                      console.error('文件上传错误:', error)
                      alert('文件上传错误，请重试')
                    }
                  }
                }}
                disabled={isReadonly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
              />
            )}
          </div>
        )

      case 'checkbox':
        return (
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

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            readOnly={isReadonly}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        )
    }
  }

  const renderEquipmentNameField = (field: FormField, item: any, index: number, onFieldChange: (name: string, value: any) => void, isReadonly: boolean) => {
    const value = item[field.name] ?? ''
    const isCustomName = item.isCustomName || false
    const category = item.category || ''

    if (isCustomName) {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onFieldChange(field.name, e.target.value)}
          placeholder="请输入新设备名称"
          readOnly={isReadonly}
          className={`w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
        />
      )
    } else {
      if (!category) {
        return (
          <select
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          >
            <option value="">请先选择设备类别</option>
          </select>
        )
      }

      const equipmentNames = getUniqueEquipmentNames(category)

      return (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__other__') {
              onFieldChange('__multi__', {
                isCustomName: true,
                [field.name]: ''
              })
            } else {
              onFieldChange('__multi__', {
                isCustomName: false,
                isCustomModel: false,
                [field.name]: e.target.value,
                model_no: ''
              })
            }
          }}
          disabled={isReadonly}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
        >
          <option value="">请选择设备名称</option>
          {equipmentNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="__other__">其他（手动输入）</option>
        </select>
      )
    }
  }

  const renderModelNoField = (field: FormField, item: any, index: number, onFieldChange: (name: string, value: any) => void, isReadonly: boolean) => {
    const value = item[field.name] ?? ''
    const isCustomModel = item.isCustomModel || false
    const isCustomName = item.isCustomName || false
    const equipmentName = item.equipment_name || ''
    const category = item.category || ''

    if (isCustomModel || isCustomName) {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onFieldChange(field.name, e.target.value)}
          placeholder="请输入设备型号"
          readOnly={isReadonly}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
        />
      )
    }

    if (!category) {
      return (
        <select
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        >
          <option value="">请先选择设备类别</option>
        </select>
      )
    }

    if (!equipmentName) {
      return (
        <select
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        >
          <option value="">请先选择设备名称</option>
        </select>
      )
    }

    const modelNos = getModelNosByEquipmentName(equipmentName, category)

    return (
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__other__') {
            onFieldChange('__multi__', {
              isCustomModel: true,
              [field.name]: ''
            })
          } else {
            onFieldChange('__multi__', {
              isCustomModel: false,
              [field.name]: e.target.value
            })
          }
        }}
        disabled={isReadonly}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
      >
        <option value="">请选择型号</option>
        {modelNos.map(modelNo => (
          <option key={modelNo} value={modelNo}>{modelNo}</option>
        ))}
        <option value="__other__">其他（手动输入）</option>
      </select>
    )
  }

  const renderAccessoryNameField = (value: string, item: any, onFieldChange: (updates: any) => void, isReadonly: boolean, placeholder: string = "配件名称", fieldName: string = "accessory_name") => {
    const isCustom = item.isCustomAccessoryName || false

    if (isCustom) {
      return (
        <div className="relative group">
          <input
            type="text"
            value={value}
            onChange={(e) => onFieldChange({ [fieldName]: e.target.value })}
            placeholder={`请输入${placeholder}`}
            readOnly={isReadonly}
            className={`w-full text-sm border border-blue-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
          {!isReadonly && (
            <button
              type="button"
              onClick={() => onFieldChange({ isCustomAccessoryName: false, [fieldName]: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="切换到选择模式"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )
    }

    const options = getUniqueAccessoryNames()

    return (
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__other__') {
            onFieldChange({ isCustomAccessoryName: true, [fieldName]: '' })
          } else {
            onFieldChange({ [fieldName]: e.target.value })
          }
        }}
        disabled={isReadonly}
        className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
      >
        <option value="">{`请选择${placeholder}`}</option>
        {options.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
        <option value="__other__">其他（手动输入）</option>
      </select>
    )
  }

  const renderAccessoryModelField = (value: string, item: any, onFieldChange: (updates: any) => void, isReadonly: boolean, placeholder: string = "规格型号", fieldName: string = "accessory_model", parentNameField: string = "accessory_name") => {
    const isCustom = item.isCustomAccessoryModel || false
    const accessoryName = item[parentNameField] || ''

    if (isCustom || item.isCustomAccessoryName) {
      return (
        <div className="relative group">
          <input
            type="text"
            value={value}
            onChange={(e) => onFieldChange({ [fieldName]: e.target.value })}
            placeholder={`请输入${placeholder}`}
            readOnly={isReadonly}
            className={`w-full text-sm border border-blue-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
          {!isReadonly && !item.isCustomAccessoryName && (
            <button
              type="button"
              onClick={() => onFieldChange({ isCustomAccessoryModel: false, [fieldName]: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="切换到选择模式"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )
    }

    if (!accessoryName) {
      return (
        <select
          disabled
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-gray-100 cursor-not-allowed"
        >
          <option value="">请先选择名称</option>
        </select>
      )
    }

    const models = getUniqueAccessoryModels(accessoryName)

    return (
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__other__') {
            onFieldChange({ isCustomAccessoryModel: true, [fieldName]: '' })
          } else {
            onFieldChange({ [fieldName]: e.target.value })
          }
        }}
        disabled={isReadonly}
        className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
      >
        <option value="">{`请选择${placeholder}`}</option>
        {models.map(model => (
          <option key={model} value={model}>{model}</option>
        ))}
        <option value="__other__">其他（手动输入）</option>
      </select>
    )
  }

  return (
    <div className="space-y-6">
      {(() => {
        const items = formData.items || []
        const hasAccessory = items.some((item: any) => item.category === 'accessory')
        if (hasAccessory) return null

        return (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5">
              {fields.map(field => {
                if (field.type === 'array' && field.name === 'items') return null
                return renderField(field)
              })}
            </div>
          </div>
        )
      })()}

      {fields.map(field => {
        const permissions = getFieldPermissions(field)
        if (!permissions.visible) return null

        if (field.type === 'array' && field.name === 'items') {
          const arrayValue = Array.isArray(formData[field.name]) ? formData[field.name] : []
          const arrayConfig = field.arrayConfig
          const isReadonly = !permissions.editable

          return (
            <div key={field.name} className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{field.label}</h2>
              </div>

              {arrayValue.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  暂无设备明细，点击下方按钮添加
                </div>
              ) : (
                <div className="space-y-3">
                  {arrayValue.map((item: any, index: number) => (
                    <div key={item.id || index} className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">设备 {index + 1}</span>
                        {!isReadonly && (
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                const newItem = { ...item }
                                newItem.id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                                onChange(field.name, [...arrayValue.slice(0, index + 1), newItem, ...arrayValue.slice(index + 1)])
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                                onChange(field.name, newArray)
                              }}
                              className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h4 className="text-base font-semibold text-gray-800">基本信息</h4>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {(() => {
                              const fields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
                              const isAccessory = item.category === 'accessory'

                              return fields.map((subField: any) => {
                                const shouldShowField = (() => {
                                  if (isAccessory && subField.name !== 'category') return false
                                  const basicFields = ['category', 'equipment_name', 'model_no', 'unit', 'quantity', 'purchase_price', 'total_price']
                                  if (!basicFields.includes(subField.name)) return false
                                  return true
                                })()

                                if (!shouldShowField) return null

                                return (
                                  <div key={subField.name} className={`${subField.name === 'total_price' ? 'col-span-1' : ''}`}>
                                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                      {subField.label}
                                      {subField.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {(() => {
                                      if (subField.name === 'equipment_name') {
                                        return renderEquipmentNameField(subField, item, index, (name: string, val: any) => {
                                          const newArray = [...arrayValue]
                                          if (name === '__multi__' && typeof val === 'object') {
                                            newArray[index] = { ...newArray[index], ...val }
                                          } else {
                                            newArray[index] = { ...newArray[index], [name]: val }
                                          }
                                          onChange(field.name, newArray)
                                        }, isReadonly)
                                      } else if (subField.name === 'model_no') {
                                        return renderModelNoField(subField, item, index, (name: string, val: any) => {
                                          const newArray = [...arrayValue]
                                          if (name === '__multi__' && typeof val === 'object') {
                                            newArray[index] = { ...newArray[index], ...val }
                                          } else {
                                            newArray[index] = { ...newArray[index], [name]: val }
                                          }
                                          onChange(field.name, newArray)
                                        }, isReadonly)
                                      } else {
                                        return renderNestedArrayFieldInput(subField, item, index, (name: string, val: any) => {
                                          const newArray = [...arrayValue]
                                          newArray[index] = { ...newArray[index], [name]: val }
                                          onChange(field.name, newArray)
                                        }, isReadonly)
                                      }
                                    })()}
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </div>

                        <div className={item.category === 'accessory' ? '' : 'hidden'}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h4 className="text-base font-semibold text-gray-800">配件信息</h4>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.is_independent_code === true || item.is_independent_code === 'true'}
                                  onChange={(e) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = {
                                      ...newArray[index],
                                      is_independent_code: e.target.checked,
                                      quantity: e.target.checked ? 1 : (newArray[index].quantity || 1)
                                    }
                                    onChange(field.name, newArray)
                                  }}
                                  disabled={isReadonly}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                独立编码
                              </label>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">设备名称</label>
                                {renderAccessoryNameField(
                                  item.equipment_name || '',
                                  item,
                                  (updates) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = { ...newArray[index], ...updates, model: '' }
                                    onChange(field.name, newArray)
                                  },
                                  isReadonly,
                                  "设备名称",
                                  "equipment_name"
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">设备型号</label>
                                {renderAccessoryModelField(
                                  item.model || '',
                                  item,
                                  (updates) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = { ...newArray[index], ...updates }
                                    onChange(field.name, newArray)
                                  },
                                  isReadonly,
                                  "设备型号",
                                  "model",
                                  "equipment_name"
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">单位</label>
                                <select
                                  value={item.unit || ''}
                                  onChange={(e) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = { ...newArray[index], unit: e.target.value }
                                    onChange(field.name, newArray)
                                  }}
                                  disabled={isReadonly}
                                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                >
                                  <option value="">请选择</option>
                                  <option value="个">个</option>
                                  <option value="套">套</option>
                                  <option value="件">件</option>
                                  <option value="台">台</option>
                                  <option value="把">把</option>
                                  <option value="根">根</option>
                                  <option value="块">块</option>
                                  <option value="张">张</option>
                                  <option value="条">条</option>
                                  <option value="支">支</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">数量</label>
                                <input
                                  type="number"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = { ...newArray[index], quantity: Number(e.target.value) }
                                    onChange(field.name, newArray)
                                  }}
                                  disabled={isReadonly || item.is_independent_code === true || item.is_independent_code === 'true'}
                                  className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly || item.is_independent_code === true || item.is_independent_code === 'true' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">采购单价</label>
                                <input
                                  type="number"
                                  value={item.purchase_price || ''}
                                  onChange={(e) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = { ...newArray[index], purchase_price: Number(e.target.value) }
                                    onChange(field.name, newArray)
                                  }}
                                  disabled={isReadonly}
                                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500">管理编码</label>
                                <input
                                  type="text"
                                  value={item.manage_code || ''}
                                  onChange={(e) => {
                                    const newArray = [...arrayValue]
                                    newArray[index] = { ...newArray[index], manage_code: e.target.value }
                                    onChange(field.name, newArray)
                                  }}
                                  disabled={isReadonly || !(item.is_independent_code === true || item.is_independent_code === 'true')}
                                  placeholder="选填"
                                  className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly || !(item.is_independent_code === true || item.is_independent_code === 'true') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="text-xs font-medium text-gray-500 mb-2 block">上传图片</label>
                              <div className="flex flex-wrap gap-2">
                                {Array.isArray(item.main_images) && item.main_images.map((img: string, imgIdx: number) => (
                                  <div key={imgIdx} className="relative group">
                                    <img src={img} alt="" className="w-20 h-20 object-cover rounded border border-gray-200" />
                                    {!isReadonly && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newArray = [...arrayValue]
                                          const newImages = [...(newArray[index].main_images || [])]
                                          newImages.splice(imgIdx, 1)
                                          newArray[index] = { ...newArray[index], main_images: newImages }
                                          onChange(field.name, newArray)
                                        }}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {!isReadonly && (
                                  <label className="flex items-center justify-center w-20 h-20 border border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                    <span className="text-gray-500 text-xs">+ 上传</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={async (e) => {
                                        const files = Array.from(e.target.files || [])
                                        const uploadedImages: string[] = []

                                        for (const file of files) {
                                          const formData = new FormData()
                                          formData.append('file', file)

                                          const token = localStorage.getItem('token')
                                          const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                                            method: 'POST',
                                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                                            body: formData
                                          })

                                          if (response.ok) {
                                            const result = await response.json()
                                            if (result.success && result.fileUrl) {
                                              uploadedImages.push(result.fileUrl)
                                            }
                                          }
                                        }

                                        if (uploadedImages.length > 0) {
                                          const newArray = [...arrayValue]
                                          const currentImages = Array.isArray(newArray[index].main_images) ? newArray[index].main_images : []
                                          newArray[index] = {
                                            ...newArray[index],
                                            main_images: [...currentImages, ...uploadedImages]
                                          }
                                          onChange(field.name, newArray)
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={(item.category === 'instrument' || item.category === 'fake_load' || item.category === 'cable') ? '' : 'hidden'}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h4 className="text-base font-semibold text-gray-800">详细信息</h4>
                          </div>
                          <div className="space-y-3">
                            {/* 仪器类和假负载类设备不显示独立编码选择框；独立配件类显示 */}
                            {item.category === 'accessory' && (
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.is_independent_code === true || item.is_independent_code === 'true'}
                                    onChange={(e) => {
                                      const newArray = [...arrayValue]
                                      newArray[index] = {
                                        ...newArray[index],
                                        is_independent_code: e.target.checked,
                                        quantity: e.target.checked ? 1 : (newArray[index].quantity || 1)
                                      }
                                      onChange(field.name, newArray)
                                    }}
                                    disabled={isReadonly}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  独立编码
                                </label>
                              </div>
                            )}
                            {(() => {
                              const fields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
                              const isInstrument = item.category === 'instrument'

                              if (isInstrument) {
                                return (
                                  <>
                                    <div className="grid grid-cols-4 gap-2">
                                      {fields.filter((f: any) => ['manage_code', 'serial_numbers', 'manufacturer', 'technical_params'].includes(f.name)).map((subField: any) => (
                                        <div key={subField.name}>
                                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                            {subField.label}
                                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                                          </label>
                                          {renderNestedArrayFieldInput(subField, item, index, (name: string, val: any) => {
                                            const newArray = [...arrayValue]
                                            newArray[index] = { ...newArray[index], [name]: val }
                                            onChange(field.name, newArray)
                                          }, isReadonly)}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-0.5 h-4 bg-blue-500 rounded-full"></div>
                                        <h5 className="text-sm font-medium text-blue-800">校准证书信息</h5>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        {fields.filter((f: any) => ['certificate_no', 'certificate_issuer', 'certificate_expiry_date'].includes(f.name)).map((subField: any) => (
                                          <div key={subField.name}>
                                            <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                              {subField.label}
                                              {subField.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>
                                            {renderNestedArrayFieldInput(subField, item, index, (name: string, val: any) => {
                                              const newArray = [...arrayValue]
                                              newArray[index] = { ...newArray[index], [name]: val }
                                              onChange(field.name, newArray)
                                            }, isReadonly)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {fields.filter((f: any) => ['item_notes'].includes(f.name)).map((subField: any) => (
                                        <div key={subField.name}>
                                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                            {subField.label}
                                            {subField.required && <span className="text-red-500 ml-1">*</span>}
                                          </label>
                                          {renderNestedArrayFieldInput(subField, item, index, (name: string, val: any) => {
                                            const newArray = [...arrayValue]
                                            newArray[index] = { ...newArray[index], [name]: val }
                                            onChange(field.name, newArray)
                                          }, isReadonly)}
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )
                              }

                              return (
                                <div className="grid grid-cols-2 gap-2">
                                  {fields.filter((f: any) => {
                                    const baseFields = ['manufacturer', 'technical_params', 'item_notes'];
                                    if (item.category !== 'fake_load') {
                                      baseFields.push('manage_code', 'serial_numbers', 'accessory_desc');
                                    } else {
                                      baseFields.push('manage_code');
                                    }
                                    return baseFields.includes(f.name);
                                  }).map((subField: any) => (
                                    <div key={subField.name}>
                                      <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                        {subField.label}
                                        {subField.required && <span className="text-red-500 ml-1">*</span>}
                                      </label>
                                      {renderNestedArrayFieldInput(subField, item, index, (name: string, val: any) => {
                                        const newArray = [...arrayValue]
                                        newArray[index] = { ...newArray[index], [name]: val }
                                        onChange(field.name, newArray)
                                      }, isReadonly)}
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        <div className={(item.category === 'instrument' || item.category === 'fake_load' || item.category === 'cable') ? '' : 'hidden'}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h4 className="text-base font-semibold text-gray-800">图片信息</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {(() => {
                              const fields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
                              return fields.map((subField: any) => {
                                if (subField.type !== 'images') return null

                                const imageValue = Array.isArray(item[subField.name]) ? item[subField.name] : []
                                const imageLabel = subField.label
                                const imageAccept = subField.accept || 'image/*'

                                return (
                                  <div key={subField.name} className="border border-gray-200 rounded-lg p-2">
                                    <span className="text-sm font-medium text-gray-700">{imageLabel}</span>
                                    {imageValue.length > 0 && (
                                      <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
                                        {imageValue.map((img: any, imgIndex: number) => (
                                          <div key={imgIndex} className="relative group">
                                            <img
                                              src={typeof img === 'string' ? img : img.url}
                                              alt={`图片 ${imgIndex + 1}`}
                                              className="w-full h-16 object-cover rounded border border-gray-200"
                                            />
                                            {!isReadonly && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    [subField.name]: imageValue.filter((_: any, i: number) => i !== imgIndex)
                                                  }
                                                  onChange(field.name, newArray)
                                                }}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                ×
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!isReadonly && (
                                      <label className="flex items-center justify-center px-3 py-1.5 border border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors mt-2">
                                        <span className="text-gray-500 text-sm">+ 上传</span>
                                        <input
                                          type="file"
                                          accept={imageAccept}
                                          multiple
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || [])
                                            if (files.length > 0) {
                                              try {
                                                const token = localStorage.getItem('token')
                                                const uploadPromises = files.map(async (file) => {
                                                  const formData = new FormData()
                                                  formData.append('file', file)
                                                  const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                                                    method: 'POST',
                                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                                                    body: formData
                                                  })
                                                  const result = await response.json()
                                                  if (result.success && result.fileUrl) {
                                                    return result.fileUrl
                                                  }
                                                  return null
                                                })
                                                const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean)
                                                const newArray = [...arrayValue]
                                                newArray[index] = {
                                                  ...newArray[index],
                                                  [subField.name]: [...imageValue, ...uploadedUrls]
                                                }
                                                onChange(field.name, newArray)
                                              } catch (error) {
                                                console.error('图片上传错误:', error)
                                                alert('图片上传失败，请重试')
                                              }
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </div>

                        <div className={(item.category === 'instrument' || item.category === 'fake_load' || item.category === 'cable') ? '' : 'hidden'}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h4 className="text-base font-semibold text-gray-800">附件信息</h4>
                          </div>
                          <div className="space-y-2">
                            {(() => {
                              const fields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
                              return fields.map((subField: any) => {
                                if (subField.type !== 'files') return null

                                const filesValue = Array.isArray(item[subField.name]) ? item[subField.name] : []

                                return (
                                  <div key={subField.name}>
                                    {filesValue.length > 0 && (
                                      <div className="space-y-1 mb-2">
                                        {filesValue.map((file: any, fileIndex: number) => (
                                          <div key={fileIndex} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                                            <a
                                              href={typeof file === 'string' ? file : file.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 text-sm truncate flex-1"
                                            >
                                              {typeof file === 'string' ? file.split('/').pop() : file.name || file.url.split('/').pop()}
                                            </a>
                                            {!isReadonly && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    [subField.name]: filesValue.filter((_: any, i: number) => i !== fileIndex)
                                                  }
                                                  onChange(field.name, newArray)
                                                }}
                                                className="text-red-500 hover:text-red-700 text-xs ml-2"
                                              >
                                                删除
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!isReadonly && (
                                      <label className="flex items-center justify-center px-3 py-1.5 border border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                        <span className="text-gray-500 text-sm">+ 上传附件</span>
                                        <input
                                          type="file"
                                          multiple
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || [])
                                            if (files.length > 0) {
                                              try {
                                                const token = localStorage.getItem('token')
                                                const uploadPromises = files.map(async (file) => {
                                                  const formData = new FormData()
                                                  formData.append('file', file)
                                                  const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                                                    method: 'POST',
                                                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                                                    body: formData
                                                  })
                                                  const result = await response.json()
                                                  if (result.success && result.fileUrl) {
                                                    return { url: result.fileUrl, name: file.name }
                                                  }
                                                  return null
                                                })
                                                const uploadedFiles = (await Promise.all(uploadPromises)).filter(Boolean)
                                                const newArray = [...arrayValue]
                                                newArray[index] = {
                                                  ...newArray[index],
                                                  [subField.name]: [...filesValue, ...uploadedFiles]
                                                }
                                                onChange(field.name, newArray)
                                              } catch (error) {
                                                console.error('文件上传错误:', error)
                                                alert('文件上传失败，请重试')
                                              }
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </div>

                        {/* 只有仪器类设备显示配件清单；独立配件类本身已是配件，不显示配件清单 */}
                        {item.category === 'instrument' && (() => {
                          const fields = Array.isArray(arrayConfig?.fields) ? arrayConfig.fields : []
                          const accessoryListField = fields.find((f: any) => f.name === 'accessory_list')
                          if (!accessoryListField) return null

                          const accessoryValue = Array.isArray(item.accessory_list) ? item.accessory_list : []
                          const accessoryFields = Array.isArray(accessoryListField.arrayConfig?.fields) ? accessoryListField.arrayConfig.fields : []

                          return (
                            <div className="border-b border-gray-200 pb-3" key="instrument-info">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                <h4 className="text-base font-semibold text-gray-800">配件清单</h4>
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                {!isReadonly && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItem: any = {}
                                      accessoryFields.forEach((f: any) => {
                                        newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''
                                      })
                                      newItem.id = `accessory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                                      const newArray = [...arrayValue]
                                      newArray[index] = {
                                        ...newArray[index],
                                        accessory_list: [...accessoryValue, newItem]
                                      }
                                      onChange(field.name, newArray)
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    + 添加配件
                                  </button>
                                )}
                              </div>
                              {accessoryValue.length === 0 ? (
                                <div className="text-center py-2 text-gray-400 text-sm">
                                  暂无配件
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {accessoryValue.map((accItem: any, accIndex: number) => (
                                    <div key={accItem.id || accIndex} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-start gap-3">
                                        <span className="text-sm font-medium text-gray-600 w-8 flex-shrink-0">{accIndex + 1}</span>
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={accItem.is_independent_code === true || accItem.is_independent_code === 'true'}
                                                onChange={(e) => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    accessory_list: accessoryValue.map((item: any, i: number) =>
                                                      i === accIndex ? {
                                                        ...item,
                                                        is_independent_code: e.target.checked,
                                                        accessory_quantity: e.target.checked ? 1 : (item.accessory_quantity || 1)
                                                      } : item
                                                    )
                                                  }
                                                  onChange(field.name, newArray)
                                                }}
                                                disabled={isReadonly}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                              />
                                              独立编码
                                            </label>
                                          </div>
                                          <div className="grid grid-cols-3 gap-3">
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs font-medium text-gray-500">配件名称</label>
                                              {renderAccessoryNameField(
                                                accItem.accessory_name || '',
                                                accItem,
                                                (updates) => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    accessory_list: accessoryValue.map((item: any, i: number) =>
                                                      i === accIndex ? { ...item, ...updates, accessory_model: '' } : item
                                                    )
                                                  }
                                                  onChange(field.name, newArray)
                                                },
                                                isReadonly,
                                                "配件名称",
                                                "accessory_name"
                                              )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs font-medium text-gray-500">规格型号</label>
                                              {renderAccessoryModelField(
                                                accItem.accessory_model || '',
                                                accItem,
                                                (updates) => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    accessory_list: accessoryValue.map((item: any, i: number) =>
                                                      i === accIndex ? { ...item, ...updates } : item
                                                    )
                                                  }
                                                  onChange(field.name, newArray)
                                                },
                                                isReadonly,
                                                "规格型号",
                                                "accessory_model",
                                                "accessory_name"
                                              )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs font-medium text-gray-500">单位</label>
                                              <select
                                                value={accItem.accessory_unit || ''}
                                                onChange={(e) => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    accessory_list: accessoryValue.map((item: any, i: number) =>
                                                      i === accIndex ? { ...item, accessory_unit: e.target.value } : item
                                                    )
                                                  }
                                                  onChange(field.name, newArray)
                                                }}
                                                disabled={isReadonly}
                                                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                                              >
                                                <option value="">-</option>
                                                <option value="个">个</option>
                                                <option value="套">套</option>
                                                <option value="件">件</option>
                                                <option value="台">台</option>
                                                <option value="把">把</option>
                                                <option value="根">根</option>
                                                <option value="块">块</option>
                                                <option value="张">张</option>
                                                <option value="条">条</option>
                                                <option value="支">支</option>
                                              </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs font-medium text-gray-500">数量</label>
                                              <input
                                                type="number"
                                                value={accItem.accessory_quantity || ''}
                                                onChange={(e) => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    accessory_list: accessoryValue.map((item: any, i: number) =>
                                                      i === accIndex ? { ...item, accessory_quantity: Number(e.target.value) } : item
                                                    )
                                                  }
                                                  onChange(field.name, newArray)
                                                }}
                                                disabled={isReadonly || accItem.is_independent_code === true || accItem.is_independent_code === 'true'}
                                                className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly || accItem.is_independent_code === true || accItem.is_independent_code === 'true' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                              />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs font-medium text-gray-500">管理编码</label>
                                              <input
                                                type="text"
                                                value={accItem.manage_code || ''}
                                                onChange={(e) => {
                                                  const newArray = [...arrayValue]
                                                  newArray[index] = {
                                                    ...newArray[index],
                                                    accessory_list: accessoryValue.map((item: any, i: number) =>
                                                      i === accIndex ? { ...item, manage_code: e.target.value } : item
                                                    )
                                                  }
                                                  onChange(field.name, newArray)
                                                }}
                                                disabled={isReadonly || !(accItem.is_independent_code === true || accItem.is_independent_code === 'true')}
                                                placeholder="选填"
                                                className={`w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadonly || !(accItem.is_independent_code === true || accItem.is_independent_code === 'true') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                              />
                                            </div>
                                          </div>
                                          <div className="col-span-2 mt-2">
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">图片</label>
                                            <div className="flex flex-wrap gap-2">
                                              {Array.isArray(accItem.accessory_images) && accItem.accessory_images.map((img: any, imgIdx: number) => (
                                                <div key={imgIdx} className="relative group">
                                                  <img
                                                    src={typeof img === 'string' ? img : img.url}
                                                    alt={`配件图片 ${imgIdx + 1}`}
                                                    className="w-16 h-16 object-cover rounded border border-gray-200"
                                                  />
                                                  {!isReadonly && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const newArray = [...arrayValue]
                                                        newArray[index] = {
                                                          ...newArray[index],
                                                          accessory_list: accessoryValue.map((item: any, i: number) =>
                                                            i === accIndex ? {
                                                              ...item,
                                                              accessory_images: (item.accessory_images || []).filter((_: any, idx: number) => idx !== imgIdx)
                                                            } : item
                                                          )
                                                        }
                                                        onChange(field.name, newArray)
                                                      }}
                                                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                                                    >
                                                      ×
                                                    </button>
                                                  )}
                                                </div>
                                              ))}
                                              {!isReadonly && (
                                                <label className="flex items-center justify-center px-3 py-1.5 border border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                                  <span className="text-gray-500 text-sm">+ 上传</span>
                                                  <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                      const files = Array.from(e.target.files || [])
                                                      if (files.length > 0) {
                                                        const token = localStorage.getItem('token')
                                                        const uploadPromises = files.map(async (file) => {
                                                          const formData = new FormData()
                                                          formData.append('file', file)
                                                          const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                                                            method: 'POST',
                                                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                                                            body: formData
                                                          })
                                                          const result = await response.json()
                                                          return result.success ? result.fileUrl : null
                                                        })
                                                        const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean)
                                                        const newArray = [...arrayValue]
                                                        newArray[index] = {
                                                          ...newArray[index],
                                                          accessory_list: accessoryValue.map((item: any, i: number) =>
                                                            i === accIndex ? {
                                                              ...item,
                                                              accessory_images: [...(item.accessory_images || []), ...uploadedUrls]
                                                            } : item
                                                          )
                                                        }
                                                        onChange(field.name, newArray)
                                                      }
                                                    }}
                                                  />
                                                </label>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {!isReadonly && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newArray = [...arrayValue]
                                              newArray[index] = {
                                                ...newArray[index],
                                                accessory_list: accessoryValue.filter((_: any, i: number) => i !== accIndex)
                                              }
                                              onChange(field.name, newArray)
                                            }}
                                            className="flex-shrink-0 text-red-500 hover:text-red-700 p-1.5"
                                            title="删除配件"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                    </div>
                  </div>
                ))}
                </div>
              )}
              {!isReadonly && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const newItem: any = {}
                        ; (Array.isArray(arrayConfig.fields) ? arrayConfig.fields : []).forEach((f: any) => {
                          if (f.type === 'array') {
                            newItem[f.name] = []
                          } else {
                            newItem[f.name] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'number' ? 0 : '')
                          }
                        })
                      newItem.id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                      newItem.isCustomName = false
                      newItem.isCustomModel = false

                      onChange(field.name, [...arrayValue, newItem])
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
                  >
                    + 添加设备明细
                  </button>
                </div>
              )}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

export default FormTemplateRenderer