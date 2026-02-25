import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
  Panel,
  Handle,
  Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Play,
  Square,
  CheckCircle,
  User,
  XCircle,
  MoreHorizontal,
  Settings,
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  Plus,
  X,
  Users,
  GitBranch,
  Layers,
  Variable,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckSquare,
  Vote,
  ArrowRightLeft,
  ListOrdered,
  Search
} from 'lucide-react'
import { API_URL } from '../config/api'

// ==================== 类型定义 ====================

export interface ApprovalConfig {
  approvalMode: 'or_sign' | 'and_sign' | 'sequential' | 'vote'
  voteThreshold?: number
  approverSource: ApproverSource
  skipCondition?: string
  autoPass?: boolean
  timeout?: number
  timeoutAction?: 'auto_pass' | 'auto_reject' | 'remind'
}

export interface ApproverSource {
  type: 'user' | 'role' | 'department_manager' | 'project_manager' | 'initiator' | 'form_field' | 'expression'
  value?: string
  multiple?: boolean
}

export interface GatewayConfig {
  type: 'exclusive' | 'parallel' | 'inclusive'
  conditions?: GatewayCondition[]
  defaultBranch?: string
}

export interface GatewayCondition {
  id: string
  name: string
  expression: string
  targetNodeId: string
}

export interface ServiceTaskConfig {
  serviceType: 'http' | 'script' | 'email' | 'notification' | 'custom'
  serviceConfig: Record<string, any>
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  defaultValue?: any
  description?: string
  required?: boolean
}

export interface WorkflowNodeData {
  label: string
  description?: string
  approvalConfig?: ApprovalConfig
  gatewayConfig?: GatewayConfig
  serviceConfig?: ServiceTaskConfig
  formKey?: string
  [key: string]: any
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'user' | 'boolean' | 'lookup' | 'reference'
  required: boolean
  placeholder?: string
  defaultValue?: any
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  disabled?: boolean
  readonly?: boolean
}

export interface UnifiedWorkflowData {
  nodes: Array<{
    id: string
    type: string
    name: string
    position: { x: number; y: number }
    approvalConfig?: ApprovalConfig
    gatewayConfig?: GatewayConfig
    serviceConfig?: ServiceTaskConfig
    formKey?: string
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    condition?: string
  }>
  variables: WorkflowVariable[]
  formSchema?: FormField[]
}

interface UnifiedWorkflowDesignerProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  initialVariables?: WorkflowVariable[]
  initialFormSchema?: FormField[]
  onSave?: (data: UnifiedWorkflowData) => void
  onExport?: (data: UnifiedWorkflowData) => void
  readOnly?: boolean
}

// ==================== 节点类型组件 ====================

const StartEventNode: React.FC<{ data: WorkflowNodeData; selected: boolean }> = ({ data, selected }) => (
  <div className="relative">
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
    <div
      className={`
        w-16 h-16 rounded-full flex items-center justify-center
        border-3 bg-white shadow-md
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-green-500'}
      `}
    >
      <Play className="w-6 h-6 text-green-500" />
    </div>
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-600 font-medium">
      {data.label || '开始'}
    </div>
  </div>
)

const EndEventNode: React.FC<{ data: WorkflowNodeData; selected: boolean }> = ({ data, selected }) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />
    <div
      className={`
        w-16 h-16 rounded-full flex items-center justify-center
        border-3 bg-white shadow-md
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-red-500'}
      `}
    >
      <Square className="w-6 h-6 text-red-500" />
    </div>
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-600 font-medium">
      {data.label || '结束'}
    </div>
  </div>
)

