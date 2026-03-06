import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, parseJWTToken } from '../../config/api'
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  GitBranch,
  Clock,
  FileText,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface ApprovedTask {
  id: string
  task_id: string
  process_id: string
  process_title: string
  process_type: string
  node_name: string
  initiator_name: string
  action: string
  comment?: string
  completed_at: string
  form_data: Record<string, any>
}

const ORDER_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
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

const ACTION_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  'approved': { label: '已通过', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'rejected': { label: '已驳回', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle }
}

export default function ApprovalCompletedPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<ApprovedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [filterAction, setFilterAction] = useState<'all' | 'approved' | 'rejected'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  useEffect(() => { loadTasks() }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const userInfo = parseJWTToken(token || '')
      
      const response = await fetch(`${API_URL.BASE}/api/workflow/my-completed-tasks?userId=${userInfo.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setTasks(result.data)
        }
      }
    } catch (error) {
      console.error('加载已审批任务失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filterAction !== 'all' && task.action !== filterAction) return false
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      return (
        task.process_title.toLowerCase().includes(keyword) ||
        task.initiator_name.toLowerCase().includes(keyword) ||
        task.node_name.toLowerCase().includes(keyword)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredTasks.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentTasks = filteredTasks.slice(startIndex, endIndex)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewDetail = (task: ApprovedTask) => {
    navigate(`/workflow/detail/${task.process_id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我已审批</h1>
        <p className="text-gray-500 mt-1">查看您已经处理过的审批任务</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索审批任务..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部操作</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
            </select>

            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            加载中...
          </div>
        ) : currentTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无已审批任务</p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">流程标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发起人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">审批节点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">审批时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentTasks.map((task) => {
                const typeConfig = ORDER_TYPE_LABELS[task.process_type] || ORDER_TYPE_LABELS['project_completion']
                const actionConfig = ACTION_CONFIG[task.action] || ACTION_CONFIG['approved']
                const ActionIcon = actionConfig.icon

                return (
                  <tr key={task.task_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <typeConfig.icon className={`w-4 h-4 text-${typeConfig.color}-500`} />
                        <span className="font-medium text-gray-900">{task.process_title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{task.initiator_name}</td>
                    <td className="px-6 py-4 text-gray-600">{task.node_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color} flex items-center gap-1 w-fit`}>
                        <ActionIcon className="w-3 h-3" />
                        {actionConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(task.completed_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetail(task)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        查看详情
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTasks.map((task) => {
              const typeConfig = ORDER_TYPE_LABELS[task.process_type] || ORDER_TYPE_LABELS['project_completion']
              const actionConfig = ACTION_CONFIG[task.action] || ACTION_CONFIG['approved']
              const ActionIcon = actionConfig.icon

              return (
                <div key={task.task_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <typeConfig.icon className={`w-5 h-5 text-${typeConfig.color}-500`} />
                      <span className="font-medium text-gray-900">{task.process_title}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color} flex items-center gap-1`}>
                      <ActionIcon className="w-3 h-3" />
                      {actionConfig.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>发起人: {task.initiator_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <GitBranch className="w-4 h-4" />
                      <span>审批节点: {task.node_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>审批时间: {formatDate(task.completed_at)}</span>
                    </div>
                    {task.comment && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700 text-xs">
                        <span className="font-medium">审批意见:</span> {task.comment}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewDetail(task)}
                    className="mt-3 w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              显示 {startIndex + 1} - {Math.min(endIndex, filteredTasks.length)} 条，共 {filteredTasks.length} 条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}