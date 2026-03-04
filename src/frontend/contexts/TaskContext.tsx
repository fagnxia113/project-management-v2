import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { taskService, type Task, type CompleteTaskParams } from '../services/taskService'

interface TaskContextType {
  tasks: Task[]
  loading: boolean
  error: string | null
  fetchTasks: () => Promise<void>
  refreshTasks: () => Promise<void>
  completeTask: (taskId: string, action: 'approve' | 'reject', comment?: string) => Promise<void>
  claimTask: (taskId: string) => Promise<void>
  delegateTask: (taskId: string, targetUserId: string, comment?: string) => Promise<void>
  getTaskById: (taskId: string) => Task | undefined
  getTasksByStatus: (status: Task['status']) => Task[]
}

const TaskContext = createContext<TaskContextType | null>(null)

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const data = await taskService.myTasks()
      setTasks(data || [])
    } catch (err: any) {
      setError(err.message || '获取任务列表失败')
      console.error('获取任务列表失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshTasks = useCallback(async () => {
    await fetchTasks()
  }, [fetchTasks])

  const completeTask = useCallback(async (taskId: string, action: 'approve' | 'reject', comment?: string) => {
    try {
      const params: CompleteTaskParams = { action, comment }
      await taskService.completeTask(taskId, params)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (err: any) {
      console.error('完成任务失败:', err)
      throw err
    }
  }, [])

  const claimTask = useCallback(async (taskId: string) => {
    try {
      await taskService.claimTask(taskId)
      await fetchTasks()
    } catch (err: any) {
      console.error('认领任务失败:', err)
      throw err
    }
  }, [fetchTasks])

  const delegateTask = useCallback(async (taskId: string, targetUserId: string, comment?: string) => {
    try {
      await taskService.delegateTask(taskId, targetUserId, comment)
      await fetchTasks()
    } catch (err: any) {
      console.error('委托任务失败:', err)
      throw err
    }
  }, [fetchTasks])

  const getTaskById = useCallback((taskId: string) => {
    return tasks.find(task => task.id === taskId)
  }, [tasks])

  const getTasksByStatus = useCallback((status: Task['status']) => {
    return tasks.filter(task => task.status === status)
  }, [tasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        fetchTasks,
        refreshTasks,
        completeTask,
        claimTask,
        delegateTask,
        getTaskById,
        getTasksByStatus
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

export const useTask = () => {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTask must be used within TaskProvider')
  }
  return context
}
