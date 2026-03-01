import { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

interface ScrapSaleEquipment {
  id: string
  order_no: string
  type: 'scrap' | 'sale'
  equipment_name: string
  equipment_category: 'instrument' | 'fake_load' | 'cable'
  scrap_sale_quantity: number
  original_location_type: 'warehouse' | 'in_project'
  original_location_name: string | null
  reason: string
  sale_price: number | null
  buyer: string | null
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  applicant: string
  apply_date: string
  approved_at: string | null
  approved_by_name: string | null
  approval_comment: string | null
  processed_at: string | null
  processed_by_name: string | null
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function ScrapSaleListPage() {
  const [orders, setOrders] = useState<ScrapSaleEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    loadOrders()
  }, [page, searchTerm, filterType, filterStatus])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterStatus && { status: filterStatus })
      })

      const response = await fetch(`${API_URL.BASE}/api/equipment/scrap-sales?${params}`)
      const result: ApiResponse<ScrapSaleEquipment> = await response.json()

      if (result.success) {
        setOrders(result.data || [])
        setTotalPages(result.totalPages || 1)
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('加载报废/售出清单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
  }

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      scrap: 'bg-red-100 text-red-700',
      sale: 'bg-blue-100 text-blue-700'
    }
    const labels: Record<string, string> = {
      scrap: '报废',
      sale: '售出'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || styles.scrap}`}>
        {labels[type] || type}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      completed: 'bg-green-100 text-green-700'
    }
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已审批',
      rejected: '已驳回',
      completed: '已完成'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
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
      key: 'order_no' as keyof ScrapSaleEquipment,
      header: '单号',
      render: (value: string) => value
    },
    {
      key: 'type' as keyof ScrapSaleEquipment,
      header: '类型',
      render: (value: string) => getTypeBadge(value)
    },
    {
      key: 'equipment_name' as keyof ScrapSaleEquipment,
      header: '设备名称',
      render: (value: string, row: ScrapSaleEquipment) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{getCategoryBadge(row.equipment_category)}</div>
        </div>
      )
    },
    {
      key: 'scrap_sale_quantity' as keyof ScrapSaleEquipment,
      header: '数量',
      render: (value: number, row: ScrapSaleEquipment) => {
        if (row.equipment_category === 'instrument') {
          return <span className="text-sm font-medium">{value} 台</span>
        } else {
          return <span className="text-sm font-medium">{value} 米</span>
        }
      }
    },
    {
      key: 'original_location_name' as keyof ScrapSaleEquipment,
      header: '原位置',
      render: (value: string | null, row: ScrapSaleEquipment) => {
        const locationType = row.original_location_type === 'warehouse' ? '仓库' : '项目'
        return value ? `${locationType}: ${value}` : '-'
      }
    },
    {
      key: 'reason' as keyof ScrapSaleEquipment,
      header: '原因',
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'sale_price' as keyof ScrapSaleEquipment,
      header: '售出价格',
      render: (value: number | null, row: ScrapSaleEquipment) => {
        if (row.type === 'sale') {
          return value ? `¥${value.toLocaleString()}` : '-'
        }
        return '-'
      }
    },
    {
      key: 'buyer' as keyof ScrapSaleEquipment,
      header: '购买方',
      render: (value: string | null, row: ScrapSaleEquipment) => {
        if (row.type === 'sale') {
          return value || '-'
        }
        return '-'
      }
    },
    {
      key: 'status' as keyof ScrapSaleEquipment,
      header: '状态',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'applicant' as keyof ScrapSaleEquipment,
      header: '申请人',
      render: (value: string) => value
    },
    {
      key: 'apply_date' as keyof ScrapSaleEquipment,
      header: '申请日期',
      render: (value: string) => new Date(value).toLocaleDateString('zh-CN')
    },
    {
      key: 'approved_by_name' as keyof ScrapSaleEquipment,
      header: '审批人',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'processed_by_name' as keyof ScrapSaleEquipment,
      header: '处理人',
      render: (value: string | null) => value || '-'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">已报废/售出设备清单</h1>
          <p className="mt-1 text-sm text-gray-600">查看所有已报废或售出的设备</p>
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
        placeholder="搜索报废/售出单..."
        onSearch={handleSearch}
      />

      <div className="flex gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部类型</option>
          <option value="scrap">报废</option>
          <option value="sale">售出</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="pending">待审批</option>
          <option value="approved">已审批</option>
          <option value="rejected">已驳回</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        emptyMessage={searchTerm ? '未找到匹配的记录' : '暂无报废/售出记录'}
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
