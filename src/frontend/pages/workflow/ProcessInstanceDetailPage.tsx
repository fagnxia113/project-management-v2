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
import EquipmentTransferForm from '../../components/equipment/EquipmentTransferForm'

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
const FORM_GROUP_CONFIG: Record<string, { title: string; fields: string[]; icon?: any }[]> = {
  'project-approval': [
    { title: '基本信息', fields: ['code', 'name', 'type', 'status'], icon: FileText },
    { title: '项目信息', fields: ['country', 'province', 'city', 'address', 'start_date', 'end_date'], icon: Calendar },
    { title: '项目负责人', fields: ['manager_id', 'technical_lead_id'], icon: User },
    { title: '项目规模', fields: ['building_area', 'it_capacity', 'cabinet_count', 'cabinet_power'], icon: FileText },
    { title: '技术架构', fields: ['power_architecture', 'hvac_architecture', 'fire_architecture', 'weak_electric_architecture'], icon: FileText },
    { title: '商务信息', fields: ['customer_id', 'end_customer', 'budget', 'description'], icon: FileText }
  ],
  'employee-onboard': [
    { title: '基本信息', fields: ['employee_name', 'employee_id', 'gender', 'phone', 'email'], icon: User },
    { title: '岗位信息', fields: ['department_id', 'position_id', 'employee_type', 'start_date'], icon: FileText },
    { title: '其他信息', fields: ['salary', 'notes'], icon: FileText }
  ],
  'equipment-transfer': [
    { title: '调拨信息', fields: ['fromLocationType', 'toLocationType', 'transferReason', 'estimatedArrivalDate'], icon: FileText },
    { title: '调出位置', fields: ['_fromLocationName', '_fromManagerName'], icon: FileText },
    { title: '调入位置', fields: ['_toLocationName', '_toManagerName'], icon: FileText },
    { title: '发货信息', fields: ['shippingDate', 'waybillNo', 'shippingNotes'], icon: FileText },
    { title: '收货信息', fields: ['receiveStatus', 'receiveComment'], icon: FileText }
  ],
  'default': [
    { title: '表单内容', fields: [], icon: FileText }
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
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

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
      
      if (definitionData.success && definitionData.data) {
        if (definitionData.data.form_schema) {
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

  const loadDynamicOptions = async (fields: FormField[]) => {
    console.log('[ProcessInstanceDetailPage] loadDynamicOptions called with fields:', fields.map(f => ({ name: f.name, type: f.type })))
    const options: Record<string, { label: string; value: any }[]> = {}
    const token = localStorage.getItem('token')

    for (const field of fields) {
      // 处理部门ID字段
      if (field.name === 'department_id' || field.name === 'department') {
        try {
          console.log('[ProcessInstanceDetailPage] Loading departments for field:', field.name)
          const res = await fetch(`${API_URL.BASE}/api/organization/departments`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          const items = data.success ? data.data : (Array.isArray(data.data) ? data.data : [])
          console.log('[ProcessInstanceDetailPage] Departments loaded:', items)

          options[field.name] = items.map((item: any) => ({
            label: item.name,
            value: item.id
          }))
          console.log('[ProcessInstanceDetailPage] Department options for', field.name, ':', options[field.name])
        } catch (e) {
          console.error(`加载部门选项失败:`, e)
        }
      }
      // 处理岗位ID字段
      else if (field.name === 'position_id' || field.name === 'position') {
        try {
          console.log('[ProcessInstanceDetailPage] Loading positions for field:', field.name)
          const res = await fetch(`${API_URL.BASE}/api/organization/positions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          const items = data.success ? data.data : (Array.isArray(data.data) ? data.data : [])
          console.log('[ProcessInstanceDetailPage] Positions loaded:', items)

          options[field.name] = items.map((item: any) => ({
            label: item.name,
            value: item.id
          }))
          console.log('[ProcessInstanceDetailPage] Position options for', field.name, ':', options[field.name])
        } catch (e) {
          console.error(`加载岗位选项失败:`, e)
        }
      }
      // 处理 businessConfig
      else if (field.businessConfig?.entityType) {
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
      }
      // 处理用户字段
      else if (field.type === 'user') {
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
      }
      // 处理选项
      else if (field.options) {
        options[field.name] = field.options
      }
    }

    console.log('[ProcessInstanceDetailPage] Final dynamic options:', JSON.stringify(options, null, 2))
    setDynamicOptions(options)
  }

  const getDisplayValue = (fieldName: string, value: any): string => {
    console.log('[ProcessInstanceDetailPage] getDisplayValue called:', { fieldName, value, dynamicOptionsKeys: Object.keys(dynamicOptions) })

    if (value === null || value === undefined || value === '') return '-'

    const options = dynamicOptions[fieldName]
    console.log('[ProcessInstanceDetailPage] Options for', fieldName, ':', options)

    if (options) {
      const option = options.find(o => o.value === value || o.value === String(value))
      console.log('[ProcessInstanceDetailPage] Found option:', option)
      if (option) return option.label
    }

    // 单独处理部门ID和岗位ID
    if (fieldName.includes('department') && typeof value === 'string') {
      const deptOptions = dynamicOptions['department_id'] || []
      const dept = deptOptions.find(o => o.value === value || o.value === String(value))
      if (dept) return dept.label
    }

    if (fieldName.includes('position') && typeof value === 'string') {
      const posOptions = dynamicOptions['position_id'] || []
      const pos = posOptions.find(o => o.value === value || o.value === String(value))
      if (pos) return pos.label
    }

    if (typeof value === 'boolean') return value ? '是' : '否'

    if (fieldName.includes('date') && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString('zh-CN')
      } catch { }
    }

    if (typeof value === 'object') return JSON.stringify(value)

    return String(value)
  }

  const handleSubmit = async () => {
    if (!currentTask || !actionType) return
    
    if (actionType === 'reject' && !comment.trim()) {
      alert('驳回时必须填写意见')
      return
    }
    
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
        await loadInstanceData()
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

  const loadTaskFormFields = async (task: Task, definitionId: string) => {
    // 简化实现，不加载任务表单字段
  }

  const getFormGroups = () => {
    const definitionKey = instance?.definition_key || ''
    const config = (FORM_GROUP_CONFIG as any)[definitionKey] || FORM_GROUP_CONFIG['default']
    const formData = instance?.variables?.formData || {}
    
    return config.map((group: any) => {
      let fields: string[]
      if (group.fields.length === 0) {
        fields = Object.keys(formData)
      } else {
        fields = group.fields.filter((f: string) => formData.hasOwnProperty(f))
      }
      
      return {
        title: group.title,
        fields: fields.filter((f: string) => !f.startsWith('_'))
      }
    }).filter((g: any) => g.fields.length > 0)
  }

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
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
          
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/workflow/visualization/${instance.id}`)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
              <GitBranch className="w-4 h-4" />
              查看流程图
            </button>
            {instance.status === 'running' && (
              <button onClick={handleWithdraw} className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1">
                <RotateCcw className="w-4 h-4" />
                撤回
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {(() => {
            console.log('[ProcessInstanceDetailPage] instance:', instance)
            console.log('[ProcessInstanceDetailPage] definition_key:', instance?.definition_key)
            console.log('[ProcessInstanceDetailPage] business_id:', instance?.business_id)
            console.log('[ProcessInstanceDetailPage] variables:', instance?.variables)
            console.log('[ProcessInstanceDetailPage] variables.formData:', instance?.variables?.formData)
            console.log('[ProcessInstanceDetailPage] transferOrderId:', instance?.variables?.formData?.transferOrderId)
            
            const isEquipmentTransfer = instance?.definition_key === 'equipment-transfer' || instance?.definition_key === 'preset-equipment-transfer'
            const hasBusinessId = instance?.business_id || instance?.variables?.formData?.transferOrderId
            
            console.log('[ProcessInstanceDetailPage] isEquipmentTransfer:', isEquipmentTransfer)
            console.log('[ProcessInstanceDetailPage] hasBusinessId:', hasBusinessId)
            
            return isEquipmentTransfer && hasBusinessId
          })() ? (
            <EquipmentTransferForm 
              transferOrderId={instance?.business_id || instance?.variables?.formData?.transferOrderId}
              currentUser={currentUser}
              onShippingComplete={loadInstanceData}
            />
          ) : (
            getFormGroups().map((group: any, idx: number) => {
              const definitionKey = instance?.definition_key || ''
              const config = (FORM_GROUP_CONFIG as any)[definitionKey]?.find((g: any) => g.title === group.title)
              const GroupIcon = config?.icon || FileText
              
              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <GroupIcon className="w-5 h-5 text-blue-500" />
                      {group.title}
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      {group.fields.map((fieldName: string) => {
                        const field = formFields.find(f => f.name === fieldName)
                        const value = instance.variables?.formData?.[fieldName]
                        
                        return (
                          <div key={fieldName} className="group">
                            <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                              {field?.label || fieldName}
                            </label>
                            <div className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 text-sm min-h-[42px] flex items-center">
                              {getDisplayValue(fieldName, value)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          
          {logs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer" onClick={() => setShowAllLogs(!showAllLogs)}>
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
                      {log.comment && <p className="text-sm text-gray-600 mt-1">{log.comment}</p>}
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

        <div className="space-y-4">
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

          {currentTask && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
              <h3 className="font-medium text-gray-900 mb-4">审批操作</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setActionType('approve')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    actionType === 'approve' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    通过
                  </button>
                  <button onClick={() => setActionType('reject')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    actionType === 'reject' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                    <XCircle className="w-4 h-4 inline mr-1" />
                    驳回
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    审批意见 {actionType === 'reject' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={actionType === 'reject' ? '请填写驳回原因...' : '请填写审批意见（选填）...'} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>

                <button onClick={handleSubmit} disabled={!actionType || submitting} className={`w-full py-2.5 rounded-lg text-white font-medium transition-colors ${
                  actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-gray-300 cursor-not-allowed'
                }`}>
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