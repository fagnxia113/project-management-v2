import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface Project {
  id: string
  name: string
  type: string
  status: string
  country: string
  start_date: string
  end_date: string | null
  description: string | null
  created_at: string
}

interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadProjects()
  }, [page, searchTerm])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`${API_URL.PROJECTS.LIST}?${params}`)
      const result = await response.json()

      if (result.success) {
        setProjects(result.data || [])
        setTotalPages(result.totalPages || 1)
      }
    } catch (error) {
      console.error('加载项目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  // 删除项目
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此项目吗？')) return

    try {
      const response = await fetch(`${API_URL.DATA}/projects/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadProjects()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除项目失败:', error)
      alert('删除失败')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      proposal: 'bg-yellow-100 text-yellow-700',
      planning: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-green-100 text-green-700',
      paused: 'bg-gray-100 text-gray-700',
      delayed: 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      proposal: '提案中',
      planning: '规划中',
      in_progress: '进行中',
      completed: '已完成',
      paused: '已暂停',
      delayed: '已延期'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.proposal}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      domestic: '国内',
      foreign: '海外',
      rd: '研发',
      service: '服务'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索项目名称..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            搜索
          </button>
        </form>
        <button
          onClick={() => { window.history.pushState({}, '', '/projects/new'); window.dispatchEvent(new PopStateEvent('popstate')); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          + 新建项目
        </button>
      </div>

      {/* 项目列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? '未找到匹配的项目' : '暂无项目数据，点击上方按钮创建新项目'}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">项目名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">国家</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始日期</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500">{project.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{getTypeBadge(project.type)}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{project.country}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{project.start_date}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    第 {page} 页，共 {totalPages} 页
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
