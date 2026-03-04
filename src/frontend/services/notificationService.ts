import { apiClient } from '../utils/apiClient'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  created_at: string
  action_url?: string
  related_id?: string
}

export const notificationService = {
  async list(params?: { page?: number; pageSize?: number }): Promise<Notification[]> {
    return apiClient.get('/api/notifications/notifications', { params })
  },

  async unreadCount(): Promise<number> {
    return apiClient.get('/api/notifications/notifications/unread-count')
  },

  async markAsRead(id: string): Promise<void> {
    return apiClient.post(`/api/notifications/notifications/${id}/read`)
  },

  async markAllAsRead(): Promise<void> {
    return apiClient.post('/api/notifications/notifications/read-all')
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/notifications/notifications/${id}`)
  }
}
