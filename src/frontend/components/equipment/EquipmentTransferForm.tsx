import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'
import { FileText, MapPin, User, Calendar, Package, Camera, Truck, CheckCircle, RotateCcw } from 'lucide-react'

interface TransferItem {
  id: string
  equipment_id: string | null
  equipment_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'accessory'
  unit: string
  manage_code: string | null
  serial_number: string | null
  quantity: number
  received_quantity?: number
  status: string
  notes: string | null
  shipping_images?: string[]
  receiving_images?: string[]
  accessories?: any[]
  accessory_desc?: string
  is_accessory?: boolean
}

interface TransferOrder {
  id: string
  order_no: string
  transfer_scene: 'A' | 'B' | 'C'
  transfer_type: 'single' | 'batch'
  applicant: string
  applicant_id: string
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
  shipping_no: string | null
  shipping_attachment: string | null

  received_at: string | null
  received_by: string | null
  receive_status: string | null
  receive_comment: string | null
  total_received_quantity?: number
  return_comment?: string | null
  returned_at?: string | null
  returned_by?: string | null

  shipping_package_images?: string[]
  receiving_package_images?: string[]

  items: TransferItem[]
}

interface Props {
  transferOrderId: string
  currentUser: any
  onShippingComplete?: () => void
}

export default function EquipmentTransferForm({ transferOrderId, currentUser, onShippingComplete }: Props) {
  const [order, setOrder] = useState<TransferOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShippingDialog, setShowShippingDialog] = useState(false)
  const [showReceivingDialog, setShowReceivingDialog] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)

  const [shippingData, setShippingData] = useState({
    shipped_at: '',
    shipping_no: '',
    shipping_attachment: '',
    item_images: [] as { item_id: string; images: string[] }[],
    package_images: [] as string[]
  })

  const [receivingData, setReceivingData] = useState({
    received_items: [] as { item_id: string; received_quantity: number }[],
    item_images: [] as { item_id: string; images: string[] }[],
    package_images: [] as string[],
    receive_comment: ''
  })

  const [returnData, setReturnData] = useState({
    return_comment: ''
  })

  useEffect(() => {
    loadOrder()
  }, [transferOrderId])

  const loadOrder = async () => {
    setLoading(true)
    console.log('[EquipmentTransferForm] Loading order with transferOrderId:', transferOrderId)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${transferOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      console.log('[EquipmentTransferForm] API response:', result)

      if (result.success) {
        console.log('[EquipmentTransferForm] Order loaded:', result.data)
        console.log('[EquipmentTransferForm] Order items:', result.data?.items)
        setOrder(result.data)
      } else {
        console.error('[EquipmentTransferForm] Failed to load order:', result.error)
      }
    } catch (error) {
      console.error('加载调拨单失败:', error)
    } finally {
      setLoading(false)
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

  const handleItemImagesUpload = async (itemId: string, files: FileList) => {
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handleImageUpload(files[i])
      if (url) urls.push(url)
    }

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
  }

  const handlePackageImagesUpload = async (files: FileList) => {
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handleImageUpload(files[i])
      if (url) urls.push(url)
    }

    setShippingData(prev => ({
      ...prev,
      package_images: [...prev.package_images, ...urls]
    }))
  }

  const handleConfirmShip = async () => {
    if (!order) return

    setSubmitting(true)
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
        onShippingComplete?.()
      } else {
        alert('发货失败：' + result.error)
      }
    } catch (error) {
      console.error('发货失败:', error)
      alert('发货失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReceivingItemImagesUpload = async (itemId: string, files: FileList) => {
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handleImageUpload(files[i])
      if (url) urls.push(url)
    }

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

  const handleReceivingPackageImagesUpload = async (files: FileList) => {
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handleImageUpload(files[i])
      if (url) urls.push(url)
    }

    setReceivingData(prev => ({
      ...prev,
      package_images: [...prev.package_images, ...urls]
    }))
  }

  const handleConfirmReceive = async () => {
    if (!order) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/receive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          received_items: receivingData.received_items,
          item_images: receivingData.item_images,
          package_images: receivingData.package_images,
          receive_comment: receivingData.receive_comment
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('收货成功')
        setShowReceivingDialog(false)
        setReceivingData({ received_items: [], item_images: [], package_images: [], receive_comment: '' })
        loadOrder()
        onShippingComplete?.()
      } else {
        alert('收货失败：' + result.error)
      }
    } catch (error) {
      console.error('收货失败:', error)
      alert('收货失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReturn = async () => {
    if (!order) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/return-to-shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          return_comment: returnData.return_comment
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('已回退到发货状态')
        setShowReturnDialog(false)
        setReturnData({ return_comment: '' })
        loadOrder()
        onShippingComplete?.()
      } else {
        alert('回退失败：' + result.error)
      }
    } catch (error) {
      console.error('回退失败:', error)
      alert('回退失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPartialReceive = async () => {
    if (!order) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/transfers/${order.id}/confirm-partial`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        alert('已确认部分收货，调拨单完成')
        loadOrder()
        onShippingComplete?.()
      } else {
        alert('确认失败：' + result.error)
      }
    } catch (error) {
      console.error('确认失败:', error)
      alert('确认失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器类',
      fake_load: '假负载类',
      accessory: '配件类'
    }
    return labels[category] || category
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN')
    } catch {
      return dateStr
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
      partial_received: 'bg-amber-100 text-amber-700',
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
      partial_received: '部分收货待确认',
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

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>
  }

  if (!order) {
    return <div className="text-center py-8 text-gray-500">调拨单不存在</div>
  }

  console.log('[EquipmentTransferForm] Rendering order:', order)
  console.log('[EquipmentTransferForm] Order items:', order.items)
  console.log('[EquipmentTransferForm] Order items length:', order.items?.length)

  const canShip = order.status === 'shipping' && currentUser?.id === order.from_manager_id
  const canReceive = order.status === 'receiving' && currentUser?.id === order.to_manager_id
  const canConfirmPartial = order.status === 'partial_received' && currentUser?.id === order.from_manager_id
  const canReturnFromReceiving = order.status === 'receiving' && currentUser?.id === order.to_manager_id

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header Summary */}
      <div className="premium-card p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                 <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">设备调拨任务单</h2>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ORDER NO: {order.order_no}</span>
               <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{formatDate(order.apply_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
              {getStatusBadge(order.status)}
            </div>
            <div className="w-px h-10 bg-slate-100 mx-2 hidden md:block"></div>
            <div className="flex -space-x-3">
               <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600 font-bold text-xs" title={`申请人: ${order.applicant}`}>
                 {order.applicant.charAt(0)}
               </div>
               {order.from_manager && (
                 <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-600 font-bold text-xs" title={`调出负责人: ${order.from_manager}`}>
                   {order.from_manager.charAt(0)}
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10 pt-8 border-t border-slate-50">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">调拨件数</p>
             <p className="text-2xl font-black text-slate-900">{order.total_items} <span className="text-sm font-medium text-slate-400">项</span></p>
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">调拨总量</p>
             <p className="text-2xl font-black text-slate-900">{order.total_quantity} <span className="text-sm font-medium text-slate-400">个</span></p>
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">调拨类型</p>
             <p className="text-md font-bold text-slate-700 mt-1">{order.transfer_type === 'batch' ? '批量调拨' : '单台调拨'}</p>
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">业务场景</p>
             <p className="text-md font-bold text-slate-700 mt-1">场景 {order.transfer_scene}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* From Location */}
        <div className="premium-card p-8 group hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Location</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">调出位置</h4>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${order.from_location_type === 'warehouse' ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-green-400'}`}></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {order.from_location_type === 'warehouse' ? 'WAREHOUSE' : 'PROJECT SITE'}
                </span>
              </div>
              <p className="text-xl font-black text-slate-800 tracking-tight">{order.from_warehouse_name || order.from_project_name || '-'}</p>
            </div>
            {order.from_manager && (
              <div className="flex items-center justify-between px-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">负责人</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black">{order.from_manager.charAt(0)}</div>
                  <span className="text-sm font-bold text-slate-700">{order.from_manager}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* To Location */}
        <div className="premium-card p-8 group hover:border-emerald-200 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Destination</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">调入位置</h4>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${order.to_location_type === 'warehouse' ? 'bg-blue-400' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`}></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {order.to_location_type === 'warehouse' ? 'WAREHOUSE' : 'PROJECT SITE'}
                </span>
              </div>
              <p className="text-xl font-black text-slate-800 tracking-tight">{order.to_warehouse_name || order.to_project_name || '-'}</p>
            </div>
             {order.to_manager && (
              <div className="flex items-center justify-between px-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">负责人</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black">{order.to_manager.charAt(0)}</div>
                  <span className="text-sm font-bold text-slate-700">{order.to_manager}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Detail */}
      <div className="premium-card overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
               <Package className="w-5 h-5" />
             </div>
             <h4 className="text-xl font-black text-slate-900 tracking-tight">调拨设备明细列表</h4>
          </div>
          <span className="bg-white px-4 py-1.5 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {order.items?.length || 0} TOTAL ITEMS
          </span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">设备信息</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">型号 / 类别</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">管理编号</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">配件与描述</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">数量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.items && order.items.length > 0 ? order.items.map(item => (
                <React.Fragment key={item.id}>
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                         <p className="font-black text-slate-800 tracking-tight">{item.equipment_name}</p>
                         {item.is_accessory && (
                           <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-pink-50 text-pink-500 border border-pink-100 uppercase tracking-tighter">
                             Independent Accessory
                           </span>
                         )}
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">BRAND: {item.brand || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-6">
                       <p className="text-sm font-bold text-slate-600">{item.model_no}</p>
                       <div className="mt-1.5">
                         <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                           item.category === 'instrument' ? 'bg-blue-50 text-blue-600' :
                           item.category === 'fake_load' ? 'bg-orange-50 text-orange-600' :
                           'bg-emerald-50 text-emerald-600'
                         }`}>
                           {getCategoryLabel(item.category)}
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-6">
                       <code className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{item.manage_code || '-'}</code>
                       {item.serial_number && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">S/N: {item.serial_number}</p>}
                    </td>
                    <td className="px-6 py-6">
                       <p className="text-xs text-slate-500 max-w-[200px] truncate" title={item.accessory_desc || ''}>
                         {item.category !== 'instrument' ? (item.accessory_desc || '-') : '-'}
                       </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-lg font-black text-slate-900">{item.quantity}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase ml-1.5">{item.unit}</span>
                    </td>
                  </tr>
                  {item.category === 'instrument' && item.accessories && item.accessories.length > 0 && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={5} className="px-8 py-4">
                        <div className="flex items-center gap-4">
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                           <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">仪器清单</p>
                           <div className="flex flex-wrap gap-2">
                             {item.accessories.map((acc: any, idx: number) => (
                               <span key={idx} className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2">
                                 {acc.accessory_name}
                                 <span className="w-px h-3 bg-slate-200"></span>
                                 <span className="text-blue-600">x{acc.accessory_quantity}</span>
                               </span>
                             ))}
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                       <Package className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-sm font-black text-slate-300 uppercase tracking-widest">暂无设备明细</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reasons */}
        <div className="premium-card p-8 md:col-span-2">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-yellow-50 text-yellow-500 rounded-2xl">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">调拨业务详情</h4>
           </div>
           <div className="space-y-6">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">调拨主要原因说明</p>
               <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-sm text-slate-600 italic leading-relaxed">
                 "{order.transfer_reason}"
               </div>
             </div>
             <div className="grid grid-cols-2 gap-8">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">预计发货日期</p>
                 <p className="text-md font-bold text-slate-800">{order.estimated_ship_date || '未设置'}</p>
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">预计到达日期</p>
                 <p className="text-md font-bold text-slate-800">{order.estimated_arrival_date || '未设置'}</p>
               </div>
             </div>
           </div>
        </div>

        {/* Transportation */}
        <div className="premium-card p-8 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Truck className="w-32 h-32" />
           </div>
           <div className="relative z-10 h-full flex flex-col">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-xl font-black tracking-tight">物流运输</h4>
             </div>
             <div className="flex-1 space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">运输方式</p>
                  <p className="text-lg font-black">{order.transport_method || '待定'}</p>
                </div>
                {order.tracking_no && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">快递/物流单号</p>
                    <p className="text-lg font-black tracking-tighter text-blue-400">{order.tracking_no}</p>
                  </div>
                )}
             </div>
             <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SYSTEM VERIFIED LOGISTICS</p>
             </div>
           </div>
        </div>
      </div>

      {order.shipped_at && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-500" />
              发货信息
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">发货时间</span>
                <p className="font-medium mt-0.5">{new Date(order.shipped_at).toLocaleString('zh-CN')}</p>
              </div>
              {order.shipping_no && (
                <div>
                  <span className="text-gray-500">发货单号</span>
                  <p className="font-medium mt-0.5">{order.shipping_no}</p>
                </div>
              )}
            </div>

            {order.items.some(item => (item.shipping_images || []).length > 0) && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-2">设备明细图片</div>
                <div className="space-y-2">
                  {order.items.filter(item => (item.shipping_images || []).length > 0).map(item => (
                    <div key={item.id} className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600 w-32">{item.equipment_name}:</span>
                      <div className="flex flex-wrap gap-1">
                        {(item.shipping_images || []).map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded border overflow-hidden hover:ring-2 hover:ring-blue-300">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(order.shipping_package_images || []).length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-2">打包整体图片</div>
                <div className="flex flex-wrap gap-2">
                  {(order.shipping_package_images || []).map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded border overflow-hidden hover:ring-2 hover:ring-blue-300">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {canShip && (
        <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-500" />
              发货操作
            </h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">审批已通过，请填写发货信息并发货。</p>
            <button
              onClick={() => setShowShippingDialog(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              填写发货信息
            </button>
          </div>
        </div>
      )}

      {showShippingDialog && (
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
                <h4 className="text-sm font-medium text-gray-900 mb-3">设备明细图片</h4>
                <div className="space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{item.equipment_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{item.model_no}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${item.category === 'instrument' ? 'bg-blue-100 text-blue-700' :
                            item.category === 'fake_load' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                            {item.category === 'instrument' ? '仪器类' : item.category === 'fake_load' ? '假负载类' : '配件类'}
                          </span>
                          {item.category !== 'instrument' && <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>}
                        </div>
                      </div>
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
                            onChange={(e) => e.target.files && handleItemImagesUpload(item.id, e.target.files)}
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
                      onChange={(e) => e.target.files && handlePackageImagesUpload(e.target.files)}
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
                disabled={submitting || uploadingImages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认发货'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canReceive && (
        <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-white border-b border-green-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              收货操作
            </h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">设备已发货，请确认收货数量并上传收货照片。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReceivingDialog(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                确认收货
              </button>
              <button
                onClick={() => setShowReturnDialog(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                回退
              </button>
            </div>
          </div>
        </div>
      )}

      {canConfirmPartial && (
        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-500" />
              部分收货确认
            </h3>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                收货方已确认收货，发货数量: {order.total_quantity}，实际收货数量: {order.total_received_quantity || 0}
              </p>
              <p className="text-sm text-gray-600">
                未收货的设备已返回原位置，请确认后闭单。
              </p>
            </div>
            <button
              onClick={handleConfirmPartialReceive}
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
            >
              {submitting ? '处理中...' : '确认并闭单'}
            </button>
          </div>
        </div>
      )}

      {showReceivingDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认收货</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">确认收货数量</h4>
                <div className="space-y-3">
                  {order.items.map(item => {
                    const currentReceived = receivingData.received_items.find(ri => ri.item_id === item.id)?.received_quantity ?? item.quantity
                    return (
                      <div key={item.id} className="flex items-center gap-4 border border-gray-200 rounded-lg p-3">
                        <div className="flex-1">
                          <span className="font-medium">{item.equipment_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{item.model_no}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${item.category === 'instrument' ? 'bg-blue-100 text-blue-700' :
                            item.category === 'fake_load' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                            {item.category === 'instrument' ? '仪器类' : item.category === 'fake_load' ? '假负载类' : '配件类'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">发货: {item.quantity}</span>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={currentReceived}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              const clampedVal = Math.min(Math.max(0, val), item.quantity)
                              setReceivingData(prev => {
                                const existing = prev.received_items.find(ri => ri.item_id === item.id)
                                if (existing) {
                                  return {
                                    ...prev,
                                    received_items: prev.received_items.map(ri =>
                                      ri.item_id === item.id ? { ...ri, received_quantity: clampedVal } : ri
                                    )
                                  }
                                }
                                return {
                                  ...prev,
                                  received_items: [...prev.received_items, { item_id: item.id, received_quantity: clampedVal }]
                                }
                              })
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">设备明细图片</h4>
                <div className="space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{item.equipment_name}</span>
                          <span className="text-sm text-gray-500 ml-2">{item.model_no}</span>
                        </div>
                      </div>
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
                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-green-500">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => e.target.files && handleReceivingItemImagesUpload(item.id, e.target.files)}
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
                  <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-green-500">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleReceivingPackageImagesUpload(e.target.files)}
                      disabled={uploadingImages}
                    />
                    <span className="text-gray-400 text-2xl">+</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">收货备注</label>
                <textarea
                  value={receivingData.receive_comment}
                  onChange={(e) => setReceivingData({ ...receivingData, receive_comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="请输入收货备注"
                />
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
                disabled={submitting || uploadingImages}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认收货'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">回退到发货状态</h3>
            <p className="text-sm text-gray-600 mb-4">
              回退后，调拨单将返回到发货状态，需要重新发货。
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">回退原因</label>
              <textarea
                value={returnData.return_comment}
                onChange={(e) => setReturnData({ return_comment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="请输入回退原因"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReturnDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleReturn}
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认回退'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
