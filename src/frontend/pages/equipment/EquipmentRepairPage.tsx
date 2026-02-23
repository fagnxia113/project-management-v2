/**
 * 设备维修单页面 - 支持审批流程
 */
import { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'

// 维修单数据类型
interface RepairOrder {
  id: string
  order_no: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'repairing' | 'completed'
  equipment_id: string
  equipment_name: string
  equipment_code: string
  fault_type: string
  fault_description: string
  repair_type: 'internal' | 'external'
  estimated_cost?: number
  actual_cost?: number
  repair_start_date?: string
  repair_end_date?: string
  repair_vendor?: string
  repair_result?: string
  project_id?: string
  project_name?: string
  applicant_id: string
  applicant_name?: string
  created_at: string
  updated_at: string
}

// 表单数据类型
interface RepairFormData {
  equipment_id: string
  equipment_name: string
  equipment_code: string
  fault_type: string
  fault_description: string
  repair_type: string
  estimated_cost: number
  repair_vendor: string
  project_id: string
}

// 选项接口
interface Equipment { id: string; name: string; code: string }
interface Project { id: string; name: string }

const API_BASE = 'http://localhost:8080/api'

// 状态标签
const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  repairing: '维修中',
  completed: '已完成'
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  repairing: 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700'
}

// 故障类型
const faultTypes: Record<string, string> = {
  mechanical: '机械故障',
  electrical: '电气故障',
  hydraulic: '液压故障',
  electronic: '电子故障',
  other: '其他故障'
}

