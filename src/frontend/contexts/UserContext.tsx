import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { authService, type User } from '../services/authService'
import { setUnauthorizedHandler } from '../utils/apiClient'

interface UserContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | null>(null)

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [])

  // 设置401错误处理
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
    })
  }, [logout])

  const login = useCallback(async (username: string, password: string) => {
    const data = await authService.login(username, password)
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!currentToken) {
      setUser(null)
      setToken(null)
      setLoading(false)
      return
    }

    // 从localStorage读取用户信息并设置到state
    if (userStr && userStr !== 'undefined') {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)
        setToken(currentToken)
        setLoading(false)
      } catch (e) {
        console.warn('解析用户信息失败', e)
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setLoading(false)
      }
    } else {
      setUser(null)
      setToken(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // 监听storage事件，当localStorage变化时更新用户信息
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        refreshUser()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [refreshUser])

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
