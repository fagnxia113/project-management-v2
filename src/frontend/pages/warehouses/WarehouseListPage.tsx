import { useState, useEffect } from 'react'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'

interface Warehouse {
  id: string
  name: string
  code: string
  location: string | null
  manager: string | null
  capacity: number | null
  status: string
  created_at: string
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function WarehouseListPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadWarehouses()
  }, [page, searchTerm])

  const loadWarehouses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`http://localhost:8080/api/data/Warehouse?${params}`)
      const result: ApiResponse<Warehouse> = await response.json()
      
      setWarehouses(result.data || [])
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch (error) {
      console.error('加载仓库失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      maintenance: 'bg-yellow-100 text-yellow-700'
    }
    const labels: Record<string, string> = {
      active: '正常',
      inactive: '停用',
      maintenance: '维护中'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  const columns = [
    {
      key: 'id' as keyof Warehouse,
      header: '仓库编号',
      width: '100px'
    },
    {
      key: 'name' as keyof Warehouse,
      header: '仓库名称',
      render: (value: string, row: Warehouse) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.code}</div>
        </div>
      )
    },
    {
      key: 'location' as keyof Warehouse,
      header: '位置',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'manager' as keyof Warehouse,
      header: '负责人',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'capacity' as keyof Warehouse,
      header: '容量',
      render: (value: number | null) => value ? `${value} 平方米` : '-'
    },
    {
      key: 'status' as keyof Warehouse,
      header: '状态',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'id' as keyof Warehouse,
      header: '操作',
      render: () => (
        <div className="space-x-2">
          <button className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
          <button className="text-red-600 hover:text-red-800 text-sm">删除</button>
        </div>
      )
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">仓库管理</h1>
            <p className="mt-1 text-sm text-gray-600">管理所有仓库信息</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 新增仓库
          </button>
        </div>

        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="搜索仓库..."
          onSearch={handleSearch}
        />

        <DataTable
          data={warehouses}
          columns={columns}
          loading={loading}
          emptyMessage={searchTerm ? '未找到匹配的仓库' : '暂无仓库数据'}
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


