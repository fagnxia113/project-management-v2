import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, parseJWTToken } from '../../config/api'
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Eye,
  RotateCcw,
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react'

interface DraftOrder {
  id: string
  order_no: string
  order_type: string
  title: string
  status: string
  current_node: string
  current_assignee_name?: string
  form_data: Record<string, any>
  created_at: string
  updated_at: string
  initiator_name?: string
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  'rejected': { label: '已驳回', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  'withdrawn': { label: '已撤回', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: RotateCcw }
}

export default function ApprovalDraftPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<DraftOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [filterStatus, setFilterStatus] = useState<'all' | 'rejected' | 'withdrawn'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const userInfo = parseJWTToken(token || '')
      
      const response = await fetch(`${API_URL.BASE}/api/workflow/processes?initiatorId=${userInfo.userId}&status=rejected,withdrawn&pageSize=100`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setOrders(result.data)
        }
      }
    } catch (error) {
      console.error('加载草稿失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      return (
        order.title.toLowerCase().includes(keyword) ||
        order.order_no.toLowerCase().includes(keyword)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

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

  const handleViewDetail = (order: DraftOrder) => {
    navigate(`/workflow/process/${order.id}`)
  }

  const handleResubmit = (order: DraftOrder) => {
    navigate(`/approvals/new?processId=${order.id}`)
  }

  const handleDelete = async (order: DraftOrder) => {
    if (!confirm(`确定要删除草稿"${order.title}"吗？`)) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/workflow/processes/${order.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        loadOrders()
      }
    } catch (error) {
      console.error('删除草稿失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的草稿</h1>
        <p className="text-gray-500 mt-1">查看和管理您的草稿（已驳回和已撤回的申请）</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索草稿..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="rejected">已驳回</option>
              <option value="withdrawn">已撤回</option>
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
        ) : currentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无草稿</p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">流程标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前节点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentOrders.map((order) => {
                const typeConfig = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS['project_completion']
                const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['rejected']
                const StatusIcon = statusConfig.icon

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <typeConfig.icon className={`w-4 h-4 text-${typeConfig.color}-500`} />
                        <span className="font-medium text-gray-900">{order.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1 w-fit`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{order.current_node}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(order)}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </button>
                        {order.status === 'rejected' && (
                          <button
                            onClick={() => handleResubmit(order)}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1"
                          >
                            <RotateCcw className="w-4 h-4" />
                            重新提交
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(order)}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentOrders.map((order) => {
              const typeConfig = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS['project_completion']
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG['rejected']
              const StatusIcon = statusConfig.icon

              return (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <typeConfig.icon className={`w-5 h-5 text-${typeConfig.color}-500`} />
                      <span className="font-medium text-gray-900">{order.title}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <GitBranch className="w-4 h-4" />
                      <span>当前节点: {order.current_node}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>创建时间: {formatDate(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleViewDetail(order)}
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      查看
                    </button>
                    {order.status === 'rejected' && (
                      <button
                        onClick={() => handleResubmit(order)}
                        className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        重新提交
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(order)}
                      className="py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              显示 {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} 条，共 {filteredOrders.length} 条
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