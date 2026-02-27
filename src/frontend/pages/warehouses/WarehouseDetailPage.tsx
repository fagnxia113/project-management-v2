import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

interface Warehouse {
  id: string
  warehouse_no: string
  name: string
  type: 'main' | 'branch' | 'project'
  location: string
  address?: string
  manager_id?: string
  manager_name?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface Equipment {
  id: string
  model_id: string
  model_name: string
  model_no: string
  brand: string
  category: 'instrument' | 'fake_load' | 'cable'
  serial_number: string | null
  manage_code: string
  health_status: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped'
  usage_status: 'idle' | 'in_use'
  location_status: 'warehouse' | 'in_project' | 'repairing' | 'transferring'
  keeper_id: string | null
  keeper_name: string | null
  purchase_date: string | null
  purchase_price: number | null
  calibration_expiry: string | null
  notes: string | null
  created_at: string
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (id) {
      loadWarehouseData()
    }
  }, [id])

  useEffect(() => {
    if (id) {
      loadEquipment()
    }
  }, [id, page, searchTerm])

  const loadWarehouseData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/warehouses/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('加载仓库信息失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setWarehouse(result.data)
      } else {
        throw new Error('仓库不存在')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadEquipment = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`${API_URL.BASE}/api/warehouses/${id}/equipment?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setEquipment(result.data || [])
          setTotalPages(result.totalPages || 1)
          setTotal(result.total || 0)
        }
      }
    } catch (err) {
      console.error('加载设备列表失败:', err)
    }
  }

  const handleSearch = () => {
    setPage(1)
  }

  const formatDate = (dateString: string) => {
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      main: '主仓库',
      branch: '分仓库',
      project: '项目仓库'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700 mb-4">{error || '仓库不存在'}</p>
          <button
            onClick={() => navigate('/warehouses')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回仓库列表
          </button>
        </div>
      </div>
    )
  }

  const columns = [
    {
      key: 'model_name' as keyof Equipment,
      header: '设备名称',
      render: (value: string, row: Equipment) => (
        <button
          onClick={() => window.location.href = `/equipment/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 text-left"
        >
          {value}
        </button>
      )
    },
    {
      key: 'manage_code' as keyof Equipment,
      header: '管理编码',
      render: (value: string) => value
    },
    {
      key: 'serial_number' as keyof Equipment,
      header: '序列号',
      render: (value: string | null) => value || '-'
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
      key: 'purchase_price' as keyof Equipment,
      header: '采购价格',
      render: (value: number | null) => formatCurrency(value)
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/warehouses')}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 返回仓库列表
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">仓库详情</h1>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">仓库编码</label>
                    <div className="text-sm font-medium text-gray-900">{warehouse.warehouse_no}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">仓库名称</label>
                    <div className="text-sm font-medium text-gray-900">{warehouse.name}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">仓库类型</label>
                    <div className="text-sm font-medium text-gray-900">{getTypeLabel(warehouse.type)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">位置</label>
                    <div className="text-sm font-medium text-gray-900">{warehouse.location}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">负责人</label>
                    <div className="text-sm font-medium text-gray-900">{warehouse.manager_name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    <div className="text-sm font-medium text-gray-900">
                      {warehouse.status === 'active' ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">启用</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">停用</span>
                      )}
                    </div>
                  </div>
                </div>
                {warehouse.address && (
                  <div>
                    <label className="text-sm text-gray-500">详细地址</label>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{warehouse.address}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">库存统计</h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-600">设备总数</div>
                  <div className="text-3xl font-bold text-blue-700 mt-2">{warehouse.total_equipment || 0}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-600">可用设备</div>
                  <div className="text-3xl font-bold text-green-700 mt-2">{warehouse.available_equipment || 0}</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-sm text-orange-600">使用中设备</div>
                  <div className="text-3xl font-bold text-orange-700 mt-2">{warehouse.in_use_equipment || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">仓库ID</label>
                <div className="text-sm font-medium text-gray-900">{warehouse.id}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">创建时间</label>
                <div className="text-sm font-medium text-gray-900">{formatDate(warehouse.created_at)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">仓库设备列表</h2>
        </div>
        <div className="p-6">
          <SearchBox
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="搜索设备..."
            onSearch={handleSearch}
          />

          <DataTable
            data={equipment}
            columns={columns}
            loading={false}
            emptyMessage={searchTerm ? '未找到匹配的设备' : '暂无设备数据'}
            rowKey="id"
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  )
}
