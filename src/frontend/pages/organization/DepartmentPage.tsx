import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface Department {
  id: string
  code: string
  name: string
  parent_id?: string
  manager_id?: string
  manager_name?: string
  level: number
  path?: string
  sort_order: number
  status: 'active' | 'inactive'
  description?: string
  employee_count?: number
  children?: Department[]
}

interface DepartmentFormData {
  name: string
  parent_id: string
  manager_id: string
  sort_order: number
  description: string
}

const DepartmentPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    parent_id: '',
    manager_id: '',
    sort_order: 0,
    description: ''
  })

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL.ORGANIZATION.DEPARTMENT_TREE, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setDepartments(data.data)
      }
    } catch (error) {
      console.error('加载部门列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        parent_id: dept.parent_id || '',
        manager_id: dept.manager_id || '',
        sort_order: dept.sort_order,
        description: dept.description || ''
      })
    } else {
      setEditingDept(null)
      setFormData({
        name: '',
        parent_id: '',
        manager_id: '',
        sort_order: 0,
        description: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDept(null)
    setFormData({
      name: '',
      parent_id: '',
      manager_id: '',
      sort_order: 0,
      description: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingDept
        ? API_URL.ORGANIZATION.DEPARTMENT_DETAIL(editingDept.id)
        : API_URL.ORGANIZATION.DEPARTMENTS
      const method = editingDept ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null,
          manager_id: formData.manager_id || null
        })
      })

      const data = await response.json()
      if (data.success) {
        handleCloseModal()
        loadDepartments()
      } else {
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('保存部门失败:', error)
      alert('保存失败，请重试')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个部门吗？')) return

    try {
      const response = await fetch(API_URL.ORGANIZATION.DEPARTMENT_DETAIL(id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        loadDepartments()
      } else {
        alert(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除部门失败:', error)
      alert('删除失败，请重试')
    }
  }

  const renderDepartmentTree = (depts: Department[], level: number = 0) => {
    return depts.map(dept => (
      <div key={dept.id} className="border-b border-gray-200 last:border-b-0">
        <div 
          className={`flex items-center justify-between p-4 hover:bg-gray-50 ${level > 0 ? 'pl-' + (8 + level * 6) : ''}`}
        >
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 text-sm w-24">{dept.code}</span>
            <span className="font-medium">{dept.name}</span>
            {dept.manager_name && (
              <span className="text-gray-500 text-sm">负责人: {dept.manager_name}</span>
            )}
            <span className="text-gray-400 text-sm">
              {dept.employee_count || 0} 人
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${
              dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {dept.status === 'active' ? '正常' : '停用'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenModal(dept)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              编辑
            </button>
            <button
              onClick={() => handleDelete(dept.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              删除
            </button>
          </div>
        </div>
        {dept.children && dept.children.length > 0 && (
          <div className="border-l-2 border-gray-100 ml-6">
            {renderDepartmentTree(dept.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">部门管理</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增部门
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="w-24">部门编号</span>
            <span>部门名称</span>
          </div>
        </div>
        {departments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无部门数据</div>
        ) : (
          renderDepartmentTree(departments)
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingDept ? '编辑部门' : '新增部门'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  部门名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上级部门
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">无（顶级部门）</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id} disabled={editingDept?.id === dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

export default DepartmentPage
