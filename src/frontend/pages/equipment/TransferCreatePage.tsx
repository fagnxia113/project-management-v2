import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  is_accessory?: boolean
  location_status: string
  location_id: string
  location_name?: string
  main_image?: string
  accessories?: any[]
  accessory_desc?: string | null
  host_equipment_id?: string | null
  tracking_type?: 'SERIALIZED' | 'BATCH'
}

interface Warehouse {
  id: string
  name: string
  location: string
  manager_id: string
  manager_name?: string
}

interface Project {
  id: string
  name: string
  project_name: string
  manager_id: string
  manager: string
  status: string
}

interface TransferItem {
  id: string
  equipment_id: string
  equipment_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  manage_code: string
  serial_number: string | null
  is_accessory?: boolean
  quantity: number
  available_quantity: number
  accessories?: any[]
  accessory_desc?: string | null
}

export default function TransferCreatePage() {
  const navigate = useNavigate()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)

  const [fromLocationType, setFromLocationType] = useState<'warehouse' | 'project'>('warehouse')
  const [fromLocationId, setFromLocationId] = useState('')
  const [fromManagerId, setFromManagerId] = useState('')
  const [toLocationType, setToLocationType] = useState<'warehouse' | 'project'>('project')
  const [toLocationId, setToLocationId] = useState('')
  const [toManagerId, setToManagerId] = useState('')

  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
  const [transferReason, setTransferReason] = useState('')
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('')

  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false)
  const [activeSourceTab, setActiveSourceTab] = useState<'equipment' | 'accessory'>('equipment');
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [hoveredEquipmentId, setHoveredEquipmentId] = useState<string | null>(null)

  useEffect(() => {
    loadBaseData()
  }, [])

  useEffect(() => {
    if (fromLocationId) {
      setTransferItems([])
      loadEquipment()
      loadFromManager()
    } else {
      setEquipment([])
      setFromManagerId('')
    }
  }, [fromLocationId, fromLocationType])

  useEffect(() => {
    if (toLocationId) {
      loadToManager()
    } else {
      setToManagerId('')
    }
  }, [toLocationId, toLocationType])

  const loadBaseData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [whRes, projRes] = await Promise.all([
        fetch(`${API_URL.BASE}/api/warehouses?page=1&pageSize=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL.BASE}/api/projects?page=1&pageSize=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const whData = await whRes.json()
      const projData = await projRes.json()

      setWarehouses(whData.data || whData || [])
      setProjects(projData.data || projData || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const loadEquipment = async () => {
    if (!fromLocationId) return;
    setLoading(true);
    setEquipment([]);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };

      // 加载仪器和假负载 (v3 接口更成熟)
      const eqParams = new URLSearchParams({
        location_id: fromLocationId,
        location_status: fromLocationType === 'warehouse' ? 'warehouse' : 'in_project',
        pageSize: '1000'
      });

      // 并行获取
      const [eqResponse, accResponse] = await Promise.all([
        fetch(`${API_URL.BASE}/api/equipment/v3/instances?${eqParams}`, { headers }),
        fetch(`${API_URL.BASE}/api/equipment/accessories?pageSize=2000`, { headers })
      ]);

      const [eqResult, accResult] = await Promise.all([
        eqResponse.json(),
        accResponse.json()
      ]);

      let allFoundEquipment: any[] = [];

      // 1. 处理设备/仪器数据
      // 兼容多种返回格式：{ success: true, data: [] } 或 { data: [] } 或 { list: [] }
      const eqData = eqResult.data || eqResult.list || (Array.isArray(eqResult) ? eqResult : []);
      if (Array.isArray(eqData)) {
        allFoundEquipment = [...eqData];
      }

      // 2. 处理配件数据
      if (accResult) {
        // 后端可能返回 { success: true, list: [] } 或 { data: [] } 或 直接 []
        const rawList = accResult.list || accResult.data || (Array.isArray(accResult) ? accResult : []);
        if (Array.isArray(rawList)) {
          console.log(`[Debug] Total accessories fetched: ${rawList.length}`);
          const mappedAccessories = rawList
            .filter((acc: any) => {
              // 必须是独立配件（没有主机）并且在当前位置
              const isUnbound = !acc.host_equipment_id;
              const matchesLocation = String(acc.location_id) === String(fromLocationId);
              return isUnbound && matchesLocation;
            })
            .map((acc: any) => ({
              id: acc.id,
              equipment_name: acc.accessory_name || '未命名配件',
              model_no: acc.model_no || acc.accessory_model || '',
              brand: acc.brand || acc.accessory_brand || '',
              category: 'cable' as const,
              unit: acc.unit || acc.accessory_unit || '个',
              quantity: acc.quantity || acc.accessory_quantity || 1,
              manage_code: acc.manage_code || '',
              serial_number: acc.serial_number || '',
              is_accessory: true,
              location_id: acc.location_id,
              location_status: acc.location_status,
              main_image: acc.main_image || null,
              images: acc.images || acc.accessory_images || []
            }));
          
          allFoundEquipment = [...allFoundEquipment, ...mappedAccessories];
        }
      }
      
      setEquipment(allFoundEquipment);
    } catch (error) {
      console.error('加载设备/配件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFromManager = async () => {
    try {
      const token = localStorage.getItem('token')
      let managerId = ''

      if (fromLocationType === 'warehouse') {
        const warehouse = warehouses.find(w => w.id === fromLocationId)
        managerId = warehouse?.manager_id || ''
      } else {
        const project = projects.find(p => p.id === fromLocationId)
        const employeeId = project?.manager_id || ''

        if (employeeId) {
          const response = await fetch(`${API_URL.BASE}/api/personnel/employees/${employeeId}/user-id`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const result = await response.json()
          if (result.success) {
            managerId = result.data.userId
          }
        }
      }

      setFromManagerId(managerId)
    } catch (error) {
      console.error('加载调出负责人失败:', error)
    }
  }

  const loadToManager = async () => {
    try {
      const token = localStorage.getItem('token')
      let managerId = ''

      if (toLocationType === 'warehouse') {
        const warehouse = warehouses.find(w => w.id === toLocationId)
        managerId = warehouse?.manager_id || ''
      } else {
        const project = projects.find(p => p.id === toLocationId)
        const employeeId = project?.manager_id || ''

        if (employeeId) {
          const response = await fetch(`${API_URL.BASE}/api/personnel/employees/${employeeId}/user-id`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const result = await response.json()
          if (result.success) {
            managerId = result.data.userId
          }
        }
      }

      setToManagerId(managerId)
    } catch (error) {
      console.error('加载调入负责人失败:', error)
    }
  }

  const getFromLocationName = () => {
    if (fromLocationType === 'warehouse') {
      return warehouses.find(w => w.id === fromLocationId)?.name || ''
    } else {
      const project = projects.find(p => p.id === fromLocationId)
      return project?.name || project?.project_name || ''
    }
  }

  const getToLocationName = () => {
    if (toLocationType === 'warehouse') {
      return warehouses.find(w => w.id === toLocationId)?.name || ''
    } else {
      const project = projects.find(p => p.id === toLocationId)
      return project?.name || project?.project_name || ''
    }
  }

  const isSystemGeneratedCode = (code: string | null) => {
    if (!code) return true
    // 系统生成的编号通常以 EQ 或 ACC 开头后面跟着一长串数字
    return (code.startsWith('EQ') || code.startsWith('ACC')) && code.length > 10
  }

  const handleAddEquipment = (eq: Equipment) => {
    const existingItem = transferItems.find(item =>
      item.equipment_id === eq.id ||
      (item.category !== 'instrument' && !eq.is_accessory && item.equipment_name === eq.equipment_name && item.model_no === eq.model_no)
    )

    if (existingItem) {
      alert('该设备已添加')
      return
    }

    const newItem: TransferItem = {
      id: crypto.randomUUID(),
      equipment_id: eq.id,
      equipment_name: eq.equipment_name,
      model_no: eq.model_no,
      brand: eq.brand || '',
      category: eq.category,
      unit: eq.unit || (eq.category === 'instrument' ? '台' : '个'),
      manage_code: eq.manage_code,
      serial_number: eq.serial_number,
      quantity: 1,
      available_quantity: eq.quantity || 1,
      accessories: eq.accessories || [],
      accessory_desc: eq.accessory_desc || null,
      is_accessory: eq.is_accessory || false
    }

    setTransferItems(prev => [...prev, newItem])
    setShowEquipmentDialog(false)
  }

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setTransferItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: Math.min(quantity, item.available_quantity) } : item
    ))
  }

  const handleRemoveItem = (id: string) => {
    setTransferItems(prev => prev.filter(item => item.id !== id))
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器类',
      'fake_load': '假负载类',
      'cable': '配件类'
    }
    return labels[category] || category
  }

  const getCategoryColorClass = (category: string) => {
    const styles: Record<string, string> = {
      instrument: 'bg-purple-100 text-purple-700',
      fake_load: 'bg-blue-100 text-blue-700',
      cable: 'bg-green-100 text-green-700'
    }
    return styles[category] || 'bg-gray-100 text-gray-700'
  }

  const handleSubmit = async () => {
    if (!fromLocationId) {
      alert('请选择调出位置')
      return
    }
    if (!fromManagerId) {
      alert('请选择调出位置负责人')
      return
    }
    if (!toLocationId) {
      alert('请选择调入位置')
      return
    }
    if (!toManagerId) {
      alert('请选择调入位置负责人')
      return
    }
    if (transferItems.length === 0) {
      alert('请添加调拨设备')
      return
    }
    if (!transferReason.trim()) {
      alert('请填写调拨原因')
      return
    }
    if (!estimatedArrivalDate) {
      alert('请选择预期到货时间')
      return
    }

    setSubmitting(true)
    try {
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      const token = localStorage.getItem('token')

      const formData = {
        fromLocationType: fromLocationType,
        fromLocationId: fromLocationId,
        fromManagerId: fromManagerId,
        toLocationType: toLocationType,
        toLocationId: toLocationId,
        toManagerId: toManagerId,
        transferReason: transferReason,
        estimatedArrivalDate: estimatedArrivalDate,
        items: transferItems.map(item => ({
          equipment_id: item.category === 'instrument' ? item.equipment_id : undefined,
          equipment_name: item.equipment_name,
          model_no: item.model_no,
          brand: item.brand,
          category: item.category,
          unit: item.unit,
          manage_code: item.manage_code,
          serial_number: item.serial_number,
          quantity: item.quantity,
          accessories: item.accessories || [],
          accessory_list: item.accessories || [], // 兼容某些组件
          accessory_desc: item.accessory_desc || null,
          is_accessory: item.is_accessory || false
        }))
      }

      const response = await fetch(API_URL.WORKFLOW.FORM_PRESET_START('preset-equipment-transfer'), {
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
      console.log('调拨申请提交结果:', result)

      if (result.success) {
        alert('调拨申请提交成功！')
        navigate('/approvals/mine')
      } else {
        const errorMsg = result.message || '未知错误'
        const dataErrors = result.data?.formValidation?.errors
        console.error('提交失败详情:', dataErrors)
        alert('提交失败：' + errorMsg + (dataErrors ? '\n' + JSON.stringify(dataErrors) : ''))
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEquipment = equipment.filter(eq => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      (eq.equipment_name || '').toLowerCase().includes(s) ||
      (eq.model_no || '').toLowerCase().includes(s) ||
      (eq.manage_code || '').toLowerCase().includes(s);
    
    // 标签页筛选
    const matchesTab = activeSourceTab === 'equipment' 
      ? (eq.category === 'instrument' || eq.category === 'fake_load')
      : (eq.category === 'cable');

    const matchesCategory = categoryFilter ? eq.category === categoryFilter : true;
    return matchesSearch && matchesTab && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备调拨申请</h1>
          <p className="mt-1 text-sm text-gray-600">申请设备跨位置调拨</p>
        </div>
        <button
          onClick={() => navigate('/equipment')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          返回
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">调拨流程说明</h3>
        <div className="flex items-center space-x-4 text-sm text-blue-700">
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">1</span>选择调出/调入位置</span>
          <span className="text-blue-300">→</span>
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">2</span>添加调拨设备</span>
          <span className="text-blue-300">→</span>
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">3</span>填写调拨信息</span>
          <span className="text-blue-300">→</span>
          <span className="flex items-center"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">4</span>提交审批</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">调拨位置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">调出位置类型</label>
            <select
              value={fromLocationType}
              onChange={(e) => {
                setFromLocationType(e.target.value as 'warehouse' | 'project')
                setFromLocationId('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="warehouse">仓库</option>
              <option value="project">项目</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">调入位置类型</label>
            <select
              value={toLocationType}
              onChange={(e) => {
                setToLocationType(e.target.value as 'warehouse' | 'project')
                setToLocationId('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="project">项目</option>
              <option value="warehouse">仓库</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">调出位置 <span className="text-red-500">*</span></label>
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择调出位置</option>
              {fromLocationType === 'warehouse' ? (
                warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.location})</option>
                ))
              ) : (
                projects.filter(p => p.status !== 'completed').map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.project_name}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">调入位置 <span className="text-red-500">*</span></label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择调入位置</option>
              {toLocationType === 'warehouse' ? (
                warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.location})</option>
                ))
              ) : (
                projects.filter(p => p.status !== 'completed').map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.project_name}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {fromLocationId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">调拨设备明细 ({transferItems.length}项)</h3>
            <button
              onClick={() => setShowEquipmentDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 添加设备
            </button>
          </div>

          {transferItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类别</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理编号</th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transferItems.map(item => (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{item.equipment_name}</div>
                          {item.category === 'instrument' && item.serial_number && (
                            <div className="text-xs text-gray-500">S/N: {item.serial_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.model_no}</td>
                        <td className="px-4 py-3 text-sm">
                           <span className={`px-2 py-1 rounded text-xs ${getCategoryColorClass(item.category)}`}>
                            {getCategoryLabel(item.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isSystemGeneratedCode(item.manage_code) ? '-' : item.manage_code}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            min="1"
                            max={item.available_quantity}
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            disabled={item.category === 'instrument'}
                          />
                          <span className="ml-1 text-gray-500">{item.unit}</span>
                          {item.category !== 'instrument' && item.available_quantity > 1 && (
                            <span className="ml-2 text-xs text-gray-400">(可用: {item.available_quantity})</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                      {item.category === 'instrument' && item.accessories && item.accessories.length > 0 && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-2 text-xs text-gray-600">
                            <div className="flex flex-wrap gap-x-6 gap-y-1">
                              <span className="font-medium text-blue-600">所含配件 ({item.accessories.length}):</span>
                              {item.accessories.map((acc: any, idx: number) => (
                                <span key={idx} className="bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {acc.accessory_name || acc.name} ({acc.accessory_model || acc.model_no || '通用'}) x{acc.accessory_quantity || acc.quantity || 1}{acc.accessory_unit || acc.unit || '个'}
                                  {acc.manage_code && !isSystemGeneratedCode(acc.manage_code) && ` [${acc.manage_code}]`}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">请点击"添加设备"按钮选择要调拨的设备</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">调拨信息</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">期望到达时间 <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={estimatedArrivalDate}
              onChange={(e) => setEstimatedArrivalDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

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
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : '提交申请'}
        </button>
      </div>

      {showEquipmentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pl-64">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mr-4">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="font-medium text-gray-900">选择设备</h3>
              <button
                onClick={() => setShowEquipmentDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-gray-200 flex-shrink-0">
              <button
                className={`flex-1 py-3 text-sm font-medium ${activeSourceTab === 'equipment' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => {
                  setActiveSourceTab('equipment');
                  setCategoryFilter('');
                }}
              >
                设备清单 (仪器/假负载)
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium ${activeSourceTab === 'accessory' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => {
                  setActiveSourceTab('accessory');
                  setCategoryFilter('');
                }}
              >
                独立配件 (散件)
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 flex gap-4 flex-shrink-0">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索设备名称、型号或编号..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {activeSourceTab === 'equipment' && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部类别</option>
                  <option value="instrument">仪器类</option>
                  <option value="fake_load">假负载类</option>
                </select>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <p className="text-center py-8 text-gray-500">加载中...</p>
              ) : filteredEquipment.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类别</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理编号</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEquipment.map(eq => (
                      <tr key={eq.id} className="hover:bg-gray-50">
                        <td className={`px-4 py-3 text-sm relative ${hoveredEquipmentId === eq.id ? 'z-20' : 'z-10'}`}>
                          <div className="flex items-center gap-2 group">
                            {eq.main_image && (
                              <img
                                src={eq.main_image}
                                alt={eq.equipment_name}
                                className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                                onClick={() => setPreviewImage(eq.main_image!)}
                              />
                            )}
                            <div className="relative">
                              <span 
                                className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                                onMouseEnter={() => setHoveredEquipmentId(eq.id)}
                                onMouseLeave={() => setHoveredEquipmentId(null)}
                              >
                                {eq.equipment_name}
                              </span>
                              {hoveredEquipmentId === eq.id && eq.main_image && (
                                <div className="absolute z-[100] left-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 min-w-[240px] transform transition-all duration-200 origin-top-left">
                                  <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">图片预览</span>
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">高清</span>
                                  </div>
                                  <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center">
                                    <img
                                      src={eq.main_image}
                                      alt="预览"
                                      className="max-w-full max-h-48 object-contain transition-transform duration-500 hover:scale-110"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{eq.model_no}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${getCategoryColorClass(eq.category)}`}>
                            {getCategoryLabel(eq.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{isSystemGeneratedCode(eq.manage_code) ? '-' : eq.manage_code}</td>
                         <td className="px-4 py-3 text-sm pb-1">
                          <div className="font-medium">{eq.quantity || 1} {eq.unit}</div>
                          {eq.accessories && eq.accessories.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 border-t border-blue-50 pt-1">
                              <div className="text-blue-600 font-medium mb-1">包含附件 ({eq.accessories.length}):</div>
                              <ul className="space-y-0.5">
                                {eq.accessories.map((acc: any, idx: number) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    {acc.accessory_name || acc.name} {acc.model_no || acc.accessory_model ? `(${acc.model_no || acc.accessory_model})` : ''} x{acc.quantity || acc.accessory_quantity || 1}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleAddEquipment(eq)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            添加
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center py-8 text-gray-500">
                  {fromLocationId ? '暂无设备数据' : '请先选择调出位置'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="预览"
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg"
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
