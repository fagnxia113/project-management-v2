/**
 * 我的申请页面 - 优化版
 * 支持表格/卡片视图切换
 */
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
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  MoreHorizontal,
  Download
} from 'lucide-react'

interface ApprovalOrder {
  id: string
  order_no: string
  order_type: string
  title: string
  status: string
  current_node: string
  current_assignee_name?: string
  form_data: Record<string, any>
  audit_logs: any[]
  created_at: string
  updated_at: string
  initiator_name?: string
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
  'id_card': '身份证号',
  'address': '地址',
  'emergency_contact': '紧急联系人',
  'emergency_phone': '紧急联系电话',
  'education': '学历',
  'major': '专业',
  'graduation_school': '毕业院校',
  'graduation_date': '毕业日期',
  'bank_account': '银行卡号',
  'bank_name': '开户银行',
  'remark': '备注',
  'inbound_type': '入库类型',
  'warehouse_id': '仓库',
  'supplier': '供应商',
  'purchase_date': '采购日期',
  'notes': '备注',
  // 设备调拨相关字段
  'fromLocationType': '调出位置类型',
  'fromLocationId': '调出位置',
  'fromManagerId': '调出位置负责人',
  'toLocationType': '调入位置类型',
  'toLocationId': '调入位置',
  'toManagerId': '调入位置负责人',
  'transferReason': '调拨原因',
  'estimatedArrivalDate': '预期到货时间',
  'shippingDate': '发货时间',
  'waybillNo': '备注单号',
  'shippingNotes': '发货备注',
  'receiveStatus': '收货状态',
  'receiveComment': '收货备注'
}

// 性别映射
const GENDER_LABELS: Record<string, string> = {
  'male': '男',
  'female': '女',
  'other': '其他'
}

// 员工类型映射
const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  'regular': '正式员工',
  'probation': '试用期',
  'intern': '实习生',
  'contract': '合同工',
  'part_time': '兼职'
}

// 入库类型映射
const INBOUND_TYPE_LABELS: Record<string, string> = {
  'purchase': '采购入库',
  'repair_return': '维修返还',
  'other': '其他入库'
}

// 设备类别映射
const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  'instrument': '仪器类',
  'fake_load': '假负载类',
  'cable': '线材类'
}

// 位置类型映射
const LOCATION_TYPE_LABELS: Record<string, string> = {
  'warehouse': '仓库',
  'project': '项目'
}

