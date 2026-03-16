import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
}

interface AccessoryFormData {
  accessory_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'accessory'
  unit: string
  quantity: number
  serial_number: string
  manage_code: string
  keeper_id: string
  purchase_date: string
  purchase_price: number
  notes: string
}

const initialFormData: AccessoryFormData = {
  accessory_name: '',
  model_no: '',
  brand: '',
  category: 'instrument',
  unit: '个',
  quantity: 1,
  serial_number: '',
  manage_code: '',
  keeper_id: '',
  purchase_date: '',
  purchase_price: 0,
  notes: ''
}

export default function AccessoryManagementPage() {
  const navigate = useNavigate()
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterBound, setFilterBound] = useState<string>('')
  const [keyword, setKeyword] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<AccessoryFormData>(initialFormData)
  const [editingId, setEditingId] = useState<string>('')

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hoveredAccessory, setHoveredAccessory] = useState<string | null>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
    loadAccessories()
  }, [page, filterCategory, filterStatus, filterBound, keyword])

  const loadAccessories = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('pageSize', '20')
      if (filterCategory) params.append('category', filterCategory)
      if (filterStatus) params.append('status', filterStatus)
      if (filterBound) params.append('bound', filterBound)
      if (keyword) params.append('keyword', keyword)

      const res = await fetch(`${API_URL.BASE}/api/equipment/accessories?${params}`, {
        headers: headers as Record<string, string>
      })
      const data = await res.json()

      if (data.success) {
        setAccessories(Array.isArray(data.list) ? data.list : [])
        setTotal(data.total || 0)
        setTotalPages(Math.ceil((data.total || 0) / 20))
      }
    } catch (error) {
      console.error('加载配件失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const headers = token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }

      let res
      if (modalMode === 'create') {
        res = await fetch(`${API_URL.BASE}/api/equipment/accessories`, {
          method: 'POST',
          headers: headers as Record<string, string>,
          body: JSON.stringify({
            ...formData,
            source_type: 'inbound_separate'
          })
        })
      } else {
        res = await fetch(`${API_URL.BASE}/api/equipment/accessories/${editingId}`, {
          method: 'PUT',
          headers: headers as Record<string, string>,
          body: JSON.stringify(formData)
        })
      }

      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setFormData(initialFormData)
        loadAccessories()
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败')
    }
  }

  const handleEdit = (accessory: Accessory) => {
    setModalMode('edit')
    setEditingId(accessory.id)
    setFormData({
      accessory_name: accessory.accessory_name || '',
      model_no: accessory.model_no || '',
      brand: accessory.brand || '',
      category: accessory.category,
      unit: accessory.unit || '个',
      quantity: accessory.quantity || 1,
      serial_number: accessory.serial_number || '',
      manage_code: accessory.manage_code || '',
      keeper_id: accessory.keeper_id || '',
      purchase_date: accessory.purchase_date || '',
      purchase_price: accessory.purchase_price || 0,
      notes: accessory.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个配件吗？')) return
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      const res = await fetch(`${API_URL.BASE}/api/equipment/accessories/${id}`, {
        method: 'DELETE',
        headers: headers as Record<string, string>
      })
      const data = await res.json()
      if (data.success) {
        loadAccessories()
      } else {
        alert(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  const handleMarkLost = async (id: string) => {
    const reason = prompt('请输入遗失原因：')
    if (reason === null) return
    try {
      const token = localStorage.getItem('token')
      const headers = token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }

      const res = await fetch(`${API_URL.BASE}/api/equipment/accessories/${id}/mark-lost`, {
        method: 'POST',
        headers: headers as Record<string, string>,
        body: JSON.stringify({
          operator_id: currentUser?.id,
          operator_name: currentUser?.name,
          reason: reason || ''
        })
      })
      const data = await res.json()
      if (data.success) {
        loadAccessories()
        alert('已标记为遗失')
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('标记遗失失败:', error)
      alert('操作失败')
    }
  }

  const handleRecover = async (id: string) => {
    if (!confirm('确定要恢复这个配件吗？')) return
    try {
      const token = localStorage.getItem('token')
      const headers = token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }

      const res = await fetch(`${API_URL.BASE}/api/equipment/accessories/${id}/recover`, {
        method: 'POST',
        headers: headers as Record<string, string>,
        body: JSON.stringify({
          operator_id: currentUser?.id,
          operator_name: currentUser?.name
        })
      })
      const data = await res.json()
      if (data.success) {
        loadAccessories()
        alert('已恢复')
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('恢复失败:', error)
      alert('操作失败')
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'instrument': return '仪器类'
      case 'fake_load': return '假负载类'
      default: return category
    }
  }

  const getStatusName = (status: string) => {
    switch (status) {
      case 'normal': return '正常'
      case 'lost': return '遗失'
      case 'damaged': return '损坏'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-700'
      case 'lost': return 'bg-red-100 text-red-700'
      case 'damaged': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getLocationStatusName = (status: string) => {
    switch (status) {
      case 'warehouse': return '仓库'
      case 'in_project': return '项目上'
      case 'repairing': return '维修中'
      case 'transferring': return '调拨中'
      default: return status
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">配件管理</h1>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">类别：</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">全部</option>
              <option value="instrument">仪器类</option>
              <option value="fake_load">假负载类</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">状态：</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">全部</option>
              <option value="normal">正常</option>
              <option value="lost">遗失</option>
              <option value="damaged">损坏</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">绑定状态：</label>
            <select
              value={filterBound}
              onChange={(e) => setFilterBound(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">全部</option>
              <option value="true">已绑定</option>
              <option value="false">未绑定</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索配件名称/型号/编号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="border rounded px-3 py-1 w-64"
            />
          </div>
          <button
            onClick={loadAccessories}
            className="px-4 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            搜索
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full whitespace-nowrap">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 min-w-[120px]">配件名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">型号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">管理编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[60px]">数量</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[60px]">单位</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px]">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px]">位置状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">当前位置</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px]">保管人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px]">绑定状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">采购日期</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">采购价格</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 min-w-[100px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : accessories.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              accessories.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className={`px-4 py-3 sticky left-0 bg-white ${hoveredAccessory === item.id ? 'z-20' : 'z-10'}`}>
                    <div className="relative inline-block">
                      <span
                        onClick={() => navigate(`/equipment/accessories/${item.id}`)}
                        onMouseEnter={() => setHoveredAccessory(item.id)}
                        onMouseLeave={() => setHoveredAccessory(null)}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        {item.accessory_name}
                      </span>
                      {hoveredAccessory === item.id && ((item.images && item.images.length > 0) || (item.accessory_images && item.accessory_images.length > 0)) && (
                        <div className="absolute z-[100] left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] max-w-[300px]">
                          <div className="text-xs text-gray-500 mb-1 font-semibold border-b pb-1">配件图片预览</div>
                          <img
                            src={(item.accessory_images && item.accessory_images[0]) || (item.images && item.images[0])}
                            alt="配件图片"
                            className="w-full h-24 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.model_no || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.manage_code || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.unit || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(item.status)}`}>
                      {getStatusName(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{getLocationStatusName(item.location_status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.location_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.keeper_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.host_equipment_id ? (
                      <span className="text-green-600">已绑定</span>
                    ) : (
                      <span className="text-gray-400">未绑定</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.purchase_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.purchase_price)}</td>
                  <td className="px-4 py-3 sticky right-0 bg-white z-10">
                    <button
                      onClick={() => navigate(`/equipment/accessories/${item.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1">
            第 {page} / {totalPages} 页 (共 {total} 条)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? '配件入库' : '编辑配件'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">配件名称 *</label>
                  <input
                    type="text"
                    required
                    value={formData.accessory_name}
                    onChange={(e) => setFormData({ ...formData, accessory_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">型号</label>
                  <input
                    type="text"
                    value={formData.model_no}
                    onChange={(e) => setFormData({ ...formData, model_no: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">品牌</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">类别 *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="instrument">仪器类</option>
                    <option value="fake_load">假负载类</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">单位</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">数量</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">序列号</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">管理编号</label>
                  <input
                    type="text"
                    value={formData.manage_code}
                    onChange={(e) => setFormData({ ...formData, manage_code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">购置日期</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">购置价格</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {modalMode === 'create' ? '入库' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