export default function EquipmentRepairPage() {
  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // 选项数据
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  
  // Modal状态
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingOrder, setEditingOrder] = useState<RepairOrder | null>(null)
  const [formData, setFormData] = useState<RepairFormData>({
    equipment_id: '',
    equipment_name: '',
    equipment_code: '',
    fault_type: 'mechanical',
    fault_description: '',
    repair_type: 'internal',
    estimated_cost: 0,
    repair_vendor: '',
    project_id: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadOrders()
    loadOptions()
  }, [page, searchTerm, statusFilter])

  const loadOptions = async () => {
    try {
      const [eqRes, prjRes] = await Promise.all([
        fetch(`${API_BASE}/data/Equipment?pageSize=100`),
        fetch(`${API_BASE}/data/Project?pageSize=100`)
      ])
      const [eqData, prjData] = await Promise.all([eqRes.json(), prjRes.json()])
      setEquipmentList(eqData.data || [])
      setProjects(prjData.data || [])
    } catch (error) {
      console.error('加载选项失败:', error)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      })
      
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-repair?${params}`)
      const result = await response.json()
      
      setOrders(result.data || [])
      setTotalPages(Math.ceil(result.total / 10))
      setTotal(result.total)
    } catch (error) {
      console.error('加载维修单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormMode('create')
    setEditingOrder(null)
    setFormData({
      equipment_id: '',
      equipment_name: '',
      equipment_code: '',
      fault_type: 'mechanical',
      fault_description: '',
      repair_type: 'internal',
      estimated_cost: 0,
      repair_vendor: '',
      project_id: ''
    })
    setIsFormOpen(true)
  }

  const handleEdit = (order: RepairOrder) => {
    setFormMode('edit')
    setEditingOrder(order)
    setFormData({
      equipment_id: order.equipment_id,
      equipment_name: order.equipment_name,
      equipment_code: order.equipment_code,
      fault_type: order.fault_type,
      fault_description: order.fault_description,
      repair_type: order.repair_type,
      estimated_cost: order.estimated_cost || 0,
      repair_vendor: order.repair_vendor || '',
      project_id: order.project_id || ''
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.equipment_name || !formData.fault_description) {
      alert('请填写必填项')
      return
    }
    
    setSubmitting(true)
    try {
      const url = formMode === 'create'
        ? `${API_BASE}/workflow-orders/equipment-repair`
        : `${API_BASE}/workflow-orders/equipment-repair/${editingOrder?.id}`
      
      const method = formMode === 'create' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, applicant_id: 'current-user' })
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

  const handleSubmitApproval = async (id: string) => {
    if (!confirm('确定要提交审批吗？')) return
    try {
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-repair/${id}/submit`, { method: 'POST' })
      if (response.ok) { await loadOrders() } else { alert('提交失败') }
    } catch (error) { alert('提交失败') }
  }

  const handleWithdraw = async (id: string) => {
    if (!confirm('确定要撤回吗？')) return
    try {
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-repair/${id}/withdraw`, { method: 'POST' })
      if (response.ok) { await loadOrders() } else { alert('撤回失败') }
    } catch (error) { alert('撤回失败') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return
    try {
      const response = await fetch(`${API_BASE}/workflow-orders/equipment-repair/${id}`, { method: 'DELETE' })
      if (response.ok) { await loadOrders() } else { alert('删除失败') }
    } catch (error) { alert('删除失败') }
  }

  const handleEquipmentSelect = (equipmentId: string) => {
    const equipment = equipmentList.find(e => e.id === equipmentId)
    if (equipment) {
      setFormData(prev => ({
        ...prev,
        equipment_id: equipment.id,
        equipment_name: equipment.name,
        equipment_code: equipment.code
      }))
    }
  }

  const columns = [
    {
      key: 'order_no' as keyof RepairOrder,
      header: '单据编号',
      render: (value: string) => <span className="font-medium text-gray-900">{value}</span>
    },
    {
      key: 'equipment_name' as keyof RepairOrder,
      header: '设备信息',
      render: (value: string, row: RepairOrder) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.equipment_code}</div>
        </div>
      )
    },
    {
      key: 'fault_type' as keyof RepairOrder,
      header: '故障类型',
      render: (value: string) => faultTypes[value] || value
    },
    {
      key: 'repair_type' as keyof RepairOrder,
      header: '维修方式',
      render: (value: string) => value === 'internal' ? '内部维修' : '外委维修'
    },
    {
      key: 'estimated_cost' as keyof RepairOrder,
      header: '预估费用',
      render: (value: number | null) => value ? `¥${value.toLocaleString()}` : '-'
    },
    {
      key: 'status' as keyof RepairOrder,
      header: '状态',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[value] || statusStyles.draft}`}>
          {statusLabels[value] || value}
        </span>
      )
    },
    {
      key: 'id' as keyof RepairOrder,
      header: '操作',
      render: (id: string, row: RepairOrder) => (
        <div className="flex items-center gap-2">
          {row.status === 'draft' && (
            <>
              <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
              <button onClick={() => handleSubmitApproval(id)} className="text-green-600 hover:text-green-800 text-sm">提交</button>
              <button onClick={() => handleDelete(id)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
            </>
          )}
          {row.status === 'pending' && (
            <button onClick={() => handleWithdraw(id)} className="text-orange-600 hover:text-orange-800 text-sm">撤回</button>
          )}
          {(row.status === 'approved' || row.status === 'rejected' || row.status === 'repairing' || row.status === 'completed') && (
            <span className="text-gray-400 text-sm">已处理</span>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备维修</h1>
          <p className="mt-1 text-sm text-gray-600">设备维修申请与管理</p>
        </div>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新建维修单
        </button>
      </div>

      <div className="flex gap-4">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="搜索单据编号、设备名称..." onSearch={() => setPage(1)} />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">全部状态</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <DataTable data={orders} columns={columns} loading={loading} emptyMessage="暂无维修单数据" rowKey="id" />

      {!loading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      {/* 表单弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{formMode === 'create' ? '新建维修单' : '编辑维修单'}</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 设备信息 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">设备信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">设备 <span className="text-red-500">*</span></label>
                    <select value={formData.equipment_id} onChange={(e) => handleEquipmentSelect(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">请选择设备</option>
                      {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">设备编号</label>
                    <input type="text" value={formData.equipment_code} onChange={(e) => setFormData(prev => ({ ...prev, equipment_code: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* 故障信息 */}
              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-700 mb-3">故障信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">故障类型 <span className="text-red-500">*</span></label>
                    <select value={formData.fault_type} onChange={(e) => setFormData(prev => ({ ...prev, fault_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {Object.entries(faultTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">维修方式</label>
                    <select value={formData.repair_type} onChange={(e) => setFormData(prev => ({ ...prev, repair_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="internal">内部维修</option>
                      <option value="external">外委维修</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">故障描述 <span className="text-red-500">*</span></label>
                  <textarea value={formData.fault_description} onChange={(e) => setFormData(prev => ({ ...prev, fault_description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="请详细描述故障情况..." />
                </div>
              </div>

              {/* 维修信息 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-700 mb-3">维修信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">预估费用</label>
                    <input type="number" min="0" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">维修单位</label>
                    <input type="text" value={formData.repair_vendor} onChange={(e) => setFormData(prev => ({ ...prev, repair_vendor: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="维修服务商名称" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">关联项目</label>
                  <select value={formData.project_id} onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">请选择项目（可选）</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
