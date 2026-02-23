import { useState, useEffect } from 'react'
import ModalDialog from '../../components/ModalDialog'

export interface EquipmentFormData {
  name: string
  code: string
  type: string
  status: string
  purchase_date: string
  purchase_price: number
  supplier: string
  location: string
  notes: string
}

interface EquipmentFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EquipmentFormData) => Promise<void>
  initialValues?: Partial<EquipmentFormData>
  mode: 'create' | 'edit'
}

export default function EquipmentForm({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  mode
}: EquipmentFormProps) {
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    code: '',
    type: 'machinery',
    status: 'available',
    purchase_date: '',
    purchase_price: 0,
    supplier: '',
    location: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        code: initialValues.code || '',
        type: initialValues.type || 'machinery',
        status: initialValues.status || 'available',
        purchase_date: initialValues.purchase_date || '',
        purchase_price: initialValues.purchase_price || 0,
        supplier: initialValues.supplier || '',
        location: initialValues.location || '',
        notes: initialValues.notes || ''
      })
    }
  }, [initialValues])

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

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? '新增设备' : '编辑设备'}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            disabled={submitting}
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 设备名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            设备名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入设备名称"
          />
        </div>

        {/* 设备编号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            设备编号 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入设备编号"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 设备类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设备类型 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="machinery">机械设备</option>
              <option value="vehicle">运输工具</option>
              <option value="tool">工具</option>
              <option value="electronics">电子设备</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* 设备状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设备状态 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">可用</option>
              <option value="in_use">使用中</option>
              <option value="maintenance">维护中</option>
              <option value="scrapped">报废</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 采购日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              采购日期
            </label>
            <input
              type="date"
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 采购价格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              采购价格（元）
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入采购价格"
            />
          </div>
        </div>

        {/* 供应商 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            供应商
          </label>
          <input
            type="text"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入供应商名称"
          />
        </div>

        {/* 存放位置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            存放位置
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入设备存放位置"
          />
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备注
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入备注信息"
          />
        </div>
      </form>
    </ModalDialog>
  )
}
