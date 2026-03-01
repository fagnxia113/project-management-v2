import { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

interface Equipment {
  id: string
  equipment_name: string
  model_no: string
  brand: string
  manufacturer: string | null
  technical_params: string | null
  category: 'instrument' | 'fake_load' | 'cable'
  unit: string
  quantity: number
  serial_number: string | null
  manage_code: string
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
  attachment: string | null
  created_at: string
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    loadEquipment()
  }, [page, searchTerm, filterCategory, filterHealthStatus, filterUsageStatus, filterLocationStatus, filterLocationId])

  const loadLocations = async () => {
    try {
      const [warehousesRes, projectsRes] = await Promise.all([
        fetch(`${API_URL.BASE}/api/warehouses`),
        fetch(`${API_URL.BASE}/api/projects`)
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

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances?${params}`)
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

  const handleSearch = () => {
    setPage(1)
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
      transferring: 'bg-orange-100 text-orange-700',
      scrapped: 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      warehouse: '仓库',
      in_project: '项目中',
      repairing: '维修中',
      transferring: '调拨中',
      scrapped: '已报废'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.warehouse}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器类',
      fake_load: '假负载类',
      cable: '线材类'
    }
    return labels[category] || category
  }

  const columns = [
    {
      key: 'equipment_name' as keyof Equipment,
      header: '设备名称',
      render: (value: string, row: Equipment) => (
        <div>
          <button
            onClick={() => window.location.href = `/equipment/${row.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 text-left"
          >
            {value}
          </button>
          <div className="text-xs text-gray-500">{row.model_no} | {row.brand || '-'}</div>
        </div>
      )
    },
    {
      key: 'manage_code' as keyof Equipment,
      header: '管理编码',
      render: (value: string) => value
    },
    {
      key: 'manufacturer' as keyof Equipment,
      header: '生产厂家',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'technical_params' as keyof Equipment,
      header: '技术参数',
      render: (value: string | null) => value ? <span className="max-w-xs truncate block" title={value}>{value}</span> : '-'
    },
    {
      key: 'quantity' as keyof Equipment,
      header: '数量',
      render: (value: number, row: Equipment) => {
        if (row.category === 'instrument') {
          return <span className="text-sm">1 台</span>
        } else {
          return <span className="text-sm font-medium">{value} {row.unit}</span>
        }
      }
    },
    {
      key: 'serial_number' as keyof Equipment,
      header: '序列号',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'category' as keyof Equipment,
      header: '类别',
      render: (value: string) => getCategoryBadge(value)
    },
    {
      key: 'health_status' as keyof Equipment,
      header: '健康状态',
      render: (value: string) => getHealthStatusBadge(value)
    },
    {
      key: 'usage_status' as keyof Equipment,
      header: '使用状态',
      render: (value: string) => getUsageStatusBadge(value)
    },
    {
      key: 'location_status' as keyof Equipment,
      header: '位置状态',
      render: (value: string) => getLocationStatusBadge(value)
    },
    {
      key: 'location_name' as keyof Equipment,
      header: '当前位置',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'keeper_name' as keyof Equipment,
      header: '保管人',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'purchase_date' as keyof Equipment,
      header: '采购日期',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'purchase_price' as keyof Equipment,
      header: '采购价格',
      render: (value: number | null) => value ? `¥${value.toLocaleString()}` : '-'
    },
    {
      key: 'calibration_expiry' as keyof Equipment,
      header: '校准到期',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'certificate_no' as keyof Equipment,
      header: '证书编号',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'certificate_issuer' as keyof Equipment,
      header: '发证单位',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'accessory_desc' as keyof Equipment,
      header: '配件情况',
      render: (value: string | null) => value ? <span className="max-w-xs truncate block" title={value}>{value}</span> : '-'
    },
    {
      key: 'notes' as keyof Equipment,
      header: '备注',
      render: (value: string | null) => value ? <span className="max-w-xs truncate block" title={value}>{value}</span> : '-'
    },
    {
      key: 'id' as keyof Equipment,
      header: '操作',
      render: (id: string) => (
        <div className="space-x-2">
          <button
            onClick={() => handleEdit(equipment.find(e => e.id === id)!)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            编辑
          </button>
          <button
            onClick={() => handleDelete(id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            删除
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
            onClick={() => window.location.href = '/equipment/scrap-sales'}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            已报废/售出清单
          </button>
        </div>
      </div>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="搜索设备..."
        onSearch={handleSearch}
      />

      <div className="flex gap-4 mb-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部类别</option>
          <option value="instrument">仪器类</option>
          <option value="fake_load">假负载类</option>
          <option value="cable">线材类</option>
        </select>

        <select
          value={filterHealthStatus}
          onChange={(e) => setFilterHealthStatus(e.target.value)}
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
          onChange={(e) => setFilterUsageStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部使用状态</option>
          <option value="idle">闲置</option>
          <option value="in_use">使用中</option>
        </select>

        <select
          value={filterLocationStatus}
          onChange={(e) => setFilterLocationStatus(e.target.value)}
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
          onChange={(e) => setFilterLocationId(e.target.value)}
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

      <DataTable
        data={equipment}
        columns={columns}
        loading={loading}
        emptyMessage={searchTerm ? '未找到匹配的设备' : '暂无设备数据'}
        rowKey="id"
      />

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
