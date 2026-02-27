import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface EquipmentInstance {
  id: string
  equipment_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  serial_number: string
  factory_serial_no: string | null
  manage_code: string
  health_status: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped'
  usage_status: 'idle' | 'in_use'
  location_status: 'warehouse' | 'in_project' | 'repairing' | 'transferring'
  location_id: string | null
  location_name: string | null
  keeper_id: string | null
  purchase_date: string | null
  purchase_price: number | null
  calibration_expiry: string | null
  certificate_no: string | null
  certificate_issuer: string | null
  accessory_desc: string | null
  notes: string | null
  attachment: string | null
  created_at: string
  updated_at: string
}

interface Employee {
  id: string
  name: string
  employee_no: string
}

interface Location {
  id: string
  name: string
}

interface User {
  id: string
  role: string
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
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadKeeper = async (keeperId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}/${keeperId}`, {
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

  const loadLocation = async (locationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Location')}/${locationId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setLocation(result.data)
        }
      }
    } catch (err) {
      console.error('加载位置信息失败:', err)
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
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/instances/${id}`, {
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

      const result = await response.json()
      if (result.success && result.data) {
        setEquipment(result.data)
        setIsEditing(false)
        alert('保存成功')
      } else {
        throw new Error('保存失败')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定要删除设备 "${equipment?.equipment_name}" 吗？此操作不可恢复！`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/equipment/instances/${id}`, {
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
                    <label className="text-sm text-gray-500">管理编码</label>
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
                    <label className="text-sm text-gray-500">健康状态</label>
                    {isEditing ? (
                      <select
                        value={editForm.health_status || 'normal'}
                        onChange={(e) => setEditForm({ ...editForm, health_status: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="normal">正常</option>
                        <option value="slightly_damaged">轻微损坏</option>
                        <option value="affected_use">影响使用</option>
                        <option value="repairing">维修中</option>
                        <option value="scrapped">已报废</option>
                      </select>
                    ) : (
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthStatusInfo.color}`}>
                          {healthStatusInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">使用状态</label>
                    {isEditing ? (
                      <select
                        value={editForm.usage_status || 'idle'}
                        onChange={(e) => setEditForm({ ...editForm, usage_status: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="idle">闲置</option>
                        <option value="in_use">使用中</option>
                      </select>
                    ) : (
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${usageStatusInfo.color}`}>
                          {usageStatusInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">位置状态</label>
                    {isEditing ? (
                      <select
                        value={editForm.location_status || 'warehouse'}
                        onChange={(e) => setEditForm({ ...editForm, location_status: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="warehouse">仓库</option>
                        <option value="in_project">项目中</option>
                        <option value="repairing">维修中</option>
                        <option value="transferring">调拨中</option>
                      </select>
                    ) : (
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${locationStatusInfo.color}`}>
                          {locationStatusInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">单位</label>
                    <div className="text-sm font-medium text-gray-900">{equipment?.unit || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">管理信息</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">保管人</label>
                  <div className="text-sm font-medium text-gray-900">
                    {keeper ? `${keeper.name} (${keeper.employee_no})` : '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">当前位置</label>
                  <div className="text-sm font-medium text-gray-900">{equipment?.location_name || '-'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">采购日期</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.purchase_date?.split('T')[0] || ''}
                      onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{formatDate(equipment.purchase_date)}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">采购价格</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.purchase_price || 0}
                      onChange={(e) => setEditForm({ ...editForm, purchase_price: parseFloat(e.target.value) || null })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(equipment.purchase_price)}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">校准到期日</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.calibration_expiry?.split('T')[0] || ''}
                      onChange={(e) => setEditForm({ ...editForm, calibration_expiry: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{formatDate(equipment.calibration_expiry)}</div>
                  )}
                </div>
                {equipment.category === 'instrument' && (
                  <div>
                    <label className="text-sm text-gray-500">校准证书编号</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.certificate_no || ''}
                        onChange={(e) => setEditForm({ ...editForm, certificate_no: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{equipment.certificate_no || '-'}</div>
                    )}
                  </div>
                )}
                {equipment.category === 'instrument' && (
                  <div>
                    <label className="text-sm text-gray-500">发证单位</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.certificate_issuer || ''}
                        onChange={(e) => setEditForm({ ...editForm, certificate_issuer: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{equipment.certificate_issuer || '-'}</div>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">配件情况</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.accessory_desc || ''}
                      onChange={(e) => setEditForm({ ...editForm, accessory_desc: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{equipment.accessory_desc || '-'}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">备注</h2>
              {isEditing ? (
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value || null })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              ) : (
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">
                  {equipment.notes || '暂无备注'}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">附件</h2>
              {isEditing ? (
                <div className="space-y-2">
                  {editForm.attachment ? (
                    <div className="flex items-center space-x-2">
                      <a
                        href={`${API_URL.BASE}${editForm.attachment}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        查看附件
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, attachment: null })}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            
                            const response = await fetch(`${API_URL.BASE}/api/upload/upload`, {
                              method: 'POST',
                              body: formData
                            })
                            
                            const result = await response.json()
                            if (result.success) {
                              setEditForm({ ...editForm, attachment: result.fileUrl })
                            } else {
                              alert('文件上传失败')
                            }
                          } catch (error) {
                            console.error('文件上传失败:', error)
                            alert('文件上传失败')
                          }
                        }
                      }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar,.7z,.tar,.gz,.tgz"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">
                  {equipment.attachment ? (
                    <a
                      href={`${API_URL.BASE}${equipment.attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      查看附件
                    </a>
                  ) : (
                    '暂无附件'
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">设备ID</label>
                  <div className="text-sm font-medium text-gray-900">{equipment.id}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">型号ID</label>
                  <div className="text-sm font-medium text-gray-900">{equipment.model_id || '-'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <div className="text-sm font-medium text-gray-900">{formatDate(equipment.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">更新时间</label>
                  <div className="text-sm font-medium text-gray-900">{formatDate(equipment.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
