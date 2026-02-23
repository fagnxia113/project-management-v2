/**
 * 元数据配置页面
 */
import React, { useState } from 'react'

const entities = [
  { name: 'Project', label: '项目', fields: 12 },
  { name: 'Task', label: '任务', fields: 10 },
  { name: 'Equipment', label: '设备', fields: 15 },
  { name: 'Customer', label: '客户', fields: 8 },
  { name: 'Employee', label: '员工', fields: 10 },
  { name: 'Warehouse', label: '仓库', fields: 6 },
]

export default function MetadataConfigPage() {
  const [selectedEntity, setSelectedEntity] = useState('Project')

  return (
    <div className="flex h-full -m-6">
      {/* 左侧实体列表 */}
      <div className="w-64 bg-gray-50 border-r p-4">
        <h3 className="font-semibold text-gray-700 mb-4">实体列表</h3>
        <div className="space-y-1">
          {entities.map(entity => (
            <button
              key={entity.name}
              onClick={() => setSelectedEntity(entity.name)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedEntity === entity.name
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{entity.label}</span>
                <span className="text-xs text-gray-400">{entity.fields} 字段</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧字段配置 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {entities.find(e => e.name === selectedEntity)?.label} 字段配置
            </h2>
            <button className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
              + 添加字段
            </button>
          </div>

          {/* 字段列表 */}
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">字段名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">标签</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">必填</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">id</td>
                  <td className="px-4 py-3 text-sm text-gray-600">ID</td>
                  <td className="px-4 py-3 text-sm text-gray-600">UUID</td>
                  <td className="px-4 py-3"><span className="text-green-600">✓</span></td>
                  <td className="px-4 py-3 text-sm text-gray-400">系统字段</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">name</td>
                  <td className="px-4 py-3 text-sm text-gray-600">名称</td>
                  <td className="px-4 py-3 text-sm text-gray-600">String</td>
                  <td className="px-4 py-3"><span className="text-green-600">✓</span></td>
                  <td className="px-4 py-3">
                    <button className="text-blue-500 hover:text-blue-700 text-sm">编辑</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">status</td>
                  <td className="px-4 py-3 text-sm text-gray-600">状态</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Enum</td>
                  <td className="px-4 py-3"><span className="text-green-600">✓</span></td>
                  <td className="px-4 py-3">
                    <button className="text-blue-500 hover:text-blue-700 text-sm">编辑</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">manager_id</td>
                  <td className="px-4 py-3 text-sm text-gray-600">负责人</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Relation</td>
                  <td className="px-4 py-3"><span className="text-gray-300">-</span></td>
                  <td className="px-4 py-3">
                    <button className="text-blue-500 hover:text-blue-700 text-sm">编辑</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">start_date</td>
                  <td className="px-4 py-3 text-sm text-gray-600">开始日期</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Date</td>
                  <td className="px-4 py-3"><span className="text-gray-300">-</span></td>
                  <td className="px-4 py-3">
                    <button className="text-blue-500 hover:text-blue-700 text-sm">编辑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
