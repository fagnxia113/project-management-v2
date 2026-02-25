import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Employee {
  id: string
  employee_no: string
  name: string
  gender: 'male' | 'female'
  phone: string
  email: string
  user_id: string | null
  department_id: string | null
  position: string
  position_name?: string
  department_name?: string
  status: 'active' | 'resigned' | 'probation'
  current_status: 'on_duty' | 'leave' | 'business_trip' | 'other'
  hire_date: string
  leave_date: string | null
  role: 'admin' | 'project_manager' | 'hr_manager' | 'equipment_manager' | 'implementer' | 'user'
  daily_cost: number
  skills: any
  avatar_color: string
  created_at: string
  updated_at: string
}

interface Department {
  id: string
  name: string
}

interface Position {
  id: string
  name: string
}

interface User {
  id: string
  role: string
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Employee>>({})

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadEmployeeData()
      loadPositions()
      loadDepartments()
    }
  }, [id])

  const loadEmployeeData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const response = await fetch(`${API_URL.DATA('Employee')}/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        throw new Error('加载员工信息失败')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setEmployee(result.data)
        setEditForm(result.data)
      } else {
        throw new Error('员工不存在')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.ORGANIZATION.POSITIONS}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setPositions(result.data)
        }
      }
    } catch (err) {
      console.error('加载岗位列表失败:', err)
    }
  }

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.ORGANIZATION.DEPARTMENTS}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setDepartments(result.data)
        }
      }
    } catch (err) {
      console.error('加载部门列表失败:', err)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm(employee || {})
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}/${id}`, {
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
        setEmployee(result.data)
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
    if (!confirm(`确定要删除员工 "${employee?.name}" 吗？此操作不可恢复！`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}/${id}`, {
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
      navigate('/personnel')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return '-'
    const labels: Record<string, string> = {
      male: '男',
      female: '女'
    }
    return labels[gender] || gender
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      active: { label: '在职', color: 'bg-green-100 text-green-700' },
      resigned: { label: '离职', color: 'bg-gray-100 text-gray-700' },
      probation: { label: '试用期', color: 'bg-yellow-100 text-yellow-700' }
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const getCurrentStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      on_duty: { label: '在岗', color: 'bg-blue-100 text-blue-700' },
      leave: { label: '请假', color: 'bg-orange-100 text-orange-700' },
      business_trip: { label: '出差', color: 'bg-purple-100 text-purple-700' },
      other: { label: '其他', color: 'bg-gray-100 text-gray-700' }
    }
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '管理员',
      project_manager: '项目经理',
      hr_manager: 'HR经理',
      equipment_manager: '设备经理',
      implementer: '实施人员',
      user: '普通用户'
    }
    return labels[role] || role
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'root'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700 mb-4">{error || '员工不存在'}</p>
          <button
            onClick={() => navigate('/personnel')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回员工列表
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusLabel(employee.status)
  const currentStatusInfo = getCurrentStatusLabel(employee.current_status)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/personnel')}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 返回员工列表
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">员工详情</h1>
            <div className="flex space-x-2">
              {isAdmin && (
                <>
                  {!isEditing ? (
                    <>
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                      >
                        取消
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4"
                    style={{ backgroundColor: employee.avatar_color || '#3B82F6' }}
                  >
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.employee_no}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="text-sm text-gray-500">姓名</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">性别</label>
                    {isEditing ? (
                      <select
                        value={editForm.gender || ''}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as 'male' | 'female' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="">请选择</option>
                        <option value="male">男</option>
                        <option value="female">女</option>
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{getGenderLabel(employee.gender)}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">状态</label>
                    {isEditing ? (
                      <select
                        value={editForm.status || ''}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'resigned' | 'probation' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="active">在职</option>
                        <option value="resigned">离职</option>
                        <option value="probation">试用期</option>
                      </select>
                    ) : (
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">当前状态</label>
                    {isEditing ? (
                      <select
                        value={editForm.current_status || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_status: e.target.value as 'on_duty' | 'leave' | 'business_trip' | 'other' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="on_duty">在岗</option>
                        <option value="leave">请假</option>
                        <option value="business_trip">出差</option>
                        <option value="other">其他</option>
                      </select>
                    ) : (
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${currentStatusInfo.color}`}>
                          {currentStatusInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">角色</label>
                    {isEditing ? (
                      <select
                        value={editForm.role || ''}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                        <option value="project_manager">项目经理</option>
                        <option value="hr_manager">HR经理</option>
                        <option value="equipment_manager">设备经理</option>
                        <option value="implementer">实施人员</option>
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{getRoleLabel(employee.role)}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">入职日期</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.hire_date?.split('T')[0] || ''}
                        onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{formatDate(employee.hire_date)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">联系方式</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">手机号码</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{employee.phone || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">邮箱</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{employee.email || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">部门</label>
                  {isEditing ? (
                    <select
                      value={editForm.department_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                      <option value="">请选择部门</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{employee.department_name || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">岗位</label>
                  {isEditing ? (
                    <select
                      value={editForm.position || ''}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                      <option value="">请选择岗位</option>
                      {positions.map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{employee.position_name || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">日成本</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.daily_cost || 0}
                      onChange={(e) => setEditForm({ ...editForm, daily_cost: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(employee.daily_cost)}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">员工ID</label>
                  <div className="text-sm font-medium text-gray-900">{employee.id}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">用户ID</label>
                  <div className="text-sm font-medium text-gray-900">{employee.user_id || '-'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <div className="text-sm font-medium text-gray-900">{formatDate(employee.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">更新时间</label>
                  <div className="text-sm font-medium text-gray-900">{formatDate(employee.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
