import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface TransferOrder {
  id: string
  order_no: string
  from_location_type: 'warehouse' | 'project'
  from_location_id: string
  from_location_name: string
  to_location_type: 'warehouse' | 'project'
  to_location_id: string
  to_location_name: string
  from_manager_id: string
  from_manager_name: string
  to_manager_id: string
  to_manager_name: string
  transfer_reason: string
  expected_arrival_date: string
  status: 'pending' | 'approved' | 'receiving' | 'completed' | 'cancelled'
  created_at: string
  items: TransferItem[]
}

interface TransferItem {
  id: string
  equipment_id: string
  equipment_name: string
  model_no: string
  category: 'instrument' | 'fake_load' | 'accessory'
  unit: string
  quantity: number
}

export default function TransferListPage() {
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState<TransferOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const statusLabels: Record<string, string> = {
    'pending': '待审批',
    'pending_from': '待调出审批',
    'pending_to': '待调入审批',
    'shipping': '待发货',
    'in_transit': '运输中',
    'approved': '已通过',
    'receiving': '收货中',
    'completed': '已完成',
    'cancelled': '已取消',
  };

  const statusColors: Record<string, string> = {
    'pending': 'text-yellow-600 bg-yellow-100',
    'pending_from': 'text-orange-600 bg-orange-100',
    'pending_to': 'text-orange-600 bg-orange-100',
    'shipping': 'text-purple-600 bg-purple-100',
    'in_transit': 'text-indigo-600 bg-indigo-100',
    'approved': 'text-green-600 bg-green-100',
    'receiving': 'text-blue-600 bg-blue-100',
    'completed': 'text-gray-600 bg-gray-100',
    'cancelled': 'text-red-600 bg-red-100',
  };

  useEffect(() => {
    loadTransfers()
  }, [page, searchTerm, statusFilter])

  const loadTransfers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      })

      const response = await fetch(`${API_URL.BASE}/api/equipment/v3/transfer?${params}`)
      const result = await response.json()

      if (result.data) {
        setTransfers(result.data || [])
        setTotalPages(Math.ceil(result.total / result.pageSize) || 1)
      } else if (result.success) {
        setTransfers(result.data || [])
        setTotalPages(result.totalPages || 1)
      } else {
        console.error('加载调拨单失败:', result.error)
        setTransfers([])
      }
    } catch (error) {
      console.error('加载调拨单失败:', error)
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadTransfers()
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setPage(1)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">设备调拨列表</h1>
        <button
          onClick={() => navigate('/equipment/transfers/create')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          创建调拨
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4 flex gap-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="搜索调拨单号、位置..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              搜索
            </button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter('')}
              className={`px-4 py-2 rounded ${statusFilter === '' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              全部
            </button>
            <button
              onClick={() => handleStatusFilter('pending')}
              className={`px-4 py-2 rounded ${statusFilter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              待审批
            </button>
            <button
              onClick={() => handleStatusFilter('approved')}
              className={`px-4 py-2 rounded ${statusFilter === 'approved' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              已通过
            </button>
            <button
              onClick={() => handleStatusFilter('receiving')}
              className={`px-4 py-2 rounded ${statusFilter === 'receiving' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              收货中
            </button>
            <button
              onClick={() => handleStatusFilter('completed')}
              className={`px-4 py-2 rounded ${statusFilter === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              已完成
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无调拨单</div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="border rounded-lg p-4 hover:shadow-md cursor-pointer"
                onClick={() => navigate(`/equipment/transfers/${transfer.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{transfer.order_no}</h3>
                    <p className="text-sm text-gray-600">
                      {transfer.from_location_name} → {transfer.to_location_name}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColors[transfer.status]}`}>
                    {statusLabels[transfer.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>调拨原因: {transfer.transfer_reason}</p>
                  <p>创建时间: {new Date(transfer.created_at).toLocaleString()}</p>
                  <p>设备数量: {transfer.items.length} 项</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  )
}