import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Accessory {
  id: string
  accessory_name: string
  model_no?: string
  brand?: string
  category: 'instrument' | 'fake_load' | 'accessory'
  unit: string
  quantity: number
  serial_number?: string
  manage_code?: string
  status: 'normal' | 'lost' | 'damaged'
  health_status: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped'
  usage_status: 'idle' | 'in_use'
  location_status: 'warehouse' | 'in_project' | 'repairing' | 'transferring'
  location_id?: string
  location_name?: string
  host_equipment_id?: string
  host_equipment_name?: string
  bound_at?: string
  source_type?: 'inbound_bundle' | 'inbound_separate'
  keeper_id?: string
  keeper_name?: string
  purchase_date?: string
  purchase_price?: number
  notes?: string
  images?: string[]
  main_images?: string[]
  accessory_images?: string[]
  attachments?: any[]
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  username: string
  name: string
  role: string
}

const AccessoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [accessory, setAccessory] = useState<Accessory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Accessory>>({})

  useEffect(() => {
    loadAccessoryData()
    loadCurrentUser()
  }, [id])

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_URL.BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const result = await response.json()
        setCurrentUser(result.user || result)
      }
    } catch (err) {
      console.error('加载用户信息失败:', err)
    }
  }

  const loadAccessoryData = async () => {
    if (!id) return

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL.BASE}/api/equipment/accessories/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('加载配件信息失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setAccessory(result.data)
        setEditForm(result.data)
      } else {
        throw new Error('配件不存在')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm(accessory || {})
  }

  const handleSave = async () => {
    if (!accessory) return

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/equipment/accessories/${accessory.id}`, {
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
      loadAccessoryData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleDelete = async () => {
    if (!accessory) return

    if (!confirm('确定要删除这个配件吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.BASE}/api/equipment/accessories/${accessory.id}`, {
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
      navigate('/equipment/accessories')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      normal: { label: '正常', color: 'bg-green-100 text-green-700' },
      lost: { label: '遗失', color: 'bg-red-100 text-red-700' },
      damaged: { label: '损坏', color: 'bg-orange-100 text-orange-700' }
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
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
      accessory: '配件'
    }
    return labels[category] || category
  }

  const getSourceTypeLabel = (sourceType: string) => {
    const labels: Record<string, string> = {
      inbound_bundle: '入库时绑定',
      inbound_separate: '单独入库'
    }
    return labels[sourceType] || sourceType
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'root'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !accessory) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700 mb-4">{error || '配件不存在'}</p>
          <button
            onClick={() => navigate('/equipment/accessories')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回配件列表
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusLabel(accessory.status)
  const healthStatusInfo = getHealthStatusLabel(accessory.health_status)
  const usageStatusInfo = getUsageStatusLabel(accessory.usage_status)
  const locationStatusInfo = getLocationStatusLabel(accessory.location_status)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/equipment/accessories')}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 返回配件列表
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">配件详情</h1>
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
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">配件名称</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.accessory_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, accessory_name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{accessory.accessory_name || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">型号</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.model_no || ''}
                        onChange={(e) => setEditForm({ ...editForm, model_no: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{accessory.model_no || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">品牌</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.brand || ''}
                        onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{accessory.brand || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">类别</label>
                    <div className="text-sm font-medium text-gray-900">{getCategoryLabel(accessory.category)}</div>
                  </div>
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
                      <div className="text-sm font-medium text-gray-900">{accessory.manage_code || '-'}</div>
                    )}
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
                      <div className="text-sm font-medium text-gray-900">{accessory.serial_number || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">数量</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.quantity || 1}
                        onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{accessory.quantity} {accessory.unit}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">来源</label>
                    <div className="text-sm font-medium text-gray-900">{accessory.source_type ? getSourceTypeLabel(accessory.source_type) : '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">状态信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${statusInfo.color}`}>
                      {statusInfo.label}
                    </div>
                  </div>
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
                    <div className="text-sm font-medium text-gray-900">{accessory.location_name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">保管人</label>
                    <div className="text-sm font-medium text-gray-900">{accessory.keeper_name || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">绑定信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">绑定状态</label>
                    <div className="text-sm font-medium text-gray-900">
                      {accessory.host_equipment_id ? (
                        <span className="text-green-600">已绑定</span>
                      ) : (
                        <span className="text-gray-400">未绑定</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">绑定设备</label>
                    <div className="text-sm font-medium text-gray-900">
                      {accessory.host_equipment_name ? (
                        <span
                          className="text-blue-600 cursor-pointer hover:underline"
                          onClick={() => navigate(`/equipment/${accessory.host_equipment_id}`)}
                        >
                          {accessory.host_equipment_name}
                        </span>
                      ) : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">绑定时间</label>
                    <div className="text-sm font-medium text-gray-900">{formatDate(accessory.bound_at)}</div>
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
                    <div className="text-sm font-medium text-gray-900">{formatDate(accessory.purchase_date)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">采购价格</label>
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(accessory.purchase_price)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">备注</h2>
            {isEditing ? (
              <textarea
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            ) : (
              <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4">
                {accessory.notes || '暂无备注'}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">图片</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {(() => {
                const allImages = [
                  ...(accessory.images || []),
                  ...(accessory.main_images || []),
                  ...(accessory.accessory_images || [])
                ]
                if (allImages.length === 0) {
                  return <div className="text-sm text-gray-500 col-span-full">暂无图片</div>
                }
                return allImages.map((img: string, idx: number) => (
                  <a
                    key={idx}
                    href={img}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={img}
                      alt={`图片 ${idx + 1}`}
                      className="w-full h-24 object-cover rounded border border-gray-200 hover:border-blue-500 transition-colors"
                    />
                  </a>
                ))
              })()}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">附件</h2>
            <div className="space-y-2">
              {(() => {
                const allAttachments = accessory.attachments || []
                if (allAttachments.length === 0) {
                  return <div className="text-sm text-gray-500">暂无附件</div>
                }
                return allAttachments.map((att: any, idx: number) => {
                  const url = typeof att === 'string' ? att : att.url
                  const name = typeof att === 'string' ? att.split('/').pop() : att.name || url.split('/').pop()
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {name}
                    </a>
                  )
                })
              })()}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span>创建时间：{formatDate(accessory.created_at)}</span>
              {accessory.updated_at && (
                <span className="ml-4">更新时间：{formatDate(accessory.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessoryDetailPage
