import { useState, useEffect } from 'react'
import EquipmentForm, { EquipmentFormData } from './EquipmentForm'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

interface Equipment {
  id: string
  name: string
  code: string
  type: string
  status: string
  purchase_date: string | null
  purchase_price: number | null
  supplier: string | null
  location: string | null
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

export default function EquipmentListPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal状态
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

  useEffect(() => {
    loadEquipment()
  }, [page, searchTerm])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm })
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

  // 打开新建设备对话框
  const handleCreate = () => {
    setFormMode('create')
    setEditingEquipment(null)
    setIsFormOpen(true)
  }

  // 打开编辑设备对话框
  const handleEdit = (eq: Equipment) => {
    setFormMode('edit')
    setEditingEquipment(eq)
    setIsFormOpen(true)
  }

  // 提交表单
  const handleSubmit = async (data: EquipmentFormData) => {
    const url = formMode === 'create'
      ? 'http://localhost:8080/api/data/Equipment'
      : `http://localhost:8080/api/data/Equipment/${editingEquipment?.id}`

    const method = formMode === 'create' ? 'POST' : 'PUT'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (response.ok) {
      await loadEquipment()
    } else {
      throw new Error(formMode === 'create' ? '创建失败' : '更新失败')
    }
  }

  // 删除设备
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此设备吗？')) return

    try {
      const response = await fetch(`${API_URL.BASE}/api/data/Equipment/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadEquipment()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除设备失败:', error)
      alert('删除失败')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-green-100 text-green-700',
      in_use: 'bg-blue-100 text-blue-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      scrapped: 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      available: '可用',
      in_use: '使用中',
      maintenance: '维护中',
      scrapped: '报废'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.available}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      machinery: '机械设备',
      vehicle: '运输工具',
      tool: '工具',
      electronics: '电子设备',
      other: '其他'
    }
    return labels[type] || type
  }

  const columns = [
    {
      key: 'name' as keyof Equipment,
      header: '设备名称',
      render: (value: string, row: Equipment) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.code}</div>
        </div>
      )
    },
    {
      key: 'type' as keyof Equipment,
      header: '类型',
      render: (value: string) => getTypeBadge(value)
    },
    {
      key: 'status' as keyof Equipment,
      header: '状态',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'purchase_price' as keyof Equipment,
      header: '采购价格',
      render: (value: number | null) => value ? `¥${value.toLocaleString()}` : '-'
    },
    {
      key: 'location' as keyof Equipment,
      header: '存放位置',
      render: (value: string | null) => value || '-'
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
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 新增设备
        </button>
      </div>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="搜索设备..."
        onSearch={handleSearch}
      />

      <DataTable
        data={equipment}
        columns={columns}
        loading={loading}
        emptyMessage={searchTerm ? '未找到匹配的设备' : '暂无设备数据，点击上方按钮创建新设备'}
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

      <EquipmentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        mode={formMode}
        initialValues={editingEquipment ? {
          name: editingEquipment.name,
          code: editingEquipment.code,
          type: editingEquipment.type,
          status: editingEquipment.status,
          purchase_date: editingEquipment.purchase_date || '',
          purchase_price: editingEquipment.purchase_price || 0,
          supplier: editingEquipment.supplier || '',
          location: editingEquipment.location || '',
          notes: editingEquipment.notes || ''
        } : undefined}
      />
    </div>
  )
}
