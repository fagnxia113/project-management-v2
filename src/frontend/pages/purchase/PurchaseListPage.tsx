import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface PurchaseRequest {
  id: string
  request_no: string
  equipment_name: string
  equipment_spec: string
  quantity: number
  reason: string
  urgency: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'purchasing' | 'arrived' | 'cancelled'
  requester_name: string
  project_name: string
  estimated_price: number
  created_at: string
}

const statusLabels: Record<string, string> = {
  'pending': '待审批',
  'approved': '已批准',
  'purchasing': '采购中',
  'arrived': '已到货',
  'cancelled': '已取消'
}

const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'approved': 'bg-blue-100 text-blue-700',
  'purchasing': 'bg-purple-100 text-purple-700',
  'arrived': 'bg-green-100 text-green-700',
  'cancelled': 'bg-gray-100 text-gray-700'
}

const urgencyLabels: Record<string, string> = {
  'low': '低',
  'normal': '普通',
  'high': '高',
  'urgent': '紧急'
}

const urgencyColors: Record<string, string> = {
  'low': 'bg-gray-100 text-gray-700',
  'normal': 'bg-blue-100 text-blue-700',
  'high': 'bg-orange-100 text-orange-700',
  'urgent': 'bg-red-100 text-red-700'
}

export default function PurchaseListPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)

  useEffect(() => {
    loadRequests()
  }, [statusFilter])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const url = statusFilter 
        ? `${API_URL.NOTIFICATIONS.PURCHASE_REQUESTS}?status=${statusFilter}`
        : API_URL.NOTIFICATIONS.PURCHASE_REQUESTS
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
      }
    } catch (error) {
      console.error('加载采购申请失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const res = await fetch(API_URL.NOTIFICATIONS.PURCHASE_REQUEST_STATUS(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      })
      if (res.ok) {
        loadRequests()
        setSelectedRequest(null)
      }
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">采购管理</h1>
          <p className="text-gray-500 mt-1">管理设备物资采购申请</p>
        </div>
        <a
          href="/purchase/request"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新建采购申请
        </a>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {Object.entries(statusLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无采购申请</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请单号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">紧急程度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map(request => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{request.request_no}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{request.equipment_name}</div>
                    {request.equipment_spec && (
                      <div className="text-xs text-gray-500">{request.equipment_spec}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{request.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${urgencyColors[request.urgency]}`}>
                      {urgencyLabels[request.urgency]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${statusColors[request.status]}`}>
                      {statusLabels[request.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{request.requester_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">采购申请详情</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">申请单号</label>
                  <p className="font-medium">{selectedRequest.request_no}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 text-xs rounded ${statusColors[selectedRequest.status]}`}>
                      {statusLabels[selectedRequest.status]}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">设备名称</label>
                  <p className="font-medium">{selectedRequest.equipment_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">规格型号</label>
                  <p>{selectedRequest.equipment_spec || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">数量</label>
                  <p>{selectedRequest.quantity}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">预估单价</label>
                  <p>{selectedRequest.estimated_price ? `¥${selectedRequest.estimated_price}` : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">紧急程度</label>
                  <p>
                    <span className={`px-2 py-1 text-xs rounded ${urgencyColors[selectedRequest.urgency]}`}>
                      {urgencyLabels[selectedRequest.urgency]}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">关联项目</label>
                  <p>{selectedRequest.project_name || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">采购原因</label>
                <p className="mt-1">{selectedRequest.reason}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">申请人</label>
                <p>{selectedRequest.requester_name}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'cancelled', '取消采购')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    取消申请
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'approved', '审批通过')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    批准采购
                  </button>
                </>
              )}
              {selectedRequest.status === 'approved' && (
                <button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'purchasing', '开始采购')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  开始采购
                </button>
              )}
              {selectedRequest.status === 'purchasing' && (
                <button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'arrived', '设备已到货')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  确认到货
                </button>
              )}
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
