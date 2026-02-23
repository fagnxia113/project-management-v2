/**
 * 任务看板页面 - 拖拽看板视图
 */
import React, { useState } from 'react'

interface Task {
  id: string
  title: string
  assignee: string
  priority: 'high' | 'medium' | 'low'
  project: string
}

const mockTasks: Record<string, Task[]> = {
  'todo': [
    { id: '1', title: '需求分析', assignee: '张三', priority: 'high', project: '项目A' },
    { id: '2', title: '界面设计', assignee: '李四', priority: 'medium', project: '项目B' },
  ],
  'in_progress': [
    { id: '3', title: '后端开发', assignee: '王五', priority: 'high', project: '项目A' },
  ],
  'done': [
    { id: '4', title: '项目启动', assignee: '张三', priority: 'low', project: '项目A' },
  ]
}

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState(mockTasks)
  const [draggedTask, setDraggedTask] = useState<{ task: Task, fromColumn: string } | null>(null)

  const columns = [
    { id: 'todo', title: '待处理', color: 'bg-gray-100' },
    { id: 'in_progress', title: '进行中', color: 'bg-blue-100' },
    { id: 'done', title: '已完成', color: 'bg-green-100' },
  ]

  const handleDragStart = (task: Task, columnId: string) => {
    setDraggedTask({ task, fromColumn: columnId })
  }

  const handleDrop = (toColumn: string) => {
    if (!draggedTask) return
    if (draggedTask.fromColumn === toColumn) {
      setDraggedTask(null)
      return
    }

    setTasks(prev => {
      const newTasks = { ...prev }
      // 从原列移除
      newTasks[draggedTask.fromColumn] = newTasks[draggedTask.fromColumn].filter(
        t => t.id !== draggedTask.task.id
      )
      // 添加到新列
      newTasks[toColumn] = [...newTasks[toColumn], draggedTask.task]
      return newTasks
    })
    setDraggedTask(null)
  }

  const priorityColors = {
    high: 'border-red-500',
    medium: 'border-yellow-500',
    low: 'border-green-500',
  }

  return (
    <div className="h-full">
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {columns.map(column => (
          <div
            key={column.id}
            className="flex-shrink-0 w-72 flex flex-col bg-gray-50 rounded-lg"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(column.id)}
          >
            {/* 列标题 */}
            <div className={`p-3 ${column.color} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">{column.title}</h3>
                <span className="text-sm text-gray-500">{tasks[column.id]?.length || 0}</span>
              </div>
            </div>

            {/* 任务卡片 */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {tasks[column.id]?.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task, column.id)}
                  className={`bg-white p-3 rounded-lg shadow-sm border-l-4 ${priorityColors[task.priority]} cursor-move hover:shadow-md transition-shadow`}
                >
                  <h4 className="font-medium text-gray-800">{task.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{task.project}</span>
                    <span className="text-gray-400">{task.assignee}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 添加按钮 */}
            <div className="p-2 border-t">
              <button className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                + 添加任务
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
