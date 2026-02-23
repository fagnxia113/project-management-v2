import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

export default function PurchaseRequestPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_spec: '',
    quantity: 1,
    reason: '',
    urgency: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    project_id: '',
    estimated_price: '',
    notes: ''
  })
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showProjectSelect, setShowProjectSelect] = useState(false)

  React.useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_URL.DATA}/projects?status=in_progress,delayed`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.items || data || [])
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'estimated_price' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.equipment_name || !formData.reason) {
      alert('请填写设备名称和采购原因')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(API_URL.NOTIFICATIONS.PURCHASE_REQUEST_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requester_id: 'current-user',
          requester_name: '当前用户'
        })
      })

      if (res.ok) {
        alert('采购申请已提交')
        navigate('/approvals/mine')
      } else {
        const error = await res.json()
        alert(error.error || '提交失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const urgencyOptions = [
    { value: 'low', label: '低', color: 'gray' },
    { value: 'normal', label: '普通', color: 'blue' },
    { value: 'high', label: '高', color: 'orange' },
    { value: 'urgent', label: '紧急', color: 'red' }
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">采购申请</h1>
        <p className="text-gray-500 mt-1">申请采购设备或物资</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            设备名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="equipment_name"
            value={formData.equipment_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入设备名称"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">规格型号</label>
          <input
            type="text"
            name="equipment_spec"
            value={formData.equipment_spec}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入规格型号"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              采购数量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预估单价（元）</label>
            <input
              type="number"
              name="estimated_price"
              value={formData.estimated_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">紧急程度</label>
          <div className="flex gap-2">
            {urgencyOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, urgency: option.value as any }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.urgency === option.value
                    ? `bg-${option.color}-600 text-white`
                    : `bg-gray-100 text-gray-700 hover:bg-gray-200`
                }`}
                style={{
                  backgroundColor: formData.urgency === option.value 
                    ? option.color === 'red' ? '#dc2626' 
                    : option.color === 'orange' ? '#ea580c'
                    : option.color === 'blue' ? '#2563eb'
                    : '#4b5563'
                    : undefined
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            采购原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请说明采购原因"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
          <div className="flex gap-2">
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">不关联项目</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="其他补充说明"
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '提交中...' : '提交申请'}
          </button>
        </div>
      </form>
    </div>
  )
}
