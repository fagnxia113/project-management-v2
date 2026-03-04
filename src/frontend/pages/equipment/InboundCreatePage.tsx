import { useState, useEffect } from 'react'
import { API_URL, parseJWTToken } from '../../config/api'

interface InboundItem {
  id: string
  category: 'instrument' | 'fake_load' | 'cable'
  equipment_name: string
  model_no: string
  brand: string
  unit: string
  quantity: number
  purchase_price: number
  total_price: number
  serial_numbers: string
  certificate_no: string
  certificate_issuer: string
  certificate_expiry_date: string
  accessory_desc: string
  manufacturer: string
  technical_params: string
  item_notes: string
  attachment: string
  isCustomName: boolean
  isCustomModel: boolean
}

interface InboundFormData {
  inbound_type: 'purchase' | 'other'
  warehouse_id: string
  supplier: string
  purchase_date: string
  notes: string
  items: InboundItem[]
}

interface Warehouse {
  id: string
  name: string
  warehouse_no: string
}

interface EquipmentOption {
  equipment_name: string
  model_no: string
  category: 'instrument' | 'fake_load' | 'cable'
}

export default function InboundCreatePage() {
  const [formData, setFormData] = useState<InboundFormData>({
    inbound_type: 'purchase',
    warehouse_id: '',
    supplier: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  })

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadWarehouses()
    loadEquipmentOptions()
  }, [])

  const loadWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL.BASE}/api/warehouses`)
      const result = await response.json()
      if (result.success) {
        setWarehouses(result.data || [])
      }
    } catch (error) {
      console.error('加载仓库失败:', error)
    }
  }

  const loadEquipmentOptions = async () => {
    try {
      const response = await fetch(`${API_URL.BASE}/api/equipment/instances?page=1&pageSize=1000`)
      const result = await response.json()
      console.log('设备数据:', result)
      if (result.success && result.data) {
        const options = result.data.map((eq: any) => ({
          equipment_name: eq.equipment_name,
          model_no: eq.model_no,
          category: eq.category
        }))
        console.log('设备选项:', options)
        console.log('设备选项详情:', JSON.stringify(options, null, 2))
        setEquipmentOptions(options)
      }
    } catch (error) {
      console.error('加载设备选项失败:', error)
    }
  }

  const handleFileUpload = async (index: number, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      if (result.success) {
        updateItem(index, 'attachment', result.fileUrl)
        return result.fileUrl
      } else {
        throw new Error(result.error || '文件上传失败')
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      alert('文件上传失败，请重试')
      throw error
    }
  }

  const getUniqueEquipmentNames = (category: string) => {
    const names = equipmentOptions
      .filter(opt => opt.category === category)
      .map(opt => opt.equipment_name)
    
    const uniqueNames = [...new Set(names)].sort()
    console.log(`类别 ${category} 的设备名称:`, uniqueNames)
    return uniqueNames
  }

  const getModelNosByEquipmentName = (equipmentName: string, category: string) => {
    console.log('getModelNosByEquipmentName 调用:', { equipmentName, category })
    console.log('当前 equipmentOptions:', equipmentOptions)
    
    const filtered = equipmentOptions.filter(opt => opt.equipment_name === equipmentName && opt.category === category)
    console.log('筛选后的设备:', filtered)
    
    const modelNos = filtered.map(opt => opt.model_no)
    const uniqueModelNos = [...new Set(modelNos)].sort()
    console.log(`设备 ${equipmentName} (${category}) 的型号:`, uniqueModelNos)
    return uniqueModelNos
  }

  const addItem = () => {
    const newItem: InboundItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      equipment_name: '',
      model_no: '',
      model_id: '',
      category: 'instrument',
      unit: '台',
      quantity: 1,
      purchase_price: 0,
      total_price: 0,
      serial_numbers: '',
      certificate_no: '',
      certificate_issuer: '',
      certificate_expiry_date: '',
      accessory_desc: '',
      manufacturer: '',
      technical_params: '',
      item_notes: '',
      attachment: '',
      isCustomName: false,
      isCustomModel: false
    }
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const duplicateItem = (index: number) => {
    const itemToDuplicate = formData.items[index]
    const newItem = {
      ...itemToDuplicate,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serial_numbers: ''
    }
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const updateItem = (index: number, field: string, value: any) => {
    console.log('updateItem:', { index, field, value })
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'purchase_price' || field === 'quantity') {
      newItems[index].total_price = newItems[index].purchase_price * newItems[index].quantity
    }
    
    console.log('newItems:', newItems)
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const updateItemMultiple = (index: number, updates: Record<string, any>) => {
    console.log('updateItemMultiple:', { index, updates })
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], ...updates }
    
    if ('purchase_price' in updates || 'quantity' in updates) {
      newItems[index].total_price = newItems[index].purchase_price * newItems[index].quantity
    }
    
    console.log('newItems:', newItems)
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.items.length === 0) {
      alert('请至少添加一个设备明细')
      return
    }
    
    for (const item of formData.items) {
      if (!item.equipment_name || !item.model_no) {
        alert('请填写完整的设备名称和型号')
        return
      }
      if (item.quantity <= 0) {
        alert('数量必须大于0')
        return
      }
    }
    
    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      
      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          equipment_name: item.equipment_name,
          model_no: item.model_no,
          model_id: item.model_id || undefined,
          category: item.category,
          unit: item.unit,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          total_price: item.total_price,
          serial_numbers: item.serial_numbers || undefined,
          certificate_no: item.certificate_no || undefined,
          certificate_issuer: item.certificate_issuer || undefined,
          certificate_expiry_date: item.certificate_expiry_date || undefined,
          accessory_desc: item.accessory_desc || undefined,
          manufacturer: item.manufacturer || undefined,
          technical_params: item.technical_params || undefined,
          item_notes: item.item_notes || undefined,
          attachment: item.attachment || undefined
        }))
      }
      
      let userInfo = { id: '', name: '' }
      
      try {
        const tokenPayload = parseJWTToken(token)
        if (tokenPayload) {
          userInfo = {
            id: tokenPayload.userId || tokenPayload.sub || '',
            name: tokenPayload.name || tokenPayload.username || ''
          }
        }
      } catch (e) {
        console.warn('Token解析失败，使用默认用户信息')
      }
      
      const response = await fetch(`${API_URL.WORKFLOW.FORM_PRESET_START('preset-equipment-inbound')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          formData: submitData,
          title: `设备入库 - ${submitData.inbound_type === 'purchase' ? '采购入库' : '其他入库'}`,
          initiator: userInfo
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert('入库单已提交审批')
        window.location.href = '/approvals/mine'
      } else {
        const error = await response.json()
        alert(error.error || '创建失败')
      }
    } catch (error) {
      console.error('创建入库单失败:', error)
      alert('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'instrument':
        return '仪器类'
      case 'fake_load':
        return '假负载类'
      case 'cable':
        return '线材类'
      default:
        return category
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">创建入库单</h1>
          <p className="mt-1 text-sm text-gray-600">批量入库设备</p>
        </div>
        <button
          onClick={() => window.location.href = '/equipment'}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          返回
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入库类型 *</label>
              <select
                required
                value={formData.inbound_type}
                onChange={(e) => setFormData({ ...formData, inbound_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="purchase">采购入库</option>
                <option value="other">其他入库</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入库仓库 *</label>
              <select
                required
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择仓库</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.warehouse_no})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">采购日期 *</label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">设备明细</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 添加设备
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无设备明细，点击上方按钮添加
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">设备 {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => duplicateItem(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        复制
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">设备类别 *</label>
                      <select
                        required
                        value={item.category}
                        onChange={(e) => {
                          updateItemMultiple(index, {
                            category: e.target.value,
                            equipment_name: '',
                            model_no: '',
                            isCustomName: false,
                            isCustomModel: false
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="instrument">仪器类</option>
                        <option value="fake_load">假负载类</option>
                        <option value="cable">线材类</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">设备名称 *</label>
                      {item.isCustomName ? (
                        <input
                          type="text"
                          required
                          placeholder="请输入新设备名称"
                          value={item.equipment_name}
                          onChange={(e) => updateItem(index, 'equipment_name', e.target.value)}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <>
                          <select
                            required
                            value={item.equipment_name}
                            onChange={(e) => {
                              if (e.target.value === '__other__') {
                                updateItemMultiple(index, {
                                  equipment_name: '',
                                  isCustomName: true
                                })
                              } else {
                                updateItemMultiple(index, {
                                  equipment_name: e.target.value,
                                  model_no: '',
                                  isCustomName: false,
                                  isCustomModel: false
                                })
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">请选择设备名称</option>
                            {getUniqueEquipmentNames(item.category).map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                            <option value="__other__">其他（手动输入）</option>
                          </select>
                        </>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">设备型号 *</label>
                      {(() => {
                        console.log('设备型号渲染条件检查:', {
                          index,
                          isCustomModel: item.isCustomModel,
                          isCustomName: item.isCustomName,
                          equipment_name: item.equipment_name,
                          shouldShowInput: item.isCustomModel || item.isCustomName || !item.equipment_name,
                          shouldShowSelect: !(item.isCustomModel || item.isCustomName || !item.equipment_name)
                        })
                        return null
                      })()}
                      {item.isCustomModel || item.isCustomName || !item.equipment_name ? (
                        <input
                          type="text"
                          required
                          placeholder="请输入设备型号"
                          value={item.model_no}
                          onChange={(e) => updateItem(index, 'model_no', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <>
                          <select
                            required
                            value={item.model_no}
                            onChange={(e) => {
                              if (e.target.value === '__other__') {
                                updateItemMultiple(index, {
                                  model_no: '',
                                  isCustomModel: true
                                })
                              } else {
                                updateItemMultiple(index, {
                                  model_no: e.target.value,
                                  isCustomModel: false
                                })
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">请选择型号</option>
                            {getModelNosByEquipmentName(item.equipment_name, item.category).map(modelNo => (
                              <option key={modelNo} value={modelNo}>{modelNo}</option>
                            ))}
                            <option value="__other__">其他（手动输入）</option>
                          </select>
                        </>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">单位 *</label>
                      <select
                        required
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
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
                      {item.category === 'instrument' ? (
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                          1 {item.unit}
                        </div>
                      ) : (
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">单价 *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.purchase_price}
                        onChange={(e) => updateItem(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总价</label>
                      <input
                        type="text"
                        value={item.total_price.toFixed(2)}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    
                    {item.category === 'instrument' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">序列号</label>
                        <input
                          type="text"
                          value={item.serial_numbers}
                          onChange={(e) => updateItem(index, 'serial_numbers', e.target.value)}
                          placeholder="SN001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">生产厂家</label>
                      <input
                        type="text"
                        value={item.manufacturer}
                        onChange={(e) => updateItem(index, 'manufacturer', e.target.value)}
                        placeholder="生产厂家"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">技术参数</label>
                      <textarea
                        value={item.technical_params}
                        onChange={(e) => updateItem(index, 'technical_params', e.target.value)}
                        placeholder="技术参数"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {item.category === 'instrument' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">校准证书编号</label>
                        <input
                          type="text"
                          value={item.certificate_no}
                          onChange={(e) => updateItem(index, 'certificate_no', e.target.value)}
                          placeholder="证书编号"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    {item.category === 'instrument' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">发证单位</label>
                        <input
                          type="text"
                          value={item.certificate_issuer}
                          onChange={(e) => updateItem(index, 'certificate_issuer', e.target.value)}
                          placeholder="发证单位"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    {item.category === 'instrument' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">校准证书到期时间</label>
                        <input
                          type="date"
                          value={item.certificate_expiry_date}
                          onChange={(e) => updateItem(index, 'certificate_expiry_date', e.target.value)}
                          placeholder="证书到期时间"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    {item.category === 'instrument' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">配件情况</label>
                        <input
                          type="text"
                          value={item.accessory_desc}
                          onChange={(e) => updateItem(index, 'accessory_desc', e.target.value)}
                          placeholder="配件描述"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                      <textarea
                        value={item.item_notes}
                        onChange={(e) => updateItem(index, 'item_notes', e.target.value)}
                        placeholder="备注"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">附件</label>
                      <div className="space-y-2">
                        {item.attachment ? (
                          <div className="flex items-center space-x-2">
                            <a
                              href={`${API_URL.BASE}${item.attachment}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              查看附件
                            </a>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'attachment', '')}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(index, file)
                              }
                            }}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar,.7z,.tar,.gz,.tgz"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {formData.items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="text-lg font-semibold">
                  总金额: ¥{formData.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.location.href = '/equipment'}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? '提交中...' : '提交入库单'}
          </button>
        </div>
      </form>
    </div>
  )
}
