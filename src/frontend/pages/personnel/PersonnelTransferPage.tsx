/**
 * 人员调拨申请页面
 * 功能：提交人员跨项目调拨申请
 */
import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface Employee {
  id: string
  name: string
  department: string
  position: string
  status: string
  current_project_id?: string
  current_project_name?: string
}

interface Project {
  id: string
  name: string
  status: string
}

export default function PersonnelTransferPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState({
    employee_id: '',
    from_project_id: '',
    to_project_id: '',
    transfer_type: 'project_transfer',
    reason: '',
    planned_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [empRes, projRes] = await Promise.all([
        fetch(`${API_URL.DATA}/employees`),
        fetch(`${API_URL.DATA}/projects`)
      ])
      
      if (empRes.ok) {
        const data = await empRes.json()
        setEmployees(data.items || data || [])
      }
      if (projRes.ok) {
        const data = await projRes.json()
        setProjects((data.items || data || []).filter((p: Project) => p.status === 'in_progress'))
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employee_id || !formData.to_project_id) {
      alert('请选择人员和目标项目')
      return
    }

    const employee = employees.find(e => e.id === formData.employee_id)
    const toProject = projects.find(p => p.id === formData.to_project_id)
    const token = localStorage.getItem('token')
    if (!token) { alert('请先登录'); return }

    setSubmitting(true)
    try {
      // 使用工作流API启动人员调拨流程
      const res = await fetch(`${API_URL.WORKFLOW.PROCESSES}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          definitionKey: 'personnel_transfer',
          title: `人员调拨申请 - ${employee?.name}`,
          businessKey: formData.employee_id,
          variables: {
            employeeId: formData.employee_id,
            employeeName: employee?.name,
            fromProjectId: formData.from_project_id,
            fromProjectName: employee?.current_project_name,
            toProjectId: formData.to_project_id,
            toProjectName: toProject?.name,
            transferType: formData.transfer_type,
            reason: formData.reason,
            plannedDate: formData.planned_date
          }
        })
      })

      if (res.ok) {
        alert('调拨申请已提交，等待审批')
        setFormData({
          employee_id: '',
          from_project_id: '',
          to_project_id: '',
          transfer_type: 'project_transfer',
          reason: '',
          planned_date: new Date().toISOString().split('T')[0]
        })
      } else {
        const err = await res.json()
        alert('提交失败: ' + (err.message || '未知错误'))
      }
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败: ' + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedEmployee = employees.find(e => e.id === formData.employee_id)

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">人员调拨申请</h1>
        <p className="text-gray-500 mt-1">申请将人员从一个项目调动到另一个项目</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* 选择人员 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            调拨人员 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.employee_id}
            onChange={(e) => {
              const emp = employees.find(emp => emp.id === e.target.value)
              setFormData({
                ...formData,
                employee_id: e.target.value,
                from_project_id: emp?.current_project_id || ''
              })
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择人员</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} - {emp.department} ({emp.status === 'occupied' ? '占用中' : emp.status === 'idle' ? '空闲' : emp.status})
              </option>
            ))}
          </select>
          {selectedEmployee && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
              <p><span className="text-gray-500">当前项目：</span>{selectedEmployee.current_project_name || '未分配'}</p>
              <p><span className="text-gray-500">状态：</span>{selectedEmployee.status}</p>
            </div>
          )}
        </div>

        {/* 目标项目 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            目标项目 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.to_project_id}
            onChange={(e) => setFormData({ ...formData, to_project_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择目标项目</option>
            {projects.filter(p => p.id !== formData.from_project_id).map(proj => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>
        </div>

        {/* 计划日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            计划调动日期
          </label>
          <input
            type="date"
            value={formData.planned_date}
            onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 调动原因 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            调动原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="请说明调动原因"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交申请'}
          </button>
        </div>
      </form>
    </div>
  )
}
