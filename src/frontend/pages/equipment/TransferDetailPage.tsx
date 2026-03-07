import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface AccessoryItem {
  id: string
  host_equipment_id: string
  accessory_id: string
  accessory_name: string
  accessory_model: string
  accessory_category: 'instrument' | 'fake_load' | 'cable'
  accessory_quantity: number
  is_required: boolean
  accessory_notes: string | null
  serial_number: string | null
  accessory_manage_code: string | null
  accessory_health_status: string
  accessory_usage_status: string
}

interface TransferItem {
  id: string
  equipment_id: string | null
  equipment_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  manage_code: string | null
  serial_number: string | null
  quantity: number
  status: string
  notes: string | null
  shipping_images?: string[]
  receiving_images?: string[]
  accessories?: AccessoryItem[]
}

interface TransferOrder {
  id: string
  order_no: string
  transfer_scene: 'A' | 'B' | 'C'
  transfer_type: 'single' | 'batch'
  applicant: string
  apply_date: string
  
  from_location_type: 'warehouse' | 'project'
  from_warehouse_id: string | null
  from_warehouse_name: string | null
  from_project_id: string | null
  from_project_name: string | null
  from_manager: string | null
  from_manager_id: string | null
  
  to_location_type: 'warehouse' | 'project'
  to_warehouse_id: string | null
  to_warehouse_name: string | null
  to_project_id: string | null
  to_project_name: string | null
  to_manager: string | null
  to_manager_id: string | null
  
  total_items: number
  total_quantity: number
  
  transfer_reason: string
  estimated_ship_date: string | null
  estimated_arrival_date: string | null
  transport_method: string | null
  tracking_no: string | null
  notes: string | null
  
  status: string
  
  from_approved_at: string | null
  from_approved_by: string | null
  from_approval_comment: string | null
  
  to_approved_at: string | null
  to_approved_by: string | null
  to_approval_comment: string | null
  
  shipped_at: string | null
  shipped_by: string | null
  
  received_at: string | null
  received_by: string | null
  receive_comment: string | null
  shipping_package_images?: string[]
  receiving_package_images?: string[]
  
  created_at: string
  updated_at: string
  
