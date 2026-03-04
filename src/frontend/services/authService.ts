import { apiClient } from '../utils/apiClient'

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
  employee_id?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    return apiClient.post('/api/auth/login', { username, password })
  },

  async verify(): Promise<User> {
    return apiClient.get('/api/auth/verify')
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return apiClient.post('/api/auth/change-password', { oldPassword, newPassword })
  }
}
