import { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface EquipmentImage {
  id: string
  image_type: string
  image_url: string
  image_name?: string
}

interface Equipment {
  id: string
  model_id: string
  equipment_name: string
  model_no: string
  manufacturer: string | null
  technical_params: string | null
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  quantity: number
  serial_number: string | null
  manage_code: string
  manage_codes?: string
  health_status: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped'
  usage_status: 'idle' | 'in_use'
  location_status: 'warehouse' | 'in_project' | 'repairing' | 'transferring'
  location_id: string | null
  location_name: string | null
  keeper_id: string | null
  keeper_name: string | null
  purchase_date: string | null
  purchase_price: number | null
  calibration_expiry: string | null
  certificate_no: string | null
  certificate_issuer: string | null
  accessory_desc: string | null
  notes: string | null
  accessories: any[] | null
  display_type: 'instrument' | 'aggregated'
  instance_ids?: string
  created_at: string
}

export default function EquipmentListPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterHealthStatus, setFilterHealthStatus] = useState<string>('')
  const [filterUsageStatus, setFilterUsageStatus] = useState<string>('')
  const [filterLocationStatus, setFilterLocationStatus] = useState<string>('')
  const [filterLocationId, setFilterLocationId] = useState<string>('')
  const [locations, setLocations] = useState<Array<{id: string, name: string, type: string}>>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [hoveredEquipment, setHoveredEquipment] = useState<string | null>(null)
  const [equipmentImages, setEquipmentImages] = useState<Record<string, EquipmentImage[]>>({})

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    loadEquipment()
  }, [page, searchTerm, filterCategory, filterHealthStatus, filterUsageStatus, filterLocationStatus, filterLocationId])

  const loadLocations = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const [warehousesRes, projectsRes] = await Promise.all([
        fetch(`${API_URL.BASE}/api/warehouses`, { headers }),
        fetch(`${API_URL.BASE}/api/projects`, { headers })
      ])
      
      const warehouses = await warehousesRes.json()
      const projects = await projectsRes.json()
      
      const locationList = [
        ...(warehouses.data || []).map((w: any) => ({ id: w.id, name: w.name, type: 'warehouse' })),
        ...(projects.data || []).map((p: any) => ({ id: p.id, name: p.name, type: 'project' }))
      ]
      
      setLocations(locationList)
    } catch (error) {
      console.error('加载位置列表失败:', error)
    }
  }

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterHealthStatus && { health_status: filterHealthStatus }),
        ...(filterUsageStatus && { usage_status: filterUsageStatus }),
        ...(filterLocationStatus && { location_status: filterLocationStatus }),
        ...(filterLocationId && { location_id: filterLocationId })
      })

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances?${params}`, { headers })
      const result = await response.json()

      if (result.success) {
        setEquipment(result.data || [])
        setTotalPages(result.totalPages || 1)
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('加载设备失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const loadEquipmentImages = async (equipmentId: string) => {
    if (equipmentImages[equipmentId]) return
    
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(`${API_URL.BASE}/api/equipment/images/equipment/${equipmentId}`, { headers })
      const result = await response.json()
      if (result.success && result.data) {
        setEquipmentImages(prev => ({
          ...prev,
          [equipmentId]: result.data
        }))
      }
    } catch (error) {
      console.error('加载设备图片失败:', error)
    }
  }

  const handleEquipmentHover = (equipmentId: string) => {
    setHoveredEquipment(equipmentId)
    loadEquipmentImages(equipmentId)
  }

  const getHealthStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      normal: 'bg-green-100 text-green-700',
      slightly_damaged: 'bg-yellow-100 text-yellow-700',
      affected_use: 'bg-orange-100 text-orange-700',
      repairing: 'bg-blue-100 text-blue-700',
      scrapped: 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      normal: '正常',
      slightly_damaged: '轻微损坏',
      affected_use: '影响使用',
      repairing: '维修中',
      scrapped: '已报废'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.normal}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getUsageStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      idle: 'bg-green-100 text-green-700',
      in_use: 'bg-blue-100 text-blue-700'
    }
    const labels: Record<string, string> = {
      idle: '闲置',
      in_use: '使用中'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.idle}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getLocationStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      warehouse: 'bg-gray-100 text-gray-700',
      in_project: 'bg-blue-100 text-blue-700',
      repairing: 'bg-yellow-100 text-yellow-700',
      transferring: 'bg-orange-100 text-orange-700'
    }
    const labels: Record<string, string> = {
      warehouse: '仓库',
      in_project: '项目中',
      repairing: '维修中',
      transferring: '调拨中'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.warehouse}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      instrument: 'bg-purple-100 text-purple-700',
      fake_load: 'bg-blue-100 text-blue-700',
      cable: 'bg-orange-100 text-orange-700'
    }
    const labels: Record<string, string> = {
      instrument: '仪器类',
      fake_load: '假负载类',
      cable: '线材类'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category] || ''}`}>
        {labels[category] || category}
      </span>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此设备吗？')) return
    
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch(`${API_URL.BASE}/api/equipment/instances/${id}`, {
        method: 'DELETE',
        headers
      })
      const result = await response.json()
      
      if (result.success) {
        loadEquipment()
      } else {
        alert('删除失败: ' + result.error)
      }
    } catch (error) {
      console.error('删除设备失败:', error)
      alert('删除失败')
    }
  }

  const handleEdit = (item: Equipment) => {
    window.location.href = `/equipment/${item.id}`
  }

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
          <p className="mt-1 text-sm text-gray-600">管理所有设备信息</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.href = '/equipment/statistics'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            统计报表
          </button>
          <button
            onClick={() => window.location.href = '/equipment/accessories'}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            配件管理
          </button>
          <button
            onClick={() => window.location.href = '/equipment/scrap-sales'}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            已报废/售出清单
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索设备名称、型号、编码..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setPage(1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            搜索
          </button>
        </div>

        <div className="flex gap-4 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部类别</option>
            <option value="instrument">仪器类</option>
            <option value="fake_load">假负载类</option>
            <option value="cable">线材类</option>
          </select>

          <select
            value={filterHealthStatus}
            onChange={(e) => { setFilterHealthStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部健康状态</option>
            <option value="normal">正常</option>
            <option value="slightly_damaged">轻微损坏</option>
            <option value="affected_use">影响使用</option>
            <option value="repairing">维修中</option>
            <option value="scrapped">已报废</option>
          </select>

          <select
            value={filterUsageStatus}
            onChange={(e) => { setFilterUsageStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部使用状态</option>
            <option value="idle">闲置</option>
            <option value="in_use">使用中</option>
          </select>

          <select
            value={filterLocationStatus}
            onChange={(e) => { setFilterLocationStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部位置状态</option>
            <option value="warehouse">仓库</option>
            <option value="in_project">项目中</option>
            <option value="repairing">维修中</option>
            <option value="transferring">调拨中</option>
          </select>

          <select
            value={filterLocationId}
            onChange={(e) => { setFilterLocationId(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部位置</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.type === 'warehouse' ? `仓库: ${loc.name}` : `项目: ${loc.name}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 sticky left-0 bg-gray-50 z-20"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] sticky left-12 bg-gray-50 z-10">设备名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] sticky left-[168px] bg-gray-50 z-10">型号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">管理编码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">序列号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">数量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">单位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">类别</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">生产厂家</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">技术参数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">健康状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">使用状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">位置状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">当前位置</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">保管人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">采购日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">采购价格</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">校准到期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">证书编号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">发证单位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">配件描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] sticky right-0 bg-gray-50 z-10">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={23} className="px-4 py-8 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={23} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? '未找到匹配的设备' : '暂无设备数据'}
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <>
                    <tr key={item.id} className={`hover:bg-gray-50 ${hoveredEquipment === item.id ? 'relative z-50' : ''}`}>
                      <td className="px-6 py-4 sticky left-0 bg-white z-20">
                        {item.category === 'instrument' && item.display_type !== 'aggregated' && (
                          <button
                            onClick={() => toggleRowExpand(item.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedRows.has(item.id) ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 sticky left-12 bg-white z-10">
                        <div className="relative inline-block">
                          <button
                            onClick={() => handleEdit(item)}
                            onMouseEnter={() => handleEquipmentHover(item.id)}
                            onMouseLeave={() => setHoveredEquipment(null)}
                            className="font-medium text-blue-600 hover:text-blue-800 text-left"
                          >
                            {item.equipment_name}
                          </button>
                          {hoveredEquipment === item.id && equipmentImages[item.id] && equipmentImages[item.id].length > 0 && (
                            <div className="absolute z-[100] left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] max-w-[200px]">
                              <div className="text-xs text-gray-500 mb-1">主机图片</div>
                              <img
                                src={equipmentImages[item.id].find(img => img.image_type === 'main')?.image_url || equipmentImages[item.id][0]?.image_url}
                                alt="设备图片"
                                className="w-full h-24 object-cover rounded"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 sticky left-[168px] bg-white z-10">
                        {item.model_no || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.category === 'instrument' ? (
                          item.manage_code || '-'
                        ) : (
                          <span className="text-gray-500 text-xs">汇总管理</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.category === 'instrument' ? (item.serial_number || '-') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="font-medium">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.unit || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getCategoryBadge(item.category)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.manufacturer || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.technical_params || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getHealthStatusBadge(item.health_status)}
                      </td>
                      <td className="px-6 py-4">
                        {getUsageStatusBadge(item.usage_status)}
                      </td>
                      <td className="px-6 py-4">
                        {getLocationStatusBadge(item.location_status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.location_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.keeper_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.purchase_price ? `¥${item.purchase_price.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.calibration_expiry ? new Date(item.calibration_expiry).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.certificate_no || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.certificate_issuer || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.accessory_desc || '-'}
                      </td>
                      <td className="px-6 py-4 sticky right-0 bg-white z-10">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            编辑
                          </button>
                          {item.display_type !== 'aggregated' && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(item.id) && item.category === 'instrument' && item.display_type !== 'aggregated' && (
                      <tr key={`${item.id}-accessories`} className="bg-gray-50">
                        <td colSpan={23} className="px-6 py-4">
                          <div className="ml-8">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">配件清单</h4>
                            {item.accessories && item.accessories.length > 0 ? (
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                {item.accessories.map((acc: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-gray-700">
                                    <span className="font-medium">{acc.accessory_name || '-'}</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-gray-500">{acc.accessory_model || '-'}</span>
                                    <span className="text-gray-400">|</span>
                                    <span>{acc.accessory_quantity || '-'} {acc.accessory_unit || ''}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">暂无配件</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            第 {page} 页，共 {totalPages} 页 (共 {total} 条)
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 rounded text-sm ${
                    pageNum === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
