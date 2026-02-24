import { useState, useEffect } from 'react'
import ModalDialog from '../../components/ModalDialog'
import { API_URL } from '../../config/api'

export interface ProjectFormData {
  // 基本信息
  name: string
  code: string
  manager_id: string
  manager: string
  start_date: string
  country: string
  province: string
  city: string
  address: string
  end_date: string
  attachments: string[]
  attachmentNames: string[]
  // 项目阶段
  status: string
  phase: string
  phase_start_date: string
  phase_end_date: string
  estimated_days: number
  remaining_days: number
  progress: number
  // 项目相关信息
  description: string
  area: number
  capacity: number
  rack_count: number
  rack_power: number
  // 技术架构
  power_arch: string
  hvac_arch: string
  fire_arch: string
  weak_arch: string
  // 商务信息
  customer_id: string
  customer_name: string
  budget: number
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
  department_id: string
  department_name?: string
  position?: string
}

interface Customer {
  id: string
  name: string
}

// 项目阶段选项
const PROJECT_PHASES = [
  { value: 'bidding', label: '投标阶段' },
  { value: 'design', label: '设计阶段' },
  { value: 'procurement', label: '采购阶段' },
  { value: 'construction', label: '施工阶段' },
  { value: 'commissioning', label: '调试验收阶段' },
  { value: 'handover', label: '移交阶段' },
  { value: 'warranty', label: '质保阶段' }
]

