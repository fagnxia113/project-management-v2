/**
 * 流程表单预设页面
 * 展示所有可用的流程表单预设，允许用户选择并启动流程
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config/api'
import ProcessFormLauncher from '../../components/ProcessFormLauncher'

interface ProcessFormPreset {
  id: string
  name: string
  category: string
  description: string
  formTemplateKey: string
  workflowTemplateId: string
  businessType: string
  status: 'active' | 'inactive'
  defaultVariables: Record<string, any>
  version: string
}

const ProcessFormPresetsPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [presets, setPresets] = useState<ProcessFormPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')

  // 加载流程表单预设
  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true)
        const response = await fetch(API_URL.WORKFLOW.FORM_PRESETS, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const responseData = await response.json()
        
        if (responseData.success) {
          const presetList = responseData.data
          setPresets(presetList)
          
          // 提取所有唯一的分类
          const uniqueCategories = Array.from(new Set(presetList.map((p: ProcessFormPreset) => p.category)))
          setCategories(uniqueCategories)
        }
      } catch (error) {
        console.error('加载流程表单预设失败:', error)
        alert('加载流程表单预设失败，请重试')
      } finally {
        setLoading(false)
      }
    }

    loadPresets()
  }, [])

  // 过滤预设
  const filteredPresets = activeCategory === 'all' 
    ? presets 
    : presets.filter(preset => preset.category === activeCategory)

  // 处理启动流程
  const handleStartProcess = (presetId: string) => {
    setSelectedPreset(presetId)
  }

  // 处理流程启动成功
  const handleProcessStarted = (processInstanceId: string) => {
    setSelectedPreset(null)
    // 跳转到流程实例详情页
    navigate(`/workflow/instances/${processInstanceId}`)
  }

  // 处理取消
  const handleCancel = () => {
    setSelectedPreset(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (selectedPreset) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-4">
          <button 
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            ← 返回预设列表
          </button>
        </div>
        <ProcessFormLauncher 
          presetId={selectedPreset} 
          onSuccess={handleProcessStarted}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">流程管理</h1>
          <p className="text-gray-600 mt-2">管理流程预设和设计审批流程</p>
        </div>
        <button
          onClick={() => navigate('/workflow/designer/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建流程
        </button>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            className={`px-4 py-2 rounded-md ${activeCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setActiveCategory('all')}
          >
            全部
          </button>
          {categories.map((category) => (
            <button 
              key={category} 
              className={`px-4 py-2 rounded-md ${activeCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPresets.map((preset) => (
            <div 
              key={preset.id} 
              className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${preset.status === 'inactive' ? 'opacity-60' : ''}`}
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900">{preset.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${preset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {preset.status === 'active' ? '激活' : '停用'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
              </div>
              <div className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">分类:</span>
                    <span>{preset.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">业务类型:</span>
                    <span>{preset.businessType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">表单模板:</span>
                    <span>{preset.formTemplateKey}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">流程模板:</span>
                    <span>{preset.workflowTemplateId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">版本:</span>
                    <span>{preset.version}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200">
                <button 
                  className={`w-full px-4 py-2 rounded-md ${preset.status === 'active' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  onClick={() => handleStartProcess(preset.id)}
                  disabled={preset.status !== 'active'}
                >
                  启动流程
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredPresets.length === 0 && (
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">暂无流程表单预设</h3>
            <p className="text-gray-600 mt-2">请联系管理员添加流程表单预设</p>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

export default ProcessFormPresetsPage
