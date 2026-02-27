import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Equipment {
  id: string
  name: string
  manage_code: string
  model_no: string
  brand: string
  category: string
  unit: string
  health_status: string
  usage_status: string
  location_status: string
  location_id: string
  location_name: string
}

interface Project {
  id: string
  name: string
  project_no: string
  status: string
}

interface BorrowingFormData {
  equipment_id: string
  lender: string
  borrow_date: string
  return_deadline: string
  contract_no: string
  project_id: string
  notes: string
}

export default function BorrowingCreatePage() {
  const navigate = useNavigate()
  
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [healthFilter, setHealthFilter] = useState('')
  
  const [formData, setFormData] = useState<BorrowingFormData>({
    equipment_id: '',
    lender: '',
    borrow_date: new Date().toISOString().slice(0, 10),
    return_deadline: '',
    contract_no: '',
    project_id: '',
    notes: ''
  })

  useEffect(() => {
    loadEquipment()
    loadProjects()
  }, [])

  useEffect(() => {
    loadEquipment()
  }, [categoryFilter, healthFilter])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        equipment_source: 'owned',
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(healthFilter && { health_status: healthFilter })
      })

      const response = await fetch(`${API_URL.BASE}/api/equipment/instances?${params}`)
      const result = await response.json()
      if (result.success) {
        setEquipment(result.data || [])
      }
    } catch (error) {
      console.error('加载设备失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_URL.BASE}/api/data/Project?status=in_progress,delayed&pageSize=100`)
      const result = await response.json()
      if (result.success) {
        setProjects(result.data || [])
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    }
  }

  const handleSelectEquipment = (eq: Equipment) => {
    setSelectedEquipment(eq)
    setFormData({ ...formData, equipment_id: eq.id })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.equipment_id) {
      alert('请选择设备')
      return
    }
    
    if (!formData.lender) {
      alert('请填写借出方')
      return
    }
    
    if (!formData.borrow_date) {
      alert('请填写借用日期')
      return
    }
    
    if (!confirm('确定要登记借用设备吗？')) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL.BASE}/api/equipment/borrowings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      if (result.success) {
        alert('借用设备登记成功')
        navigate('/approvals/mine')
      } else {
        alert(result.error || '登记失败')
      }
    } catch (error) {
      console.error('登记失败:', error)
      alert('登记失败，请重试')
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">借用设备登记</h1>
          <p className="mt-1 text-sm text-gray-600">登记借用设备信息</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">选择设备</h2>
              
              <div className="mb-4 flex gap-4">
                <input
                  type="text"
                  placeholder="搜索设备..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部类别</option>
                  <option value="instrument">仪器</option>
                  <option value="fake_load">假负载</option>
                  <option value="cable">线材</option>
                </select>
                <select
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部健康状态</option>
                  <option value="normal">正常</option>
                  <option value="slightly_damaged">轻微损坏</option>
                  <option value="affected_use">影响使用</option>
                </select>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">选择</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理编号</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">健康状态</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-center text-gray-500">加载中...</td>
                      </tr>
                    ) : equipment.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-center text-gray-500">暂无设备</td>
                      </tr>
                    ) : (
                      equipment.map((eq) => (
                        <tr key={eq.id} className={selectedEquipment?.id === eq.id ? 'bg-blue-50' : ''}>
                          <td className="px-4 py-3">
                            <input
                              type="radio"
                              name="equipment"
                              checked={selectedEquipment?.id === eq.id}
                              onChange={() => handleSelectEquipment(eq)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.manage_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.model_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.brand}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.health_status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">借用信息</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    借出方（厂家） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lender}
                    onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入厂家名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    借用日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.borrow_date}
                    onChange={(e) => setFormData({ ...formData, borrow_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    归还期限
                  </label>
                  <input
                    type="date"
                    value={formData.return_deadline}
                    onChange={(e) => setFormData({ ...formData, return_deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    借用合同编号
                  </label>
                  <input
                    type="text"
                    value={formData.contract_no}
                    onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入合同编号"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    使用项目
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择项目</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.project_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入备注信息"
                  />
                </div>
              </div>
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
              {submitting ? '提交中...' : '提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
