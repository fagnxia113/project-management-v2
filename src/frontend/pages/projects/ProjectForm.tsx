import { useState, useEffect } from 'react'
import ModalDialog from '../../components/ModalDialog'
import { API_URL } from '../../config/api'

export interface ProjectFormData {
  name: string
  type: string
  status: string
  country: string
  address: string
  manager_id: string
  manager: string
  tech_manager_id: string
  tech_manager: string
  start_date: string
  end_date: string
  budget: number
  customer_id: string
  customer_name: string
  description: string
  area: number
  capacity: number
  rack_count: number
  rack_power: number
  power_arch: string
  hvac_arch: string
  fire_arch: string
  weak_arch: string
}

interface ProjectFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  initialValues?: Partial<ProjectFormData>
  mode: 'create' | 'edit'
}

interface Employee {
  id: string
  name: string
  department: string
}

interface Customer {
  id: string
  name: string
}

export default function ProjectForm({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  mode
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    type: 'domestic',
    status: 'proposal',
    country: '中国',
    address: '',
    manager_id: '',
    manager: '',
    tech_manager_id: '',
    tech_manager: '',
    start_date: '',
    end_date: '',
    budget: 0,
    customer_id: '',
    customer_name: '',
    description: '',
    area: 0,
    capacity: 0,
    rack_count: 0,
    rack_power: 0,
    power_arch: '',
    hvac_arch: '',
    fire_arch: '',
    weak_arch: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  // 加载员工和客户列表
  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, custRes] = await Promise.all([
          fetch(`${API_URL.BASE}/api/data/Employee`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`${API_URL.BASE}/api/data/Customer`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ])
        
        const empData = await empRes.json()
        const custData = await custRes.json()
        
        if (empData.success) setEmployees(empData.data || [])
        if (custData.success) setCustomers(custData.data || [])
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }
    
    if (isOpen) loadData()
  }, [isOpen])

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        type: initialValues.type || 'domestic',
        status: initialValues.status || 'proposal',
        country: initialValues.country || '中国',
        address: initialValues.address || '',
        manager_id: initialValues.manager_id || '',
        manager: initialValues.manager || '',
        tech_manager_id: initialValues.tech_manager_id || '',
        tech_manager: initialValues.tech_manager || '',
        start_date: initialValues.start_date || '',
        end_date: initialValues.end_date || '',
        budget: initialValues.budget || 0,
        customer_id: initialValues.customer_id || '',
        customer_name: initialValues.customer_name || '',
        description: initialValues.description || '',
        area: initialValues.area || 0,
        capacity: initialValues.capacity || 0,
        rack_count: initialValues.rack_count || 0,
        rack_power: initialValues.rack_power || 0,
        power_arch: initialValues.power_arch || '',
        hvac_arch: initialValues.hvac_arch || '',
        fire_arch: initialValues.fire_arch || '',
        weak_arch: initialValues.weak_arch || ''
      })
    }
  }, [initialValues])

  const handleManagerChange = (field: 'manager' | 'tech_manager', idField: 'manager_id' | 'tech_manager_id', value: string) => {
    const emp = employees.find(e => e.id === value)
    setFormData(prev => ({
      ...prev,
      [idField]: value,
      [field]: emp?.name || ''
    }))
  }

  const handleCustomerChange = (value: string) => {
    const cust = customers.find(c => c.id === value)
    setFormData(prev => ({
      ...prev,
      customer_id: value,
      customer_name: cust?.name || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  // 国家列表
  const countries = [
    '中国', '美国', '新加坡', '马来西亚', '印度尼西亚', '泰国', '越南', 
    '菲律宾', '日本', '韩国', '阿联酋', '沙特阿拉伯', '德国', '英国', '其他'
  ]

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? '新建项目' : '编辑项目'}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="请输入项目名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="domestic">国内项目</option>
                <option value="overseas">海外项目</option>
                <option value="rd">研发项目</option>
                <option value="service">服务项目</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="proposal">提案中</option>
                <option value="planning">规划中</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="paused">已暂停</option>
                <option value="delayed">已延期</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属国家</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目经理</label>
              <select
                value={formData.manager_id}
                onChange={(e) => handleManagerChange('manager', 'manager_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">技术负责人</label>
              <select
                value={formData.tech_manager_id}
                onChange={(e) => handleManagerChange('tech_manager', 'tech_manager_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客户</label>
              <select
                value={formData.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">项目地址</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="请输入项目地址"
              />
            </div>
          </div>
        </div>

        {/* 计划信息 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">计划信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">计划开始日期 *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">计划结束日期</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预算(万元)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 技术参数 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">技术参数</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">建筑面积(m²)</label>
              <input
                type="number"
                min="0"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IT容量(MW)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">机柜数量</label>
              <input
                type="number"
                min="0"
                value={formData.rack_count}
                onChange={(e) => setFormData({ ...formData, rack_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单机柜功率(KW)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.rack_power}
                onChange={(e) => setFormData({ ...formData, rack_power: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 架构信息 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">架构信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电力架构</label>
              <textarea
                rows={2}
                value={formData.power_arch}
                onChange={(e) => setFormData({ ...formData, power_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">暖通架构</label>
              <textarea
                rows={2}
                value={formData.hvac_arch}
                onChange={(e) => setFormData({ ...formData, hvac_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消防架构</label>
              <textarea
                rows={2}
                value={formData.fire_arch}
                onChange={(e) => setFormData({ ...formData, fire_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">弱电架构</label>
              <textarea
                rows={2}
                value={formData.weak_arch}
                onChange={(e) => setFormData({ ...formData, weak_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 项目描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="请输入项目描述信息"
          />
        </div>
      </form>
    </ModalDialog>
  )
}
