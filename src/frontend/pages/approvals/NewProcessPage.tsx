import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'

interface ProcessPreset {
  id: string
  name: string
  category: string
  description: string
  status: string
}

const categoryLabels: Record<string, string> = {
  'hr': '人事管理',
  'project': '项目管理',
  'equipment': '设备管理',
  'purchase': '采购管理',
  'admin': '行政管理'
}

const categoryIcons: Record<string, React.ReactNode> = {
  'hr': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  'project': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  'equipment': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  'purchase': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  'admin': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

const presetRoutes: Record<string, string> = {
  'preset-employee-onboard': '/personnel/onboard',
  'preset-employee-offboard': '/personnel/offboard',
  'preset-employee-regular': '/personnel/regular',
  'preset-employee-leave': '/personnel/leave',
  'preset-employee-trip': '/personnel/trip',
  'preset-equipment-inbound': '/equipment/inbound',
  'preset-equipment-outbound': '/equipment/outbound',
  'preset-equipment-transfer': '/equipment/transfer',
  'preset-equipment-return': '/equipment/return',
  'preset-equipment-repair': '/equipment/repair',
  'preset-equipment-scrap': '/equipment/scrap',
  'preset-purchase-request': '/purchase/request',
  'preset-project-completion': '/projects',
}

export default function NewProcessPage() {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<ProcessPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const res = await fetch(API_URL.PROCESS_PRESETS)
      if (res.ok) {
        const data = await res.json()
        setPresets(data.data || data || [])
      }
    } catch (error) {
      console.error('加载流程预设失败:', error)
      // 使用默认数据
      setPresets([
        { id: 'preset-employee-onboard', name: '人员入职', category: 'hr', description: '新员工入职审批流程', status: 'active' },
        { id: 'preset-employee-offboard', name: '人员离职', category: 'hr', description: '员工离职审批流程', status: 'active' },
        { id: 'preset-employee-regular', name: '人员转正', category: 'hr', description: '员工转正审批流程', status: 'active' },
        { id: 'preset-employee-leave', name: '请假申请', category: 'hr', description: '员工请假审批流程', status: 'active' },
        { id: 'preset-employee-trip', name: '出差申请', category: 'hr', description: '员工出差审批流程', status: 'active' },
        { id: 'preset-equipment-inbound', name: '设备入库', category: 'equipment', description: '设备入库审批流程', status: 'active' },
        { id: 'preset-equipment-outbound', name: '设备出库', category: 'equipment', description: '设备出库审批流程', status: 'active' },
        { id: 'preset-equipment-transfer', name: '设备调拨', category: 'equipment', description: '设备调拨审批流程', status: 'active' },
        { id: 'preset-equipment-return', name: '设备归还', category: 'equipment', description: '项目结束后设备归还', status: 'active' },
        { id: 'preset-equipment-repair', name: '设备维修', category: 'equipment', description: '设备维修审批流程', status: 'active' },
        { id: 'preset-equipment-scrap', name: '设备报废', category: 'equipment', description: '设备报废审批流程', status: 'active' },
        { id: 'preset-purchase-request', name: '采购申请', category: 'purchase', description: '设备物资采购申请', status: 'active' },
        { id: 'preset-project-completion', name: '项目结项', category: 'project', description: '项目结项审批流程', status: 'active' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPreset = (preset: ProcessPreset) => {
    const route = presetRoutes[preset.id]
    if (route) {
      navigate(route)
    } else {
      navigate(`/approvals/new/${preset.id}`)
    }
  }

  const categories = [...new Set(presets.map(p => p.category))]
  const filteredPresets = selectedCategory 
    ? presets.filter(p => p.category === selectedCategory)
    : presets

  const groupedPresets = filteredPresets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = []
    }
    acc[preset.category].push(preset)
    return acc
  }, {} as Record<string, ProcessPreset[]>)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">新建流程</h1>
        <p className="text-gray-500 mt-1">选择需要发起的审批流程</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {categoryLabels[category] || category}
          </button>
        ))}
      </div>

      {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-blue-600">{categoryIcons[category]}</span>
            {categoryLabels[category] || category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryPresets.map(preset => (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {preset.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{preset.description}</p>
                  </div>
                  <div className="ml-4 text-gray-400 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    preset.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {preset.status === 'active' ? '可用' : '停用'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filteredPresets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>暂无可用的流程</p>
        </div>
      )}
    </div>
  )
}
