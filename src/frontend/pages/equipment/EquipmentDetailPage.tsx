import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Equipment {
  id: string
  equipment_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  quantity: number
  manage_code: string
  serial_number: string | null
  location_status: string
  location_id: string
  location_name?: string
}

interface SelectedEquipment extends Equipment {
  repair_quantity: number
}

interface RepairCreateModalProps {
  isOpen: boolean
  onClose: () => void
  currentEquipment: Equipment | null
}

function RepairCreateModal({ isOpen, onClose, currentEquipment }: RepairCreateModalProps) {
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment[]>([])
  const [faultDescription, setFaultDescription] = useState('')
  const [repairServiceProvider, setRepairServiceProvider] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && currentEquipment) {
      console.log('Modal opened with equipment:', currentEquipment.id, currentEquipment.category, currentEquipment.quantity);
      loadAvailableEquipment()
      setSelectedEquipment([{ ...currentEquipment, repair_quantity: currentEquipment.category === 'instrument' ? 1 : currentEquipment.quantity }])
    }
  }, [isOpen, currentEquipment])

  const loadAvailableEquipment = async () => {
    if (!currentEquipment) return

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('加载设备信息失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        const filtered = result.data.filter((eq: Equipment) => 
          eq.location_id === currentEquipment.location_id && 
          eq.location_status === currentEquipment.location_status &&
          eq.id !== currentEquipment.id
        )
        setAvailableEquipment(filtered)
      }
    } catch (err) {
      console.error('加载设备信息失败:', err)
    }
  }

  const handleAddEquipment = (eq: Equipment) => {
    if (!selectedEquipment.find(e => e.id === eq.id)) {
      setSelectedEquipment([...selectedEquipment, { ...eq, repair_quantity: eq.category === 'instrument' ? 1 : eq.quantity }])
    }
  }

  const handleRemoveEquipment = (id: string) => {
    setSelectedEquipment(selectedEquipment.filter(e => e.id !== id))
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    setSelectedEquipment(selectedEquipment.map(e => 
      e.id === id ? { ...e, repair_quantity: Math.max(1, Math.min(quantity, e.quantity)) } : e
    ))
  }

  const handleSubmit = async () => {
    if (selectedEquipment.length === 0) {
      alert('请选择需要维修的设备')
      return
    }

    const invalidItems = selectedEquipment.filter(e => e.repair_quantity <= 0 || e.repair_quantity > e.quantity)
    if (invalidItems.length > 0) {
      alert('维修数量必须在1到总数量之间')
      return
    }

    if (!faultDescription.trim()) {
      alert('请填写故障描述')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')

      const equipmentData = selectedEquipment.map(eq => ({
        equipment_id: eq.id,
        equipment_name: eq.equipment_name,
        equipment_category: eq.category,
        repair_quantity: eq.repair_quantity
      }))

      const formData = {
        equipment_data: equipmentData,
        original_location_type: currentEquipment?.location_status === 'warehouse' ? 'warehouse' : 'project',
        original_location_id: currentEquipment?.location_id,
        fault_description: faultDescription,
        repair_service_provider: repairServiceProvider || null
      }

      const response = await fetch(`${API_URL.BASE}/api/equipment/repairs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || '提交失败')
      }

      alert('维修申请提交成功')
      onClose()
      window.location.href = '/approvals/mine'
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器',
      fake_load: '假负载',
      cable: '线材'
    }
    return labels[category] || category
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">申请维修</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">已选设备</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      设备名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      型号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      品牌
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类别
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      维修数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEquipment.map((eq) => {
                    console.log('Rendering equipment:', eq.id, eq.category, eq.repair_quantity);
                    return (
                      <tr key={eq.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {eq.equipment_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {eq.model_no}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {eq.brand}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {getCategoryLabel(eq.category)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {eq.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {eq.category === 'instrument' ? (
                            <span className="text-gray-500">1</span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              max={eq.quantity}
                              value={eq.repair_quantity}
                              onChange={(e) => {
                                console.log('Quantity change:', eq.id, eq.category, e.target.value);
                                handleQuantityChange(eq.id, parseInt(e.target.value) || 1);
                              }}
                              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleRemoveEquipment(eq.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">添加设备（同位置）</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      设备名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      型号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      品牌
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类别
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availableEquipment.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {eq.equipment_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {eq.model_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {eq.brand}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {getCategoryLabel(eq.category)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {eq.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleAddEquipment(eq)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          添加
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                故障描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
                placeholder="请输入故障描述"
                rows={5}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                维修服务商
              </label>
              <input
                type="text"
                value={repairServiceProvider}
                onChange={(e) => setRepairServiceProvider(e.target.value)}
                placeholder="请输入维修服务商（可选）"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedEquipment.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {submitting ? '提交中...' : `提交申请 (${selectedEquipment.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<EquipmentInstance | null>(null)
  const [keeper, setKeeper] = useState<Employee | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<EquipmentInstance>>({})
  const [showRepairModal, setShowRepairModal] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadEquipmentData()
    }
  }, [id])

  const loadEquipmentData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('加载设备信息失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setEquipment(result.data)
        setEditForm(result.data)

        if (result.data.keeper_id) {
          loadKeeper(result.data.keeper_id)
        }
      } else {
        throw new Error('设备不存在')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载设备信息失败')
    } finally {
      setLoading(false)
    }
  }

  const loadKeeper = async (keeperId: string) => {
    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/personnel/employees/${keeperId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setKeeper(result.data)
        }
      }
    } catch (err) {
      console.error('加载保管人信息失败:', err)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm(equipment || {})
  }

  const handleSave = async () => {
    if (!equipment) return

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances/${equipment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      alert('保存成功')
      setIsEditing(false)
      loadEquipmentData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleDelete = async () => {
    if (!equipment) return

    if (!confirm('确定要删除这个设备吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances/${equipment.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      alert('删除成功')
      navigate('/equipment')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const getHealthStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      normal: { label: '正常', color: 'bg-green-100 text-green-700' },
      slightly_damaged: { label: '轻微损坏', color: 'bg-yellow-100 text-yellow-700' },
      affected_use: { label: '影响使用', color: 'bg-orange-100 text-orange-700' },
      repairing: { label: '维修中', color: 'bg-blue-100 text-blue-700' },
      scrapped: { label: '已报废', color: 'bg-gray-100 text-gray-700' }
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const getUsageStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      idle: { label: '闲置', color: 'bg-gray-100 text-gray-700' },
      in_use: { label: '使用中', color: 'bg-blue-100 text-blue-700' }
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const getLocationStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      warehouse: { label: '仓库', color: 'bg-gray-100 text-gray-700' },
      in_project: { label: '项目中', color: 'bg-blue-100 text-blue-700' },
      repairing: { label: '维修中', color: 'bg-orange-100 text-orange-700' },
      transferring: { label: '调拨中', color: 'bg-purple-100 text-purple-700' }
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器',
      fake_load: '假负载',
      cable: '线材'
    }
    return labels[category] || category
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'root'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !equipment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700 mb-4">{error || '设备不存在'}</p>
          <button
            onClick={() => navigate('/equipment')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回设备列表
          </button>
        </div>
      </div>
    )
  }

  const healthStatusInfo = getHealthStatusLabel(equipment.health_status)
  const usageStatusInfo = getUsageStatusLabel(equipment.usage_status)
  const locationStatusInfo = getLocationStatusLabel(equipment.location_status)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RepairCreateModal
        isOpen={showRepairModal}
        onClose={() => setShowRepairModal(false)}
        currentEquipment={equipment}
      />

      <div className="mb-6">
        <button
          onClick={() => navigate('/equipment')}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 返回设备列表
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">设备详情</h1>
            <div className="flex space-x-2">
              {isAdmin && (
                <>
                  {!isEditing ? (
                    <>
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                      >
                        取消
                      </button>
                    </>
                  )}
                </>
              )}
              <button
                onClick={() => navigate('/equipment/transfers/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                调拨
              </button>
              <button
                onClick={() => setShowRepairModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
              >
                申请维修
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">设备信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">设备名称</label>
                    <div className="text-sm font-medium text-gray-900">{equipment?.equipment_name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">型号</label>
                    <div className="text-sm font-medium text-gray-900">{equipment?.model_no || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">品牌</label>
                    <div className="text-sm font-medium text-gray-900">{equipment?.brand || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">类别</label>
                    <div className="text-sm font-medium text-gray-900">{equipment ? getCategoryLabel(equipment.category) : '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">序列号</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.serial_number || ''}
                        onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{equipment.serial_number || '-'}</div>
                    )}
                  </div>
                  {equipment.category === 'instrument' && (
                    <div>
                      <label className="text-sm text-gray-500">仪器出厂编号</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.factory_serial_no || ''}
                          onChange={(e) => setEditForm({ ...editForm, factory_serial_no: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{equipment.factory_serial_no || '-'}</div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-500">管理编号</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.manage_code || ''}
                        onChange={(e) => setEditForm({ ...editForm, manage_code: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{equipment.manage_code || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">单位</label>
                    <div className="text-sm font-medium text-gray-900">{equipment.unit || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">状态信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">健康状态</label>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${healthStatusInfo.color}`}>
                      {healthStatusInfo.label}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">使用状态</label>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${usageStatusInfo.color}`}>
                      {usageStatusInfo.label}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">位置状态</label>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${locationStatusInfo.color}`}>
                      {locationStatusInfo.label}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">当前位置</label>
                    <div className="text-sm font-medium text-gray-900">{equipment.location_name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">保管人</label>
                    <div className="text-sm font-medium text-gray-900">{keeper?.name || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">采购信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">采购日期</label>
                    <div className="text-sm font-medium text-gray-900">{formatDate(equipment.purchase_date)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">采购价格</label>
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(equipment.purchase_price)}</div>
                  </div>
                </div>
              </div>
            </div>

            {equipment.category === 'instrument' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">校准信息</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">校准有效期</label>
                      <div className="text-sm font-medium text-gray-900">{formatDate(equipment.calibration_expiry)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">证书编号</label>
                      <div className="text-sm font-medium text-gray-900">{equipment.certificate_no || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">证书颁发机构</label>
                      <div className="text-sm font-medium text-gray-900">{equipment.certificate_issuer || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">其他信息</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">附件描述</label>
                <div className="text-sm font-medium text-gray-900">{equipment.accessory_desc || '-'}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">备注</label>
                {isEditing ? (
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{equipment.notes || '-'}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">附件</label>
                <div className="text-sm font-medium text-gray-900">{equipment.attachment || '-'}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <div>创建时间: {formatDate(equipment.created_at)}</div>
            <div>更新时间: {formatDate(equipment.updated_at)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
