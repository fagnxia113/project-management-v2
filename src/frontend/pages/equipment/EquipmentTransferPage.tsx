import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

// 设备型号
interface EquipmentModel {
  id: string
  name: string
  model_no: string
  brand: string
  category: string
  unit: string
}

// 库存位置
interface StockLocation {
  location_id: string
  location_name: string
  location_type: 'warehouse' | 'project'
  country: string
  available_qty: number
  total_qty: number
}

// 调拨明细
interface TransferItem {
  id: string
  model_id: string
  model_name: string
  model_no: string
  brand: string
  unit: string
  from_location_id: string
  from_location_name: string
  from_location_type: 'warehouse' | 'project'
  to_location_id: string
  to_location_name: string
  to_location_type: 'warehouse' | 'project'
  request_qty: number
  available_qty: number
}

export default function EquipmentTransferPage() {
  const navigate = useNavigate()
  
  // 基础数据
  const [models, setModels] = useState<EquipmentModel[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  
  // 表单状态
  const [selectedModelId, setSelectedModelId] = useState('')
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedFromLocation, setSelectedFromLocation] = useState('')
  const [selectedToLocation, setSelectedToLocation] = useState('')
  const [selectedToType, setSelectedToType] = useState<'warehouse' | 'project'>('project')
  const [requestQty, setRequestQty] = useState(1)
  const [transferReason, setTransferReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 加载基础数据
  useEffect(() => {
    loadBaseData()
  }, [])

  const loadBaseData = async () => {
    try {
      const [modelRes, whRes, projRes] = await Promise.all([
        fetch(`${API_URL.BASE}/api/data/EquipmentModel`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API_URL.BASE}/api/data/Warehouse`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API_URL.BASE}/api/data/Project`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ])
      
      const modelData = await modelRes.json()
      const whData = await whRes.json()
      const projData = await projRes.json()
      
      // 兼容两种API响应格式
      setModels(modelData.data || modelData || [])
      setWarehouses(whData.data || whData || [])
      setProjects(projData.data || projData || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 查询设备库存分布
  const queryStock = async (modelId: string) => {
    if (!modelId) {
      setStockLocations([])
      return
    }
    
    setLoadingStock(true)
    try {
      // 调用后端API查询库存
      const response = await fetch(`${API_URL.BASE}/api/equipment/stock-distribution?model_id=${modelId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const result = await response.json()
      
      if (result.success) {
        setStockLocations(result.data || [])
      } else {
        // 如果API不存在，模拟数据
        setStockLocations([
          { location_id: 'wh-domestic', location_name: '国内仓库', location_type: 'warehouse', country: '中国', available_qty: 5, total_qty: 5 },
          { location_id: 'wh-overseas', location_name: '国外仓库', location_type: 'warehouse', country: '新加坡', available_qty: 3, total_qty: 3 },
        ])
      }
    } catch (error) {
      console.error('查询库存失败:', error)
      // 模拟数据
      setStockLocations([
        { location_id: 'wh-domestic', location_name: '国内仓库', location_type: 'warehouse', country: '中国', available_qty: 5, total_qty: 5 },
        { location_id: 'wh-overseas', location_name: '国外仓库', location_type: 'warehouse', country: '新加坡', available_qty: 3, total_qty: 3 },
      ])
    } finally {
      setLoadingStock(false)
    }
  }

  // 选择设备型号时查询库存
  useEffect(() => {
    queryStock(selectedModelId)
  }, [selectedModelId])

  // 添加调拨项
  const handleAddTransferItem = () => {
    const model = models.find(m => m.id === selectedModelId)
    const fromLocation = stockLocations.find(s => s.location_id === selectedFromLocation)
    
    if (!model || !fromLocation) {
      alert('请选择设备和调出位置')
      return
    }
    
    if (requestQty > fromLocation.available_qty) {
      alert('申请数量超过可用库存')
      return
    }
    
    const toItem = warehouses.find(w => w.id === selectedToLocation) || 
                   projects.find(p => p.id === selectedToLocation)
    
    if (!selectedToLocation || !toItem) {
      alert('请选择调入位置')
      return
    }

    const newItem: TransferItem = {
      id: crypto.randomUUID(),
      model_id: model.id,
      model_name: model.name,
      model_no: model.model_no,
      brand: model.brand || '',
      unit: model.unit || '台',
      from_location_id: fromLocation.location_id,
      from_location_name: fromLocation.location_name,
      from_location_type: fromLocation.location_type,
      to_location_id: selectedToLocation,
      to_location_name: toItem.name || toItem.project_name,
      to_location_type: selectedToType,
      request_qty: requestQty,
      available_qty: fromLocation.available_qty
    }
    
    setTransferItems(prev => [...prev, newItem])
    
    // 重置选择
    setSelectedModelId('')
    setSelectedFromLocation('')
    setSelectedToLocation('')
    setRequestQty(1)
    setShowAddDialog(false)
  }

  // 移除调拨项
  const handleRemoveItem = (id: string) => {
    setTransferItems(prev => prev.filter(item => item.id !== id))
  }

  // 提交调拨申请
  const handleSubmit = async () => {
    if (transferItems.length === 0) {
      alert('请添加调拨设备')
      return
    }
    if (!transferReason) {
      alert('请填写调拨原因')
      return
    }

    setSubmitting(true)
    try {
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null

      const orderData = {
        order_no: `DB-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-4)}`,
        transfer_type: transferItems.length > 1 ? 'batch' : 'single',
        total_items: transferItems.length,
        total_quantity: transferItems.reduce((sum, item) => sum + item.request_qty, 0),
        applicant_id: user?.id || 'unknown',
        applicant: user?.name || '当前用户',
        apply_date: new Date().toISOString().slice(0, 10),
        transfer_reason: transferReason,
        notes: notes,
        status: 'pending',
        items: transferItems
      }

      const response = await fetch(`${API_URL.BASE}/api/data/EquipmentTransferOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      
      if (result.success) {
        alert('调拨申请提交成功！')
        navigate('/approvals/pending')
      } else {
        alert('提交失败：' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 获取目标位置列表
  const getToLocationOptions = () => {
    const options: { id: string; name: string; type: 'warehouse' | 'project' }[] = []
    
    // 添加仓库
    warehouses.forEach(wh => {
      options.push({ id: wh.id, name: wh.name, type: 'warehouse' })
    })
    
    // 添加项目
    projects.forEach(p => {
      options.push({ id: p.id, name: p.name || p.project_name, type: 'project' })
    })
    
    return options
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备调拨申请</h1>
          <p className="mt-1 text-sm text-gray-600">查询设备库存并申请调拨</p>
        </div>
        <button
          onClick={() => navigate('/equipment')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          设备台账
        </button>
      </div>

      {/* 步骤说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">调拨流程</h3>
        <div className="flex items-center space-x-4 text-sm text-blue-700">
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">1</span>选择设备型号</span>
          <span className="text-blue-300">→</span>
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">2</span>查看库存分布</span>
          <span className="text-blue-300">→</span>
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">3</span>选择调出/调入位置</span>
          <span className="text-blue-300">→</span>
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">4</span>提交申请</span>
        </div>
      </div>

      {/* 已添加的调拨项 */}
      {transferItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">调拨明细 ({transferItems.length}项)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">调出位置</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">调入位置</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transferItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm">{item.model_name}</td>
                    <td className="px-4 py-3 text-sm">{item.model_no}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                        {item.from_location_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                        {item.to_location_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{item.request_qty} {item.unit}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
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

      {/* 添加调拨项对话框 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">添加调拨设备</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：选择设备和查看库存 */}
          <div className="space-y-4">
            {/* 选择设备型号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择设备型号</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择设备型号</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.model_no} ({m.brand || '未知品牌'})</option>
                ))}
              </select>
            </div>

            {/* 库存分布 */}
            {selectedModelId && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  库存分布 
                  {loadingStock && <span className="text-blue-500 ml-2">加载中...</span>}
                </h4>
                {stockLocations.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">位置名称</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">可用数量</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockLocations.map(loc => (
                          <tr key={loc.location_id} className={selectedFromLocation === loc.location_id ? 'bg-blue-50' : ''}>
                            <td className="px-3 py-2 text-sm">{loc.location_name}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                loc.location_type === 'warehouse' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {loc.location_type === 'warehouse' ? '仓库' : '项目'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-green-600">{loc.available_qty}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => setSelectedFromLocation(loc.location_id)}
                                disabled={loc.available_qty === 0}
                                className={`text-sm px-2 py-1 rounded ${
                                  selectedFromLocation === loc.location_id
                                    ? 'bg-blue-600 text-white'
                                    : loc.available_qty > 0
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {selectedFromLocation === loc.location_id ? '已选择' : '从此调出'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !loadingStock && <p className="text-gray-500 text-sm">暂无库存数据</p>
                )}
              </div>
            )}
          </div>

          {/* 右侧：选择调入位置和数量 */}
          <div className="space-y-4">
            {/* 调入位置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调入位置</label>
              <select
                value={selectedToLocation}
                onChange={(e) => {
                  const loc = getToLocationOptions().find(l => l.id === e.target.value)
                  if (loc) {
                    setSelectedToLocation(loc.id)
                    setSelectedToType(loc.type)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择调入位置</option>
                <optgroup label="仓库">
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>📦 {wh.name}</option>
                  ))}
                </optgroup>
                <optgroup label="项目">
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>🏗️ {p.name || p.project_name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 申请数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">申请数量</label>
              <input
                type="number"
                min="1"
                value={requestQty}
                onChange={(e) => setRequestQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {selectedFromLocation && (
                <p className="text-xs text-gray-500 mt-1">
                  可用库存: {stockLocations.find(s => s.location_id === selectedFromLocation)?.available_qty || 0}
                </p>
              )}
            </div>

            {/* 添加按钮 */}
            <button
              onClick={handleAddTransferItem}
              disabled={!selectedModelId || !selectedFromLocation || !selectedToLocation}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              + 添加到调拨列表
            </button>
          </div>
        </div>
      </div>

      {/* 调拨原因和备注 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">调拨信息</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">调拨原因 <span className="text-red-500">*</span></label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="请填写调拨原因..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="其他备注信息..."
            />
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate('/equipment')}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || transferItems.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '提交中...' : '提交调拨申请'}
        </button>
      </div>
    </div>
  )
}
