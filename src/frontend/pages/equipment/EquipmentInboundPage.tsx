/**
 * 设备入库单页面
 */
import { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

// 入库单数据类型
interface InboundOrder {
  id: string
  order_no: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  inbound_type: 'purchase' | 'repair_return' | 'project_end' | 'other'
  warehouse_id: string
  warehouse_name?: string
  equipment_id: string
  equipment_name: string
  equipment_code: string
  quantity: number
  unit: string
  inbound_date: string
  supplier?: string
  purchase_price?: number
  notes?: string
  applicant_id: string
  applicant_name?: string
  approval_id?: string
  created_at: string
  updated_at: string
}

// 表单数据类型
interface InboundFormData {
  inbound_type: string
  warehouse_id: string
  equipment_id: string
  equipment_name: string
  equipment_code: string
  quantity: number
  unit: string
  inbound_date: string
  supplier: string
  purchase_price: number
  notes: string
}

// 仓库选项
interface Warehouse {
  id: string
  name: string
}

// 设备选项
interface Equipment {
  id: string
  name: string
  code: string
  unit: string
}

const API_BASE = API_URL.BASE + '/api'

// 状态标签
const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝'
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

// 入库类型标签
const inboundTypeLabels: Record<string, string> = {
  purchase: '采购入库',
  repair_return: '维修入库',
  project_end: '项目结束入库',
  other: '其他'
}

export default function EquipmentInboundPage() {
  const [orders, setOrders] = useState<InboundOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // 选项数据
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])

  // Modal状态
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingOrder, setEditingOrder] = useState<InboundOrder | null>(null)
  const [formData, setFormData] = useState<InboundFormData>({
    inbound_type: 'purchase',
    warehouse_id: '',
    equipment_id: '',
    equipment_name: '',
    equipment_code: '',
    quantity: 1,
    unit: 'piece',
    inbound_date: new Date().toISOString().slice(0, 10),
    supplier: '',
    purchase_price: 0,
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadOrders()
    loadOptions()
  }, [page, searchTerm, statusFilter])

  // 加载选项数据
  const loadOptions = async () => {
    try {
      // 加载仓库
      const whRes = await fetch(`${API_BASE}/data/Warehouse?pageSize=100`)
      const whData = await whRes.json()
      setWarehouses(whData.data || [])

      // 加载设备
      const eqRes = await fetch(`${API_BASE}/data/Equipment?pageSize=100`)
      const eqData = await eqRes.json()
      setEquipmentList(eqData.data || [])
    } catch (error) {
      console.error('加载选项失败:', error)
    }
  }

  // 加载入库单列表
  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      })

      const response = await fetch(`${API_BASE}/workflow-orders/equipment-inbound?${params}`)
      const result = await response.json()

      setOrders(result.data || [])
      setTotalPages(Math.ceil(result.total / 10))
      setTotal(result.total)
    } catch (error) {
      console.error('加载入库单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 打开新建对话框
  const handleCreate = () => {
    setFormMode('create')
    setEditingOrder(null)
    setFormData({
      inbound_type: 'purchase',
      warehouse_id: '',
      equipment_id: '',
      equipment_name: '',
      equipment_code: '',
      quantity: 1,
      unit: 'piece',
      inbound_date: new Date().toISOString().slice(0, 10),
      supplier: '',
      purchase_price: 0,
      notes: ''
    })
    setIsFormOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (order: InboundOrder) => {
    setFormMode('edit')
    setEditingOrder(order)
    setFormData({
      inbound_type: order.inbound_type,
      warehouse_id: order.warehouse_id,
      equipment_id: order.equipment_id,
      equipment_name: order.equipment_name,
      equipment_code: order.equipment_code,
      quantity: order.quantity,
      unit: order.unit,
      inbound_date: order.inbound_date,
      supplier: order.supplier || '',
      purchase_price: order.purchase_price || 0,
      notes: order.notes || ''
    })
    setIsFormOpen(true)
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.warehouse_id || !formData.equipment_name) {
      alert('请填写必填项')
      return
    }

    setSubmitting(true)
    try {
      const url = formMode === 'create'
        ? `${API_BASE}/workflow-orders/equipment-inbound`
        : `${API_BASE}/workflow-orders/equipment-inbound/${editingOrder?.id}`

      const method = formMode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          applicant_id: 'current-user' // TODO: 从上下文获取当前用户
        })
      })

      if (response.ok) {
        setIsFormOpen(false)
        await loadOrders()
      } else {
        const error = await response.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 提交审批
  const handleSubmitApproval = async (id: string) => {
    if (!confirm('确定要提交审批吗？')) return

    try {
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-inbound/${id}/submit`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadOrders()
      } else {
        const error = await response.json()
        alert(error.error || '提交失败')
      }
    } catch (error) {
      console.error('提交审批失败:', error)
      alert('提交失败')
    }
  }

  // 撤回
  const handleWithdraw = async (id: string) => {
    if (!confirm('确定要撤回吗？')) return

    try {
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-inbound/${id}/withdraw`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadOrders()
      } else {
        const error = await response.json()
        alert(error.error || '撤回失败')
      }
    } catch (error) {
      console.error('撤回失败:', error)
      alert('撤回失败')
    }
  }

  // 删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return

    try {
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-inbound/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadOrders()
      } else {
        const error = await response.json()
        alert(error.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  // 选择设备时自动填充
  const handleEquipmentSelect = (equipmentId: string) => {
    const equipment = equipmentList.find(e => e.id === equipmentId)
    if (equipment) {
      setFormData(prev => ({
        ...prev,
        equipment_id: equipment.id,
        equipment_name: equipment.name,
        equipment_code: equipment.code,
        unit: equipment.unit || 'piece'
      }))
    }
  }

  // 表格列定义
  const columns = [
    {
      key: 'order_no' as keyof InboundOrder,
      header: '单据编号',
      render: (value: string, row: InboundOrder) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{inboundTypeLabels[row.inbound_type]}</div>
        </div>
      )
    },
    {
      key: 'equipment_name' as keyof InboundOrder,
      header: '设备信息',
      render: (value: string, row: InboundOrder) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.equipment_code} | {row.quantity} {row.unit}</div>
        </div>
      )
    },
    {
      key: 'warehouse_name' as keyof InboundOrder,
      header: '入库仓库',
      render: (value: string) => value || '-'
    },
    {
      key: 'inbound_date' as keyof InboundOrder,
      header: '入库日期',
      render: (value: string) => value || '-'
    },
    {
      key: 'status' as keyof InboundOrder,
      header: '状态',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[value] || statusStyles.draft}`}>
          {statusLabels[value] || value}
        </span>
      )
    },
    {
      key: 'id' as keyof InboundOrder,
      header: '操作',
      render: (id: string, row: InboundOrder) => (
        <div className="flex items-center gap-2">
          {row.status === 'draft' && (
            <>
              <button
                onClick={() => handleEdit(row)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => handleSubmitApproval(id)}
                className="text-green-600 hover:text-green-800 text-sm"
              >
                提交
              </button>
              <button
                onClick={() => handleDelete(id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                删除
              </button>
            </>
          )}
          {row.status === 'pending' && (
            <button
              onClick={() => handleWithdraw(id)}
              className="text-orange-600 hover:text-orange-800 text-sm"
            >
              撤回
            </button>
          )}
          {(row.status === 'approved' || row.status === 'rejected') && (
            <span className="text-gray-400 text-sm">已处理</span>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备入库</h1>
          <p className="mt-1 text-sm text-gray-600">设备入库申请与管理</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 新建入库单
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="搜索单据编号、设备名称..."
          onSearch={() => setPage(1)}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="pending">待审批</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      {/* 数据表格 */}
      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        emptyMessage={searchTerm ? '未找到匹配的入库单' : '暂无入库单数据'}
        rowKey="id"
      />

      {/* 分页 */}
      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* 表单弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {formMode === 'create' ? '新建入库单' : '编辑入库单'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* 入库类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  入库类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.inbound_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, inbound_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="purchase">采购入库</option>
                  <option value="repair_return">维修入库</option>
                  <option value="project_end">项目结束入库</option>
                  <option value="other">其他</option>
                </select>
              </div>

              {/* 入库仓库 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  入库仓库 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">请选择仓库</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              {/* 设备选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.equipment_id}
                    onChange={(e) => handleEquipmentSelect(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">请选择设备</option>
                    {equipmentList.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="设备名称（可手动输入）"
                    value={formData.equipment_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, equipment_name: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 设备编号 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设备编号</label>
                  <input
                    type="text"
                    value={formData.equipment_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, equipment_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="piece">台</option>
                    <option value="set">套</option>
                    <option value="unit">个</option>
                    <option value="item">件</option>
                  </select>
                </div>
              </div>

              {/* 数量和日期 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    入库日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.inbound_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, inbound_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 采购相关 */}
              {formData.inbound_type === 'purchase' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">采购价格</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入备注信息..."
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