const UserTaskNode: React.FC<{ data: WorkflowNodeData; selected: boolean }> = ({ data, selected }) => {
  const getApprovalModeIcon = () => {
    switch (data.approvalConfig?.approvalMode) {
      case 'or_sign': return <CheckSquare className="w-3 h-3" />
      case 'and_sign': return <Users className="w-3 h-3" />
      case 'sequential': return <ListOrdered className="w-3 h-3" />
      case 'vote': return <Vote className="w-3 h-3" />
      default: return <User className="w-3 h-3" />
    }
  }

  const getApprovalModeLabel = () => {
    const labels: Record<string, string> = {
      'or_sign': '或签',
      'and_sign': '会签',
      'sequential': '顺序签',
      'vote': '票决'
    }
    return labels[data.approvalConfig?.approvalMode || 'or_sign']
  }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
      <div
        className={`
          min-w-[180px] px-4 py-3 rounded-lg bg-white shadow-md
          border-2 transition-all duration-200
          ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-blue-400'}
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-800 truncate">
              {data.label || '审批节点'}
            </div>
            {data.approvalConfig?.approverSource?.type && (
              <div className="text-xs text-gray-500">
                {getApproverTypeLabel(data.approvalConfig.approverSource.type)}
              </div>
            )}
          </div>
        </div>
        {data.approvalConfig?.approvalMode && (
          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
            {getApprovalModeIcon()}
            <span>{getApprovalModeLabel()}</span>
            {data.approvalConfig.approvalMode === 'vote' && data.approvalConfig.voteThreshold && (
              <span className="ml-1 text-blue-600">({data.approvalConfig.voteThreshold}票)</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ServiceTaskNode: React.FC<{ data: WorkflowNodeData; selected: boolean }> = ({ data, selected }) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
    <div
      className={`
        min-w-[160px] px-4 py-3 rounded-lg bg-white shadow-md
        border-2 transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-purple-400'}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <Settings className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-800 truncate">
            {data.label || '服务任务'}
          </div>
          <div className="text-xs text-gray-500">
            {data.serviceConfig?.serviceType || '自动执行'}
          </div>
        </div>
      </div>
    </div>
  </div>
)

const ExclusiveGatewayNode: React.FC<{ data: WorkflowNodeData; selected: boolean }> = ({ data, selected }) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    <Handle type="source" position={Position.Top} className="w-3 h-3 bg-orange-500" />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500" />
    <div
      className={`
        w-14 h-14 flex items-center justify-center
        transform rotate-45 bg-white shadow-md
        border-2 transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-orange-400'}
      `}
    >
      <XCircle className="w-6 h-6 text-orange-500 transform -rotate-45" />
    </div>
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-600 font-medium">
      {data.label || '排他网关'}
    </div>
  </div>
)

const ParallelGatewayNode: React.FC<{ data: WorkflowNodeData; selected: boolean }> = ({ data, selected }) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
    <Handle type="source" position={Position.Top} className="w-3 h-3 bg-purple-500" />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    <div
      className={`
        w-14 h-14 flex items-center justify-center
        transform rotate-45 bg-white shadow-md
        border-2 transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-purple-400'}
      `}
    >
      <MoreHorizontal className="w-6 h-6 text-purple-500 transform -rotate-45" />
    </div>
    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-600 font-medium">
      {data.label || '并行网关'}
    </div>
  </div>
)

// ==================== 辅助函数 ====================

const getApproverTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'user': '指定用户',
    'role': '指定角色',
    'department_manager': '部门经理',
    'project_manager': '项目经理',
    'initiator': '发起人',
    'form_field': '表单字段',
    'expression': '表达式'
  }
  return labels[type] || type
}

const defaultNodeTypes: NodeTypes = {
  startEvent: StartEventNode,
  endEvent: EndEventNode,
  userTask: UserTaskNode,
  serviceTask: ServiceTaskNode,
  exclusiveGateway: ExclusiveGatewayNode,
  parallelGateway: ParallelGatewayNode
}

// ==================== 主组件 ====================

