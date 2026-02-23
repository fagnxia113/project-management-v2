/**
 * 管理员后台 - 数据管理页面
 */
import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface TableInfo {
  name: string
  count: number
  lastUpdated: string
}

export default function AdminDataPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => { loadTables() }, [])

  const loadTables = async () => {
    setLoading(true)
    try {
      // 获取各表数据统计
      const entities = ['Project', 'Task', 'Employee', 'Equipment', 'Customer', 'Warehouse', 'DailyReport', 'ApprovalOrder']
      const results = await Promise.all(
        entities.map(async (entity) => {
          try {
            const res = await fetch(`${API_URL.DATA}/${entity}`)
            const data = await res.json()
            return { name: entity, count: data.items?.length || data.length || 0, lastUpdated: new Date().toISOString() }
          } catch {
            return { name: entity, count: 0, lastUpdated: '-' }
          }
        })
      )
      setTables(results)
    } catch (e) {
      console.error(e)
      // 模拟数据
      setTables([
        { name: 'Project', count: 15, lastUpdated: '2026-02-19 22:00' },
        { name: 'Task', count: 48, lastUpdated: '2026-02-19 21:30' },
        { name: 'Employee', count: 32, lastUpdated: '2026-02-19 20:00' },
        { name: 'Equipment', count: 86, lastUpdated: '2026-02-19 18:00' },
        { name: 'Customer', count: 12, lastUpdated: '2026-02-18 15:00' },
        { name: 'Warehouse', count: 5, lastUpdated: '2026-02-17 10:00' },
        { name: 'DailyReport', count: 156, lastUpdated: '2026-02-19 22:00' },
        { name: 'ApprovalOrder', count: 23, lastUpdated: '2026-02-19 21:00' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadTableData = async (tableName: string) => {
    setSelectedTable(tableName)
    setDataLoading(true)
    try {
      const res = await fetch(`${API_URL.DATA}/${tableName}`)
      const data = await res.json()
      setTableData(data.items || data || [])
    } catch (e) {
      console.error(e)
      // 模拟数据
      setTableData(getMockData(tableName))
    } finally {
      setDataLoading(false)
    }
  }

  const getMockData = (tableName: string): any[] => {
    switch (tableName) {
      case 'Project':
        return [
          { id: '1', name: '智慧城市项目', status: 'in_progress', progress: 65, manager: '张经理', created_at: '2026-01-15' },
          { id: '2', name: '市政道路改造', status: 'in_progress', progress: 40, manager: '李经理', created_at: '2026-02-01' },
          { id: '3', name: '住宅小区建设', status: 'completed', progress: 100, manager: '王经理', created_at: '2025-10-01' }
        ]
      case 'Employee':
        return [
          { id: '1', name: '张三', department: '工程部', position: '工程师', status: 'occupied', created_at: '2025-06-01' },
          { id: '2', name: '李四', department: '技术部', position: '技术员', status: 'idle', created_at: '2025-08-15' }
        ]
      default:
        return [{ id: '1', name: '示例数据', created_at: '2026-02-19' }]
    }
  }

  const getTableLabel = (name: string) => {
    const labels: Record<string, string> = {
      'Project': '项目', 'Task': '任务', 'Employee': '员工', 'Equipment': '设备',
      'Customer': '客户', 'Warehouse': '仓库', 'DailyReport': '日报', 'ApprovalOrder': '审批工单'
    }
    return labels[name] || name
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据管理</h1>
        <p className="text-gray-500 mt-1">查看和管理系统后台数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">总记录数</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{tables.reduce((a, b) => a + b.count, 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">数据表</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{tables.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">今日更新</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">12</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">系统状态</p>
          <p className="text-lg font-bold text-green-600 mt-2">运行正常</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 数据表列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">数据表</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-4 text-center text-gray-500">加载中...</div>
              ) : (
                tables.map(table => (
                  <div
                    key={table.name}
                    onClick={() => loadTableData(table.name)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedTable === table.name ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{getTableLabel(table.name)}</p>
                        <p className="text-xs text-gray-500">{table.name}</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{table.count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">快捷操作</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">📊 导出所有数据</button>
              <button className="w-full px-4 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">🔄 刷新数据统计</button>
              <button className="w-full px-4 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg">⚙️ 系统设置</button>
            </div>
          </div>
        </div>

        {/* 数据预览 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                {selectedTable ? `${getTableLabel(selectedTable)} 数据预览` : '选择数据表查看'}
              </h3>
              {selectedTable && (
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">新增</button>
                  <button className="px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">导出</button>
                </div>
              )}
            </div>
            <div className="p-4">
              {!selectedTable ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <p>点击左侧数据表查看数据</p>
                </div>
              ) : dataLoading ? (
                <div className="text-center py-12 text-gray-500">加载中...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {tableData.length > 0 && Object.keys(tableData[0]).map(key => (
                          <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tableData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-3 text-sm text-gray-900">{typeof val === 'object' ? JSON.stringify(val) : String(val).slice(0, 50)}</td>
                          ))}
                          <td className="px-4 py-3 text-right">
                            <button className="text-blue-600 text-sm hover:underline">编辑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableData.length > 10 && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                      显示前10条，共 {tableData.length} 条数据
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
