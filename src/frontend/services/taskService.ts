import { apiClient } from '../utils/apiClient'

export interface Task {
  id: string
  name: string
  instance_id: string
  process_title: string
  node_id: string
  assignee_id: string
  assignee_name: string
  status: 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  priority: number
  created_at: string
  due_date?: string
  variables?: Record<string, any>
  field_permissions?: Record<string, 'read' | 'write' | 'hidden'>
}

export interface CompleteTaskParams {
  action: 'approve' | 'reject'
  comment?: string
  formData?: Record<string, any>
  variables?: Record<string, any>
}

export const taskService = {
  async myTasks(params?: { status?: string[] }): Promise<Task[]> {
    return apiClient.get('/api/workflow/my-tasks', { params })
  },

  async getTaskDetail(id: string): Promise<Task> {
    return apiClient.get(`/api/workflow/tasks/${id}`)
  },

  async completeTask(id: string, params: CompleteTaskParams): Promise<void> {
    return apiClient.post(`/api/workflow/tasks/${id}/complete`, params)
  },

  async claimTask(id: string): Promise<void> {
    return apiClient.post(`/api/workflow/tasks/${id}/claim`)
  },

  async delegateTask(id: string, targetUserId: string, comment?: string): Promise<void> {
    return apiClient.post(`/api/workflow/tasks/${id}/delegate`, { targetUserId, comment })
  },

  async transferTask(id: string, targetUserId: string, comment?: string): Promise<void> {
    return apiClient.post(`/api/workflow/tasks/${id}/transfer`, { targetUserId, comment })
  }
}
