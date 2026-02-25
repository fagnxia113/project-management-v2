import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Project {
  id: string
  code: string
  name: string
  status: string
  progress: number
  start_date: string
  end_date: string
  manager: string
  tech_manager: string
  country: string
  address: string
  description: string
  budget: number
  customer_name: string
}

interface Phase {
  id: string
  phase_name: string
  status: string
  planned_start_date: string
  planned_end_date: string
  actual_start_date: string
  actual_end_date: string
  progress: number
  warning_level: string
  manager: string
}

interface Task {
  id: string
  code: string
  name: string
  status: string
  progress: number
  planned_start_date: string
  planned_end_date: string
  assignee: string
  wbs_code: string
  task_type: string
  parent_id: string | null
}

interface ProjectPersonnel {
  id: string
  employee_id: string
  employee_name: string
  department: string
  position: string
  on_duty_status: string
  transfer_in_date: string
  transfer_out_date: string | null
  notes: string
}

interface User {
  id: string
  role: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  proposal: { label: '立项', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  completed: { label: '已结项', color: 'green' },
  paused: { label: '暂停', color: 'orange' },
}

const PHASE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: '未开始', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  paused: { label: '已暂停', color: 'orange' },
}

const WARNING_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  warning: { label: '预警', color: 'orange' },
  severe: { label: '严重滞后', color: 'red' },
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [personnel, setPersonnel] = useState<ProjectPersonnel[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'tasks' | 'team'>('overview')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Project>>({})

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadProjectData()
    }
  }, [id])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const projectRes = await fetch(API_URL.PROJECTS.DETAIL(id!), {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (projectRes.ok) {
        const projectResult = await projectRes.json()
        setProject(projectResult.data)
        setEditForm(projectResult.data)
      }

      const structureRes = await fetch(API_URL.PROJECTS.STRUCTURE(id!), {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (structureRes.ok) {
        const structureResult = await structureRes.json()
        const allTasks: Task[] = structureResult.data || []
        setTasks(allTasks)

        const milestones = allTasks.filter(t => t.task_type === 'milestone').map(m => ({
          id: m.id,
          phase_name: m.name,
          status: m.status,
          planned_start_date: m.planned_start_date,
          planned_end_date: m.planned_end_date,
          actual_start_date: '',
          actual_end_date: '',
          progress: m.progress,
          warning_level: 'normal',
          manager: m.assignee || '无'
        }))
        setPhases(milestones)
      }

      const personnelRes = await fetch(`${API_URL.DATA('project_personnel')}?project_id=${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (personnelRes.ok) {
        const personnelData = await personnelRes.json()
        setPersonnel(personnelData.data || personnelData.items || personnelData || [])
      }
    } catch (error) {
      console.error('加载项目数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm(project || {})
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(API_URL.PROJECTS.DETAIL(id!), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setProject(result.data)
        setIsEditing(false)
        alert('保存成功')
      } else {
        throw new Error('保存失败')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定要删除项目 "${project?.name}" 吗？此操作不可恢复！`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(API_URL.PROJECTS.DETAIL(id!), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      alert('删除成功')
      navigate('/projects')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const renderGanttChart = () => {
    if (phases.length === 0) {
      return <div className="text-gray-500 text-center py-8">暂无阶段数据</div>
    }

    const today = new Date()
    const allDates = phases.flatMap(p => [new Date(p.planned_start_date), new Date(p.planned_end_date)])
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex border-b border-gray-200 pb-2 mb-4">
            <div className="w-48 flex-shrink-0 font-medium text-gray-600">阶段名称</div>
            <div className="flex-1 relative h-6">
              {Array.from({ length: Math.ceil(totalDays / 7) + 1 }).map((_, i) => {
                const date = new Date(minDate)
                date.setDate(date.getDate() + i * 7)
                const left = (i * 7 / totalDays) * 100
                return (
                  <div
                    key={i}
                    className="absolute text-xs text-gray-400"
                    style={{ left: `${left}%` }}
                  >
                    {date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </div>
                )
              })}
            </div>
          </div>

          {phases.map(phase => {
            const start = new Date(phase.planned_start_date)
            const end = new Date(phase.planned_end_date)
            const startOffset = (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
            const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
            const left = (startOffset / totalDays) * 100
            const width = (duration / totalDays) * 100

            const warningColor = WARNING_LABELS[phase.warning_level]?.color || 'blue'
            const statusColor = PHASE_STATUS_LABELS[phase.status]?.color || 'gray'

            return (
              <div key={phase.id} className="flex items-center mb-3">
                <div className="w-48 flex-shrink-0">
                  <div className="font-medium text-gray-800">{phase.phase_name}</div>
                  <div className="text-sm text-gray-500">{phase.progress}% 完成</div>
                </div>
                <div className="flex-1 relative h-8 bg-gray-100 rounded">
                  <div
                    className={`absolute h-full rounded cursor-pointer transition-all hover:opacity-80 ${statusColor === 'green' ? 'bg-green-500' :
                        statusColor === 'blue' ? 'bg-blue-500' :
                          statusColor === 'orange' ? 'bg-orange-500' : 'bg-gray-400'
                      }`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    title={`${phase.planned_start_date} ~ ${phase.planned_end_date}`}
                  >
                    <div
                      className="h-full bg-black bg-opacity-20 rounded"
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>
                  {today >= start && today <= end && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                      style={{ left: `${((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100}%` }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'root'

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  if (!project) {
    return <div className="text-center text-gray-500 py-8">项目不存在</div>
  }

  const statusInfo = STATUS_LABELS[project.status] || { label: project.status, color: 'gray' }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-700`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-gray-500 mt-1">项目编号: {project.code}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                {!isEditing ? (
                  <>
                    <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      编辑
                    </button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      删除
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      保存
                    </button>
                    <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                      取消
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>整体进度</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">项目经理</p>
            {isEditing ? (
              <input
                type="text"
                value={editForm.manager || ''}
                onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            ) : (
              <p className="font-medium">{project.manager || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">技术负责人</p>
            {isEditing ? (
              <input
                type="text"
                value={editForm.tech_manager || ''}
                onChange={(e) => setEditForm({ ...editForm, tech_manager: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            ) : (
              <p className="font-medium">{project.tech_manager || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">计划周期</p>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={editForm.start_date?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
                <input
                  type="date"
                  value={editForm.end_date?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              </div>
            ) : (
              <p className="font-medium">
                {project.start_date} ~ {project.end_date || '未定'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">预算金额</p>
            {isEditing ? (
              <input
                type="number"
                value={editForm.budget || 0}
                onChange={(e) => setEditForm({ ...editForm, budget: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            ) : (
              <p className="font-medium">{project.budget ? `¥${project.budget}万` : '-'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { key: 'overview', label: '项目概览' },
              { key: 'phases', label: '阶段甘特图' },
              { key: 'tasks', label: '任务列表' },
              { key: 'team', label: '项目团队' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">项目描述</h3>
              {isEditing ? (
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              ) : (
                <p className="text-gray-600 whitespace-pre-wrap">{project.description || '暂无描述'}</p>
              )}

              <h3 className="text-lg font-semibold mt-6 mb-4">阶段统计</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-gray-900">{phases.length}</p>
                  <p className="text-sm text-gray-500">总阶段数</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-600">
                    {phases.filter(p => p.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-gray-500">进行中</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-600">
                    {phases.filter(p => p.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-500">已完成</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-600">
                    {phases.filter(p => p.warning_level === 'severe').length}
                  </p>
                  <p className="text-sm text-gray-500">严重滞后</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phases' && renderGanttChart()}

          {activeTab === 'tasks' && (
            <div>
              {tasks.length === 0 ? (
                <div className="text-gray-500 text-center py-8">暂无任务数据</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WBS</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">负责人</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">进度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map(task => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{task.wbs_code}</td>
                        <td className="px-4 py-3 text-sm font-medium">{task.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{task.assignee || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{task.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">项目团队</h3>
              </div>

              {personnel.length === 0 ? (
                <div className="text-gray-500 text-center py-8">暂无项目人员</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {personnel.filter(p => p.on_duty_status === 'on_duty').map(p => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-lg">
                          {p.employee_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{p.employee_name}</div>
                        <div className="text-sm text-gray-500">{p.position}</div>
                        <div className="text-xs text-gray-400">{p.department}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          在岗
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {p.transfer_in_date} 调入
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {personnel.filter(p => p.on_duty_status !== 'on_duty').length > 0 && (
                <>
                  <h4 className="text-md font-semibold mt-6 mb-3 text-gray-600">已调出人员</h4>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">岗位</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">调入时间</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">调出时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {personnel.filter(p => p.on_duty_status !== 'on_duty').map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{p.employee_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{p.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{p.position}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{p.transfer_in_date}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{p.transfer_out_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
