import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import DataTable, { Pagination, SearchBox } from '../../components/DataTable'
import { API_URL } from '../../config/api'

interface Employee {
  id: string
  employee_no: string
  name: string
  position: string
  department_id: string
  email: string | null
  phone: string | null
  status: string
  created_at: string
}

interface Position {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function PersonnelListPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '', gender: 'male', phone: '', email: '', department: '', position: '', hire_date: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '', phone: '', email: '', department: '', position: '', status: 'active'
  })
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }
    loadEmployees()
    loadPositions()
    loadDepartments()
  }, [page, searchTerm])

  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Position')}?pageSize=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      const result = await response.json()
      setPositions(result.data || [])
    } catch (error) {
      console.error('加载岗位失败:', error)
    }
  }

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Department')}?pageSize=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      const result = await response.json()
      setDepartments(result.data || [])
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }

  const getPositionName = (positionId: string) => {
    const position = positions.find(p => p.id === positionId)
    return position?.name || positionId
  }

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId)
    return department?.name || departmentId
  }

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm })
      })

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      const result: ApiResponse<Employee> = await response.json()

      setEmployees(result.data || [])
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch (error) {
      console.error('加载人员失败:', error)
    } finally {
      setLoading(false)
    }
  }

const handleSearch = () => {
    setPage(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.phone || !formData.department || !formData.position || !formData.hire_date) {
      alert('请填写所有必填字段')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL.DATA('Employee')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          id: uuidv4(),
          employee_no: `YG-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
          name: formData.name,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email || null,
          department: formData.department,
          position: formData.position,
          hire_date: formData.hire_date,
          status: 'active',
          current_status: 'on_duty'
        })
      })
if (response.ok) {
        setShowModal(false)
        setFormData({ name: '', gender: 'male', phone: '', email: '', department: '', position: '', hire_date: '' })
        loadEmployees()
        alert('员工创建成功！')
      } else {
        const error = await response.json()
        console.error('创建员工失败:', error)
        alert('创建失败: ' + (error.error || error.message || JSON.stringify(error)))
      }
    } catch (error) {
      console.error('创建员工失败:', error)
      alert('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      on_leave: 'bg-yellow-100 text-yellow-700'
    }
    const labels: Record<string, string> = {
      active: '在职',
      inactive: '离职',
      on_leave: '休假'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getPositionBadge = (position: string) => {
    const labels: Record<string, string> = {
      manager: '项目经理',
      engineer: '工程师',
      worker: '工人',
      driver: '司机'
    }
    return labels[position] || position
  }

  const canEditEmployee = () => {
    return currentUser?.role === 'admin' || currentUser?.role === 'root'
  }

  const canViewEmployeeDetail = (employee: Employee) => {
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'root'
    if (isAdmin) return true
    return employee.id === currentUser?.employee_id
  }

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`确定要删除员工 "${employee.name}" 吗？此操作不可恢复！`)) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}/${employee.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        alert('删除成功')
        loadEmployees()
      } else {
        const error = await response.json()
        alert('删除失败: ' + (error.error || error.message || '未知错误'))
      }
    } catch (error) {
      console.error('删除员工失败:', error)
      alert('删除失败')
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setEditFormData({
      name: employee.name,
      phone: employee.phone || '',
      email: employee.email || '',
      department: employee.department,
      position: employee.position,
      status: employee.status
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}/${editingEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          name: editFormData.name,
          phone: editFormData.phone || null,
          email: editFormData.email || null,
          department: editFormData.department,
          position: editFormData.position,
          status: editFormData.status
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingEmployee(null)
        loadEmployees()
        alert('更新成功')
      } else {
        const error = await response.json()
        alert('更新失败: ' + (error.error || error.message || '未知错误'))
      }
    } catch (error) {
      console.error('更新员工失败:', error)
      alert('更新失败')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('警告：此操作将清空所有员工数据！\n\n确定要继续吗？')) return
    if (!confirm('再次确认：您真的要删除所有员工数据吗？此操作不可恢复！')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}/clear-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        alert('所有员工数据已清空')
        loadEmployees()
      } else {
        const error = await response.json()
        alert('清空失败: ' + (error.error || error.message || '未知错误'))
      }
    } catch (error) {
      console.error('清空员工数据失败:', error)
      alert('清空失败')
    }
  }

  const columns = [
    {
      key: 'employee_no' as keyof Employee,
      header: '员工工号',
      width: '150px'
    },
    {
      key: 'name' as keyof Employee,
      header: '姓名',
      render: (value: string, row: Employee) => {
        if (canViewEmployeeDetail(row)) {
          return (
            <button
              onClick={() => window.location.href = `/personnel/${row.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {value}
            </button>
          )
        }
        return <span className="text-gray-700 font-medium">{value}</span>
      }
    },
    {
      key: 'position' as keyof Employee,
      header: '职位',
      render: (value: string) => getPositionName(value)
    },
    {
      key: 'department_id' as keyof Employee,
      header: '部门',
      render: (value: string) => getDepartmentName(value)
    },
    {
      key: 'email' as keyof Employee,
      header: '邮箱',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'phone' as keyof Employee,
      header: '电话',
      render: (value: string | null) => value || '-'
    },
    {
      key: 'status' as keyof Employee,
      header: '状态',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'actions' as keyof Employee,
      header: '操作',
      render: (_value: string, row: Employee) => (
        <div className="space-x-2">
          {canEditEmployee() && (
            <>
              <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 text-sm">编辑</button>
              <button onClick={() => handleDelete(row)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
            </>
          )}
          {!canEditEmployee() && (
            <span className="text-gray-400 text-sm">仅查看</span>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">人员管理</h1>
            <p className="mt-1 text-sm text-gray-600">查看所有员工信息（仅管理员可编辑）</p>
          </div>
          <div className="flex gap-2">
            {canEditEmployee() && (
              <button onClick={handleClearAll} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">清空所有</button>
            )}
            <button onClick={() => window.location.href = '/personnel/onboard'} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">+ 入职申请</button>
            <button onClick={() => window.location.href = '/approvals'} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">离职申请</button>
          </div>
        </div>

        <SearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="搜索员工..."
          onSearch={handleSearch}
        />

        <DataTable
          data={employees}
          columns={columns}
          loading={loading}
          emptyMessage={searchTerm ? '未找到匹配的员工' : '暂无员工数据，请通过入职申请创建'}
          rowKey="id"
        />

{!loading && totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        )}

      {/* 编辑员工弹窗 */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">编辑员工</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <input
                  type="text"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
                <input
                  type="text"
                  value={editFormData.position}
                  onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="active">在职</option>
                  <option value="inactive">离职</option>
                  <option value="on_leave">休假</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


