import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { notificationService, type Notification } from '../services/notificationService'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    try {
      const data = await notificationService.list()
      setNotifications(data || [])
    } catch (error) {
      console.error('获取通知失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      )
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      )
    } catch (error) {
      console.error('标记所有通知已读失败:', error)
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.delete(id)
      setNotifications(prev => prev.filter(notif => notif.id !== id))
    } catch (error) {
      console.error('删除通知失败:', error)
    }
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchNotifications()
    
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
