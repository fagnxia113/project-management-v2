import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Equipment {
  id: string
  equipment_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'accessory'
  unit: string
  quantity: number
  manage_code: string
  serial_number: string | null
  location_status: string
  location_id: string
  location_name?: string
}

interface Warehouse {
  id: string
  name: string
  location: string
  manager_id: string
  manager_name?: string
}

interface SelectedEquipment extends Equipment {
  repair_quantity: number
}

export default function RepairCreatePage() {
  const navigate = useNavigate()
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [locationManagerId, setLocationManagerId] = useState('')
  
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment[]>([])
  const [faultDescription, setFaultDescription] = useState('')
  const [repairServiceProvider, setRepairServiceProvider] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadWarehouses()
  }, [])


  useEffect(() => {
    if (locationId) {
      setSelectedEquipment([])
    }
    loadEquipment()
    loadLocationManager()
  }, [locationId])

  const loadWarehouses = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const res = await fetch(`${API_URL.BASE}/api/warehouses?page=1&pageSize=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await res.json()
      
      if (result.success) {
        const allWarehouses = result.data || []
        
        const equipmentRes = await fetch(`${API_URL.BASE}/api/equipment/instances?location_status=warehouse&page=1&pageSize=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const equipmentResult = await equipmentRes.json()
        
        if (equipmentResult.success) {
          const equipment = equipmentResult.data || []
          const warehouseIds = new Set(equipment.map((e: Equipment) => e.location_id))
          const warehousesWithEquipment = allWarehouses.filter((wh: Warehouse) => warehouseIds.has(wh.id))
          setWarehouses(warehousesWithEquipment)
        } else {
          setWarehouses(allWarehouses)
        }
      }
    } catch (error) {
      console.error('加载仓库列表失败:', error)
    }
  }

  const loadEquipment = async () => {
    if (!locationId) {
      setEquipment([])
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/equipment/instances?location_id=${locationId}&location_status=warehouse`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await res.json()
      
      if (result.success) {
        setEquipment(result.data || [])
      }
    } catch (error) {
      console.error('加载设备失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLocationManager = async () => {
    if (!locationId) {
      setLocationManagerId('')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/warehouses/${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await res.json()
      
      if (result.success && result.data) {
        const warehouse = result.data
        const employeeId = warehouse?.manager_id || ''
        
        if (employeeId) {
          const userRes = await fetch(`${API_URL.BASE}/api/personnel/${employeeId}/user-id`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const userResult = await userRes.json()
          if (userResult.success && userResult.data) {
            setLocationManagerId(userResult.data.userId)
          } else {
            setLocationManagerId('')
          }
        } else {
          setLocationManagerId('')
        }
      } else {
        setLocationManagerId('')
      }
    } catch (error) {
      console.error('加载位置管理员失败:', error)
      setLocationManagerId('')
    }
  }

  const handleAddEquipment = (eq: Equipment) => {
    if (selectedEquipment.find(e => e.id === eq.id)) {
      return
    }

    setSelectedEquipment([...selectedEquipment, {
      ...eq,
      repair_quantity: eq.category === 'instrument' ? 1 : eq.quantity
    }])
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
      alert('请选择至少一个设备')
      return
    }

    if (!faultDescription.trim()) {
      alert('请填写故障描述')
      return
    }

    if (!locationManagerId) {
      const proceed = window.confirm('未找到位置管理员信息，是否继续提交？系统将使用默认审批流程。')
      if (!proceed) return
    }

    try {
      setSubmitting(true)
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      const token = localStorage.getItem('token')

      const formData = {
        equipment_data: selectedEquipment.map(e => ({
          equipment_id: e.id,
          equipment_name: e.equipment_name,
          equipment_category: e.category,
          repair_quantity: e.repair_quantity
        })),
        original_location_type: locationId.startsWith('wh') ? 'warehouse' : 'project',
        original_location_id: locationId,
        location_manager_id: locationManagerId,
        fault_description: faultDescription,
        repair_service_provider: repairServiceProvider || null
      }

      const response = await fetch(API_URL.WORKFLOW.FORM_PRESET_START('preset-equipment-repair'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          formData,
          initiator: {
            id: user?.id,
            name: user?.name
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('维修申请提交成功')
        navigate('/approvals/mine')
      } else {
        alert('提交失败：' + (result.message || '未知错误'))
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'instrument': '仪器',
      'fake_load': '假负载',
      'cable': '线缆'
    }
    return labels[category] || category
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/approvals/new')}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">设备维修申请</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择位置
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">请选择位置</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        {locationId && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">选择设备</h2>
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
                    {equipment.map((eq) => (
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleAddEquipment(eq)}
                            disabled={selectedEquipment.find(e => e.id === eq.id) !== undefined}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                          >
                            {selectedEquipment.find(e => e.id === eq.id) ? '已添加' : '添加'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedEquipment.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">已选设备</h2>
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
                      {selectedEquipment.map((eq) => (
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
                                onChange={(e) => handleQuantityChange(eq.id, parseInt(e.target.value) || 1)}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                故障描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请描述设备故障情况"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                维修服务商（可选）
              </label>
              <input
                type="text"
                value={repairServiceProvider}
                onChange={(e) => setRepairServiceProvider(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入维修服务商名称"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedEquipment.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : '提交申请'}
              </button>
              <button
                onClick={() => navigate('/approvals/new')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
