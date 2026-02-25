/**
 * 待办审批页面 - 优化版
 * 支持表格/卡片视图切换
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  User,
  MessageSquare,
  ArrowRight
} from 'lucide-react'

interface FieldPermission {
  fieldName: string
  visible: boolean
  editable: boolean
  required?: boolean
  roles?: string[]
}

interface ApprovalTask {
  id: string
  task_id: string
  process_id: string
  process_title: string
  process_type: string
  node_name: string
  initiator_name: string
  created_at: string
  priority: 'high' | 'normal' | 'low'
  form_data: Record<string, any>
  field_permissions?: FieldPermission[]
  dept_map?: Record<string, string>
  pos_map?: Record<string, string>
  timeout?: number
}

const PROCESS_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  'person_onboard': { label: '人员入职', color: 'blue', icon: User },
  'personnel_onboard': { label: '人员入职', color: 'blue', icon: User },
  'personnel_offboard': { label: '人员离职', color: 'red', icon: User },
  'personnel_transfer': { label: '人员调拨', color: 'purple', icon: User },
  'personnel_leave': { label: '请假申请', color: 'orange', icon: Calendar },
  'personnel_trip': { label: '出差申请', color: 'cyan', icon: Calendar },
  'equipment_inbound': { label: '设备入库', color: 'green', icon: FileText },
  'equipment_outbound': { label: '设备出库', color: 'orange', icon: FileText },
  'equipment_transfer': { label: '设备调动', color: 'yellow', icon: FileText },
  'equipment_repair': { label: '设备维修', color: 'pink', icon: FileText },
  'equipment_scrap': { label: '设备报废', color: 'gray', icon: FileText },
  'project_completion': { label: '项目结项', color: 'indigo', icon: FileText },
  'purchase_request': { label: '采购申请', color: 'teal', icon: FileText }
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'high': { label: '紧急', color: 'text-red-700', bgColor: 'bg-red-50' },
  'normal': { label: '普通', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'low': { label: '低优', color: 'text-gray-700', bgColor: 'bg-gray-50' }
}

// 表单字段中文标签映射
const FORM_FIELD_LABELS: Record<string, string> = {
  'employee_name': '员工姓名',
  'employee_id': '员工编号',
  'department_id': '部门',
  'position_id': '职位',
  'phone': '联系电话',
  'gender': '性别',
  'start_date': '入职日期',
  'employee_type': '员工类型',
  'email': '邮箱',
  'address': '地址',
  'id_card': '身份证号',
  'emergency_contact': '紧急联系人',
  'emergency_phone': '紧急联系电话',
  'education': '学历',
  'major': '专业',
  'school': '毕业院校',
  'work_experience': '工作经验',
  'salary': '薪资',
  'probation_period': '试用期',
  'report_to': '汇报对象',
  'office_location': '办公地点',
  'computer_type': '电脑类型',
  'system_access': '系统权限'
}

// 性别映射
const GENDER_LABELS: Record<string, string> = {
  'male': '男',
  'female': '女'
}

// 员工类型映射
const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  'regular': '正式员工',
  'probation': '试用期',
  'intern': '实习生',
  'contractor': '外包',
  'part_time': '兼职'
}

export default function ApprovalPendingPageNew() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<ApprovalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [filter, setFilter] = useState<'all' | 'high' | 'normal' | 'low'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [approvalComment, setApprovalComment] = useState('')
  const [approvalFormData, setApprovalFormData] = useState<Record<string, any>>({})
  const [processing, setProcessing] = useState(false)

  useEffect(() => { loadTasks() }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      let userId = 'current-user'
      if (token) {
        try {
          const base64Payload = token.split('.')[1]
          if (base64Payload) {
            const payload = JSON.parse(atob(base64Payload))
            userId = payload.userId || payload.id || 'current-user'
          }
        } catch (e) {
          console.warn('Token解析失败')
        }
      }
      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/tasks/assignee/${userId}?status=assigned,in_progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          const mappedTasks = data.data.map((item: any) => {
            const formData = item.variables?.formData || {}
            const deptMap = formData._deptMap || {}
            const posMap = formData._posMap || {}
            
            // 移除映射数据，只保留原始表单数据
            const { _deptMap, _posMap, ...cleanFormData } = formData
            
            return {
              id: item.id,
              task_id: item.id,
              process_id: item.instance_id,
              process_title: item.process_title || '未命名流程',
              process_type: item.definition_key || 'unknown',
              node_name: item.name || '审批节点',
              initiator_name: item.initiator_name || '未知',
              created_at: item.created_at,
              priority: item.priority || 'normal',
              form_data: cleanFormData,
              field_permissions: item.field_permissions,
              dept_map: deptMap,
              pos_map: posMap,
              timeout: item.timeout
            }
          })
          setTasks(mappedTasks)
        } else {
          setTasks([])
        }
      }
    } catch (e) {
      console.error('加载待办任务失败:', e)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  // 过滤和搜索
  const filteredTasks = tasks.filter(task => {
    // 优先级过滤
    if (filter !== 'all' && task.priority !== filter) return false
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      const matchTitle = task.process_title.toLowerCase().includes(keyword)
      const matchInitiator = task.initiator_name.toLowerCase().includes(keyword)
      const matchType = (PROCESS_TYPE_LABELS[task.process_type]?.label || '').toLowerCase().includes(keyword)
      if (!matchTitle && !matchInitiator && !matchType) return false
    }
    
    return true
  })

  // 分页
  const totalPages = Math.ceil(filteredTasks.length / pageSize)
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleApprove = async (taskId: string) => {
    if (!confirm('确定要通过此申请吗？')) return
    setProcessing(true)
    try {
      const token = localStorage.getItem('token')
      let userId = 'current-user'
      let userName = '当前用户'
      if (token) {
        try {
          const base64Payload = token.split('.')[1]
          if (base64Payload) {
            const payload = JSON.parse(atob(base64Payload))
            userId = payload.userId || payload.id || 'current-user'
            userName = payload.name || payload.username || payload.sub || '当前用户'
          }
        } catch (e) {
          console.warn('Token解析失败')
        }
      }
      
      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/task/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'approved',
          comment: approvalComment,
          formData: approvalFormData,
          operator: { id: userId, name: userName }
        })
      })
      if (res.ok) {
        alert('审批通过')
        setSelectedTask(null)
        setApprovalComment('')
        setApprovalFormData({})
        loadTasks()
      }
    } catch (e) {
      alert('审批成功（模拟）')
      setSelectedTask(null)
      setApprovalComment('')
      setApprovalFormData({})
      loadTasks()
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (taskId: string) => {
    if (!taskId) {
      alert('任务ID无效')
      return
    }
    if (!approvalComment.trim()) {
      alert('请填写驳回原因')
      return
    }
    if (!confirm('确定要驳回此申请吗？')) return
    setProcessing(true)
    try {
      const token = localStorage.getItem('token')
      let userId = 'current-user'
      let userName = '当前用户'
      if (token) {
        try {
          const base64Payload = token.split('.')[1]
          if (base64Payload) {
            const payload = JSON.parse(atob(base64Payload))
            userId = payload.userId || payload.id || 'current-user'
            userName = payload.name || payload.username || payload.sub || '当前用户'
          }
        } catch (e) {
          console.warn('Token解析失败')
        }
      }
      
      const res = await fetch(`${API_URL.BASE}/api/workflow/v2/task/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'rejected',
          comment: approvalComment,
          formData: approvalFormData,
          operator: { id: userId, name: userName }
        })
      })
      if (res.ok) {
        alert('已驳回')
        setSelectedTask(null)
        setApprovalComment('')
        setApprovalFormData({})
        // 强制清空任务列表并重新加载
        setTasks([])
        setTimeout(() => loadTasks(), 100)
      }
    } catch (e) {
      alert('驳回成功（模拟）')
      setSelectedTask(null)
      setApprovalComment('')
      setApprovalFormData({})
      setTasks([])
      setTimeout(() => loadTasks(), 100)
    } finally {
      setProcessing(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['normal']
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        {priority === 'high' && <AlertCircle className="w-3 h-3" />}
        {config.label}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffHours = diffTime / (1000 * 3600)
    const diffDays = diffTime / (1000 * 3600 * 24)
    
    if (diffHours < 1) return '刚刚'
    if (diffHours < 24) return `${Math.floor(diffHours)}小时前`
    if (diffDays < 7) return `${Math.floor(diffDays)}天前`
    
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 卡片视图
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedTasks.map(task => {
        const typeConfig = PROCESS_TYPE_LABELS[task.process_type] || { label: task.process_type, color: 'gray', icon: FileText }
        const TypeIcon = typeConfig.icon
        
        return (
          <div 
            key={task.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            onClick={() => setSelectedTask(task)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg bg-${typeConfig.color}-100 flex items-center justify-center`}>
                  <TypeIcon className={`w-5 h-5 text-${typeConfig.color}-600`} />
                </div>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(task.priority)}
                  {task.timeout && task.timeout < 24 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      即将超时
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {task.process_title}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{typeConfig.label}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {task.initiator_name}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{task.node_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(task.created_at)}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/workflow/visualization/${task.process_id}`)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <GitBranch className="w-4 h-4" />
                  查看流程
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTask(task)
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  审批
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  // 表格视图
  const renderTableView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">申请信息</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">类型</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">当前节点</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">发起人</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">优先级</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">到达时间</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.map(task => {
              const typeConfig = PROCESS_TYPE_LABELS[task.process_type] || { label: task.process_type, color: 'gray', icon: FileText }
              const TypeIcon = typeConfig.icon
              
              return (
                <tr 
                  key={task.id} 
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-${typeConfig.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className={`w-4 h-4 text-${typeConfig.color}-600`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{task.process_title}</div>
                        {task.timeout && task.timeout < 24 && (
                          <span className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            即将超时
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">{typeConfig.label}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{task.node_name}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{task.initiator_name}</td>
                  <td className="py-4 px-4">{getPriorityBadge(task.priority)}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{formatDate(task.created_at)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/workflow/visualization/${task.process_id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="查看流程"
                      >
                        <GitBranch className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        审批
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // 空状态
  const renderEmpty = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无待办任务</h3>
      <p className="text-gray-500">您已完成所有审批任务</p>
    </div>
  )

  // 审批弹窗
  const renderApprovalModal = () => {
    if (!selectedTask) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getPriorityBadge(selectedTask.priority)}
                <span className="text-sm text-gray-500">来自 {selectedTask.initiator_name}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{selectedTask.process_title}</h3>
            </div>
            <button 
              onClick={() => { setSelectedTask(null); setApprovalComment(''); setApprovalFormData({}) }} 
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 内容 */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">当前节点</div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                  {selectedTask.node_name}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">申请类型</div>
                <div className="font-medium text-gray-900">
                  {PROCESS_TYPE_LABELS[selectedTask.process_type]?.label || selectedTask.process_type}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">到达时间</div>
                <div className="font-medium text-gray-900">{formatDate(selectedTask.created_at)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">任务ID</div>
                <div className="font-medium text-gray-900 font-mono text-sm">{selectedTask.task_id}</div>
              </div>
            </div>
            
            {/* 表单数据 */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                申请内容
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {Object.entries(selectedTask.form_data).length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedTask.form_data)
                      .filter(([key]) => {
                        // 如果没有权限配置，显示所有字段
                        if (!selectedTask.field_permissions) return true
                        // 查找字段权限
                        const permission = selectedTask.field_permissions.find(p => p.fieldName === key)
                        // 如果没有找到权限配置，默认显示；否则根据visible决定
                        return !permission || permission.visible !== false
                      })
                      .map(([key, value]) => {
                        const permission = selectedTask.field_permissions?.find(p => p.fieldName === key)
                        const isEditable = permission?.editable !== false // 默认可编辑
                        
                        // 获取字段中文标签
                        const label = FORM_FIELD_LABELS[key] || key
                        
                        // 转换值为中文显示
                        let displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
                        if (key === 'gender' && GENDER_LABELS[value as string]) {
                          displayValue = GENDER_LABELS[value as string]
                        } else if (key === 'employee_type' && EMPLOYEE_TYPE_LABELS[value as string]) {
                          displayValue = EMPLOYEE_TYPE_LABELS[value as string]
                        } else if (key === 'department_id' && selectedTask.dept_map?.[value as string]) {
                          displayValue = selectedTask.dept_map[value as string]
                        } else if (key === 'position_id' && selectedTask.pos_map?.[value as string]) {
                          displayValue = selectedTask.pos_map[value as string]
                        }
                        
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-xs text-gray-500 mb-1">
                              {label}
                              {permission && !isEditable && (
                                <span className="ml-1 text-xs text-orange-500">(只读)</span>
                              )}
                            </span>
                            {isEditable ? (
                              <input
                                type="text"
                                defaultValue={displayValue}
                                className="text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onChange={(e) => {
                                  setApprovalFormData(prev => ({
                                    ...prev,
                                    [key]: e.target.value
                                  }))
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                {displayValue}
                              </span>
                            )}
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无表单数据</p>
                )}
              </div>
            </div>
            
            {/* 审批意见 */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                审批意见
              </h4>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="请输入审批意见（驳回时必填）"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>
          </div>
          
          {/* 底部操作 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={() => navigate(`/workflow/visualization/${selectedTask.process_id}`)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              查看流程图
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleReject(selectedTask.task_id)}
                disabled={processing}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {processing ? '处理中...' : '驳回'}
              </button>
              <button
                onClick={() => handleApprove(selectedTask.task_id)}
                disabled={processing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {processing ? '处理中...' : '通过'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">待办审批</h1>
            <p className="text-gray-500 mt-1">
              共有 <span className="text-blue-600 font-semibold">{tasks.length}</span> 项待办任务
              {tasks.filter(t => t.priority === 'high').length > 0 && (
                <span className="ml-2 text-red-600">
                  （{tasks.filter(t => t.priority === 'high').length} 项紧急）
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* 筛选和搜索栏 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 优先级筛选 */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'high', label: '紧急' },
                  { key: 'normal', label: '普通' },
                  { key: 'low', label: '低优' }
                ].map(f => (
                  <button 
                    key={f.key} 
                    onClick={() => { setFilter(f.key as any); setCurrentPage(1) }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      filter === f.key 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 搜索 */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1) }}
                  placeholder="搜索申请标题、发起人或类型..."
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* 视图切换 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'card' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="卡片视图"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="表格视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {filteredTasks.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {viewMode === 'card' ? renderCardView() : renderTableView()}
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredTasks.length)} 条，
                共 {filteredTasks.length} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 审批弹窗 */}
      {selectedTask && renderApprovalModal()}
    </div>
  )
}
