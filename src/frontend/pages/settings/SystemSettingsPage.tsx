import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface SystemConfig {
  id: string
  key: string
  value: string
  description: string
  category: string
}

export default function SystemSettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('general')
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL.DATA}/system_configs`)
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.items || data || [])
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      setConfigs([
        { id: '1', key: 'purchase_manager_id', value: '', description: '采购负责人ID', category: 'purchase' },
        { id: '2', key: 'equipment_manager_id', value: '', description: '设备管理员ID', category: 'equipment' },
        { id: '3', key: 'hr_manager_id', value: '', description: '人事负责人ID', category: 'hr' },
        { id: '4', key: 'daily_report_reminder_time', value: '18:00', description: '日报提醒时间', category: 'notification' },
        { id: '5', key: 'progress_check_interval', value: '60', description: '进度检查间隔(分钟)', category: 'notification' },
        { id: '6', key: 'deviation_threshold_warning', value: '5', description: '进度偏离预警阈值(%)', category: 'notification' },
        { id: '7', key: 'deviation_threshold_severe', value: '15', description: '进度偏离严重阈值(%)', category: 'notification' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(editedValues)) {
        const config = configs.find(c => c.key === key)
        if (config) {
          await fetch(`${API_URL.DATA}/system_configs/${config.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
          })
        }
      }
      alert('配置保存成功')
      setEditedValues({})
      loadConfigs()
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }))
  }

  const getValue = (config: SystemConfig) => {
    return editedValues[config.key] !== undefined ? editedValues[config.key] : config.value
  }

  const categories = [
    { key: 'general', label: '常规设置', icon: '⚙️' },
    { key: 'notification', label: '通知设置', icon: '🔔' },
    { key: 'purchase', label: '采购设置', icon: '🛒' },
    { key: 'equipment', label: '设备设置', icon: '📦' },
    { key: 'hr', label: '人事设置', icon: '👥' },
  ]

  const filteredConfigs = configs.filter(c => c.category === activeCategory || activeCategory === 'general')

  const hasChanges = Object.keys(editedValues).length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-500 mt-1">配置系统参数和业务规则</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4">
            <nav className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredConfigs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">暂无配置项</div>
                ) : (
                  filteredConfigs.map(config => (
                    <div key={config.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">
                            {config.description}
                          </label>
                          <p className="text-xs text-gray-400 mt-1">{config.key}</p>
                        </div>
                        <div className="ml-4 w-64">
                          <input
                            type="text"
                            value={getValue(config)}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {hasChanges && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setEditedValues({})}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 mr-3"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            )}
          </div>

          {activeCategory === 'notification' && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">定时任务状态</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">进度偏离检查</p>
                    <p className="text-sm text-gray-500">每小时自动执行</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await fetch(API_URL.NOTIFICATIONS.SCHEDULER_TRIGGER, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_type: 'progress_check' })
                      })
                      if (res.ok) alert('执行成功')
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    立即执行
                  </button>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">日报提醒</p>
                    <p className="text-sm text-gray-500">每天18:00自动执行</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await fetch(API_URL.NOTIFICATIONS.SCHEDULER_TRIGGER, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_type: 'daily_report_reminder' })
                      })
                      if (res.ok) alert('执行成功')
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    立即执行
                  </button>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">设备维护检查</p>
                    <p className="text-sm text-gray-500">每天09:00自动执行</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await fetch(API_URL.NOTIFICATIONS.SCHEDULER_TRIGGER, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_type: 'equipment_maintenance_check' })
                      })
                      if (res.ok) alert('执行成功')
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    立即执行
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
