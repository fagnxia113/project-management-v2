import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface EquipmentBorrowing {
  id: string
  borrowing_no: string
  equipment_id: string
  equipment_name: string
  manage_code: string
  lender: string
  borrow_date: string
  return_deadline: string
  contract_no: string
  project_id: string
  project_name: string
  return_date: string
  return_to: string
  return_location_id: string
  status: 'borrowing' | 'returned' | 'overdue'
  notes: string
  applicant_name: string
  created_at: string
}

interface Warehouse {
  id: string
  name: string
  code: string
}

export default function BorrowingReturnPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const [borrowing, setBorrowing] = useState<EquipmentBorrowing | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [returnTo, setReturnTo] = useState<'lender' | 'warehouse'>('lender')
  const [returnLocationId, setReturnLocationId] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadBorrowing()
    loadWarehouses()
  }, [id])

  const loadBorrowing = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL.BASE}/api/equipment/borrowings/${id}`)
      const result = await response.json()
      if (result.success) {
        setBorrowing(result.data)
      }
    } catch (error) {
      console.error('加载借用记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL.BASE}/api/data/Warehouse`)
      const result = await response.json()
      if (result.success) {
        setWarehouses(result.data || [])
      }
    } catch (error) {
      console.error('加载仓库失败:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!returnDate) {
      alert('请填写归还日期')
      return
    }
    
    if (returnTo === 'warehouse' && !returnLocationId) {
      alert('请选择归还仓库')
      return
    }
    
    if (!confirm('确定要归还设备吗？')) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL.BASE}/api/equipment/borrowings/${id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          return_to: returnTo,
          return_location_id: returnTo === 'warehouse' ? returnLocationId : null,
          return_date: returnDate,
          notes
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('归还成功')
        navigate('/approvals/mine')
      } else {
        alert(result.error || '归还失败')
      }
    } catch (error) {
      console.error('归还失败:', error)
      alert('归还失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8 text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!borrowing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8 text-gray-500">借用记录不存在</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/approvals/mine')}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 返回借用设备列表
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">借用设备归还</h1>
          <p className="mt-1 text-sm text-gray-600">归还借用设备</p>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">借用信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">借用单号：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.borrowing_no}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">设备名称：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.equipment_name}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">管理编号：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.manage_code}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">借出方：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.lender}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">借用日期：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.borrow_date}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">归还期限：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.return_deadline || '-'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">使用项目：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.project_name || '-'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">借用合同编号：</span>
                <span className="ml-2 text-sm font-medium text-gray-900">{borrowing.contract_no || '-'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">归还信息</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  归还对象 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="return_to"
                      value="lender"
                      checked={returnTo === 'lender'}
                      onChange={(e) => setReturnTo(e.target.value as 'lender' | 'warehouse')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">归还厂家</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="return_to"
                      value="warehouse"
                      checked={returnTo === 'warehouse'}
                      onChange={(e) => setReturnTo(e.target.value as 'lender' | 'warehouse')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">归还仓库</span>
                  </label>
                </div>
              </div>

              {returnTo === 'warehouse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    归还仓库 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={returnLocationId}
                    onChange={(e) => setReturnLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择仓库</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  归还日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入备注信息"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/approvals/mine')}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : '确认归还'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