  items: TransferItem[]
}

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [order, setOrder] = useState<TransferOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showShippingDialog, setShowShippingDialog] = useState(false)
  const [showReceivingDialog, setShowReceivingDialog] = useState(false)
  
  const [shippingData, setShippingData] = useState({
    shipped_at: '',
    shipping_no: '',
    shipping_attachment: '',
    item_images: [] as { item_id: string; images: string[] }[],
    package_images: [] as string[]
  })
  
  const [receivingData, setReceivingData] = useState({
    received_at: '',
    receive_status: 'normal' as 'normal' | 'damaged' | 'missing' | 'partial',
    receive_comment: '',
    item_images: [] as { item_id: string; images: string[] }[],
    package_images: [] as string[],
    received_items: [] as { item_id: string; received_quantity: number }[]
  })
  
  const [uploadingImages, setUploadingImages] = useState(false)

  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadOrder()
    }
  }, [id])

  const loadOrder = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      
      if (result.success) {
        setOrder(result.data)
      } else {
        alert('调拨单不存在')
        navigate('/approvals/mine')
      }
    } catch (error) {
      console.error('加载调拨单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!order || !currentUser) return
    
    let approveType: 'from' | 'to' | undefined
    
    if (currentUser.id === order.from_manager_id) {
      approveType = 'from'
    } else if (currentUser.id === order.to_manager_id) {
      approveType = 'to'
    }
    
    const remark = prompt('请输入审批意见（可选）：')
    
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          approved: true,
          remark,
          approve_type: approveType
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert('审批成功')
        loadOrder()
      } else {
        alert('审批失败：' + result.error)
      }
    } catch (error) {
      console.error('审批失败:', error)
      alert('审批失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!order) return
    
    const remark = prompt('请输入驳回原因：')
    if (!remark) return
    
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          approved: false,
          remark
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert('已驳回')
        loadOrder()
      } else {
        alert('驳回失败：' + result.error)
      }
    } catch (error) {
      console.error('驳回失败:', error)
      alert('驳回失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleShip = async () => {
    setShowShippingDialog(true)
  }

  const handleConfirmShip = async () => {
    if (!order) return
    
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/ship`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shipped_at: shippingData.shipped_at || undefined,
          shipping_no: shippingData.shipping_no || undefined,
          shipping_attachment: shippingData.shipping_attachment || undefined,
          item_images: shippingData.item_images,
          package_images: shippingData.package_images
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert('发货成功')
        setShowShippingDialog(false)
        setShippingData({ shipped_at: '', shipping_no: '', shipping_attachment: '', item_images: [], package_images: [] })
        loadOrder()
      } else {
        alert('发货失败：' + result.error)
      }
    } catch (error) {
      console.error('发货失败:', error)
      alert('发货失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReceive = async () => {
    if (!order) return
    
    setReceivingData(prev => ({
      ...prev,
      received_items: order.items.map(item => ({
        item_id: item.id,
        received_quantity: item.quantity
      }))
    }))
    setShowReceivingDialog(true)
  }

  const handleConfirmReceive = async () => {
    if (!order) return
    
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/receive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          received_at: receivingData.received_at || undefined,
          receive_status: receivingData.receive_status || undefined,
          receive_comment: receivingData.receive_comment || undefined,
          item_images: receivingData.item_images,
          package_images: receivingData.package_images,
          received_items: receivingData.received_items
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert('收货成功')
        setShowReceivingDialog(false)
        setReceivingData({ received_at: '', receive_status: 'normal', receive_comment: '', item_images: [], package_images: [], received_items: [] })
        loadOrder()
      } else {
        alert('收货失败：' + result.error)
      }
    } catch (error) {
      console.error('收货失败:', error)
      alert('收货失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setUploadingImages(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('image', file)
      formData.append('image_type', 'transfer')
      formData.append('business_type', 'transfer')
      
      const response = await fetch(`${API_URL.BASE}/api/equipment/images/upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      })
      
      const result = await response.json()
      if (result.success && result.data?.image_url) {
        return result.data.image_url
      }
      return null
    } catch (error) {
      console.error('上传图片失败:', error)
      return null
    } finally {
      setUploadingImages(false)
    }
  }

  const handleItemImagesUpload = async (itemId: string, files: FileList, isShipping: boolean) => {
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handleImageUpload(files[i])
      if (url) urls.push(url)
    }
    
    if (isShipping) {
      setShippingData(prev => {
        const existing = prev.item_images.find(img => img.item_id === itemId)
        if (existing) {
          return {
            ...prev,
            item_images: prev.item_images.map(img => 
              img.item_id === itemId ? { ...img, images: [...img.images, ...urls] } : img
            )
          }
        }
        return {
          ...prev,
          item_images: [...prev.item_images, { item_id: itemId, images: urls }]
        }
      })
    } else {
      setReceivingData(prev => {
        const existing = prev.item_images.find(img => img.item_id === itemId)
        if (existing) {
          return {
            ...prev,
            item_images: prev.item_images.map(img => 
              img.item_id === itemId ? { ...img, images: [...img.images, ...urls] } : img
            )
          }
        }
        return {
          ...prev,
          item_images: [...prev.item_images, { item_id: itemId, images: urls }]
        }
      })
    }
  }

  const handlePackageImagesUpload = async (files: FileList, isShipping: boolean) => {
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handleImageUpload(files[i])
      if (url) urls.push(url)
    }
    
    if (isShipping) {
      setShippingData(prev => ({
        ...prev,
        package_images: [...prev.package_images, ...urls]
      }))
    } else {
      setReceivingData(prev => ({
        ...prev,
        package_images: [...prev.package_images, ...urls]
      }))
    }
  }

  const handleCancel = async () => {
    if (!order) return
    
    const reason = prompt('请输入取消原因：')
    if (!reason) return
    
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      })
      
      const result = await response.json()
      if (result.success) {
        alert('已取消')
        loadOrder()
      } else {
        alert('取消失败：' + result.error)
      }
    } catch (error) {
      console.error('取消失败:', error)
      alert('取消失败')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending_from: 'bg-yellow-100 text-yellow-700',
      pending_to: 'bg-orange-100 text-orange-700',
      rejected: 'bg-red-100 text-red-700',
      shipping: 'bg-purple-100 text-purple-700',
      receiving: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
      withdrawn: 'bg-gray-100 text-gray-500'
    }
    
    const labels: Record<string, string> = {
      draft: '草稿',
      pending_from: '待调出方审批',
      pending_to: '待调入方审批',
      rejected: '已驳回',
      shipping: '待发货',
      receiving: '待收货',
      completed: '已完成',
      cancelled: '已取消',
      withdrawn: '已撤回'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getSceneLabel = (scene: string) => {
    const labels: Record<string, string> = {
      A: '国内有库存 - 仓库直接发货',
      B: '国内无库存 - 需采购或外借',
      C: '项目间调拨 - 双方项目经理审批'
    }
    return labels[scene] || scene
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器类',
      fake_load: '假负载类',
      cable: '线材类'
    }
    return labels[category] || category
  }

  const getTransportLabel = (method: string | null) => {
    if (!method) return '-'
    const labels: Record<string, string> = {
      land: '陆运',
      air: '空运',
      express: '快递',
      self: '自提'
    }
    return labels[method] || method
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-500">调拨单不存在</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">调拨单详情</h1>
          <p className="mt-1 text-sm text-gray-600">{order.order_no}</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(order.status)}
          <button
            onClick={() => navigate('/approvals/mine')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            返回列表
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-gray-500">调拨场景</label>
            <p className="mt-1 font-medium">{getSceneLabel(order.transfer_scene)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">调拨类型</label>
            <p className="mt-1 font-medium">{order.transfer_type === 'batch' ? '批量调拨' : '单台调拨'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">申请人</label>
            <p className="mt-1 font-medium">{order.applicant}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">申请日期</label>
            <p className="mt-1 font-medium">{order.apply_date}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">设备项数</label>
            <p className="mt-1 font-medium">{order.total_items} 项</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">总数量</label>
            <p className="mt-1 font-medium">{order.total_quantity}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">调拨位置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <label className="text-sm text-blue-600">调出位置</label>
            <p className="mt-1 text-lg font-medium">
              {order.from_warehouse_name || order.from_project_name || '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              类型: {order.from_location_type === 'warehouse' ? '仓库' : '项目'}
              {order.from_manager && ` | 负责人: ${order.from_manager}`}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <label className="text-sm text-green-600">调入位置</label>
            <p className="mt-1 text-lg font-medium">
              {order.to_warehouse_name || order.to_project_name || '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              类型: {order.to_location_type === 'warehouse' ? '仓库' : '项目'}
              {order.to_manager && ` | 负责人: ${order.to_manager}`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">调拨设备明细</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类别</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理编号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">序列号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">{item.equipment_name}</td>
                  <td className="px-4 py-3 text-sm">{item.model_no}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.category === 'instrument' ? 'bg-blue-100 text-blue-700' :
                      item.category === 'fake_load' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {getCategoryLabel(item.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.manage_code || '-'}</td>
                  <td className="px-4 py-3 text-sm">{item.serial_number || '-'}</td>
                  <td className="px-4 py-3 text-sm">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === 'transferred' ? 'bg-green-100 text-green-700' :
                      item.status === 'returned' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'transferred' ? '已调拨' : item.status === 'returned' ? '已归还' : '待调拨'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.items.some(item => item.category === 'instrument' && item.accessories && item.accessories.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">配件清单</h3>
          <div className="space-y-6">
            {order.items.filter(item => item.category === 'instrument' && item.accessories && item.accessories.length > 0).map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{item.equipment_name} ({item.model_no})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">配件名称</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类别</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理编号</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">序列号</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">是否必需</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {item.accessories!.map(accessory => (
                        <tr key={accessory.id}>
                          <td className="px-4 py-3 text-sm">{accessory.accessory_name}</td>
                          <td className="px-4 py-3 text-sm">{accessory.accessory_model || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              accessory.accessory_category === 'instrument' ? 'bg-blue-100 text-blue-700' :
                              accessory.accessory_category === 'fake_load' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {accessory.accessory_category === 'instrument' ? '仪器类' :
                               accessory.accessory_category === 'fake_load' ? '假负载类' : '线材类'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{accessory.accessory_quantity}</td>
                          <td className="px-4 py-3 text-sm">{accessory.accessory_manage_code || '-'}</td>
                          <td className="px-4 py-3 text-sm">{accessory.serial_number || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              accessory.is_required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {accessory.is_required ? '必需' : '可选'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{accessory.accessory_notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">调拨信息</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">调拨原因</label>
            <p className="mt-1">{order.transfer_reason}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">预计发货日期</label>
              <p className="mt-1">{order.estimated_ship_date || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">预计到达日期</label>
              <p className="mt-1">{order.estimated_arrival_date || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">运输方式</label>
              <p className="mt-1">{getTransportLabel(order.transport_method)}</p>
            </div>
          </div>
          {order.tracking_no && (
            <div>
              <label className="text-sm text-gray-500">物流单号</label>
              <p className="mt-1">{order.tracking_no}</p>
            </div>
          )}
          {order.notes && (
            <div>
              <label className="text-sm text-gray-500">备注</label>
              <p className="mt-1">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* 发货信息区块 - 调入方审批时可见 */}
      {(order.shipped_at || order.shipping_no || (order as any).shipping_attachment) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">发货信息</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.shipped_at && (
                <div>
                  <label className="text-sm text-gray-500">发货时间</label>
                  <p className="mt-1 font-medium">{new Date(order.shipped_at).toLocaleString('zh-CN')}</p>
                </div>
              )}
              {(order as any).shipping_no && (
                <div>
                  <label className="text-sm text-gray-500">发货单号</label>
                  <p className="mt-1 font-medium">{(order as any).shipping_no}</p>
                </div>
              )}
            </div>
            {(order as any).shipping_attachment && (
              <div>
                <label className="text-sm text-gray-500">发货凭证附件</label>
                <p className="mt-1">
                  <a
                    href={(order as any).shipping_attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    查看附件
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(order.from_approved_at || order.to_approved_at || order.shipped_at || order.received_at) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">审批/操作记录</h3>
          <div className="space-y-4">
            {order.from_approved_at && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="text-sm font-medium">调出方审批通过</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.from_approved_at).toLocaleString('zh-CN')}
                    {order.from_approval_comment && ` - ${order.from_approval_comment}`}
                  </p>
                </div>
              </div>
            )}
            {order.to_approved_at && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p className="text-sm font-medium">调入方审批通过</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.to_approved_at).toLocaleString('zh-CN')}
                    {order.to_approval_comment && ` - ${order.to_approval_comment}`}
                  </p>
                </div>
              </div>
            )}
            {order.shipped_at && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                <div>
                  <p className="text-sm font-medium">已发货</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.shipped_at).toLocaleString('zh-CN')}
                    {(order as any).shipping_no && ` | 发货单号: ${(order as any).shipping_no}`}
                  </p>
                </div>
              </div>
            )}
            {order.received_at && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                <div>
                  <p className="text-sm font-medium">已收货</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.received_at).toLocaleString('zh-CN')}
                    {order.receive_comment && ` - ${order.receive_comment}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {['pending_from', 'pending_to', 'shipping', 'receiving'].includes(order.status) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">操作</h3>
          <div className="flex flex-wrap gap-3">
            {/* 调出方审批 */}
            {order.status === 'pending_from' && currentUser && currentUser.employee_id === order.from_manager_id && (
              <>
                <button
                  onClick={() => handleApprove()}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  审批通过
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  驳回
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  取消
                </button>
              </>
            )}
            {/* 调入方审批 */}
            {order.status === 'pending_to' && currentUser && currentUser.employee_id === order.to_manager_id && (
              <>
                <button
                  onClick={() => handleApprove()}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  审批通过
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  驳回
                </button>
              </>
            )}
            {/* 发货操作 - 调出方审批通过后 */}
            {order.status === 'shipping' && currentUser && currentUser.employee_id === order.from_manager_id && (
              <>
                <button
                  onClick={handleShip}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  填写发货信息
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  取消
                </button>
              </>
            )}
            {/* 收货操作 - 发货后 */}
            {order.status === 'receiving' && currentUser && currentUser.employee_id === order.to_manager_id && (
              <button
                onClick={handleReceive}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                填写到货信息
              </button>
            )}
          </div>
        </div>
      )}

      {showShippingDialog && order && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">填写发货信息</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发货时间</label>
                  <input
                    type="datetime-local"
                    value={shippingData.shipped_at}
                    onChange={(e) => setShippingData({ ...shippingData, shipped_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发货单号</label>
                  <input
                    type="text"
                    value={shippingData.shipping_no}
                    onChange={(e) => setShippingData({ ...shippingData, shipping_no: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入发货单号"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">设备明细</h4>
                <div className="space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{item.equipment_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{item.model_no}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            item.category === 'instrument' ? 'bg-blue-100 text-blue-700' :
                            item.category === 'fake_load' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.category === 'instrument' ? '仪器类' : item.category === 'fake_load' ? '假负载类' : '线材类'}
                          </span>
                          {item.category !== 'instrument' && <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>}
                        </div>
                      </div>
                      {item.category !== 'instrument' && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">接收数量</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receivingData.received_items.find(ri => ri.item_id === item.id)?.received_quantity || item.quantity}
                            onChange={(e) => {
                              const receivedQty = parseInt(e.target.value) || 0;
                              setReceivingData(prev => ({
                                ...prev,
                                received_items: prev.received_items.map(ri =>
                                  ri.item_id === item.id
                                    ? { ...ri, received_quantity: receivedQty }
                                    : ri
                                )
                              }))
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-500 ml-2">/ {item.quantity}</span>
                        </div>
                      )}
                      <h5 className="text-sm font-medium text-gray-900 mb-2">设备明细图片</h5>
                      <div className="flex flex-wrap gap-2">
                        {(shippingData.item_images.find(img => img.item_id === item.id)?.images || []).map((url, idx) => (
                          <div key={idx} className="relative w-20 h-20">
                            <img src={url} alt="" className="w-full h-full object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => {
                                setShippingData(prev => ({
                                  ...prev,
                                  item_images: prev.item_images.map(img =>
                                    img.item_id === item.id
                                      ? { ...img, images: img.images.filter((_, i) => i !== idx) }
                                      : img
                                  )
                                }))
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                            >×</button>
                          </div>
                        ))}
                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && handleItemImagesUpload(item.id, e.target.files, true)}
                            disabled={uploadingImages}
                          />
                          <span className="text-gray-400 text-2xl">+</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">打包整体图片</h4>
                <div className="flex flex-wrap gap-2">
                  {(shippingData.package_images || []).map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img src={url} alt="" className="w-full h-full object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setShippingData(prev => ({
                          ...prev,
                          package_images: prev.package_images.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >×</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handlePackageImagesUpload(e.target.files, true)}
                      disabled={uploadingImages}
                    />
                    <span className="text-gray-400 text-2xl">+</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowShippingDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleConfirmShip}
                disabled={actionLoading || uploadingImages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '确认发货'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceivingDialog && order && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">填写到货信息</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">到货时间</label>
                  <input
                    type="datetime-local"
                    value={receivingData.received_at}
                    onChange={(e) => setReceivingData({ ...receivingData, received_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">到货状态</label>
                  <select
                    value={receivingData.receive_status}
                    onChange={(e) => setReceivingData({ ...receivingData, receive_status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">正常</option>
                    <option value="damaged">损坏</option>
                    <option value="missing">缺失</option>
                    <option value="partial">部分到货</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">到货备注</label>
                <textarea
                  rows={2}
                  value={receivingData.receive_comment}
                  onChange={(e) => setReceivingData({ ...receivingData, receive_comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入到货备注"
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">设备明细</h4>
                <div className="space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{item.equipment_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{item.model_no}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            item.category === 'instrument' ? 'bg-blue-100 text-blue-700' :
                            item.category === 'fake_load' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.category === 'instrument' ? '仪器类' : item.category === 'fake_load' ? '假负载类' : '线材类'}
                          </span>
                          {item.category !== 'instrument' && <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>}
                        </div>
                      </div>
                      {item.category !== 'instrument' && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">接收数量</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receivingData.received_items.find(ri => ri.item_id === item.id)?.received_quantity || item.quantity}
                            onChange={(e) => {
                              const receivedQty = parseInt(e.target.value) || 0;
                              setReceivingData(prev => ({
                                ...prev,
                                received_items: prev.received_items.map(ri =>
                                  ri.item_id === item.id
                                    ? { ...ri, received_quantity: receivedQty }
                                    : ri
                                )
                              }))
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-500 ml-2">/ {item.quantity}</span>
                        </div>
                      )}
                      <h5 className="text-sm font-medium text-gray-900 mb-2">设备明细图片</h5>
                      <div className="flex flex-wrap gap-2">
                        {(receivingData.item_images.find(img => img.item_id === item.id)?.images || []).map((url, idx) => (
                          <div key={idx} className="relative w-20 h-20">
                            <img src={url} alt="" className="w-full h-full object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => {
                                setReceivingData(prev => ({
                                  ...prev,
                                  item_images: prev.item_images.map(img =>
                                    img.item_id === item.id
                                      ? { ...img, images: img.images.filter((_, i) => i !== idx) }
                                      : img
                                  )
                                }))
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                            >×</button>
                          </div>
                        ))}
                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && handleItemImagesUpload(item.id, e.target.files, false)}
                            disabled={uploadingImages}
                          />
                          <span className="text-gray-400 text-2xl">+</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">整体收货图片</h4>
                <div className="flex flex-wrap gap-2">
                  {(receivingData.package_images || []).map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img src={url} alt="" className="w-full h-full object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setReceivingData(prev => ({
                          ...prev,
                          package_images: prev.package_images.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >×</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handlePackageImagesUpload(e.target.files, false)}
                      disabled={uploadingImages}
                    />
                    <span className="text-gray-400 text-2xl">+</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReceivingDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReceive}
                disabled={actionLoading || uploadingImages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '确认收货'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
