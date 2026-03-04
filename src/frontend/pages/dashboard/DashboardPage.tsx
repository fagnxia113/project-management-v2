import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface DashboardStats {
  projects: { total: number; inProgress: number; completed: number; delayed: number }
  tasks: { total: number; pending: number; inProgress: number; completed: number }
  equipment: { total: number; inWarehouse: number; inProject: number; repairing: number }
  approvals: { pending: number; todayApproved: number }
  dailyReports: { submitted: number; unsubmitted: number; submissionRate: number }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    projects: { total: 0, inProgress: 0, completed: 0, delayed: 0 },
    tasks: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    equipment: { total: 0, inWarehouse: 0, inProject: 0, repairing: 0 },
    approvals: { pending: 0, todayApproved: 0 },
    dailyReports: { submitted: 0, unsubmitted: 0, submissionRate: 0 }
  })
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      const fetchWithTimeout = async (url: string, timeout: number = 3000) => {
        return Promise.race([
          fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), timeout))
        ])
      }
      
      const [projRes, equipRes, alertsRes, reportsRes] = await Promise.allSettled([
        fetchWithTimeout(API_URL.PROJECTS.LIST + '?pageSize=5'),
        fetchWithTimeout(API_URL.BASE + '/api/equipment/instances?pageSize=1'),
        fetchWithTimeout(API_URL.NOTIFICATIONS.ALERTS + '?status=active'),
        fetchWithTimeout(API_URL.NOTIFICATIONS.DAILY_REPORT_STATISTICS)
      ])

      if (projRes.status === 'fulfilled' && projRes.value instanceof Response && projRes.value.ok) {
        const data = await projRes.value.json()
        setRecentProjects(data.data || [])
        setStats(prev => ({
          ...prev,
          projects: {
            total: data.total || 0,
            inProgress: (data.data || []).filter((p: any) => p.status === 'in_progress').length,
            completed: (data.data || []).filter((p: any) => p.status === 'completed').length,
            delayed: (data.data || []).filter((p: any) => p.status === 'delayed').length
          }
        }))
      }

      if (equipRes.status === 'fulfilled' && equipRes.value instanceof Response && equipRes.value.ok) {
        const data = await equipRes.value.json()
        setStats(prev => ({
          ...prev,
          equipment: {
            total: data.total || 0,
            inWarehouse: 0,
            inProject: 0,
            repairing: 0
          }
        }))
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value instanceof Response && alertsRes.value.ok) {
        const data = await alertsRes.value.json()
        setWarnings(data.data || [])
      }

      if (reportsRes.status === 'fulfilled' && reportsRes.value instanceof Response && reportsRes.value.ok) {
        const data = await reportsRes.value.json()
        if (data.success) {
          setStats(prev => ({
            ...prev,
            dailyReports: {
              submitted: data.data.total_submitted,
              unsubmitted: data.data.total_unsubmitted,
              submissionRate: data.data.submission_rate
            }
          }))
        }
      }

    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mesh p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">数字化控制中心</h1>
          <p className="text-slate-500 mt-2 font-medium">欢迎回来，这是您今日的项目运行概况</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">当前状态</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-semibold text-slate-700">系统运行正常</span>
            </div>
          </div>
          <button onClick={loadDashboardData} className="btn-secondary flex items-center gap-2 bg-white border border-slate-200">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            同步数据
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: '项目总数', value: stats.projects.total, sub: `进行中 ${stats.projects.inProgress}`, color: 'blue', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
          { label: '资产总量', value: stats.equipment.total, sub: '一物一码追踪中', color: 'indigo', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
          { label: '日报提交率', value: `${stats.dailyReports.submissionRate}%`, sub: `已提 ${stats.dailyReports.submitted} / 未提 ${stats.dailyReports.unsubmitted}`, color: 'emerald', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { label: '待办审批', value: stats.approvals.pending, sub: '需要您的关注', color: 'orange', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
        ].map((item, i) => (
          <div key={i} className="premium-card p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${item.color}-500/5 rounded-full transition-transform group-hover:scale-110`}></div>
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${item.color}-50 text-${item.color}-600 rounded-xl`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{item.value}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{item.sub}</span>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">活跃项目总览</h2>
            <button className="text-sm font-bold text-primary hover:underline">查看全部项目</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recentProjects.length > 0 ? recentProjects.map((project) => (
              <div key={project.id} onClick={() => window.location.href = `/projects/${project.id}`} className="premium-card p-5 cursor-pointer flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary font-bold text-lg">
                  {project.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{project.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-medium text-slate-400">ID: {project.code}</span>
                    <span className={`status-badge ${project.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                      {project.status === 'in_progress' ? '进行中' : project.status}
                    </span>
                  </div>
                </div>
                <div className="w-48">
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                    <span>当前进度</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="premium-card p-12 text-center text-slate-400">
                暂无活跃项目数据
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Warnings */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              智能预警
              {warnings.filter(w => w.status === 'active').length > 0 && <span className="flex h-2 w-2 rounded-full bg-red-500"></span>}
            </h2>
            <div className="space-y-3">
              {warnings.length > 0 ? warnings.map(warning => (
                <div key={warning.id} className={`p-4 rounded-2xl border ${warning.alert_level === 'severe' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'} animate-in slide-in-from-right-4`}>
                  <div className="flex gap-3">
                    <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center ${warning.alert_level === 'severe' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${warning.alert_level === 'severe' ? 'text-red-900' : 'text-amber-900'}`}>{warning.project_name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{warning.entity_name} {warning.alert_level === 'severe' ? '严重滞后' : '存在偏差'}</p>
                      <button className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">立即查看详情 →</button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs">暂无未确认预警</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">快捷入口</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '项目初始化', icon: 'M12 4v16m8-8H4', path: '/projects/new', bg: 'blue' },
                { label: '资产录入', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', path: '/equipment/inbound', bg: 'indigo' },
                { label: '任务看板', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 012-2h-2', path: '/tasks/board', bg: 'amber' },
                { label: '成本核算', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z', path: '/reports/dashboard', bg: 'emerald' }
              ].map((act, i) => (
                <button key={i} onClick={() => window.location.href = act.path} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all text-left flex flex-col gap-3 group">
                  <div className={`p-2 bg-${act.bg}-50 text-${act.bg}-600 rounded-lg w-fit transition-transform group-hover:scale-110`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={act.icon} /></svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{act.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