const UnifiedWorkflowDesigner: React.FC<UnifiedWorkflowDesignerProps> = ({
  initialNodes = [],
  initialEdges = [],
  initialVariables = [],
  initialFormSchema = [],
  onSave,
  onExport,
  readOnly = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [variables, setVariables] = useState<WorkflowVariable[]>(initialVariables)
  const [formSchema, setFormSchema] = useState<FormField[]>(initialFormSchema || [])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [mainTab, setMainTab] = useState<'workflow' | 'form'>('workflow')
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6'
        }
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const addNode = useCallback((type: string) => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: getDefaultNodeData(type)
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  const getDefaultNodeData = (type: string): WorkflowNodeData => {
    switch (type) {
      case 'startEvent':
        return { label: '开始' }
      case 'endEvent':
        return { label: '结束' }
      case 'userTask':
        return {
          label: '审批节点',
          approvalConfig: {
            approvalMode: 'or_sign',
            approverSource: { type: 'role', value: '' }
          }
        }
      case 'serviceTask':
        return {
          label: '服务任务',
          serviceConfig: { serviceType: 'http', serviceConfig: {} }
        }
      case 'exclusiveGateway':
        return {
          label: '排他网关',
          gatewayConfig: { type: 'exclusive', conditions: [] }
        }
      case 'parallelGateway':
        return {
          label: '并行网关',
          gatewayConfig: { type: 'parallel' }
        }
      default:
        return { label: '节点' }
    }
  }

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
      setSelectedNode(null)
      setShowConfig(false)
    }
  }, [selectedNode, setNodes, setEdges])

  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return

    const nodeWidth = 180
    const nodeHeight = 80
    const horizontalSpacing = 60
    const verticalSpacing = 100

    const nodeMap = new Map<string, { level: number; index: number }>()
    const adjacencyList = new Map<string, string[]>()
    
    nodes.forEach(node => {
      adjacencyList.set(node.id, [])
    })
    
    edges.forEach(edge => {
      const targets = adjacencyList.get(edge.source) || []
      targets.push(edge.target)
      adjacencyList.set(edge.source, targets)
    })

    const inDegree = new Map<string, number>()
    nodes.forEach(node => inDegree.set(node.id, 0))
    edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    })

    const levels: string[][] = []
    let currentLevel = nodes.filter(n => (inDegree.get(n.id) || 0) === 0).map(n => n.id)
    
    while (currentLevel.length > 0) {
      levels.push(currentLevel)
      const nextLevel: string[] = []
      
      currentLevel.forEach(nodeId => {
        const targets = adjacencyList.get(nodeId) || []
        targets.forEach(targetId => {
          const newInDegree = (inDegree.get(targetId) || 0) - 1
          inDegree.set(targetId, newInDegree)
          if (newInDegree === 0) {
            nextLevel.push(targetId)
          }
        })
      })
      
      currentLevel = nextLevel
    }

    const positionedNodes = nodes.map(node => {
      let levelIndex = -1
      let indexInLevel = -1
      
      for (let i = 0; i < levels.length; i++) {
        const idx = levels[i].indexOf(node.id)
        if (idx !== -1) {
          levelIndex = i
          indexInLevel = idx
          break
        }
      }
      
      if (levelIndex === -1) {
        levelIndex = levels.length
        indexInLevel = 0
      }

      const levelWidth = levels[levelIndex]?.length || 1
      const totalWidth = levelWidth * nodeWidth + (levelWidth - 1) * horizontalSpacing
      const startX = (800 - totalWidth) / 2

      return {
        ...node,
        position: {
          x: startX + indexInLevel * (nodeWidth + horizontalSpacing),
          y: 100 + levelIndex * (nodeHeight + verticalSpacing)
        }
      }
    })

    setNodes(positionedNodes)
  }, [nodes, edges, setNodes])

  const updateNodeData = useCallback((key: string, value: any) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                [key]: value
              }
            }
          }
          return node
        })
      )
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...prev.data, [key]: value } } : null
      )
    }
  }, [selectedNode, setNodes])

  const handleSave = useCallback(() => {
    const workflowData: UnifiedWorkflowData = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type || 'userTask',
        name: node.data.label,
        position: node.position,
        approvalConfig: node.data.approvalConfig,
        gatewayConfig: node.data.gatewayConfig,
        serviceConfig: node.data.serviceConfig,
        formKey: node.data.formKey
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        condition: edge.data?.condition
      })),
      variables,
      formSchema
    }
    onSave?.(workflowData)
    onExport?.(workflowData)
  }, [nodes, edges, variables, formSchema, onSave, onExport])

  // 表单设计相关方法
  const addFormField = useCallback((type: string = 'text', label?: string) => {
    const newField: FormField = {
      name: `field_${formSchema.length + 1}`,
      label: label || `字段 ${formSchema.length + 1}`,
      type: type as any,
      required: false
    }
    const newIndex = formSchema.length
    setFormSchema([...formSchema, newField])
    setSelectedFieldIndex(newIndex)
  }, [formSchema])

  const updateFormField = useCallback((index: number, field: keyof FormField, value: any) => {
    const newFields = [...formSchema]
    newFields[index] = { ...newFields[index], [field]: value }
    setFormSchema(newFields)
  }, [formSchema])

  const removeFormField = useCallback((index: number) => {
    setFormSchema(formSchema.filter((_, i) => i !== index))
  }, [formSchema])

  const addVariable = useCallback(() => {
    const newVar: WorkflowVariable = {
      name: `var_${variables.length + 1}`,
      type: 'string',
      required: false
    }
    setVariables([...variables, newVar])
  }, [variables])

  const updateVariable = useCallback((index: number, field: keyof WorkflowVariable, value: any) => {
    const newVars = [...variables]
    newVars[index] = { ...newVars[index], [field]: value }
    setVariables(newVars)
  }, [variables])

  const removeVariable = useCallback((index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }, [variables])

  // ==================== 渲染 ====================

  return (
    <div className="w-full h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* 顶部标签页 */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setMainTab('workflow')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${
            mainTab === 'workflow' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          流程设计
        </button>
        <button
          onClick={() => setMainTab('form')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${
            mainTab === 'form' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          表单设计
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-4">
          <button
            onClick={handleSave}
            disabled={readOnly}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {mainTab === 'workflow' ? (
          <div className="w-full h-full flex">
            {/* 左侧节点工具栏 */}
            <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">流程节点</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">事件节点</div>
                  <button
                    onClick={() => addNode('startEvent')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Play className="w-4 h-4 text-green-600" />
                    </div>
                    <span>开始节点</span>
                  </button>
                  <button
                    onClick={() => addNode('endEvent')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <Square className="w-4 h-4 text-red-600" />
                    </div>
                    <span>结束节点</span>
                  </button>

                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-4">任务节点</div>
                  <button
                    onClick={() => addNode('userTask')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>审批节点</span>
                  </button>
                  <button
                    onClick={() => addNode('serviceTask')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>服务任务</span>
                  </button>

                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-4">网关节点</div>
                  <button
                    onClick={() => addNode('exclusiveGateway')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 bg-orange-100 flex items-center justify-center transform rotate-45">
                      <XCircle className="w-4 h-4 text-orange-600 transform -rotate-45" />
                    </div>
                    <span>排他网关</span>
                  </button>
                  <button
                    onClick={() => addNode('parallelGateway')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 bg-purple-100 flex items-center justify-center transform rotate-45">
                      <MoreHorizontal className="w-4 h-4 text-purple-600 transform -rotate-45" />
                    </div>
                    <span>并行网关</span>
                  </button>
                </div>
              </div>

              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={autoLayout}
                  disabled={readOnly || nodes.length === 0}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  自动排版
                </button>
              </div>
            </div>

            {/* 中间画布区域 */}
            <div className="flex-1 relative">
              <ReactFlow
                ref={reactFlowWrapper}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={defaultNodeTypes}
                fitView
                attributionPosition="bottom-left"
              >
                <Background color="#f1f5f9" gap={16} />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>

            {/* 右侧属性面板 */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              {selectedNode ? (
                <NodeConfigPanel
                  node={selectedNode}
                  onUpdate={updateNodeData}
                  onDelete={deleteSelectedNode}
                  readOnly={readOnly}
                />
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Variable className="w-4 h-4" />
                      流程变量
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">定义流程中使用的变量</span>
                        <button
                          onClick={addVariable}
                          disabled={readOnly}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                          添加
                        </button>
                      </div>

                      {variables.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          点击"添加"创建流程变量
                        </div>
                      ) : (
                        variables.map((variable, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={variable.name}
                                onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                disabled={readOnly}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="变量名"
                              />
                              <button
                                onClick={() => removeVariable(index)}
                                disabled={readOnly}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <select
                              value={variable.type}
                              onChange={(e) => updateVariable(index, 'type', e.target.value)}
                              disabled={readOnly}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="string">字符串</option>
                              <option value="number">数字</option>
                              <option value="boolean">布尔值</option>
                              <option value="date">日期</option>
                              <option value="object">对象</option>
                              <option value="array">数组</option>
                            </select>
                            <input
                              type="text"
                              value={variable.description || ''}
                              onChange={(e) => updateVariable(index, 'description', e.target.value)}
                              disabled={readOnly}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="描述"
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={variable.required || false}
                                onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                                disabled={readOnly}
                                className="rounded"
                              />
                              必填
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* 表单设计标签页 */
          <div className="w-full h-full flex">
            {/* 左侧字段类型工具栏 */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">字段类型</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  <button
                    onClick={() => addFormField('text', '文本字段')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">T</span>
                    </div>
                    <span>文本输入</span>
                  </button>

                  <button
                    onClick={() => addFormField('number', '数字字段')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold">#</span>
                    </div>
                    <span>数字输入</span>
                  </button>

                  <button
                    onClick={() => addFormField('date', '日期字段')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 text-xs font-bold">D</span>
                    </div>
                    <span>日期选择</span>
                  </button>

                  <button
                    onClick={() => addFormField('select', '下拉选择')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 text-xs font-bold">S</span>
                    </div>
                    <span>下拉选择</span>
                  </button>

                  <button
                    onClick={() => addFormField('textarea', '多行文本')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-bold">¶</span>
                    </div>
                    <span>多行文本</span>
                  </button>

                  <button
                    onClick={() => addFormField('user', '用户选择')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span>用户选择</span>
                  </button>

                  <button
                    onClick={() => addFormField('boolean', '布尔值')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-600 text-xs font-bold">✓</span>
                    </div>
                    <span>布尔值</span>
                  </button>

                  <button
                    onClick={() => addFormField('reference', '引用字段')}
                    disabled={readOnly}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center">
                      <span className="text-pink-600 text-xs font-bold">@</span>
                    </div>
                    <span>引用字段</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 中间表单预览区域 */}
            <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">表单预览</h3>
                
                {formSchema.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无表单字段</p>
                    <p className="text-sm mt-2">从左侧选择字段类型添加到表单</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formSchema.map((field, index) => (
                      <div 
                        key={index} 
                        onClick={() => setSelectedFieldIndex(index)}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedFieldIndex === index 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFormField(index)
                              if (selectedFieldIndex === index) {
                                setSelectedFieldIndex(null)
                              }
                            }}
                            disabled={readOnly}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            删除
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          字段名: {field.name} | 类型: {field.type}
                        </div>
                        {field.type === 'text' && (
                          <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50" placeholder={field.placeholder} />
                        )}
                        {field.type === 'number' && (
                          <input type="number" disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50" placeholder={field.placeholder} />
                        )}
                        {field.type === 'date' && (
                          <input type="date" disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50" />
                        )}
                        {field.type === 'select' && (
                          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50">
                            <option>请选择...</option>
                          </select>
                        )}
                        {field.type === 'textarea' && (
                          <textarea disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50" rows={3} placeholder={field.placeholder} />
                        )}
                        {field.type === 'boolean' && (
                          <label className="flex items-center gap-2">
                            <input type="checkbox" disabled className="rounded" />
                            <span className="text-sm text-gray-600">是/否</span>
                          </label>
                        )}
                        {field.type === 'user' && (
                          <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50" placeholder="点击选择用户" />
                        )}
                        {field.type === 'reference' && (
                          <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50" placeholder="点击选择引用数据" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧字段属性面板 */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">字段属性</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {formSchema.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    请先添加表单字段
                  </div>
                ) : selectedFieldIndex === null ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    点击左侧表单字段进行编辑
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="text-xs font-medium text-gray-500 uppercase flex items-center justify-between">
                        {formSchema[selectedFieldIndex].label}
                        <span className="text-blue-500">字段 {selectedFieldIndex + 1}/{formSchema.length}</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">字段名(英文)</label>
                        <input
                          type="text"
                          value={formSchema[selectedFieldIndex].name}
                          onChange={(e) => updateFormField(selectedFieldIndex, 'name', e.target.value)}
                          disabled={readOnly}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">字段标签</label>
                        <input
                          type="text"
                          value={formSchema[selectedFieldIndex].label}
                          onChange={(e) => updateFormField(selectedFieldIndex, 'label', e.target.value)}
                          disabled={readOnly}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">字段类型</label>
                        <select
                          value={formSchema[selectedFieldIndex].type}
                          onChange={(e) => updateFormField(selectedFieldIndex, 'type', e.target.value)}
                          disabled={readOnly}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="text">文本</option>
                          <option value="number">数字</option>
                          <option value="date">日期</option>
                          <option value="select">下拉选择</option>
                          <option value="textarea">多行文本</option>
                          <option value="user">用户选择</option>
                          <option value="boolean">布尔值</option>
                          <option value="lookup">查找</option>
                          <option value="reference">引用</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">占位提示</label>
                        <input
                          type="text"
                          value={formSchema[selectedFieldIndex].placeholder || ''}
                          onChange={(e) => updateFormField(selectedFieldIndex, 'placeholder', e.target.value)}
                          disabled={readOnly}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formSchema[selectedFieldIndex].required || false}
                          onChange={(e) => updateFormField(selectedFieldIndex, 'required', e.target.checked)}
                          disabled={readOnly}
                          className="rounded"
                        />
                        必填
                      </label>
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => setSelectedFieldIndex(Math.max(0, selectedFieldIndex - 1))}
                          disabled={selectedFieldIndex === 0}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          上一个
                        </button>
                        <button
                          onClick={() => setSelectedFieldIndex(Math.min(formSchema.length - 1, selectedFieldIndex + 1))}
                          disabled={selectedFieldIndex === formSchema.length - 1}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一个
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== 节点配置面板 ====================

interface NodeConfigPanelProps {
  node: Node
  onUpdate: (key: string, value: any) => void
  onDelete?: () => void
  readOnly?: boolean
}

// ==================== 员工选择弹窗 ====================

interface Employee {
  id: string
  name: string
  employeeNo: string
  position?: string
  department?: string
  email?: string
  phone?: string
}

interface EmployeeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedIds: string[]) => void
  initialSelectedIds: string[]
}

const EmployeeSelectorModal: React.FC<EmployeeSelectorModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedIds
}) => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
      setSelectedIds(initialSelectedIds)
    }
  }, [isOpen, initialSelectedIds])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}?page=1&pageSize=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      const result = await response.json()
      setEmployees(result.data || [])
    } catch (error) {
      console.error('加载员工列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleConfirm = () => {
    onConfirm(selectedIds)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">选择员工</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索姓名、工号或职位..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {selectedIds.length > 0 ? (
              <div className="space-y-1">
                <div>已选择 {selectedIds.length} 人</div>
                <div className="text-xs text-blue-600">
                  {selectedIds.map(id => {
                    const emp = employees.find(e => e.id === id)
                    return emp?.name || id
                  }).join('、')}
                </div>
              </div>
            ) : (
              <div>已选择 0 人</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无员工数据</div>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  onClick={() => toggleSelection(employee.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.includes(employee.id)
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedIds.includes(employee.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedIds.includes(employee.id) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{employee.name}</span>
                      <span className="text-xs text-gray-500">({employee.employeeNo})</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {employee.position || '无职位'} {employee.department ? `- ${employee.department}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            确认选择 ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  )
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onUpdate, onDelete, readOnly }) => {
  const [activeSection, setActiveSection] = useState<'basic' | 'approval' | 'gateway' | 'service'>('basic')
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL.DATA('Employee')}?page=1&pageSize=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      const result = await response.json()
      setEmployees(result.data || [])
    } catch (error) {
      console.error('加载员工列表失败:', error)
    }
  }

  const getSelectedEmployeeNames = (employeeIds: string): string => {
    if (!employeeIds) return ''
    const ids = employeeIds.split(',').filter(Boolean)
    const names = ids.map(id => {
      const emp = employees.find(e => e.id === id)
      return emp?.name || id
    })
    return names.join('、')
  }

  const renderBasicConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">节点名称</label>
        <input
          type="text"
          value={node.data.label || ''}
          onChange={(e) => onUpdate('label', e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="请输入节点名称"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">节点说明</label>
        <textarea
          value={node.data.description || ''}
          onChange={(e) => onUpdate('description', e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          rows={3}
          placeholder="请输入节点说明"
        />
      </div>

      {node.type === 'userTask' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">关联表单</label>
          <input
            type="text"
            value={node.data.formKey || ''}
            onChange={(e) => onUpdate('formKey', e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="表单标识"
          />
        </div>
      )}
    </div>
  )

  const renderApprovalConfig = () => {
    const config: ApprovalConfig = node.data.approvalConfig || {
      approvalMode: 'or_sign',
      approverSource: { type: 'role' }
    }

    const updateConfig = (key: keyof ApprovalConfig, value: any) => {
      onUpdate('approvalConfig', { ...config, [key]: value })
    }

    const updateApproverSource = (key: keyof ApproverSource, value: any) => {
      onUpdate('approvalConfig', {
        ...config,
        approverSource: { ...config.approverSource, [key]: value }
      })
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">审批模式</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'or_sign', label: '或签', icon: CheckSquare, desc: '任一通过' },
              { value: 'and_sign', label: '会签', icon: Users, desc: '全部通过' },
              { value: 'sequential', label: '顺序签', icon: ListOrdered, desc: '依次审批' },
              { value: 'vote', label: '票决', icon: Vote, desc: '票数达标' }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => updateConfig('approvalMode', mode.value)}
                disabled={readOnly}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  config.approvalMode === mode.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <mode.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{mode.label}</span>
                <span className="text-xs text-gray-500">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {config.approvalMode === 'vote' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">票决阈值</label>
            <input
              type="number"
              min={1}
              value={config.voteThreshold || 1}
              onChange={(e) => updateConfig('voteThreshold', parseInt(e.target.value))}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">需要达到的同意票数</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">审批人类型</label>
          <select
            value={config.approverSource?.type || 'role'}
            onChange={(e) => updateApproverSource('type', e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="role">指定角色</option>
            <option value="user">指定用户</option>
            <option value="department_manager">部门经理</option>
            <option value="project_manager">项目经理</option>
            <option value="initiator">发起人</option>
            <option value="form_field">表单字段</option>
            <option value="expression">表达式</option>
          </select>
        </div>

        {config.approverSource?.type === 'role' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">审批角色</label>
            <select
              value={config.approverSource?.value || ''}
              onChange={(e) => updateApproverSource('value', e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">请选择角色</option>
              <option value="admin">系统管理员</option>
              <option value="project_manager">项目经理</option>
              <option value="hr_manager">人事经理</option>
              <option value="equipment_manager">设备管理员</option>
              <option value="finance_manager">财务经理</option>
              <option value="general_manager">总经理</option>
            </select>
          </div>
        )}

        {config.approverSource?.type === 'user' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">指定用户</label>
            <div className="space-y-2">
              <button
                onClick={() => setShowEmployeeSelector(true)}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className={config.approverSource?.value ? 'text-gray-800' : 'text-gray-400'}>
                  {config.approverSource?.value
                    ? getSelectedEmployeeNames(config.approverSource.value) || `已选择 ${config.approverSource.value.split(',').filter(Boolean).length} 人`
                    : '点击选择员工'}
                </span>
                <Users className="w-4 h-4 text-gray-400" />
              </button>
              {config.approverSource?.value && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  员工ID: {config.approverSource.value}
                </div>
              )}
            </div>
            <EmployeeSelectorModal
              isOpen={showEmployeeSelector}
              onClose={() => setShowEmployeeSelector(false)}
              onConfirm={(selectedIds) => updateApproverSource('value', selectedIds.join(','))}
              initialSelectedIds={config.approverSource?.value?.split(',').filter(Boolean) || []}
            />
          </div>
        )}

        {config.approverSource?.type === 'form_field' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">表单字段</label>
            <input
              type="text"
              value={config.approverSource?.value || ''}
              onChange={(e) => updateApproverSource('value', e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="如: departmentManager"
            />
          </div>
        )}

        {config.approverSource?.type === 'expression' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">表达式</label>
            <input
              type="text"
              value={config.approverSource?.value || ''}
              onChange={(e) => updateApproverSource('value', e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="如: ${formData.amount > 10000 ? 'gm' : 'pm'}"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">跳过条件</label>
          <select
            value={config.skipCondition || 'none'}
            onChange={(e) => updateConfig('skipCondition', e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="none">不跳过</option>
            <option value="no_approvers">无审批人时跳过</option>
            <option value="always">始终跳过</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">超时设置（小时）</label>
          <input
            type="number"
            min={0}
            value={config.timeout || 0}
            onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">0表示不设置超时</p>
        </div>

        {config.timeout && config.timeout > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">超时动作</label>
            <select
              value={config.timeoutAction || 'remind'}
              onChange={(e) => updateConfig('timeoutAction', e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="remind">提醒</option>
              <option value="auto_pass">自动通过</option>
              <option value="auto_reject">自动拒绝</option>
            </select>
          </div>
        )}
      </div>
    )
  }

  const renderGatewayConfig = () => {
    const config: GatewayConfig = node.data.gatewayConfig || { type: 'exclusive' }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">网关类型</label>
          <div className="flex gap-2">
            {[
              { value: 'exclusive', label: '排他网关', desc: '条件分支' },
              { value: 'parallel', label: '并行网关', desc: '同时执行' },
              { value: 'inclusive', label: '包容网关', desc: '多条件满足' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => onUpdate('gatewayConfig', { ...config, type: type.value })}
                disabled={readOnly}
                className={`flex-1 p-3 rounded-lg border-2 text-center ${
                  config.type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-xs text-gray-500">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {config.type === 'exclusive' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分支条件</label>
            <div className="space-y-2">
              {(config.conditions || []).map((condition, index) => (
                <div key={condition.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={condition.name}
                    onChange={(e) => {
                      const newConditions = [...(config.conditions || [])]
                      newConditions[index] = { ...condition, name: e.target.value }
                      onUpdate('gatewayConfig', { ...config, conditions: newConditions })
                    }}
                    disabled={readOnly}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="条件名称"
                  />
                  <input
                    type="text"
                    value={condition.expression}
                    onChange={(e) => {
                      const newConditions = [...(config.conditions || [])]
                      newConditions[index] = { ...condition, expression: e.target.value }
                      onUpdate('gatewayConfig', { ...config, conditions: newConditions })
                    }}
                    disabled={readOnly}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="表达式: ${formData.amount > 1000}"
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const newCondition: GatewayCondition = {
                    id: `cond_${Date.now()}`,
                    name: `条件${(config.conditions || []).length + 1}`,
                    expression: '',
                    targetNodeId: ''
                  }
                  onUpdate('gatewayConfig', {
                    ...config,
                    conditions: [...(config.conditions || []), newCondition]
                  })
                }}
                disabled={readOnly}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                添加条件
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderServiceConfig = () => {
    const config: ServiceTaskConfig = node.data.serviceConfig || {
      serviceType: 'http',
      serviceConfig: {}
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">服务类型</label>
          <select
            value={config.serviceType}
            onChange={(e) => onUpdate('serviceConfig', { ...config, serviceType: e.target.value })}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="http">HTTP请求</option>
            <option value="script">执行脚本</option>
            <option value="email">发送邮件</option>
            <option value="notification">发送通知</option>
            <option value="custom">自定义服务</option>
          </select>
        </div>

        {config.serviceType === 'http' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">请求URL</label>
              <input
                type="text"
                value={config.serviceConfig?.url || ''}
                onChange={(e) => onUpdate('serviceConfig', {
                  ...config,
                  serviceConfig: { ...config.serviceConfig, url: e.target.value }
                })}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">请求方法</label>
              <select
                value={config.serviceConfig?.method || 'POST'}
                onChange={(e) => onUpdate('serviceConfig', {
                  ...config,
                  serviceConfig: { ...config.serviceConfig, method: e.target.value }
                })}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </>
        )}

        {config.serviceType === 'email' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">收件人</label>
              <input
                type="text"
                value={config.serviceConfig?.to || ''}
                onChange={(e) => onUpdate('serviceConfig', {
                  ...config,
                  serviceConfig: { ...config.serviceConfig, to: e.target.value }
                })}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">邮件主题</label>
              <input
                type="text"
                value={config.serviceConfig?.subject || ''}
                onChange={(e) => onUpdate('serviceConfig', {
                  ...config,
                  serviceConfig: { ...config.serviceConfig, subject: e.target.value }
                })}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="流程通知"
              />
            </div>
          </>
        )}
      </div>
    )
  }

  const sections: { key: typeof activeSection; label: string; icon: any; show: boolean }[] = [
    { key: 'basic', label: '基础配置', icon: Settings, show: true },
    { key: 'approval', label: '审批配置', icon: User, show: node.type === 'userTask' },
    { key: 'gateway', label: '网关配置', icon: GitBranch, show: node.type?.includes('Gateway') },
    { key: 'service', label: '服务配置', icon: Settings, show: node.type === 'serviceTask' }
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">节点配置</h3>
        {onDelete && !readOnly && (
          <button 
            onClick={onDelete} 
            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            删除
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {sections.filter(s => s.show).map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`flex items-center gap-1 px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeSection === section.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'basic' && renderBasicConfig()}
        {activeSection === 'approval' && renderApprovalConfig()}
        {activeSection === 'gateway' && renderGatewayConfig()}
        {activeSection === 'service' && renderServiceConfig()}
      </div>
    </div>
  )
}

export default UnifiedWorkflowDesigner
