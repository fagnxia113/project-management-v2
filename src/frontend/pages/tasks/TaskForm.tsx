import { useState, useEffect } from 'react'
import ModalDialog from '../../components/ModalDialog'
import { useState as useGlobalState } from 'react'

export interface TaskFormData {
  name: string
  status: string
  priority: string
  project_id: string
  assignee_id: string
  due_date: string
  description: string
}

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TaskFormData) => Promise<void>
  initialValues?: Partial<TaskFormData>
  mode: 'create' | 'edit'
  projects: string[]
  employees: string[]
}

export default function TaskForm({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  mode,
  projects,
  employees
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    status: 'todo',
    priority: 'medium',
    project_id: '',
    assignee_id: '',
    due_date: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        status: initialValues.status || 'todo',
        priority: initialValues.priority || 'medium',
        project_id: initialValues.project_id || '',
        assignee_id: initialValues.assignee_id || '',
        due_date: initialValues.due_date || '',
        description: initialValues.description || ''
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
      title={mode === 'create' ? '新建任务' : '编辑任务'}
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
        {/* 任务名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            任务名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入任务名称"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 任务状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todo">待办</option>
              <option value="in_progress">进行中</option>
              <option value="review">审核中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              优先级 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="urgent">紧急</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 关联项目 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              关联项目
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">未关联项目</option>
              {projects.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* 指派给 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              指派给
            </label>
            <select
              value={formData.assignee_id}
              onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">未指派</option>
              {employees.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 截止日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            截止日期
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 任务描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            任务描述
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入任务描述"
          />
        </div>
      </form>
    </ModalDialog>
  )
}