// 项目状态选项
const PROJECT_STATUSES = [
  { value: 'initiated', label: '立项' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已结项' },
  { value: 'paused', label: '暂停' }
]

export default function ProjectForm({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  mode
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    // 基本信息
    name: '',
    code: '',
    manager_id: '',
    manager: '',
    start_date: '',
    country: '中国',
    province: '',
    city: '',
    address: '',
    end_date: '',
    attachments: [],
    attachmentNames: [],
    // 项目阶段
    status: 'initiated',
    phase: '',
    phase_start_date: '',
    phase_end_date: '',
    estimated_days: 0,
    remaining_days: 0,
    progress: 0,
    // 项目相关信息
    description: '',
    area: 0,
    capacity: 0,
    rack_count: 0,
    rack_power: 0,
    // 技术架构
    power_arch: '',
    hvac_arch: '',
    fire_arch: '',
    weak_arch: '',
    // 商务信息
    customer_id: '',
    customer_name: '',
    budget: 0
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
        // 基本信息
        name: initialValues.name || '',
        code: initialValues.code || '',
        manager_id: initialValues.manager_id || '',
        manager: initialValues.manager || '',
        start_date: initialValues.start_date || '',
        country: initialValues.country || '中国',
        province: initialValues.province || '',
        city: initialValues.city || '',
        address: initialValues.address || '',
        end_date: initialValues.end_date || '',
        attachments: Array.isArray(initialValues.attachments) ? initialValues.attachments : [],
        attachmentNames: Array.isArray(initialValues.attachmentNames) ? initialValues.attachmentNames : [],
        // 项目阶段
        status: initialValues.status || 'initiated',
        phase: initialValues.phase || '',
        phase_start_date: initialValues.phase_start_date || '',
        phase_end_date: initialValues.phase_end_date || '',
        estimated_days: initialValues.estimated_days || 0,
        remaining_days: initialValues.remaining_days || 0,
        progress: initialValues.progress || 0,
        // 项目相关信息
        description: initialValues.description || '',
        area: initialValues.area || 0,
        capacity: initialValues.capacity || 0,
        rack_count: initialValues.rack_count || 0,
        rack_power: initialValues.rack_power || 0,
        // 技术架构
        power_arch: initialValues.power_arch || '',
        hvac_arch: initialValues.hvac_arch || '',
        fire_arch: initialValues.fire_arch || '',
        weak_arch: initialValues.weak_arch || '',
        // 商务信息
        customer_id: initialValues.customer_id || '',
        customer_name: initialValues.customer_name || '',
        budget: initialValues.budget || 0
      })
    }
  }, [initialValues])

  const handleManagerChange = (value: string) => {
    const emp = employees.find(e => e.id === value)
    setFormData(prev => ({
      ...prev,
      manager_id: value,
      manager: emp?.name || ''
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

  // 计算预计使用天数
  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 当阶段日期改变时自动计算天数
  const handlePhaseDateChange = (field: 'phase_start_date' | 'phase_end_date', value: string) => {
    const newData = { ...formData, [field]: value }
    if (field === 'phase_start_date') {
      newData.phase_start_date = value
    } else {
      newData.phase_end_date = value
    }
    
    // 计算预计使用天数
    if (newData.phase_start_date && newData.phase_end_date) {
      newData.estimated_days = calculateDays(newData.phase_start_date, newData.phase_end_date)
      // 计算剩余天数
      const today = new Date()
      const endDate = new Date(newData.phase_end_date)
      const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      newData.remaining_days = remaining > 0 ? remaining : 0
    }
    
    setFormData(newData)
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
              <label className="block text-sm font-medium text-gray-700 mb-1">项目编号</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                placeholder="自动生成"
                disabled={mode === 'create'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目经理 <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.manager_id}
                onChange={(e) => handleManagerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.position || emp.department_id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目开始日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">省份/州</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="请输入省份或州"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="请输入城市"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="请输入详细地址"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目结束日期</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">附件</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.zip,.rar"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    const fileNames = files.map(f => f.name)
                    setFormData({ 
                      ...formData, 
                      attachments: [...formData.attachments, ...fileNames],
                      attachmentNames: [...formData.attachmentNames, ...fileNames]
                    })
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.attachmentNames.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.attachmentNames.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <span>📎 {name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newAttachments = formData.attachments.filter((_, i) => i !== idx)
                            const newNames = formData.attachmentNames.filter((_, i) => i !== idx)
                            setFormData({ ...formData, attachments: newAttachments, attachmentNames: newNames })
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">支持 PDF、Word、Excel、图片、压缩包等格式</p>
            </div>
          </div>
        </div>

        {/* 项目阶段 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">项目阶段</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {PROJECT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目阶段</label>
              <select
                value={formData.phase}
                onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {PROJECT_PHASES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">该阶段预计开始日期</label>
              <input
                type="date"
                value={formData.phase_start_date}
                onChange={(e) => handlePhaseDateChange('phase_start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">该阶段预计结束日期</label>
              <input
                type="date"
                value={formData.phase_end_date}
                onChange={(e) => handlePhaseDateChange('phase_end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预计使用天数</label>
              <input
                type="number"
                min="0"
                value={formData.estimated_days || ''}
                onChange={(e) => setFormData({ ...formData, estimated_days: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">剩余天数</label>
              <input
                type="number"
                min="0"
                value={formData.remaining_days || ''}
                onChange={(e) => setFormData({ ...formData, remaining_days: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                readOnly
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">完成进度</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 w-12">{formData.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 项目相关信息 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">项目相关信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="请输入项目描述信息"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">建筑面积(m²)</label>
              <input
                type="number"
                min="0"
                value={formData.area || ''}
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
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">机柜数量</label>
              <input
                type="number"
                min="0"
                value={formData.rack_count || ''}
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
                value={formData.rack_power || ''}
                onChange={(e) => setFormData({ ...formData, rack_power: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 技术架构 */}
        <div className="border-b pb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">技术架构</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电力架构</label>
              <textarea
                rows={2}
                value={formData.power_arch}
                onChange={(e) => setFormData({ ...formData, power_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="电力系统架构描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">暖通架构</label>
              <textarea
                rows={2}
                value={formData.hvac_arch}
                onChange={(e) => setFormData({ ...formData, hvac_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="暖通系统架构描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消防架构</label>
              <textarea
                rows={2}
                value={formData.fire_arch}
                onChange={(e) => setFormData({ ...formData, fire_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="消防系统架构描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">弱电架构</label>
              <textarea
                rows={2}
                value={formData.weak_arch}
                onChange={(e) => setFormData({ ...formData, weak_arch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="弱电系统架构描述"
              />
            </div>
          </div>
        </div>

        {/* 商务信息 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">商务信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">终端客户</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预算金额(万元)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}