// 收货状态映射
const RECEIVE_STATUS_LABELS: Record<string, string> = {
  'normal': '正常',
  'damaged': '损坏',
  'missing': '缺失',
  'partial': '部分'
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
  'pending': { label: '审批中', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  'approved': { label: '已通过', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'rejected': { label: '已驳回', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  'withdrawn': { label: '已撤回', color: 'text-gray-700', bgColor: 'bg-gray-50', icon: RotateCcw },
  'running': { label: '审批中', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  'completed': { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  'terminated': { label: '已终止', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle }
}

export default function ApprovalMinePageNew() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ApprovalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<ApprovalOrder | null>(null)
  const [transferOrderDetail, setTransferOrderDetail] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'quarter'>('all')

  useEffect(() => { loadOrders() }, [])
  
  // 当选中设备调拨单时，加载调拨单详情
  useEffect(() => {
    const loadTransferDetail = async () => {
      // 尝试从多个来源获取调拨单ID
      const transferOrderId = selectedOrder?.form_data?.transferOrderId || selectedOrder?.form_data?.businessId || (selectedOrder as any)?.business_id
      console.log('[ApprovalMinePage] selectedOrder:', selectedOrder?.order_type, 'transferOrderId:', transferOrderId)
      
      if (selectedOrder?.order_type === 'equipment-transfer' && transferOrderId) {
        try {
          const token = localStorage.getItem('token')
          const res = await fetch(`${API_URL.BASE}/api/equipment/transfers/${transferOrderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const result = await res.json()
            if (result.success && result.data) {
              console.log('[ApprovalMinePage] 加载调拨单详情成功:', result.data)
              setTransferOrderDetail(result.data)
            }
          }
        } catch (e) {
          console.warn('加载调拨单详情失败', e)
        }
      } else {
        setTransferOrderDetail(null)
      }
    }
    loadTransferDetail()
  }, [selectedOrder])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
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
      
      const res = await fetch(`${API_URL.BASE}/api/workflow/processes?initiatorId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          const mappedOrders = data.data.map((item: any) => {
            // 根据状态和结果计算显示状态
            let displayStatus = item.status;
            if (item.status === 'running') {
              displayStatus = 'pending';
            } else if (item.status === 'completed') {
              // 已完成状态需要根据结果判断：approved, rejected, withdrawn
              displayStatus = item.result || 'approved';
            } else if (item.status === 'terminated') {
              displayStatus = 'rejected';
            }

            return {
              id: item.id,
              order_no: item.id.substring(0, 8).toUpperCase(),
              order_type: item.definition_key,
              title: item.title,
              status: displayStatus,
              current_node: item.current_node_name || '未知',
              current_assignee_name: item.current_assignee_name || '',
              form_data: item.variables?.formData || {},
              audit_logs: [],
              created_at: item.created_at,
              updated_at: item.updated_at,
              initiator_name: item.initiator_name || '我'
            };
          })
          setOrders(mappedOrders)
        } else {
          setOrders([])
        }
      }
    } catch (e) {
      console.error('加载申请列表失败:', e)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // 过滤和搜索
  const filteredOrders = orders.filter(order => {
    // 状态过滤
    if (filter !== 'all' && order.status !== filter) return false
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      const matchTitle = order.title.toLowerCase().includes(keyword)
      const matchOrderNo = order.order_no.toLowerCase().includes(keyword)
      const matchType = (ORDER_TYPE_LABELS[order.order_type]?.label || '').toLowerCase().includes(keyword)
      if (!matchTitle && !matchOrderNo && !matchType) return false
    }
    
    // 日期范围过滤
    if (dateRange !== 'all') {
      const orderDate = new Date(order.created_at)
      const now = new Date()
      const diffTime = now.getTime() - orderDate.getTime()
      const diffDays = diffTime / (1000 * 3600 * 24)
      
      if (dateRange === 'week' && diffDays > 7) return false
      if (dateRange === 'month' && diffDays > 30) return false
      if (dateRange === 'quarter' && diffDays > 90) return false
    }
    
    return true
  })

  // 分页
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleWithdraw = async (id: string) => {
    if (!confirm('确定要撤回此申请吗？')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/workflow/processes/${id}/withdraw`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        alert('已撤回')
        loadOrders()
      }
    } catch (e) {
      alert('撤回成功（模拟）')
      loadOrders()
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['pending']
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    )
  }

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

  // 卡片视图
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedOrders.map(order => {
        const typeConfig = ORDER_TYPE_LABELS[order.order_type] || { label: order.order_type, color: 'gray', icon: FileText }
        const TypeIcon = typeConfig.icon
        
        return (
          <div 
            key={order.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            onClick={() => navigate(`/workflow/detail/${order.id}`)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg bg-${typeConfig.color}-100 flex items-center justify-center`}>
                  <TypeIcon className={`w-5 h-5 text-${typeConfig.color}-600`} />
                </div>
                {getStatusBadge(order.status)}
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {order.title}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{typeConfig.label}</span>
                <span>·</span>
                <span className="font-mono text-xs">{order.order_no}</span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{order.current_node}</span>
                </div>
                {order.current_assignee_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{order.current_assignee_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(order.created_at)}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/workflow/detail/${order.id}`)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <GitBranch className="w-4 h-4" />
                  查看流程
                </button>
                {order.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleWithdraw(order.id)
                    }}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    撤回
                  </button>
                )}
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
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">当前审批人</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">状态</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">提交时间</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map(order => {
              const typeConfig = ORDER_TYPE_LABELS[order.order_type] || { label: order.order_type, color: 'gray', icon: FileText }
              const TypeIcon = typeConfig.icon
              
              return (
                <tr 
                  key={order.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/workflow/detail/${order.id}`)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-${typeConfig.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className={`w-4 h-4 text-${typeConfig.color}-600`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{order.title}</div>
                        <div className="text-xs text-gray-500 font-mono">{order.order_no}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">{typeConfig.label}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{order.current_node}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {order.current_assignee_name || '-'}
                  </td>
                  <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{formatDate(order.created_at)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/workflow/detail/${order.id}`)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="查看流程"
                      >
                        <GitBranch className="w-4 h-4" />
                      </button>
                      {order.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleWithdraw(order.id)
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="撤回"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
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
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无申请记录</h3>
      <p className="text-gray-500 mb-4">您还没有提交任何申请</p>
      <button
        onClick={() => navigate('/approvals/new')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        发起新申请
      </button>
    </div>
  )

  // 详情弹窗
  const renderDetailModal = () => {
    if (!selectedOrder) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-sm text-gray-500 font-mono">{selectedOrder.order_no}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{selectedOrder.title}</h3>
            </div>
            <button 
              onClick={() => setSelectedOrder(null)} 
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 内容 */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">当前节点</div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-blue-500" />
                  {selectedOrder.current_node}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">当前审批人</div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  {selectedOrder.current_assignee_name || '-'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">申请类型</div>
                <div className="font-medium text-gray-900">
                  {ORDER_TYPE_LABELS[selectedOrder.order_type]?.label || selectedOrder.order_type}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">提交时间</div>
                <div className="font-medium text-gray-900">{formatDate(selectedOrder.created_at)}</div>
              </div>
            </div>
            
            {/* 表单数据 */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                申请内容
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                {Object.entries(selectedOrder.form_data).length > 0 ? (
                  <div className="space-y-6">
                    {/* 设备调拨特殊处理 */}
                    {selectedOrder.order_type === 'equipment-transfer' && selectedOrder.form_data.items && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">调拨设备</h5>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">类别</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">管理编号</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">序列号</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedOrder.form_data.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.equipment_name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.model_no}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{EQUIPMENT_CATEGORY_LABELS[item.category] || item.category}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.manage_code}</td>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.serial_number || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* 设备调拨位置和负责人信息 */}
                    {selectedOrder.order_type === 'equipment-transfer' && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">调拨信息</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">调出位置：</span>
                            <span className="text-sm text-gray-900 ml-2">
                              {selectedOrder.form_data._fromLocationName || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">调出负责人：</span>
                            <span className="text-sm text-gray-900 ml-2">
                              {selectedOrder.form_data._fromManagerName || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">调入位置：</span>
                            <span className="text-sm text-gray-900 ml-2">
                              {selectedOrder.form_data._toLocationName || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">调入负责人：</span>
                            <span className="text-sm text-gray-900 ml-2">
                              {selectedOrder.form_data._toManagerName || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 设备调拨发货信息 - 从调拨单详情获取 */}
                    {selectedOrder.order_type === 'equipment-transfer' && transferOrderDetail &&
                      (transferOrderDetail.shipping_no || transferOrderDetail.shipped_at || transferOrderDetail.shipping_attachment) && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">发货信息</h5>
                        <div className="grid grid-cols-2 gap-4">
                          {transferOrderDetail.shipped_at && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">发货时间：</span>
                              <span className="text-sm text-gray-900 ml-2">
                                {new Date(transferOrderDetail.shipped_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          )}
                          {transferOrderDetail.shipping_no && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">发货单号：</span>
                              <span className="text-sm text-gray-900 ml-2">
                                {transferOrderDetail.shipping_no}
                              </span>
                            </div>
                          )}
                          {transferOrderDetail.shipping_attachment && (
                            <div className="col-span-2">
                              <span className="text-sm font-medium text-gray-700">发货凭证：</span>
                              <a
                                href={transferOrderDetail.shipping_attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 ml-2 underline"
                              >
                                查看附件
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 入库单特殊处理 */}
                    {selectedOrder.order_type === 'equipment-inbound' && selectedOrder.form_data.items && (
                      <div className="space-y-6">
                        {selectedOrder.form_data.items.map((item: any, idx: number) => (
                          <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                              <h5 className="font-medium text-gray-900">
                                设备 {idx + 1}: {item.equipment_name} ({EQUIPMENT_CATEGORY_LABELS[item.category] || item.category})
                              </h5>
                            </div>
                            <div className="p-4 space-y-4">
                              {/* 基本信息 */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <span className="text-xs text-gray-500">设备型号</span>
                                  <p className="text-sm font-medium text-gray-900">{item.model_no || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">单位</span>
                                  <p className="text-sm font-medium text-gray-900">{item.unit || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">数量</span>
                                  <p className="text-sm font-medium text-gray-900">{item.quantity || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">序列号</span>
                                  <p className="text-sm font-medium text-gray-900">{item.serial_no || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">生产厂家</span>
                                  <p className="text-sm font-medium text-gray-900">{item.manufacturer || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">技术参数</span>
                                  <p className="text-sm font-medium text-gray-900">{item.tech_params || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">采购单价</span>
                                  <p className="text-sm font-medium text-gray-900">{item.purchase_price ? `¥${item.purchase_price}` : '-'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">总价</span>
                                  <p className="text-sm font-medium text-gray-900">{item.total_price ? `¥${item.total_price}` : '-'}</p>
                                </div>
                              </div>

                              {/* 校准证书信息 - 仅仪器类 */}
                              {item.category === 'instrument' && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <h6 className="text-sm font-medium text-blue-800 mb-2">校准证书信息</h6>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <span className="text-xs text-gray-500">证书编号</span>
                                      <p className="text-sm font-medium text-gray-900">{item.calibration_cert_no || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">发证单位</span>
                                      <p className="text-sm font-medium text-gray-900">{item.calibration_issuer || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">到期时间</span>
                                      <p className="text-sm font-medium text-gray-900">{item.calibration_expiry || '-'}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 配件情况 */}
                              <div>
                                <span className="text-xs text-gray-500">配件情况</span>
                                <p className="text-sm font-medium text-gray-900">{item.accessory_desc || '-'}</p>
                              </div>

                              {/* 备注 */}
                              <div>
                                <span className="text-xs text-gray-500">备注</span>
                                <p className="text-sm font-medium text-gray-900">{item.remark || '-'}</p>
                              </div>

                              {/* 主机图片 */}
                              {item.main_images && item.main_images.length > 0 && (
                                <div>
                                  <span className="text-xs text-gray-500 block mb-2">主机图片</span>
                                  <div className="flex flex-wrap gap-2">
                                    {item.main_images.map((img: string, imgIdx: number) => (
                                      <a
                                        key={imgIdx}
                                        href={img}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={img}
                                          alt={`主机图片 ${imgIdx + 1}`}
                                          className="w-20 h-20 object-cover rounded border border-gray-200 hover:border-blue-500 transition-colors"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 配件图片 */}
                              {item.accessory_images && item.accessory_images.length > 0 && (
                                <div>
                                  <span className="text-xs text-gray-500 block mb-2">配件图片</span>
                                  <div className="flex flex-wrap gap-2">
                                    {item.accessory_images.map((img: string, imgIdx: number) => (
                                      <a
                                        key={imgIdx}
                                        href={img}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={img}
                                          alt={`配件图片 ${imgIdx + 1}`}
                                          className="w-20 h-20 object-cover rounded border border-gray-200 hover:border-blue-500 transition-colors"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 附件信息 */}
                              {item.attachments && item.attachments.length > 0 && (
                                <div>
                                  <span className="text-xs text-gray-500 block mb-2">附件</span>
                                  <div className="space-y-1">
                                    {item.attachments.map((att: any, attIdx: number) => (
                                      <a
                                        key={attIdx}
                                        href={typeof att === 'string' ? att : att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 underline block"
                                      >
                                        {typeof att === 'string' ? `附件 ${attIdx + 1}` : (att.name || `附件 ${attIdx + 1}`)}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 配件清单 - 仅仪器类 */}
                              {item.category === 'instrument' && item.accessory_list && item.accessory_list.length > 0 && (
                                <div>
                                  <span className="text-xs text-gray-500 block mb-2">配件清单</span>
                                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">序号</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">配件名称</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">规格型号</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">数量</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">单位</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {item.accessory_list.map((acc: any, accIdx: number) => (
                                          <tr key={accIdx}>
                                            <td className="px-3 py-2 text-sm text-gray-900">{accIdx + 1}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900">{acc.accessory_name || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900">{acc.accessory_model || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900">{acc.accessory_quantity || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900">{acc.accessory_unit || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 其他字段 */}
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        // 获取部门/职位名称映射
                        const deptMap = selectedOrder.form_data._deptMap || {}
                        const posMap = selectedOrder.form_data._posMap || {}
                        
                        // 对于设备调拨，添加位置和负责人信息
                        const fromLocationName = selectedOrder.form_data._fromLocationName || ''
                        const toLocationName = selectedOrder.form_data._toLocationName || ''
                        const fromManagerName = selectedOrder.form_data._fromManagerName || ''
                        const toManagerName = selectedOrder.form_data._toManagerName || ''
                        
                        return Object.entries(selectedOrder.form_data)
                          .filter(([key]) => !key.startsWith('_') && key !== 'items') // 过滤内部字段和items
                          .filter(([key]) => {
                            // 对于设备调拨，过滤掉一些不需要显示的字段
                            if (selectedOrder.order_type === 'equipment-transfer') {
                              return !['fromLocationId', 'toLocationId', 'fromManagerId', 'toManagerId'].includes(key)
                            }
                            return true
                          })
                          .map(([key, value]) => {
                            // 格式化显示值
                            let displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
                            if (key === 'gender' && GENDER_LABELS[String(value)]) {
                              displayValue = GENDER_LABELS[String(value)]
                            } else if (key === 'employee_type' && EMPLOYEE_TYPE_LABELS[String(value)]) {
                              displayValue = EMPLOYEE_TYPE_LABELS[String(value)]
                            } else if (key === 'inbound_type' && INBOUND_TYPE_LABELS[String(value)]) {
                              displayValue = INBOUND_TYPE_LABELS[String(value)]
                            } else if (key === 'fromLocationType' && LOCATION_TYPE_LABELS[String(value)]) {
                              displayValue = LOCATION_TYPE_LABELS[String(value)]
                            } else if (key === 'toLocationType' && LOCATION_TYPE_LABELS[String(value)]) {
                              displayValue = LOCATION_TYPE_LABELS[String(value)]
                            } else if (key === 'receiveStatus' && RECEIVE_STATUS_LABELS[String(value)]) {
                              displayValue = RECEIVE_STATUS_LABELS[String(value)]
                            } else if (key === 'estimatedArrivalDate' && value) {
                              displayValue = new Date(value).toLocaleDateString('zh-CN')
                            } else if (key === 'shippingDate' && value) {
                              displayValue = new Date(value).toLocaleDateString('zh-CN')
                            } else if (key === 'department_id' && deptMap[String(value)]) {
                              displayValue = deptMap[String(value)]
                            } else if (key === 'position_id' && posMap[String(value)]) {
                              displayValue = posMap[String(value)]
                            }
                            
                            return (
                              <div key={key} className="flex flex-col">
                                <span className="text-xs text-gray-500 mb-1">
                                  {FORM_FIELD_LABELS[key] || key}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {displayValue}
                                </span>
                              </div>
                            )
                          })
                      })()}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无表单数据</p>
                )}
              </div>
            </div>
            
            {/* 审批记录 */}
            {selectedOrder.audit_logs && selectedOrder.audit_logs.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h4 className="font-semibold text-gray-900 mb-4">审批记录</h4>
                <div className="space-y-3">
                  {selectedOrder.audit_logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        log.action === 'approve' ? 'bg-green-500' : 
                        log.action === 'reject' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{log.node}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            log.action === 'approve' ? 'bg-green-100 text-green-700' :
                            log.action === 'reject' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {log.action === 'approve' ? '通过' : log.action === 'reject' ? '驳回' : '转交'}
                          </span>
                        </div>
                        {log.comment && (
                          <p className="text-sm text-gray-600 mt-1">{log.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 底部操作 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => navigate(`/workflow/visualization/${selectedOrder.id}`)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              查看流程图
            </button>
            {selectedOrder.status === 'pending' && (
              <button
                onClick={() => handleWithdraw(selectedOrder.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                撤回申请
              </button>
            )}
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
            <h1 className="text-2xl font-bold text-gray-900">我的申请</h1>
            <p className="text-gray-500 mt-1">共提交 {orders.length} 项申请</p>
          </div>
          <button
            onClick={() => navigate('/approvals/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            发起申请
          </button>
        </div>
        
        {/* 筛选和搜索栏 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 状态筛选 */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'pending', label: '审批中' },
                  { key: 'approved', label: '已通过' },
                  { key: 'rejected', label: '已驳回' }
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
            
            {/* 日期筛选 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value as any); setCurrentPage(1) }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部时间</option>
                <option value="week">最近一周</option>
                <option value="month">最近一月</option>
                <option value="quarter">最近三月</option>
              </select>
            </div>
            
            {/* 搜索 */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1) }}
                  placeholder="搜索申请标题、单号或类型..."
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
      {filteredOrders.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {viewMode === 'card' ? renderCardView() : renderTableView()}
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredOrders.length)} 条，
                共 {filteredOrders.length} 条
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

      {/* 详情弹窗 */}
      {selectedOrder && renderDetailModal()}
    </div>
  )
}
