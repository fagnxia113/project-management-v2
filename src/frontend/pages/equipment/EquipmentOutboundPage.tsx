/**
 * 设备出库页面
 */
import React, { useState } from 'react'

export default function EquipmentOutboundPage() {
  const [formData, setFormData] = useState({
    equipmentId: '',
    projectName: '',
    operator: '',
    outDate: new Date().toISOString().split('T')[0],
    reason: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('设备出库申请已提交')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">设备出库申请</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设备编号</label>
            <input
              type="text"
              value={formData.equipmentId}
              onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="请输入设备编号"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出库项目</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="请输入项目名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">经办人</label>
            <input
              type="text"
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="请输入经办人"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出库日期</label>
            <input
              type="date"
              value={formData.outDate}
              onChange={(e) => setFormData({ ...formData, outDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出库原因</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="请输入出库原因"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              提交申请
            </button>
            <button type="button" className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
