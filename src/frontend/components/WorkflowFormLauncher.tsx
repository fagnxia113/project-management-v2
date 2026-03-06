import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, parseJWTToken } from '../config/api'
import FormTemplateRenderer from './workflow/FormTemplateRenderer'
import { FormTemplate, FormField } from '../types/workflow'

interface WorkflowFormLauncherProps {
  definitionKey: string
  onSuccess?: (processInstanceId: string) => void
  onCancel?: () => void
}

const WorkflowFormLauncher: React.FC<WorkflowFormLauncherProps> = ({ 
  definitionKey, 
  onSuccess, 
  onCancel 
}) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [definition, setDefinition] = useState<any>(null)
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [departmentMap, setDepartmentMap] = useState<Record<string, string>>({})
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({})
  const [projectMap, setProjectMap] = useState<Record<string, string>>({})
  const [positionMap, setPositionMap] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [definitionKey])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const token = localStorage.getItem('token')
      
      const defResponse = await fetch(`${API_URL.BASE}/api/workflow/definitions/key/${definitionKey}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!defResponse.ok) {
        throw new Error('流程定义不存在')
      }
      
      const defData = await defResponse.json()
      const workflowDef = defData.data || defData
      setDefinition(workflowDef)
      
      const formKey = workflowDef.form_template_id || workflowDef.definition?.nodes?.find((n: any) => n.type === 'startEvent')?.config?.formKey
      if (formKey) {
        const templateResponse = await fetch(`${API_URL.BASE}/api/workflow/form-templates/key/${formKey}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (templateResponse.ok) {
          const templateData = await templateResponse.json()
          setFormTemplate(templateData.data || templateData)
          
          const initialData: Record<string, any> = {}
          ;(templateData.data?.fields || templateData.fields || []).forEach((field: FormField) => {
            if (field.defaultValue !== undefined) {
              initialData[field.name] = field.defaultValue
            }
          })
          setFormData(initialData)
        }
      } else if (workflowDef.form_schema) {
        const initialData: Record<string, any> = {}
        workflowDef.form_schema.forEach((field: FormField) => {
          if (field.defaultValue !== undefined) {
            initialData[field.name] = field.defaultValue
          }
        })
        setFormData(initialData)
      }
      
      const loadWithTimeout = async (fn: () => Promise<void>, timeout: number = 5000) => {
        return Promise.race([
          fn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), timeout))
        ])
      }
      
      await Promise.allSettled([
        loadWithTimeout(loadUserMap),
        loadWithTimeout(loadDepartmentMap),
        loadWithTimeout(loadWarehouseMap),
        loadWithTimeout(loadProjectMap),
        loadWithTimeout(loadPositionMap)
      ])
      
    } catch (error) {
      console.error('加载数据失败:', error)
      alert('加载流程表单失败，请重试')
      onCancel?.()
    } finally {
      setLoading(false)
    }
  }

  const loadUserMap = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/data/Employee`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return
      const data = await response.json()
      const users = Array.isArray(data.data) ? data.data : []
      const map: Record<string, string> = {}
      users.forEach((user: any) => {
        map[user.id] = user.name
      })
      setUserMap(map)
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  }

  const loadDepartmentMap = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/organization/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return
      const data = await response.json()
      const departments = Array.isArray(data.data) ? data.data : []
      const map: Record<string, string> = {}
      departments.forEach((dept: any) => {
        map[dept.id] = dept.name
      })
      setDepartmentMap(map)
    } catch (error) {
      console.error('加载部门列表失败:', error)
    }
  }

  const loadWarehouseMap = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/data/Warehouse`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return
      const data = await response.json()
      const warehouses = Array.isArray(data.data) ? data.data : []
      const map: Record<string, string> = {}
      warehouses.forEach((wh: any) => {
        map[wh.id] = wh.name
      })
      setWarehouseMap(map)
    } catch (error) {
      console.error('加载仓库列表失败:', error)
    }
  }

  const loadProjectMap = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/data/Project`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return
      const data = await response.json()
      const projects = Array.isArray(data.data) ? data.data : []
      const map: Record<string, string> = {}
      projects.forEach((proj: any) => {
        map[proj.id] = proj.name
      })
      setProjectMap(map)
    } catch (error) {
      console.error('加载项目列表失败:', error)
    }
  }

  const loadPositionMap = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/organization/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) return
      const data = await response.json()
      const positions = Array.isArray(data.data) ? data.data : []
      const map: Record<string, string> = {}
      positions.forEach((pos: any) => {
        map[pos.id] = pos.name
      })
      setPositionMap(map)
    } catch (error) {
      console.error('加载岗位列表失败:', error)
    }
  }

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const fields = formTemplate?.fields || definition?.form_schema || []

    fields.forEach((field: any) => {
      const permissions = getFieldPermissions(field)
      if (!permissions.visible) return

      // 跳过自动生成/只读/禁用的字段
      const isAutoGenerated = field.autoGenerate === true || field.readonly === true || field.disabled === true
      if (isAutoGenerated) return

      const value = formData[field.name]

      if (permissions.required && (value === undefined || value === null || value === '')) {
        newErrors[field.name] = `${field.label}是必填项`
        return
      }

      if (value !== undefined && value !== null && value !== '') {
        if (field.validation) {
          if (field.validation.min !== undefined && typeof value === 'number' && value < field.validation.min) {
            newErrors[field.name] = field.validation.message || `${field.label}不能小于${field.validation.min}`
          }

          if (field.validation.max !== undefined && typeof value === 'number' && value > field.validation.max) {
            newErrors[field.name] = field.validation.message || `${field.label}不能大于${field.validation.max}`
          }

          if (field.validation.pattern && typeof value === 'string') {
            const regex = new RegExp(field.validation.pattern)
            if (!regex.test(value)) {
              newErrors[field.name] = field.validation.message || `${field.label}格式不正确`
            }
          }
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getFieldPermissions = (field: FormField): {
    visible: boolean
    editable: boolean
    required: boolean
  } => {
    if (!field.permissions) {
      return {
        visible: true,
        editable: true,
        required: field.required || false
      }
    }

    if (field.permissions.default) {
      return {
        visible: field.permissions.default.visible,
        editable: field.permissions.default.editable,
        required: field.permissions.default.required ?? field.required ?? false
      }
    }

    return {
      visible: true,
      editable: true,
      required: field.required || false
    }
  }

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

      const response = await fetch(`${API_URL.BASE}/api/workflow/v2/process/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          processKey: definitionKey,
          variables: {
            formData: formData
          },
          initiator: userInfo
        })
      })

      const responseData = await response.json()

      if (responseData.success) {
        const processInstanceId = responseData.data?.processInstanceId || responseData.data?.id
        alert('流程启动成功！')
        if (onSuccess) {
          onSuccess(processInstanceId)
        } else {
          navigate(-1)
        }
      } else {
        alert(responseData.error || '流程启动失败')
      }
    } catch (error) {
      console.error('启动流程失败:', error)
      alert('流程启动失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`${API_URL.BASE}/api/draft/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: definition?.id,
          templateKey: definitionKey,
          formData: formData,
          status: 'draft',
          metadata: {
            definitionName: definition?.name,
            category: definition?.category
          }
        })
      })

      const responseData = await response.json()

      if (responseData.success) {
        alert('草稿保存成功！')
      } else {
        alert(responseData.error || '保存草稿失败')
      }
    } catch (error) {
      console.error('保存草稿失败:', error)
      alert('保存草稿失败，请重试')
    } finally {
      setSavingDraft(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!definition) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600">流程定义不存在</h3>
          <button className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onCancel}>返回</button>
        </div>
      </div>
    )
  }

  const fields = formTemplate?.fields || definition.form_schema || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{definition.name}</h2>
        {definition.category && (
          <p className="text-gray-600 mt-1">类别: {definition.category}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <FormTemplateRenderer
            fields={fields}
            data={formData}
            onChange={handleFieldChange}
            mode="create"
            userMap={userMap}
            departmentMap={departmentMap}
            warehouseMap={warehouseMap}
            projectMap={projectMap}
            positionMap={positionMap}
          />
          
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">请修正以下错误：</h4>
              <ul className="list-disc list-inside text-sm text-red-600">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            disabled={submitting || savingDraft}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 flex items-center gap-2"
            disabled={submitting || savingDraft}
          >
            {savingDraft ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              '保存草稿'
            )}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            disabled={submitting || savingDraft}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                提交中...
              </>
            ) : (
              '提交申请'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default WorkflowFormLauncher
