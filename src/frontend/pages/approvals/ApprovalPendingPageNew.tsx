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

const GENDER_LABELS: Record<string, string> = {
  'male': '男',
  'female': '女'
}

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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

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
            
            return {
              id: item.id,
              task_id: item.id,
              process_id: item.instance_id,
              process_title: item.process_title || item.name,
              process_type: item.definition_key || item.process_type,
              node_name: item.name,
              initiator_name: item.initiator_name,
              created_at: item.created_at,
              priority: item.priority || 'normal',
              form_data: formData,
              field_permissions: item.field_permissions,
              dept_map: deptMap,
              pos_map: posMap,
              timeout: item.timeout
            }
          })
          setTasks(mappedTasks)
        }
      }
    } catch (e) {
      console.error('加载任务失败:', e)
      alert('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter !== 'all' && task.priority !== filter) return false
    
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      const matchTitle = task.process_title.toLowerCase().includes(keyword)
      const matchInitiator = task.initiator_name.toLowerCase().includes(keyword)
      const matchType = (PROCESS_TYPE_LABELS[task.process_type]?.label || '').toLowerCase().includes(keyword)
      if (!matchTitle && !matchInitiator && !matchType) return false
    }
    
    return true
  })

  const totalPages = Math.ceil(filteredTasks.length / pageSize)
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  const getPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['normal']
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        {priority === 'high' && <AlertCircle className="w-3 h-3" />}
        {config.label}
      </span>
    )
  }

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedTasks.map(task => {
        const typeConfig = PROCESS_TYPE_LABELS[task.process_type] || { label: task.process_type, color: 'gray', icon: FileText }
        const TypeIcon = typeConfig.icon
        
        return (
          <div 
            key={task.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            onClick={() => navigate(`/workflow/detail/${task.process_id}`)}
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
                    navigate(`/workflow/detail/${task.process_id}`)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <GitBranch className="w-4 h-4" />
                  查看流程
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/workflow/detail/${task.process_id}`)
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

  const renderTableView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">任务</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">类型</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">发起人</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">当前节点</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">优先级</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">到达时间</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedTasks.map(task => {
            const typeConfig = PROCESS_TYPE_LABELS[task.process_type] || { label: task.process_type, color: 'gray', icon: FileText }
            
            return (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${typeConfig.color}-100 flex items-center justify-center`}>
                      <typeConfig.icon className={`w-5 h-5 text-${typeConfig.color}-600`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{task.process_title}</div>
                      <div className="text-xs text-gray-500 font-mono">{task.task_id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{typeConfig.label}</span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{task.initiator_name}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{task.node_name}</td>
                <td className="py-4 px-4">{getPriorityBadge(task.priority)}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{formatDate(task.created_at)}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/workflow/detail/${task.process_id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="查看流程"
                    >
                      <GitBranch className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/workflow/detail/${task.process_id}`)}
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
  )

  const renderEmpty = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无待办任务</h3>
      <p className="text-gray-500">您已完成所有审批任务</p>
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
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
        
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索任务标题、发起人或类型..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部优先级</option>
              <option value="high">紧急</option>
              <option value="normal">普通</option>
              <option value="low">低优</option>
            </select>
          </div>
          
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

      {filteredTasks.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {viewMode === 'card' ? renderCardView() : renderTableView()}
          
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredTasks.length)} 条，
                共 {filteredTasks.length} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
    </div>
  )
}
