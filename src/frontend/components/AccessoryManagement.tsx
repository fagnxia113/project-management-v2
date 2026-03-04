import { useState, useEffect } from 'react'
import { API_URL } from '../config/api'

export interface AccessoryInstance {
  id: string
  accessory_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  quantity: number
  manage_code: string
  serial_number: string | null
  notes: string | null
  created_at: string
}

interface AccessoryManagementProps {
  hostEquipmentId?: string
  readOnly?: boolean
  onAccessoriesChange?: (accessories: AccessoryInstance[]) => void
}

export default function AccessoryManagement({
  hostEquipmentId,
  readOnly = false,
  onAccessoriesChange
}: AccessoryManagementProps) {
  const [accessories, setAccessories] = useState<AccessoryInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newAccessory, setNewAccessory] = useState({
    accessory_name: '',
    model_no: '',
    brand: '',
    category: 'instrument' as 'instrument' | 'fake_load' | 'cable',
    unit: '台',
    quantity: 1,
    serial_number: '',
    notes: ''
  })

  useEffect(() => {
    if (hostEquipmentId) {
      loadAccessories()
    }
  }, [hostEquipmentId])

  const loadAccessories = async () => {
    if (!hostEquipmentId) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/images/accessories/host/${hostEquipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setAccessories(result.data)
        onAccessoriesChange?.(result.data)
      }
    } catch (error) {
      console.error('加载附件失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccessory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAccessory.accessory_name || !newAccessory.model_no) {
      alert('请填写附件名称和型号')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/images/accessories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          ...newAccessory,
          host_equipment_id: hostEquipmentId
        })
      })

      const result = await response.json()
      if (result.success) {
        setAccessories(prev => [...prev, result.data])
        onAccessoriesChange?.([...accessories, result.data])
        setShowAddDialog(false)
        setNewAccessory({
          accessory_name: '',
          model_no: '',
          brand: '',
          category: 'instrument',
          unit: '台',
          quantity: 1,
          serial_number: '',
          notes: ''
        })
      } else {
        alert(result.error || '添加失败')
      }
    } catch (error) {
      console.error('添加附件失败:', error)
      alert('添加失败')
    }
  }

  const handleDeleteAccessory = async (accessoryId: string) => {
    if (!confirm('确定要删除这个附件吗？')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/images/accessories/${accessoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        const updatedAccessories = accessories.filter(a => a.id !== accessoryId)
        setAccessories(updatedAccessories)
        onAccessoriesChange?.(updatedAccessories)
      } else {
        alert(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除附件失败:', error)
      alert('删除失败')
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器',
      fake_load: '假负载',
      cable: '线缆'
    }
    return labels[category] || category
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">附件管理</h3>
        {!readOnly && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + 添加附件
          </button>
        )}
      </div>

      {accessories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          暂无附件
        </div>
      ) : (
        <div className="space-y-3">
          {accessories.map((accessory) => (
            <div key={accessory.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">{accessory.accessory_name}</h4>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      {getCategoryLabel(accessory.category)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-500">型号：</span>
                      {accessory.model_no}
                    </div>
                    <div>
                      <span className="text-gray-500">品牌：</span>
                      {accessory.brand || '-'}
                    </div>
                    <div>
                      <span className="text-gray-500">数量：</span>
                      {accessory.quantity} {accessory.unit}
                    </div>
                    <div>
                      <span className="text-gray-500">管理编号：</span>
                      {accessory.manage_code}
                    </div>
                    {accessory.serial_number && (
                      <div>
                        <span className="text-gray-500">序列号：</span>
                        {accessory.serial_number}
                      </div>
                    )}
                    {accessory.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-500">备注：</span>
                        {accessory.notes}
                      </div>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleDeleteAccessory(accessory.id)}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加附件</h3>
            <form onSubmit={handleAddAccessory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">附件名称 *</label>
                  <input
                    type="text"
                    required
                    value={newAccessory.accessory_name}
                    onChange={(e) => setNewAccessory({ ...newAccessory, accessory_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型号 *</label>
                  <input
                    type="text"
                    required
                    value={newAccessory.model_no}
                    onChange={(e) => setNewAccessory({ ...newAccessory, model_no: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                  <input
                    type="text"
                    value={newAccessory.brand}
                    onChange={(e) => setNewAccessory({ ...newAccessory, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类别 *</label>
                  <select
                    required
                    value={newAccessory.category}
                    onChange={(e) => setNewAccessory({ ...newAccessory, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="instrument">仪器</option>
                    <option value="fake_load">假负载</option>
                    <option value="cable">线缆</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位 *</label>
                  <select
                    required
                    value={newAccessory.unit}
                    onChange={(e) => setNewAccessory({ ...newAccessory, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="台">台</option>
                    <option value="米">米</option>
                    <option value="套">套</option>
                    <option value="个">个</option>
                    <option value="件">件</option>
                    <option value="根">根</option>
                    <option value="卷">卷</option>
                    <option value="箱">箱</option>
                    <option value="包">包</option>
                    <option value="组">组</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量 *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newAccessory.quantity}
                    onChange={(e) => setNewAccessory({ ...newAccessory, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">序列号</label>
                  <input
                    type="text"
                    value={newAccessory.serial_number}
                    onChange={(e) => setNewAccessory({ ...newAccessory, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  rows={3}
                  value={newAccessory.notes}
                  onChange={(e) => setNewAccessory({ ...newAccessory, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
