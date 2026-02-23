import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { API_URL } from '../../config/api'

interface Customer {
  id: string
  customer_no: string
  name: string
  type: string
  contact: string
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'direct',
    contact: '',
    phone: '',
    address: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL.DATA}/customers`)
      const result = await response.json()
      setCustomers(result.data || result.items || [])
    } catch (error) {
      console.error('加载客户失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
if (!formData.name || !formData.contact || !formData.phone) {
      alert('请填写所有必填字段（名称、联系人、电话）')
      return
    }
    setSubmitting(true)
    try {
      const customerNo = `KH-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`
      const response = await fetch(`${API_URL.DATA}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
          id: uuidv4(),
          customer_no: customerNo,
          name: formData.name,
          type: formData.type,
          contact: formData.contact,
          phone: formData.phone,
          address: formData.address || null,
          notes: formData.notes || null
        })
      })
if (response.ok) {
        setShowModal(false)
        setFormData({ name: '', type: 'direct', contact: '', phone: '', address: '', notes: '' })
        loadCustomers()
        alert('客户创建成功！')
      } else {
        const errorData = await response.json()
        console.error('创建失败:', errorData)
        alert('创建失败: ' + (errorData.error || JSON.stringify(errorData)))
      }
    } catch (error) {
      console.error('创建客户失败:', error)
      alert('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此客户吗？')) return
    try {
      const response = await fetch(`${API_URL.DATA}/customers/${id}`, { method: 'DELETE' })
      if (response.ok) loadCustomers()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      direct: 'bg-blue-100 text-blue-700',
      channel: 'bg-green-100 text-green-700',
      agent: 'bg-purple-100 text-purple-700'
    }
    const labels: Record<string, string> = {
      direct: '直签客户',
      channel: '渠道客户',
      agent: '代理商'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || styles.direct}`}>
        {labels[type] || type}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">客户管理</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">+ 新增客户</button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无客户数据，点击"新增客户"添加</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户编号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.customer_no}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-4 py-3">{getTypeBadge(customer.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{customer.contact}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{customer.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.address || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">新增客户</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">客户名称 <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">客户类型</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="direct">直签客户</option>
                  <option value="channel">渠道客户</option>
                  <option value="agent">代理商</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
<div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">取消</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
