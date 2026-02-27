import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'
import {
  GitBranch,
  History,
  CheckCircle,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  Send,
  User,
  RotateCcw,
  ArrowLeft
} from 'lucide-react'

interface WorkflowInstance {
  id: string
  definition_id: string
  definition_key: string
  title: string
  status: string
  result: string | null
  initiator_id: string
  initiator_name: string
  start_time: string
  end_time: string | null
  current_node_id: string | null
  current_node_name: string | null
  business_id: string | null
  variables: {
    formData: Record<string, any>
  }
}

interface WorkflowTask {
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

interface WorkflowLog {
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

const FORM_GROUP_CONFIG = [
  { title: '基本信息', fields: ['employee_name', 'employee_id', 'gender', 'phone', 'email'] },
  { title: '岗位信息', fields: ['department_id', 'position_id', 'employee_type', 'start_date'] },
  { title: '个人信息', fields: ['id_card', 'address', 'emergency_contact', 'emergency_phone'] },
  { title: '教育背景', fields: ['education', 'major', 'graduation_school', 'graduation_date'] },
  { title: '银行信息', fields: ['bank_account', 'bank_name'] }
]

export default function PersonnelOnboardDetailPage() {
  const { instanceId } = useParams<{ instanceId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [instance, setInstance] = useState<WorkflowInstance | null>(null)
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [logs, setLogs] = useState<WorkflowLog[]>([])
  const [currentTask, setCurrentTask] = useState<WorkflowTask | null>(null)
  const [showAllLogs, setShowAllLogs] = useState(false)

  const [actionType, setActionType] = useState<'approve' | 'reject' | ''>('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (instanceId) {
      loadInstanceData()
    }
  }, [instanceId])

  const loadInstanceData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const instanceRes = await fetch(`${API_URL.BASE}/api/workflow/processes/${instanceId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (instanceRes.ok) {
        const instanceResult = await instanceRes.json()
        if (instanceResult.success && instanceResult.data) {
          setInstance(instanceResult.data)

          const tasksRes = await fetch(`${API_URL.BASE}/api/workflow/v2/process/instance/${instanceResult.data.id}/tasks`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          })

          if (tasksRes.ok) {
            const tasksResult = await tasksRes.json()
            if (tasksResult.success) {
              setTasks(tasksResult.data || [])
              const activeTask = tasksResult.data?.find((t: WorkflowTask) => t.status === 'assigned' || t.status === 'in_progress')
              setCurrentTask(activeTask || null)
            }
          }

          const logsRes = await fetch(`${API_URL.BASE}/api/workflow/v2/process/instance/${instanceResult.data.id}/logs`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          })

          if (logsRes.ok) {
            const logsResult = await logsRes.json()
            if (logsResult.success) {
              setLogs(logsResult.data || [])
            }
          }
        }
      }
    } catch (error) {
      console.error('加载流程数据失败:', error)
      alert('加载失败')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!currentTask) {
      alert('没有待审批的任务')
      return
    }

    if (actionType === 'reject' && !comment.trim()) {
      alert('驳回时必须填写意见')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/task/${currentTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          action: actionType === 'approve' ? 'approve' : 'reject',
          comment: comment.trim()
        })
      })

      const data = await res.json()

      if (data.success) {
        alert(actionType === 'approve' ? '审批通过' : '已驳回')
        setActionType('')
        setComment('')
        loadInstanceData()
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
    if (!instance || !confirm('确定要撤回此申请吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/workflow/processes/${instance.id}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (res.ok) {
        alert('已撤回')
        loadInstanceData()
      }
    } catch (error) {
      alert('撤回失败')
    }
  }

  const getDisplayValue = (fieldName: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-'

    if (fieldName === 'gender') {
      const labels: Record<string, string> = { male: '男', female: '女' }
      return labels[value] || value
    }

    if (fieldName === 'employee_type') {
      const labels: Record<string, string> = {
        regular: '正式',
        intern: '实习',
        outsourced: '外包'
      }
      return labels[value] || value
    }

    if (fieldName === 'education') {
      const labels: Record<string, string> = {
        bachelor: '本科',
        master: '硕士',
        doctor: '博士',
        college: '大专',
        high_school: '高中'
      }
      return labels[value] || value
    }

    if (fieldName.includes('date') && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString('zh-CN')
      } catch { }
    }

    return String(value)
  }

  const getFormGroups = () => {
    const formData = instance?.variables?.formData || {}
    return FORM_GROUP_CONFIG.map(group => {
      const fields = group.fields.filter(f => formData.hasOwnProperty(f))
      return {
        title: group.title,
        fields: fields.filter(f => !f.startsWith('_'))
      }
    }).filter(g => g.fields.length > 0)
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
                  <Clock className="w-4 h-4" />
                  {formatDateTime(instance.start_time)}
                </span>
              </div>
            </div>
          </div>

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
        <div className="col-span-2 space-y-4">
          {getFormGroups().map((group, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-900">{group.title}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {group.fields.map(fieldName => {
                    const value = instance.variables?.formData?.[fieldName]
                    const label = {
                      employee_name: '姓名',
                      employee_id: '员工编号',
                      gender: '性别',
                      phone: '手机号',
                      email: '邮箱',
                      department_id: '部门',
                      position_id: '岗位',
                      employee_type: '员工性质',
                      start_date: '入职日期',
                      id_card: '身份证号',
                      address: '地址',
                      emergency_contact: '紧急联系人',
                      emergency_phone: '紧急联系电话',
                      education: '学历',
                      major: '专业',
                      graduation_school: '毕业院校',
                      graduation_date: '毕业日期',
                      bank_account: '银行账号',
                      bank_name: '开户行'
                    }[fieldName] || fieldName

                    return (
                      <div key={fieldName} className="space-y-1">
                        <label className="text-sm text-gray-500">{label}</label>
                        <div className="text-gray-900">{getDisplayValue(fieldName, value)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

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

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-gray-400" />
                流程进度
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      task.status === 'completed' ? 'bg-green-100' :
                      task.status === 'assigned' || task.status === 'in_progress' ? 'bg-blue-100' :
                      'bg-gray-100'
                    }`}>
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : task.status === 'assigned' || task.status === 'in_progress' ? (
                        <Clock className="w-4 h-4 text-blue-600" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{task.name}</span>
                        <span className="text-xs text-gray-500">{task.assignee_name || '待分配'}</span>
                      </div>
                      {task.status === 'completed' && task.comment && (
                        <div className="text-xs text-gray-600 mt-1">{task.comment}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {currentTask && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-900">审批操作</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">当前任务：{currentTask.name}</p>
                  <p className="text-sm text-gray-600">审批人：{currentTask.assignee_name}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActionType('approve')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        actionType === 'approve'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      同意
                    </button>
                    <button
                      onClick={() => setActionType('reject')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        actionType === 'reject'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      驳回
                    </button>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={actionType === 'reject' ? '请输入驳回意见（必填）' : '请输入审批意见（选填）'}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-3"
                  />
                  <button
                    onClick={handleApprove}
                    disabled={!actionType || submitting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? '提交中...' : '提交审批'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
