import React from 'react'
import DataLinkageConfigurator from '../../components/DataLinkageConfigurator'

export default function DataLinkagePage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数据联动配置</h1>
              <p className="text-gray-500 mt-1">
                配置实体之间的数据联动规则，实现自动筛选、级联更新等功能
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow" style={{ height: 'calc(100vh - 200px)' }}>
            <DataLinkageConfigurator />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>筛选联动</strong>：根据源字段值筛选目标数据，如选择部门后只显示该部门的岗位</li>
              <li><strong>级联联动</strong>：源字段变化时自动更新目标字段，如选择岗位后自动填充岗位级别</li>
              <li><strong>计算联动</strong>：根据源字段值计算目标字段值，如根据数量计算总价</li>
              <li><strong>默认值</strong>：为目标字段设置默认值</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}