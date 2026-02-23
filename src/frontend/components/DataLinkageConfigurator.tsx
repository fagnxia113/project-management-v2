import React, { useState, useEffect, useCallback } from 'react'
import {
  Link,
  Plus,
  Trash2,
  Save,
  Play,
  Settings,
  Database,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react'
import { API_URL } from '../config/api'

interface LinkageRule {
  id: string
  name: string
  sourceEntity: string
  sourceField: string
  targetEntity: string
  targetField: string
  linkageType: 'filter' | 'cascade' | 'calculate' | 'default'
  condition?: string
  mapping?: Record<string, any>
  isActive: boolean
  description?: string
}

interface EntityConfig {
  name: string
  label: string
  fields: { name: string; label: string; type: string }[]
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  department: {
    name: 'department',
    label: '部门',
    fields: [
      { name: 'id', label: 'ID', type: 'id' },
      { name: 'code', label: '部门编码', type: 'string' },
      { name: 'name', label: '部门名称', type: 'string' },
      { name: 'manager_id', label: '部门经理', type: 'reference' }
    ]
  },
  position: {
    name: 'position',
    label: '岗位',
    fields: [
      { name: 'id', label: 'ID', type: 'id' },
      { name: 'code', label: '岗位编码', type: 'string' },
      { name: 'name', label: '岗位名称', type: 'string' },
      { name: 'department_id', label: '所属部门', type: 'reference' },
      { name: 'level', label: '岗位级别', type: 'string' }
    ]
  },
  employee: {
    name: 'employee',
    label: '员工',
    fields: [
      { name: 'id', label: 'ID', type: 'id' },
      { name: 'code', label: '员工编号', type: 'string' },
      { name: 'name', label: '姓名', type: 'string' },
      { name: 'department_id', label: '所属部门', type: 'reference' },
      { name: 'position_id', label: '所属岗位', type: 'reference' },
      { name: 'phone', label: '电话', type: 'string' },
      { name: 'email', label: '邮箱', type: 'string' }
    ]
  },
  project: {
    name: 'project',
    label: '项目',
    fields: [
      { name: 'id', label: 'ID', type: 'id' },
      { name: 'code', label: '项目编码', type: 'string' },
      { name: 'name', label: '项目名称', type: 'string' },
      { name: 'manager_id', label: '项目经理', type: 'reference' },
      { name: 'status', label: '项目状态', type: 'string' }
    ]
  },
  equipment: {
    name: 'equipment',
    label: '设备',
    fields: [
      { name: 'id', label: 'ID', type: 'id' },
      { name: 'code', label: '设备编码', type: 'string' },
      { name: 'name', label: '设备名称', type: 'string' },
      { name: 'type', label: '设备类型', type: 'string' },
      { name: 'project_id', label: '所属项目', type: 'reference' },
      { name: 'status', label: '设备状态', type: 'string' }
    ]
  }
}

const LINKAGE_TYPES = [
  { value: 'filter', label: '筛选联动', description: '根据源字段值筛选目标数据' },
  { value: 'cascade', label: '级联联动', description: '源字段变化时级联更新目标字段' },
  { value: 'calculate', label: '计算联动', description: '根据源字段值计算目标字段值' },
  { value: 'default', label: '默认值', description: '设置目标字段的默认值' }
]

interface DataLinkageConfiguratorProps {
  onSave?: (rules: LinkageRule[]) => void
}

const DataLinkageConfigurator: React.FC<DataLinkageConfiguratorProps> = ({ onSave }) => {
  const [rules, setRules] = useState<LinkageRule[]>([])
  const [selectedRule, setSelectedRule] = useState<LinkageRule | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [showTestPanel, setShowTestPanel] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/data-linkage/rules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setRules(data.data || [])
        }
      }
    } catch (error) {
      console.error('加载联动规则失败:', error)
    }
  }

  const addRule = useCallback(() => {
    const newRule: LinkageRule = {
      id: `rule_${Date.now()}`,
      name: '新联动规则',
      sourceEntity: '',
      sourceField: '',
      targetEntity: '',
      targetField: '',
      linkageType: 'filter',
      isActive: true,
      description: ''
    }
    setRules(prev => [...prev, newRule])
    setSelectedRule(newRule)
    setShowConfig(true)
  }, [])

  const deleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId))
    if (selectedRule?.id === ruleId) {
      setSelectedRule(null)
      setShowConfig(false)
    }
  }, [selectedRule])

  const updateRule = useCallback((ruleId: string, updates: Partial<LinkageRule>) => {
    setRules(prev =>
      prev.map(rule => {
        if (rule.id === ruleId) {
          return { ...rule, ...updates }
        }
        return rule
      })
    )
    if (selectedRule?.id === ruleId) {
      setSelectedRule(prev => prev ? { ...prev, ...updates } : null)
    }
  }, [selectedRule])

  const handleSave = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/data-linkage/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rules })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          alert('保存成功！')
          onSave?.(rules)
        } else {
          alert('保存失败: ' + (data.error || '未知错误'))
        }
      }
    } catch (error) {
      console.error('保存联动规则失败:', error)
      alert('保存失败，请重试')
    }
  }, [rules, onSave])

  const testRule = useCallback(async (rule: LinkageRule, testValue: any) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/data-linkage/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rule,
          testValue
        })
      })

      if (res.ok) {
        const data = await res.json()
        setTestResult(data)
      }
    } catch (error) {
      console.error('测试联动规则失败:', error)
      setTestResult({ success: false, error: '测试失败' })
    }
  }, [])

  const getEntityLabel = (entityName: string) => {
    return ENTITY_CONFIGS[entityName]?.label || entityName
  }

  const getFieldLabel = (entityName: string, fieldName: string) => {
    const entity = ENTITY_CONFIGS[entityName]
    if (!entity) return fieldName
    const field = entity.fields.find(f => f.name === fieldName)
    return field?.label || fieldName
  }

  return (
    <div className="flex h-full">
      {/* 左侧规则列表 */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">联动规则</h3>
          <button
            onClick={addRule}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {rules.map(rule => (
            <div
              key={rule.id}
              onClick={() => {
                setSelectedRule(rule)
                setShowConfig(true)
              }}
              className={`p-3 bg-white border rounded-lg cursor-pointer transition-all ${
                selectedRule?.id === rule.id
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{rule.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {rule.isActive ? '启用' : '停用'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {getEntityLabel(rule.sourceEntity)}.{getFieldLabel(rule.sourceEntity, rule.sourceField)}
                <ArrowRight className="w-3 h-3 inline mx-1" />
                {getEntityLabel(rule.targetEntity)}.{getFieldLabel(rule.targetEntity, rule.targetField)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  {LINKAGE_TYPES.find(t => t.value === rule.linkageType)?.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteRule(rule.id)
                  }}
                  className="ml-auto p-1 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Link className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">暂无联动规则</p>
              <p className="text-xs mt-1">点击 + 添加规则</p>
            </div>
          )}
        </div>
      </div>

      {/* 中间配置区域 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {showConfig && selectedRule ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">配置联动规则</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  测试
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      规则名称
                    </label>
                    <input
                      type="text"
                      value={selectedRule.name}
                      onChange={(e) => updateRule(selectedRule.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入规则名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      规则说明
                    </label>
                    <textarea
                      value={selectedRule.description || ''}
                      onChange={(e) => updateRule(selectedRule.id, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="请输入规则说明"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={selectedRule.isActive}
                      onChange={(e) => updateRule(selectedRule.id, { isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      启用此规则
                    </label>
                  </div>
                </div>
              </div>

              {/* 数据源配置 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  数据源配置
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      源实体
                    </label>
                    <select
                      value={selectedRule.sourceEntity}
                      onChange={(e) => updateRule(selectedRule.id, { 
                        sourceEntity: e.target.value,
                        sourceField: ''
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择源实体</option>
                      {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedRule.sourceEntity && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        源字段
                      </label>
                      <select
                        value={selectedRule.sourceField}
                        onChange={(e) => updateRule(selectedRule.id, { sourceField: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择源字段</option>
                        {ENTITY_CONFIGS[selectedRule.sourceEntity]?.fields.map(field => (
                          <option key={field.name} value={field.name}>{field.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 联动类型 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  联动类型
                </h3>
                <div className="space-y-3">
                  {LINKAGE_TYPES.map(type => (
                    <label
                      key={type.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedRule.linkageType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="linkageType"
                        value={type.value}
                        checked={selectedRule.linkageType === type.value}
                        onChange={(e) => updateRule(selectedRule.id, { linkageType: e.target.value as any })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 目标配置 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  目标配置
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      目标实体
                    </label>
                    <select
                      value={selectedRule.targetEntity}
                      onChange={(e) => updateRule(selectedRule.id, { 
                        targetEntity: e.target.value,
                        targetField: ''
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择目标实体</option>
                      {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedRule.targetEntity && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        目标字段
                      </label>
                      <select
                        value={selectedRule.targetField}
                        onChange={(e) => updateRule(selectedRule.id, { targetField: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择目标字段</option>
                        {ENTITY_CONFIGS[selectedRule.targetEntity]?.fields.map(field => (
                          <option key={field.name} value={field.name}>{field.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 高级配置 */}
              {selectedRule.linkageType === 'filter' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">筛选条件</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      筛选表达式
                    </label>
                    <textarea
                      value={selectedRule.condition || ''}
                      onChange={(e) => updateRule(selectedRule.id, { condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={3}
                      placeholder="例如: department_id = {source_value}"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      使用 {'{source_value}'} 引用源字段值
                    </p>
                  </div>
                </div>
              )}

              {selectedRule.linkageType === 'calculate' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">计算公式</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      计算表达式
                    </label>
                    <textarea
                      value={selectedRule.condition || ''}
                      onChange={(e) => updateRule(selectedRule.id, { condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={3}
                      placeholder="例如: {source_value} * 1.2"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      使用 {'{source_value}'} 引用源字段值，支持 + - * / 运算符
                    </p>
                  </div>
                </div>
              )}

              {selectedRule.linkageType === 'default' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">默认值设置</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认值
                    </label>
                    <input
                      type="text"
                      value={selectedRule.condition || ''}
                      onChange={(e) => updateRule(selectedRule.id, { condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入默认值"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Link className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">选择一个联动规则进行配置</p>
              <p className="text-sm mt-2">或点击左侧 + 创建新规则</p>
            </div>
          </div>
        )}
      </div>

      {/* 右侧测试面板 */}
      {showTestPanel && selectedRule && (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">规则测试</h3>
            <button
              onClick={() => setShowTestPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                测试值
              </label>
              <input
                type="text"
                id="testValue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入测试值"
              />
            </div>
            <button
              onClick={() => {
                const input = document.getElementById('testValue') as HTMLInputElement
                testRule(selectedRule, input.value)
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              执行测试
            </button>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? '测试成功' : '测试失败'}
                  </span>
                </div>
                {testResult.data && (
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
                {testResult.error && (
                  <p className="text-sm text-red-600">{testResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DataLinkageConfigurator