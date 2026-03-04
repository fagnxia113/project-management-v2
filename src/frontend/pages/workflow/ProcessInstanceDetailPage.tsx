/**
 * 流程实例详情页面
 * 统一的流程详情展示页面，所有节点都看到同样的表单内容
 * 包含：表单详情区域 + 流程进度区域 + 审批操作区域
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL, parseJWTToken } from '../../config/api'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  GitBranch,
  FileText,
  Calendar,
  User,
  Send,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'user' | 'boolean' | 'lookup' | 'reference'
  required: boolean
  options?: { label: string; value: any }[]
  businessConfig?: {
    module?: string
    entityType?: string
    lookupField?: string
    displayField?: string
  }
  refEntity?: string
  refLabel?: string
  refValue?: string
}

interface ProcessInstance {
  id: string
  definition_id: string
  definition_key: string
  title: string
  status: string
  result: string | null
  variables: {
    formData: Record<string, any>
  }
  initiator_id: string
  initiator_name: string
  start_time: string
  end_time: string | null
  current_node_id: string | null
  current_node_name: string | null
  business_id: string | null
}

interface Task {
  id: string
  name: string
  node_id: string
  status: string
  assignee_id: string
  assignee_name: string
  result: string | null
  comment: string | null
  created_at: string
  completed_at: string | null
}

interface ExecutionLog {
  id: string
  action: string
  node_id: string
  node_name?: string
  status: string
  operator_id?: string
  operator_name?: string
  comment?: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  'pending': { label: '审批中', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  'running': { label: '审批中', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  'approved': { label: '已通过', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'rejected': { label: '已驳回', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  'withdrawn': { label: '已撤回', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: RotateCcw },
  'completed': { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'terminated': { label: '已终止', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  'skipped': { label: '已跳过', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: ChevronDown }
}

// 表单字段分组配置（按业务类型）
const FORM_GROUP_CONFIG: Record<string, { title: string; fields: string[] }[]> = {
  'project-approval': [
    { title: '基本信息', fields: ['code', 'name', 'type', 'status'] },
    { title: '项目信息', fields: ['country', 'province', 'city', 'address', 'start_date', 'end_date'] },
    { title: '项目负责人', fields: ['manager_id', 'technical_lead_id'] },
    { title: '项目规模', fields: ['building_area', 'it_capacity', 'cabinet_count', 'cabinet_power'] },
    { title: '技术架构', fields: ['power_architecture', 'hvac_architecture', 'fire_architecture', 'weak_electric_architecture'] },
    { title: '商务信息', fields: ['customer_id', 'end_customer', 'budget', 'description'] }
  ],
  'employee-onboard': [
    { title: '基本信息', fields: ['employee_name', 'employee_id', 'gender', 'phone', 'email'] },
    { title: '岗位信息', fields: ['department_id', 'position_id', 'employee_type', 'start_date'] },
    { title: '其他信息', fields: ['salary', 'notes'] }
  ],
  'equipment-transfer': [
    { title: '调拨信息', fields: ['fromLocationType', 'toLocationType', 'transferReason', 'estimatedArrivalDate'] },
    { title: '调出位置', fields: ['_fromLocationName', '_fromManagerName'] },
    { title: '调入位置', fields: ['_toLocationName', '_toManagerName'] },
    { title: '发货信息', fields: ['shippingDate', 'waybillNo', 'shippingNotes'] },
    { title: '收货信息', fields: ['receiveStatus', 'receiveComment'] }
  ],
  'default': [
    { title: '表单内容', fields: [] } // 空数组表示显示所有字段
  ]
}

export default function ProcessInstanceDetailPage() {
  const { instanceId } = useParams<{ instanceId: string }>()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [instance, setInstance] = useState<ProcessInstance | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string; value: any }[]>>({})
  
  // 审批操作状态
  const [actionType, setActionType] = useState<'approve' | 'reject' | ''>('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [taskFormData, setTaskFormData] = useState<Record<string, any>>({})
  const [taskFormFields, setTaskFormFields] = useState<FormField[]>([])

  useEffect(() => {
    if (instanceId) {
      loadInstanceData()
    }
  }, [instanceId])

  const loadInstanceData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // 1. 加载流程实例详情
      const instanceRes = await fetch(`${API_URL.BASE}/api/workflow/processes/${instanceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const instanceData = await instanceRes.json()
      
      if (!instanceData.success) {
        throw new Error('流程实例不存在')
      }
      
      setInstance(instanceData.data)
      
      // 2. 加载流程定义获取表单字段
      const definitionRes = await fetch(`${API_URL.BASE}/api/workflow/definitions/${instanceData.data.definition_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const definitionData = await definitionRes.json()
      
      console.log('[ProcessInstanceDetailPage] definitionData:', definitionData.data)
      
      if (definitionData.success && definitionData.data) {
        // 优先使用 form_template_id 加载表单模板
        if (definitionData.data.form_template_id) {
          console.log('[ProcessInstanceDetailPage] 使用 form_template_id 加载表单:', definitionData.data.form_template_id)
          const templateRes = await fetch(`${API_URL.BASE}/api/workflow/form-templates/${definitionData.data.form_template_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (templateRes.ok) {
            const templateData = await templateRes.json()
            const template = templateData.data || templateData
            console.log('[ProcessInstanceDetailPage] template:', template)
            if (template.fields) {
              console.log('[ProcessInstanceDetailPage] 设置表单字段:', template.fields)
              setFormFields(template.fields)
              await loadDynamicOptions(template.fields)
            }
          }
        } else if (definitionData.data.form_schema) {
          console.log('[ProcessInstanceDetailPage] 使用 form_schema 加载表单')
          setFormFields(definitionData.data.form_schema)
          await loadDynamicOptions(definitionData.data.form_schema)
        }
      }
      
      // 3. 加载任务列表
      const tasksRes = await fetch(`${API_URL.BASE}/api/workflow/v2/tasks/instance/${instanceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const tasksData = await tasksRes.json()
      
      if (tasksData.success) {
        setTasks(tasksData.data || [])
        
        // 检查当前用户是否有待处理的任务
        let userId = 'current-user'
        if (token) {
          try {
            const payload = parseJWTToken(token)
            if (payload) {
              userId = payload.userId || payload.id || 'current-user'
            }
          } catch (e) {
            console.warn('Token解析失败')
          }
        }
        const pendingTask = (tasksData.data || []).find(
          (t: Task) => t.assignee_id === userId && ['assigned', 'in_progress'].includes(t.status)
        )
        setCurrentTask(pendingTask || null)
        
        // 加载当前任务的表单字段
        if (pendingTask) {
          await loadTaskFormFields(pendingTask, instanceData.data.definition_id)
        }
      }
      
      // 4. 加载执行日志
      const logsRes = await fetch(`${API_URL.BASE}/api/workflow/processes/${instanceId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const logsData = await logsRes.json()
      
      if (logsData.success) {
        setLogs(logsData.data || [])
      }
      
    } catch (error) {
      console.error('加载流程实例详情失败:', error)
      alert('加载失败')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  // 加载动态选项
  const loadDynamicOptions = async (fields: FormField[]) => {
    const options: Record<string, { label: string; value: any }[]> = {}
    const token = localStorage.getItem('token')
    
    for (const field of fields) {
      if (field.businessConfig?.entityType) {
        try {
          const res = await fetch(`${API_URL.BASE}/api/data/${field.businessConfig.entityType}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          const items = data.success ? data.data : (Array.isArray(data.data) ? data.data : [])
          
          const labelField = field.businessConfig.displayField || 'name'
          const valueField = field.businessConfig.lookupField || 'id'
          
          options[field.name] = items.map((item: any) => ({
            label: item[labelField],
            value: item[valueField]
          }))
        } catch (e) {
          console.error(`加载${field.label}选项失败:`, e)
        }
      } else if (field.type === 'user') {
        try {
          const res = await fetch(`${API_URL.BASE}/api/data/Employee`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          const items = data.success ? data.data : (Array.isArray(data.data) ? data.data : [])
          
          options[field.name] = items.map((item: any) => ({
            label: `${item.name}${item.position_name ? ` (${item.position_name})` : ''}`,
            value: item.id
          }))
        } catch (e) {
          console.error('加载员工选项失败:', e)
        }
      } else if (field.options) {
        options[field.name] = field.options
      }
    }
    
    setDynamicOptions(options)
  }

  // 获取字段显示值
  const getDisplayValue = (fieldName: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-'
    
    // 从动态选项中查找
    const options = dynamicOptions[fieldName]
    if (options) {
      const option = options.find(o => o.value === value)
      if (option) return option.label
    }
    
    // 布尔值处理
    if (typeof value === 'boolean') return value ? '是' : '否'
    
    // 日期格式化
    if (fieldName.includes('date') && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString('zh-CN')
      } catch { }
    }
    
    // 对象转字符串
    if (typeof value === 'object') return JSON.stringify(value)
    
    return String(value)
  }

  // 处理审批提交
  const handleSubmit = async () => {
    if (!currentTask || !actionType) return
    
    if (actionType === 'reject' && !comment.trim()) {
      alert('驳回时必须填写意见')
      return
    }
    
    // 验证必填字段
    for (const field of taskFormFields) {
      if (field.required && !taskFormData[field.name]) {
        alert(`请填写${field.label}`)
        return
      }
    }
    
    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      
      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/tasks/${currentTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionType === 'approve' ? 'approve' : 'reject',
          comment: comment.trim(),
          formData: taskFormData
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        alert(actionType === 'approve' ? '审批通过' : '已驳回')
        // 重新加载流程实例数据，而不是直接导航
        await loadInstanceData()
        // 清空表单数据和操作状态
        setTaskFormData({})
        setActionType('')
        setComment('')
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('审批操作失败:', error)
      alert('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 处理撤回
  const handleWithdraw = async () => {
    if (!instance || !confirm('确定要撤回此申请吗？')) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/workflow/processes/${instance.id}/withdraw`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        alert('已撤回')
        loadInstanceData()
      }
    } catch (error) {
      alert('撤回成功')
      loadInstanceData()
    }
  }

  // 加载当前任务的表单字段
  const loadTaskFormFields = async (task: Task, definitionId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      // 获取流程定义
      const definitionRes = await fetch(`${API_URL.BASE}/api/workflow/definitions/${definitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const definitionData = await definitionRes.json()
      
      console.log('Definition data:', definitionData)
      
      if (definitionData.success && definitionData.data?.definition) {
        const definition = definitionData.data.definition
        
        // 找到当前节点
        const currentNode = definition.nodes.find((n: any) => n.id === task.node_id)
        
        console.log('Current node:', currentNode)
        
        if (currentNode?.config?.formKey) {
          const formKey = currentNode.config.formKey
          
          console.log('Form key:', formKey)
          
          // 获取表单字段
          const formRes = await fetch(`${API_URL.BASE}/api/workflow/form-templates/key/${formKey}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const formData = await formRes.json()
          
          console.log('Form data:', formData)
          
          if (formData.success && formData.data?.fields) {
            setTaskFormFields(formData.data.fields)
          } else {
            console.error('Form data error:', formData)
          }
        }
      }
    } catch (error) {
      console.error('加载任务表单字段失败:', error)
    }
  }

  // 获取表单分组
  const getFormGroups = () => {
    const definitionKey = instance?.definition_key || ''
    const config = FORM_GROUP_CONFIG[definitionKey] || FORM_GROUP_CONFIG['default']
    const formData = instance?.variables?.formData || {}
    
    return config.map(group => {
      let fields: string[]
      if (group.fields.length === 0) {
        // 显示所有字段
        fields = Object.keys(formData)
      } else {
        // 只显示存在的字段
        fields = group.fields.filter(f => formData.hasOwnProperty(f))
      }
      
      return {
        title: group.title,
        fields: fields.filter(f => !f.startsWith('_')) // 过滤内部字段
      }
    }).filter(g => g.fields.length > 0)
  }

  // 格式化日期时间
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">流程实例不存在</h3>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
          返回
        </button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[instance.status] || STATUS_CONFIG[instance.result || ''] || STATUS_CONFIG['pending']
  const StatusIcon = statusConfig.icon

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-semibold text-gray-900">{instance.title}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {instance.initiator_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateTime(instance.start_time)}
                </span>
                <span className="font-mono text-xs">#{instance.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/workflow/visualization/${instance.id}`)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <GitBranch className="w-4 h-4" />
              查看流程图
            </button>
            {instance.status === 'running' && (
              <button
                onClick={handleWithdraw}
                className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                撤回
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：表单内容 */}
        <div className="col-span-2 space-y-4">
          {/* 表单详情 - 分组展示 */}
          {getFormGroups().map((group, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  {group.title}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {group.fields.map(fieldName => {
                    const field = formFields.find(f => f.name === fieldName)
                    const value = instance.variables?.formData?.[fieldName]
                    
                    return (
                      <div key={fieldName} className="space-y-1">
                        <label className="text-sm text-gray-500">
                          {field?.label || fieldName}
                        </label>
                        <div className="text-gray-900">
                          {getDisplayValue(fieldName, value)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* 审批记录 */}
          {logs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer"
                onClick={() => setShowAllLogs(!showAllLogs)}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  审批记录
                </h3>
                {showAllLogs ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
              <div className={`divide-y divide-gray-100 ${showAllLogs ? '' : 'max-h-48 overflow-hidden'}`}>
                {logs.slice().reverse().map((log, idx) => (
                  <div key={log.id || idx} className="px-6 py-3 flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      log.action === 'task_complete' && log.status === 'approved' ? 'bg-green-500' :
                      log.action === 'task_complete' && log.status === 'rejected' ? 'bg-red-500' :
                      log.action === 'process_start' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900">
                          {log.node_name || log.node_id || '流程启动'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          log.status === 'approved' ? 'bg-green-100 text-green-700' :
                          log.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {log.action === 'process_start' ? '发起' :
                           log.status === 'approved' ? '通过' :
                           log.status === 'rejected' ? '驳回' :
                           log.status === 'skipped' ? '跳过' : log.status}
                        </span>
                      </div>
                      {log.comment && (
                        <p className="text-sm text-gray-600 mt-1">{log.comment}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {log.operator_name} · {formatDateTime(log.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：流程信息 + 审批操作 */}
        <div className="space-y-4">
          {/* 当前状态 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-4">流程状态</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">当前节点</span>
                <span className="font-medium text-gray-900">
                  {instance.current_node_name || (instance.status === 'completed' ? '已结束' : '-')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">流程状态</span>
                <span className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
              </div>
              {instance.end_time && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">完成时间</span>
                  <span className="text-gray-900">{formatDateTime(instance.end_time)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 审批操作区（仅当前审批人可见） */}
          {currentTask && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">审批操作</h3>
              <div className="space-y-4">
                {/* 操作类型选择 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActionType('approve')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      actionType === 'approve'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    通过
                  </button>
                  <button
                    onClick={() => setActionType('reject')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      actionType === 'reject'
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    驳回
                  </button>
                </div>

                {/* 任务表单字段 */}
                {taskFormFields.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      填写表单信息
                    </label>
                    <div className="space-y-3">
                      {taskFormFields.map(field => (
                        <div key={field.name}>
                          <label className="block text-sm text-gray-600 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={taskFormData[field.name] || ''}
                              onChange={(e) => setTaskFormData({ ...taskFormData, [field.name]: e.target.value })}
                              placeholder={field.placeholder || `请输入${field.label}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          )}
                          {field.type === 'textarea' && (
                            <textarea
                              value={taskFormData[field.name] || ''}
                              onChange={(e) => setTaskFormData({ ...taskFormData, [field.name]: e.target.value })}
                              placeholder={field.placeholder || `请输入${field.label}`}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          )}
                          {field.type === 'date' && (
                            <input
                              type="date"
                              value={taskFormData[field.name] || ''}
                              onChange={(e) => setTaskFormData({ ...taskFormData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          )}
                          {field.type === 'datetime' && (
                            <input
                              type="datetime-local"
                              value={taskFormData[field.name] || ''}
                              onChange={(e) => setTaskFormData({ ...taskFormData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          )}
                          {field.type === 'select' && field.options && (
                            <select
                              value={taskFormData[field.name] || ''}
                              onChange={(e) => setTaskFormData({ ...taskFormData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">请选择</option>
                              {field.options.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 审批意见 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    审批意见 {actionType === 'reject' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder={actionType === 'reject' ? '请填写驳回原因...' : '请填写审批意见（选填）...'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* 提交按钮 */}
                <button
                  onClick={handleSubmit}
                  disabled={!actionType || submitting}
                  className={`w-full py-2.5 rounded-lg text-white font-medium transition-colors ${
                    actionType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : actionType === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {submitting ? '处理中...' : (
                    <>
                      <Send className="w-4 h-4 inline mr-1" />
                      {actionType === 'approve' ? '确认通过' : actionType === 'reject' ? '确认驳回' : '请选择操作'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 任务列表 */}
          {tasks.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">任务列表</h3>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{task.name}</div>
                      <div className="text-xs text-gray-500">{task.assignee_name}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status === 'completed' ? '已完成' : '待处理'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}