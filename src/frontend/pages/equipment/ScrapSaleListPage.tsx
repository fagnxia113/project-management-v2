import { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

interface ArchiveEquipment {
  id: string
  equipment_name: string
  model_no: string
  brand?: string
  category: 'instrument' | 'fake_load' | 'accessory'
  tracking_type: 'SERIALIZED' | 'BATCH'
  quantity: number
  serial_number?: string
  unit?: string
  location_id?: string
  usage_status?: string
  health_status?: string
  location_status?: string
  manage_code: string
  created_at: string
  updated_at: string
  accessories?: any[]
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export default function ScrapSaleListPage() {
  const [orders, setOrders] = useState<ArchiveEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    loadOrders()
  }, [page, searchTerm, filterStatus])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(filterStatus && { status: filterStatus })
      })

      const response = await fetch(`${API_URL.BASE}/api/equipment/v3/equipment/archives?${params}`)
      const result: ApiResponse<ArchiveEquipment> = await response.json()

      setOrders(result.data || [])
      setTotalPages(Math.ceil((result.total || 0) / 10))
      setTotal(result.total || 0)
    } catch (error) {
      console.error('加载设备档案失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
  }

  const getStatusBadge = (equipment: ArchiveEquipment) => {
    if (equipment.health_status === 'REPAIRING') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          维修中
        </span>
      )
    } else if (equipment.usage_status === 'SCRAPPED') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          已报废
        </span>
      )
    } else if (equipment.usage_status === 'LOST') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          已遗失
        </span>
      )
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        未知状态
      </span>
    )
  }

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      instrument: '仪器类',
      fake_load: '假负载类',
      accessory: '配件类'
    }
    return labels[category] || category
  }

  const getTrackingTypeBadge = (trackingType: string) => {
    const labels: Record<string, string> = {
      SERIALIZED: '序列化',
      BATCH: '批次'
    }
    return labels[trackingType] || trackingType
  }

  const columns = [
    {
      key: 'manage_code' as keyof ArchiveEquipment,
      header: '设备编号',
      render: (value: string) => value
    },
    {
      key: 'equipment_name' as keyof ArchiveEquipment,
      header: '设备名称',
      render: (value: string, row: ArchiveEquipment) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.model_no}</div>
        </div>
      )
    },
    {
      key: 'category' as keyof ArchiveEquipment,
      header: '类别',
      render: (value: string) => getCategoryBadge(value)
    },
    {
      key: 'tracking_type' as keyof ArchiveEquipment,
      header: '追踪方式',
      render: (value: string) => getTrackingTypeBadge(value)
    },
    {
      key: 'quantity' as keyof ArchiveEquipment,
      header: '数量',
      render: (value: number, row: ArchiveEquipment) => {
        return <span className="text-sm font-medium">{value} {row.unit || '台'}</span>
      }
    },
    {
      key: 'serial_number' as keyof ArchiveEquipment,
      header: '序列号',
      render: (value: string) => value || '-'
    },
    {
      key: 'status' as keyof ArchiveEquipment,
      header: '状态',
      render: (_: any, row: ArchiveEquipment) => getStatusBadge(row)
    },
    {
      key: 'accessories' as keyof ArchiveEquipment,
      header: '配件数量',
      render: (value: any[]) => value?.length || 0
    },
    {
      key: 'updated_at' as keyof ArchiveEquipment,
      header: '更新时间',
      render: (value: string) => new Date(value).toLocaleString('zh-CN')
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备档案清单</h1>
          <p className="mt-1 text-sm text-gray-600">查看所有报废、遗失和维修中的设备</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.href = '/equipment'}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            返回设备台账
          </button>
        </div>
      </div>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="搜索设备档案..."
        onSearch={handleSearch}
      />

      <div className="flex gap-4 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="SCRAPPED">已报废</option>
          <option value="LOST">已遗失</option>
          <option value="REPAIRING">维修中</option>
        </select>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        emptyMessage={searchTerm ? '未找到匹配的记录' : '暂无设备档案记录'}
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
