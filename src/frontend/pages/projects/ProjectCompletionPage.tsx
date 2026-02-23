/**
 * 项目结项申请页面
 */
import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface Project {
  id: string
  name: string
  status: string
  progress: number
  manager: string
  planned_end_date: string
}

export default function ProjectCompletionPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    project_id: '',
    completion_date: new Date().toISOString().split('T')[0],
    summary: '',
    deliverables: '',
    achievements: '',
    lessons_learned: '',
    remarks: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL.DATA}/projects`)
      if (res.ok) {
        const data = await res.json()
        setProjects((data.items || data || []).filter((p: Project) => p.status === 'in_progress'))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.project_id) { alert('请选择项目'); return }
    
    const project = projects.find(p => p.id === formData.project_id)
    const token = localStorage.getItem('token')
    if (!token) { alert('请先登录'); return }
    
    setSubmitting(true)
    try {
      // 使用工作流API启动项目结项流程
      const res = await fetch(`${API_URL.WORKFLOW.PROCESSES}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          definitionKey: 'project_completion',
          title: `项目结项申请 - ${project?.name}`,
          businessKey: formData.project_id,
          variables: {
            projectId: formData.project_id,
            projectName: project?.name,
            completionDate: formData.completion_date,
            summary: formData.summary,
            deliverables: formData.deliverables,
            achievements: formData.achievements,
            lessonsLearned: formData.lessons_learned,
            remarks: formData.remarks
          }
        })
      })
      if (res.ok) { 
        alert('结项申请已提交')
        setFormData({ project_id: '', completion_date: new Date().toISOString().split('T')[0], summary: '', deliverables: '', achievements: '', lessons_learned: '', remarks: '' })
      }
      else { 
        const err = await res.json()
        alert('提交失败: ' + (err.message || '未知错误'))
      }
    } catch (e) { 
      alert('提交失败: ' + (e as Error).message)
    }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex justify-center items-center h-64">加载中...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">项目结项申请</h1>
        <p className="text-gray-500 mt-1">提交项目结项申请，审批通过后将更新项目状态</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择项目 <span className="text-red-500">*</span></label>
          <select value={formData.project_id} onChange={(e) => setFormData({...formData, project_id: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
            <option value="">请选择项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.progress}%)</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">结项日期 <span className="text-red-500">*</span></label>
          <input type="date" value={formData.completion_date} onChange={(e) => setFormData({...formData, completion_date: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">项目总结 <span className="text-red-500">*</span></label>
          <textarea value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required placeholder="请填写项目总结..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">交付成果</label>
          <textarea value={formData.deliverables} onChange={(e) => setFormData({...formData, deliverables: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="列出主要交付成果..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">主要成果与收获</label>
          <textarea value={formData.achievements} onChange={(e) => setFormData({...formData, achievements: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">经验教训</label>
          <textarea value={formData.lessons_learned} onChange={(e) => setFormData({...formData, lessons_learned: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => window.history.back()} className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
          <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? '提交中...' : '提交申请'}</button>
        </div>
      </form>
    </div>
  )
}
