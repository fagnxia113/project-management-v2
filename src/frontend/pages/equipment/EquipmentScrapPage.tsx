/**
 * 设备报废单页面 - 支持审批流程
 */
import React, { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'

interface ScrapOrder {
  id: string
  order_no: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  equipment_id: string
  equipment_name: string
  equipment_code: string
  scrap_type: 'normal' | 'damage' | 'obsolete' | 'other'
  scrap_reason: string
  residual_value?: number
  disposal_method?: 'sale' | 'recycle' | 'discard'
  disposal_vendor?: string
  notes?: string
  applicant_id: string
  applicant_name?: string
  created_at: string
  updated_at: string
}

interface ScrapFormData {
  equipment_id: string
  equipment_name: string
  equipment_code: string
  scrap_type: string
  scrap_reason: string
  residual_value: number
  disposal_method: string
  disposal_vendor: string
  notes: string
}

interface Equipment {
  id: string
  name: string
  code: string
  purchase_price?: number
}

const API_BASE = 'http://localhost:8080/api'

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

const scrapTypes: Record<string, string> = {
  normal: '正常报废',
  damage: '损坏报废',
  obsolete: '淘汰报废',
  other: '其他'
}

const disposalMethods: Record<string, string> = {
  sale: '出售',
  recycle: '回收',
  discard: '废弃'
}

export default function EquipmentScrapPage() {
  const [orders, setOrders] = useState<ScrapOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingOrder, setEditingOrder] = useState<ScrapOrder | null>(null)
  const [formData, setFormData] = useState<ScrapFormData>({
    equipment_id: '',
    equipment_name: '',
    equipment_code: '',
    scrap_type: 'normal',
    scrap_reason: '',
    residual_value: 0,
    disposal_method: 'discard',
    disposal_vendor: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadOrders()
    loadOptions()
  }, [page, searchTerm, statusFilter])

  async function loadOptions() {
    try {
      const res = await fetch(`${API_BASE}/data/Equipment?pageSize=100`)
      const data = await res.json()
      setEquipmentList(data.data || [])
    } catch (error) {
      console.error('加载选项失败:', error)
    }
  }

  async function loadOrders() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      })
      const res = await fetch(`${API_BASE}/workflow-orders/equipment-scrap?${params}`)
      const result = await res.json()
      setOrders(result.data || [])
      setTotalPages(Math.ceil(result.total / 10))
      setTotal(result.total)
    } catch (error) {
      console.error('加载报废单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    setFormMode('create')
    setEditingOrder(null)
    setFormData({
      equipment_id: '',
      equipment_name: '',
      equipment_code: '',
      scrap_type: 'normal',
      scrap_reason: '',
      residual_value: 0,
      disposal_method: 'discard',
      disposal_vendor: '',
      notes: ''
    })
    setIsFormOpen(true)
  }

  function handleEdit(order: ScrapOrder) {
    setFormMode('edit')
    setEditingOrder(order)
    setFormData({
      equipment_id: order.equipment_id,
      equipment_name: order.equipment_name,
      equipment_code: order.equipment_code,
      scrap_type: order.scrap_type,
      scrap_reason: order.scrap_reason,
      residual_value: order.residual_value || 0,
      disposal_method: order.disposal_method || 'discard',
      disposal_vendor: order.disposal_vendor || '',
      notes: order.notes || ''
    })
    setIsFormOpen(true)
  }

  async function handleSubmit() {
    if (!formData.equipment_name || !formData.scrap_reason) {
      alert('请填写必填项')
      return
    }
    setSubmitting(true)
    try {
      const url = formMode === 'create'
        ? `${API_BASE}/workflow-orders/equipment-scrap`
        : `${API_BASE}/workflow-orders/equipment-scrap/${editingOrder?.id}`
      const res = await fetch(url, {
        method: formMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, applicant_id: 'current-user' })
      })
      if (res.ok) {
        setIsFormOpen(false)
        await loadOrders()
      } else {
        alert('操作失败')
      }
    } catch (error) {
      alert('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitApproval(id: string) {
    if (!confirm('确定要提交审批吗？')) return
    try {
      const res = await fetch(`${API_BASE}/workflow-orders/equipment-scrap/${id}/submit`, { method: 'POST' })
      if (res.ok) {
        await loadOrders()
      } else {
        alert('提交失败')
      }
    } catch (error) {
      alert('提交失败')
    }
  }

  async function handleWithdraw(id: string) {
    if (!confirm('确定要撤回吗？')) return
    try {
      const res = await fetch(`${API_BASE}/workflow-orders/equipment-scrap/${id}/withdraw`, { method: 'POST' })
      if (res.ok) {
        await loadOrders()
      } else {
        alert('撤回失败')
      }
    } catch (error) {
      alert('撤回失败')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除吗？')) return
    try {
      const res = await fetch(`${API_BASE}/workflow-orders/equipment-scrap/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadOrders()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  function handleEquipmentSelect(id: string) {
    const eq = equipmentList.find(e => e.id === id)
    if (eq) {
      setFormData(prev => ({
        ...prev,
        equipment_id: eq.id,
        equipment_name: eq.name,
        equipment_code: eq.code
      }))
    }
  }

  function renderOrderNo(v: string) {
    return React.createElement('span', { className: 'font-medium text-gray-900' }, v)
  }

  function renderEquipment(v: string, r: ScrapOrder) {
    return React.createElement('div', null,
      React.createElement('div', { className: 'font-medium' }, v),
      React.createElement('div', { className: 'text-xs text-gray-500' }, r.equipment_code)
    )
  }

  function renderScrapType(v: string) {
    return scrapTypes[v] || v
  }

  function renderDisposal(v: string) {
    return v ? disposalMethods[v] || v : '-'
  }

  function renderResidual(v: number | null) {
    return v ? `¥${v.toLocaleString()}` : '-'
  }

  function renderStatus(v: string) {
    return React.createElement('span', {
      className: `px-2 py-1 rounded-full text-xs font-medium ${statusStyles[v] || statusStyles.draft}`
    }, statusLabels[v] || v)
  }

  function renderOperations(id: string, r: ScrapOrder) {
    if (r.status === 'draft') {
      return React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('button', {
          onClick: () => handleEdit(r),
          className: 'text-blue-600 hover:text-blue-800 text-sm'
        }, '编辑'),
        React.createElement('button', {
          onClick: () => handleSubmitApproval(id),
          className: 'text-green-600 hover:text-green-800 text-sm'
        }, '提交'),
        React.createElement('button', {
          onClick: () => handleDelete(id),
          className: 'text-red-600 hover:text-red-800 text-sm'
        }, '删除')
      )
    }
    if (r.status === 'pending') {
      return React.createElement('button', {
        onClick: () => handleWithdraw(id),
        className: 'text-orange-600 hover:text-orange-800 text-sm'
      }, '撤回')
    }
    return React.createElement('span', { className: 'text-gray-400 text-sm' }, '已处理')
  }

  const columns = [
    { key: 'order_no' as keyof ScrapOrder, header: '单据编号', render: renderOrderNo },
    { key: 'equipment_name' as keyof ScrapOrder, header: '设备信息', render: renderEquipment },
    { key: 'scrap_type' as keyof ScrapOrder, header: '报废类型', render: renderScrapType },
    { key: 'disposal_method' as keyof ScrapOrder, header: '处置方式', render: renderDisposal },
    { key: 'residual_value' as keyof ScrapOrder, header: '残值', render: renderResidual },
    { key: 'status' as keyof ScrapOrder, header: '状态', render: renderStatus },
    { key: 'id' as keyof ScrapOrder, header: '操作', render: renderOperations }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备报废</h1>
          <p className="mt-1 text-sm text-gray-600">设备报废申请与处置管理</p>
        </div>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 新建报废单
        </button>
      </div>

      <div className="flex gap-4">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="搜索单据编号、设备名称..." onSearch={() => setPage(1)} />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">全部状态</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <DataTable data={orders} columns={columns} loading={loading} emptyMessage="暂无报废单数据" rowKey="id" />

      {!loading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">{formMode === 'create' ? '新建报废单' : '编辑报废单'}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">设备信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">设备 <span className="text-red-500">*</span></label>
                    <select
                      value={formData.equipment_id}
                      onChange={(e) => handleEquipmentSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">请选择设备</option>
                      {equipmentList.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">设备编号</label>
                    <input
                      type="text"
                      value={formData.equipment_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-700 mb-3">报废信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">报废类型 <span className="text-red-500">*</span></label>
                    <select
                      value={formData.scrap_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, scrap_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(scrapTypes).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">处置方式</label>
                    <select
                      value={formData.disposal_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, disposal_method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(disposalMethods).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">报废原因 <span className="text-red-500">*</span></label>
                  <textarea
                    value={formData.scrap_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, scrap_reason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="请详细说明报废原因..."
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-700 mb-3">处置信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">残值评估</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.residual_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, residual_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">处置单位</label>
                    <input
                      type="text"
                      value={formData.disposal_vendor}
                      onChange={(e) => setFormData(prev => ({ ...prev, disposal_vendor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="回收/处置单位名称"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">备注</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="其他备注信息..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                取消
              </button>
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
