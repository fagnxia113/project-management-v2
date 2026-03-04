import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import UnifiedWorkflowDesigner, { UnifiedWorkflowData, WorkflowVariable } from '../../components/UnifiedWorkflowDesigner'
import { API_URL } from '../../config/api'

interface WorkflowDefinition {
  id: string
  key: string
  name: string
  version: number
  category: string
  entity_type: string
  status: string
  node_config: any
  variables?: WorkflowVariable[]
  form_schema?: any[]
  form_template_id?: string
}

interface FormTemplate {
  id: string
  name: string
  version: number
  fields: any[]
}

export default function WorkflowDesignerNewPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowKey, setWorkflowKey] = useState('')
  const [workflowCategory, setWorkflowCategory] = useState('hr')
  const [formTemplateId, setFormTemplateId] = useState<string>('')
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [workflowData, setWorkflowData] = useState<UnifiedWorkflowData | null>(null)

  useEffect(() => {
    loadFormTemplates()
    if (id) {
      loadDefinition(id)
    }
  }, [id])

  const loadFormTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/form-templates/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setFormTemplates(data.data || [])
        }
      }
    } catch (error) {
      console.error('加载表单模板失败:', error)
    }
  }

  const loadDefinition = async (definitionId: string) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL.BASE}/api/workflow/definitions/${definitionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setDefinition(data.data)
          setWorkflowName(data.data.name)
          setWorkflowKey(data.data.key)
          setWorkflowCategory(data.data.category || 'hr')
          setFormTemplateId(data.data.form_template_id || '')
        }
      }
    } catch (error) {
      console.error('加载流程定义失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (data: UnifiedWorkflowData) => {
    setWorkflowData(data)
    setShowSaveDialog(true)
  }

  const handleExport = (data: UnifiedWorkflowData) => {
    console.log('导出流程数据:', data)
  }

  const confirmSave = async () => {
    if (!workflowName || !workflowKey) {
      alert('请填写流程名称和流程标识')
      return
    }

    if (!workflowData) {
      alert('流程数据为空')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const typeMap: Record<string, string> = {
        'startEvent': 'start',
        'endEvent': 'end',
        'userTask': 'approval',
        'serviceTask': 'service',
        'exclusiveGateway': 'exclusive',
        'parallelGateway': 'parallel'
      }
      
      const payload = {
        key: workflowKey,
        name: workflowName,
        category: workflowCategory,
        entity_type: workflowCategory,
        nodes: workflowData.nodes.map(node => ({
          id: node.id,
          type: typeMap[node.type] || node.type,
          name: node.name,
          position: node.position,
          config: node.approvalConfig || node.gatewayConfig || node.serviceConfig,
          formKey: node.formKey
        })),
        edges: workflowData.edges,
        variables: workflowData.variables,
        form_schema: workflowData.formSchema,
        form_template_id: formTemplateId || null,
        created_by: 'admin'
      }

      const url = id 
        ? `${API_URL.BASE}/api/workflow/definitions/${id}`
        : `${API_URL.BASE}/api/workflow/definitions`
      
      const method = id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      
      if (data.success) {
        alert('保存成功！')
        setShowSaveDialog(false)
        navigate('/workflow/definitions')
      } else {
        alert('保存失败: ' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存流程失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 转换节点数据格式
  const initialNodes = definition?.node_config?.nodes?.map((node: any) => {
    const typeMap: Record<string, string> = {
      'start': 'startEvent',
      'end': 'endEvent',
      'approval': 'userTask',
      'service': 'serviceTask',
      'exclusive': 'exclusiveGateway',
      'parallel': 'parallelGateway'
    }
    return {
      id: node.id,
      type: typeMap[node.type] || node.type || 'userTask',
      position: node.position || { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: {
        label: node.name || node.data?.label,
        description: node.description || node.data?.description,
        approvalConfig: node.approvalConfig || node.config || node.data?.approvalConfig,
        gatewayConfig: node.gatewayConfig || node.data?.gatewayConfig,
        serviceConfig: node.serviceConfig || node.data?.serviceConfig,
        formKey: node.formKey || node.data?.formKey
      }
    }
  }) || [
    {
      id: 'start',
      type: 'startEvent',
      position: { x: 100, y: 200 },
      data: { label: '开始' }
    }
  ]

  const initialEdges = definition?.node_config?.edges?.map((edge: any) => ({
    id: edge.id || `edge_${edge.source}_${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: true,
    data: { condition: edge.condition }
  })) || []

  const initialVariables = definition?.variables || []
  const initialFormSchema = definition?.form_schema || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {id ? '编辑流程' : '新建流程'}
            </h1>
            <p className="text-gray-500 mt-1">
              拖拽节点设计审批流程，点击节点配置审批人和流程变量
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/workflow/definitions')}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>

      {/* 设计器主体 */}
      <div className="flex-1 overflow-hidden">
        <UnifiedWorkflowDesigner
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          initialVariables={initialVariables}
          initialFormSchema={initialFormSchema}
          onSave={handleSave}
          onExport={handleExport}
        />
      </div>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">保存流程</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  流程名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入流程名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  流程标识 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={workflowKey}
                  onChange={(e) => setWorkflowKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：personnel_onboard"
                  disabled={!!id}
                />
                <p className="mt-1 text-xs text-gray-500">
                  流程标识唯一标识一个流程，创建后不可修改
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  流程分类
                </label>
                <select
                  value={workflowCategory}
                  onChange={(e) => setWorkflowCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hr">人事管理</option>
                  <option value="equipment">设备管理</option>
                  <option value="project">项目管理</option>
                  <option value="purchase">采购管理</option>
                  <option value="finance">财务管理</option>
                  <option value="general">通用流程</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  绑定表单模板
                </label>
                <select
                  value={formTemplateId}
                  onChange={(e) => setFormTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不绑定表单模板</option>
                  {formTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} (v{template.version}) - {template.fields.length}个字段
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  绑定表单模板后，发起流程时将自动加载该表单
                </p>
              </div>
              
              {/* 流程统计信息 */}
              {workflowData && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-medium text-gray-700">流程统计</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">节点数量: <span className="font-medium text-gray-900">{workflowData.nodes.length}</span></div>
                    <div className="text-gray-600">连线数量: <span className="font-medium text-gray-900">{workflowData.edges.length}</span></div>
                    <div className="text-gray-600">变量数量: <span className="font-medium text-gray-900">{workflowData.variables.length}</span></div>
                    <div className="text-gray-600">审批节点: <span className="font-medium text-gray-900">
                      {workflowData.nodes.filter(n => n.type === 'userTask').length}
                    </span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
