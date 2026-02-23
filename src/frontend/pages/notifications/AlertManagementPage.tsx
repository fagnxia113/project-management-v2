import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface ProgressAlert {
  id: string
  project_id: string
  project_name: string
  entity_type: 'project' | 'phase' | 'task'
  entity_name: string
  planned_progress: number
  actual_progress: number
  deviation: number
  deviation_threshold: number
  alert_level: 'warning' | 'severe'
  status: 'active' | 'acknowledged' | 'resolved'
  manager_name: string
  created_at: string
  acknowledged_at: string
  resolved_at: string
  resolution_note: string
}

const entityTypeLabels: Record<string, string> = {
  'project': '项目',
  'phase': '阶段',
  'task': '任务'
}

const alertLevelLabels: Record<string, string> = {
  'warning': '预警',
  'severe': '严重'
}

const alertLevelColors: Record<string, string> = {
  'warning': 'bg-orange-100 text-orange-700',
  'severe': 'bg-red-100 text-red-700'
}

const statusLabels: Record<string, string> = {
  'active': '活动中',
  'acknowledged': '已确认',
  'resolved': '已解决'
}

const statusColors: Record<string, string> = {
  'active': 'bg-red-100 text-red-700',
  'acknowledged': 'bg-yellow-100 text-yellow-700',
  'resolved': 'bg-green-100 text-green-700'
}

export default function AlertManagementPage() {
  const [alerts, setAlerts] = useState<ProgressAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedAlert, setSelectedAlert] = useState<ProgressAlert | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  useEffect(() => {
    loadAlerts()
  }, [statusFilter])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const url = statusFilter 
        ? `${API_URL.NOTIFICATIONS.ALERTS}?status=${statusFilter}`
        : API_URL.NOTIFICATIONS.ALERTS
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.data || [])
      }
    } catch (error) {
      console.error('加载预警失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (id: string) => {
    try {
      await fetch(API_URL.NOTIFICATIONS.ALERT_ACKNOWLEDGE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: 'current-user' })
      })
      loadAlerts()
      setSelectedAlert(null)
    } catch (error) {
      console.error('确认预警失败:', error)
    }
  }

  const handleResolve = async (id: string) => {
    if (!resolutionNote.trim()) {
      alert('请填写解决说明')
      return
    }
    try {
      await fetch(API_URL.NOTIFICATIONS.ALERT_RESOLVE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_note: resolutionNote })
      })
      loadAlerts()
      setSelectedAlert(null)
      setResolutionNote('')
    } catch (error) {
      console.error('解决预警失败:', error)
    }
  }

  const handleCheckProgress = async () => {
    try {
      const res = await fetch(API_URL.NOTIFICATIONS.ALERT_CHECK, { method: 'POST' })
      if (res.ok) {
        alert('进度检查完成')
        loadAlerts()
      }
    } catch (error) {
      console.error('执行检查失败:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">预警管理</h1>
          <p className="text-gray-500 mt-1">进度偏离预警和异常监控</p>
        </div>
        <button
          onClick={handleCheckProgress}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          执行进度检查
        </button>
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
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暂无预警</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">项目</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">偏离</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">级别</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">负责人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {alerts.map(alert => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{alert.project_name}</td>
                  <td className="px-4 py-3 text-sm">{entityTypeLabels[alert.entity_type]}</td>
                  <td className="px-4 py-3 text-sm font-medium">{alert.entity_name}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">-{alert.deviation}%</span>
                      <div className="text-xs text-gray-500">
                        计划 {alert.planned_progress}% / 实际 {alert.actual_progress}%
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${alertLevelColors[alert.alert_level]}`}>
                      {alertLevelLabels[alert.alert_level]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${statusColors[alert.status]}`}>
                      {statusLabels[alert.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{alert.manager_name}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">预警详情</h2>
              <button
                onClick={() => {
                  setSelectedAlert(null)
                  setResolutionNote('')
                }}
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
                  <label className="text-sm text-gray-500">项目</label>
                  <p className="font-medium">{selectedAlert.project_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">类型</label>
                  <p>{entityTypeLabels[selectedAlert.entity_type]}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">名称</label>
                  <p className="font-medium">{selectedAlert.entity_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">负责人</label>
                  <p>{selectedAlert.manager_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">计划进度</label>
                  <p>{selectedAlert.planned_progress}%</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">实际进度</label>
                  <p>{selectedAlert.actual_progress}%</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">偏离程度</label>
                  <p className="text-red-600 font-medium">-{selectedAlert.deviation}%</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">预警级别</label>
                  <p>
                    <span className={`px-2 py-1 text-xs rounded ${alertLevelColors[selectedAlert.alert_level]}`}>
                      {alertLevelLabels[selectedAlert.alert_level]}
                    </span>
                  </p>
                </div>
              </div>
              
              {selectedAlert.status !== 'active' && (
                <div>
                  <label className="text-sm text-gray-500">解决说明</label>
                  <p className="mt-1">{selectedAlert.resolution_note || '-'}</p>
                </div>
              )}

              {selectedAlert.status === 'active' && (
                <div>
                  <label className="text-sm text-gray-500">解决说明</label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1"
                    placeholder="请说明解决方案..."
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              {selectedAlert.status === 'active' && (
                <>
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    确认预警
                  </button>
                  <button
                    onClick={() => handleResolve(selectedAlert.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    标记已解决
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedAlert(null)
                  setResolutionNote('')
                }}
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
