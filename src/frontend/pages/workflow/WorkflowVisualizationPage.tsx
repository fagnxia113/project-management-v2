import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import WorkflowVisualization from '../../components/WorkflowVisualization'
import { API_URL } from '../../config/api'

interface WorkflowInstance {
  id: string
  title: string
  status: string
  definition_key: string
  definition_id: string
  current_node_id?: string
  current_node_name?: string
  variables?: Record<string, any>
  created_at: string
  initiator_id: string
  initiator_name: string
}

interface WorkflowTask {
  id: string
  instance_id: string
  node_id: string
  name: string
  assignee_id: string
  assignee_name: string
  status: string
  result?: string
  comment?: string
  created_at: string
  completed_at?: string
}

export default function WorkflowVisualizationPage() {
  const { instanceId } = useParams<{ instanceId: string }>()
  const [instance, setInstance] = useState<WorkflowInstance | null>(null)
  const [definition, setDefinition] = useState<any | null>(null)
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWorkflowData()
  }, [instanceId])

  const loadWorkflowData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('未登录')
        return
      }

      const instanceRes = await fetch(`${API_URL.BASE}/api/workflow/processes/${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!instanceRes.ok) {
        throw new Error('流程实例不存在')
      }

      const instanceData = await instanceRes.json()
      if (!instanceData.success) {
        throw new Error(instanceData.error || '加载流程实例失败')
      }

      const instanceInfo = instanceData.data
      setInstance(instanceInfo)

      const definitionRes = await fetch(`${API_URL.BASE}/api/workflow/definitions/${instanceInfo.definition_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (definitionRes.ok) {
        const definitionData = await definitionRes.json()
        if (definitionData.success) {
          setDefinition(definitionData.data)
        }
      }

      const tasksRes = await fetch(`${API_URL.BASE}/api/workflow/tasks?instanceId=${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        if (tasksData.success) {
          setTasks(tasksData.data || [])
        }
      }

    } catch (error: any) {
      console.error('加载流程数据失败:', error)
      setError(error.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadWorkflowData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!instance || !definition) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">流程不存在</h3>
          <p className="text-gray-500">请检查流程ID是否正确</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">流程可视化</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>流程名称：{instance.title}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            instance.status === 'running' ? 'bg-blue-100 text-blue-700' :
            instance.status === 'completed' ? 'bg-green-100 text-green-700' :
            instance.status === 'terminated' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {instance.status === 'running' ? '进行中' :
             instance.status === 'completed' ? '已完成' :
             instance.status === 'terminated' ? '已终止' : '未知'}
          </span>
        </div>
      </div>

      <WorkflowVisualization
        instanceId={instance.id}
        definition={definition}
        tasks={tasks}
        onNodeClick={(node) => {
          console.log('点击节点:', node)
        }}
      />

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">流程信息</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">流程ID：</span>
            <span className="font-medium">{instance.id}</span>
          </div>
          <div>
            <span className="text-gray-500">流程名称：</span>
            <span className="font-medium">{instance.title}</span>
          </div>
          <div>
            <span className="text-gray-500">当前状态：</span>
            <span className={`font-medium ${
              instance.status === 'running' ? 'text-blue-600' :
              instance.status === 'completed' ? 'text-green-600' :
              instance.status === 'terminated' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {instance.status === 'running' ? '进行中' :
               instance.status === 'completed' ? '已完成' :
               instance.status === 'terminated' ? '已终止' : '未知'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">发起人：</span>
            <span className="font-medium">{instance.initiator_name || '未知'}</span>
          </div>
          <div>
            <span className="text-gray-500">发起时间：</span>
            <span className="font-medium">{new Date(instance.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <div>
            <span className="text-gray-500">当前节点：</span>
            <span className="font-medium">{instance.current_node_name || '无'}</span>
          </div>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">审批记录</h3>
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex items-center gap-4 text-sm border-b border-gray-100 pb-3">
                <div className={`w-2 h-2 rounded-full ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in_progress' ? 'bg-blue-500' :
                  task.status === 'assigned' ? 'bg-yellow-500' :
                  'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{task.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status === 'completed' ? '已完成' :
                       task.status === 'in_progress' ? '处理中' :
                       task.status === 'assigned' ? '待处理' : '未开始'}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">
                    处理人：{task.assignee_name || '未分配'}
                    {task.comment && <span className="ml-4">意见：{task.comment}</span>}
                  </div>
                </div>
                <div className="text-gray-400 text-xs">
                  {task.completed_at ? new Date(task.completed_at).toLocaleString('zh-CN') : 
                   new Date(task.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}