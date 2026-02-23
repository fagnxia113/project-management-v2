import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Equipment {
  id: string
  name: string
  manage_code: string
  model: string
  location_status: string
  project_id: string
  project_name: string
  use_status: string
}

interface Project {
  id: string
  name: string
  status: string
}

export default function EquipmentReturnPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectEquipment(selectedProject)
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL.DATA}/projects?status=in_progress,delayed,completed`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.items || data || [])
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjectEquipment = async (projectId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL.DATA}/equipment?project_id=${projectId}&location_status=in_project`)
      if (res.ok) {
        const data = await res.json()
        setEquipment(data.items || data || [])
      }
    } catch (error) {
      console.error('加载设备失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedEquipment.length === equipment.length) {
      setSelectedEquipment([])
    } else {
      setSelectedEquipment(equipment.map(e => e.id))
    }
  }

  const handleSelectEquipment = (id: string) => {
    if (selectedEquipment.includes(id)) {
      setSelectedEquipment(selectedEquipment.filter(e => e !== id))
    } else {
      setSelectedEquipment([...selectedEquipment, id])
    }
  }

  const handleSubmit = async () => {
    if (selectedEquipment.length === 0) {
      alert('请选择要归还的设备')
      return
    }

    if (!confirm(`确定要归还 ${selectedEquipment.length} 台设备吗？`)) {
      return
    }

    setSubmitting(true)
    try {
      // 批量更新设备状态
      for (const equipmentId of selectedEquipment) {
        await fetch(`${API_URL.DATA}/equipment/${equipmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_status: 'warehouse',
            project_id: null,
            project_name: null,
            use_status: 'idle'
          })
        })
      }

      alert('设备归还成功')
      navigate('/equipment')
    } catch (error) {
      console.error('归还失败:', error)
      alert('归还失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">设备归还</h1>
        <p className="text-gray-500 mt-1">项目结束后将设备归还至仓库</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择项目</label>
        <select
          value={selectedProject}
          onChange={(e) => {
            setSelectedProject(e.target.value)
            setSelectedEquipment([])
          }}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">请选择项目</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.status === 'completed' ? '已完成' : project.status === 'in_progress' ? '进行中' : '延期'})
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">项目设备列表</h2>
              <p className="text-sm text-gray-500">
                共 {equipment.length} 台设备在项目中
              </p>
            </div>
            {equipment.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {selectedEquipment.length === equipment.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : equipment.length === 0 ? (
            <div className="p-8 text-center text-gray-500">该项目没有在用设备</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEquipment.length === equipment.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备编号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {equipment.map(item => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedEquipment.includes(item.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => handleSelectEquipment(item.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedEquipment.includes(item.id)}
                        onChange={() => handleSelectEquipment(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{item.manage_code}</td>
                    <td className="px-4 py-3 text-sm">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.model || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.use_status === 'in_use' ? 'bg-green-100 text-green-700' :
                        item.use_status === 'idle' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.use_status === 'in_use' ? '使用中' : item.use_status === 'idle' ? '空闲' : item.use_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedEquipment.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                已选择 <span className="font-medium">{selectedEquipment.length}</span> 台设备
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认归还'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
