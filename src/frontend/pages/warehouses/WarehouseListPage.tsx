import { useState, useEffect } from 'react'
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
  
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)

  useEffect(() => {
    loadWarehouses()
  }, [page, searchTerm, filterType, filterStatus])

  const loadWarehouses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterStatus && { status: filterStatus })
      })

      const response = await fetch(`${API_URL.BASE}/api/warehouses?${params}`)
      const result = await response.json()

      if (result.success) {
        setWarehouses(result.data || [])
        setTotalPages(result.totalPages || 1)
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('加载仓库失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
  }

  const handleCreate = () => {
    setFormMode('create')
    setEditingWarehouse(null)
    setIsFormOpen(true)
  }

  const handleEdit = (warehouse: Warehouse) => {
    setFormMode('edit')
    setEditingWarehouse(warehouse)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此仓库吗？')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.BASE}/api/warehouses/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        await loadWarehouses()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除仓库失败:', error)
      alert('删除失败')
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      main: '主仓库',
      branch: '分仓库',
      project: '项目仓库'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700'
    }
    const labels: Record<string, string> = {
      active: '启用',
      inactive: '停用'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  const columns = [
    {
      key: 'warehouse_no' as keyof Warehouse,
      header: '仓库编码',
      render: (value: string, row: Warehouse) => (
        <button
          onClick={() => window.location.href = `/warehouses/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 text-left"
        >
          {value}
        </button>
      )
    },
    {
      key: 'name' as keyof Warehouse,
      header: '仓库名称',
      render: (value: string) => value
    },
    {
      key: 'type' as keyof Warehouse,
      header: '仓库类型',
      render: (value: string) => getTypeLabel(value)
    },
    {
      key: 'location' as keyof Warehouse,
      header: '位置',
      render: (value: string) => value
    },
    {
      key: 'manager_name' as keyof Warehouse,
      header: '负责人',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'status' as keyof Warehouse,
      header: '状态',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'id' as keyof Warehouse,
      header: '操作',
      render: (id: string) => (
        <div className="space-x-2">
          <button
            onClick={() => handleEdit(warehouses.find(w => w.id === id)!)}
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
          <h1 className="text-2xl font-bold text-gray-900">仓库管理</h1>
          <p className="mt-1 text-sm text-gray-600">管理所有仓库信息</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 新增仓库
        </button>
      </div>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="搜索仓库..."
        onSearch={handleSearch}
      />

      <div className="flex gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部类型</option>
          <option value="main">主仓库</option>
          <option value="branch">分仓库</option>
          <option value="project">项目仓库</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
      </div>

      <DataTable
        data={warehouses}
        columns={columns}
        loading={loading}
        emptyMessage={searchTerm ? '未找到匹配的仓库' : '暂无仓库数据，点击上方按钮创建新仓库'}
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

      {isFormOpen && (
        <WarehouseForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (data) => {
            const token = localStorage.getItem('token')
            const url = formMode === 'create'
              ? `${API_URL.BASE}/api/warehouses`
              : `${API_URL.BASE}/api/warehouses/${editingWarehouse?.id}`
            const method = formMode === 'create' ? 'POST' : 'PUT'

            const response = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
              },
              body: JSON.stringify(data)
            })

            if (response.ok) {
              await loadWarehouses()
              setIsFormOpen(false)
            } else {
              throw new Error(formMode === 'create' ? '创建失败' : '更新失败')
            }
          }}
          mode={formMode}
          initialValues={editingWarehouse ? {
            warehouse_no: editingWarehouse.warehouse_no,
            name: editingWarehouse.name,
            type: editingWarehouse.type,
            location: editingWarehouse.location,
            address: editingWarehouse.address || '',
            manager_id: editingWarehouse.manager_id || '',
            status: editingWarehouse.status
          } : undefined}
        />
      )}
    </div>
  )
}

function WarehouseForm({ isOpen, onClose, onSubmit, mode, initialValues }: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  mode: 'create' | 'edit'
  initialValues?: any
}) {
  const [formData, setFormData] = useState({
    warehouse_no: '',
    name: '',
    type: 'main' as 'main' | 'branch' | 'project',
    location: '',
    address: '',
    manager_id: '',
    status: 'active' as 'active' | 'inactive'
  })
  const [employees, setEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues)
    }
  }, [initialValues])

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
    }
  }, [isOpen])

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true)
      const response = await fetch(`${API_URL.BASE}/api/personnel`)
      const result = await response.json()
      if (result.success) {
        setEmployees(result.data || [])
      }
    } catch (error) {
      console.error('加载员工列表失败:', error)
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = mode === 'create' 
        ? { ...formData, warehouse_no: undefined }
        : formData
      await onSubmit(submitData)
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? '新增仓库' : '编辑仓库'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">仓库编码 *</label>
                <input
                  type="text"
                  required
                  value={formData.warehouse_no}
                  onChange={(e) => setFormData({ ...formData, warehouse_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">仓库名称 *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">仓库类型 *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="main">主仓库</option>
                <option value="branch">分仓库</option>
                <option value="project">项目仓库</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">位置 *</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                disabled={loadingEmployees}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择负责人</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态 *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {mode === 'create' ? '创建' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
