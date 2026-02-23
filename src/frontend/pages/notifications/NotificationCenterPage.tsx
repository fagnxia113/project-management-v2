import React, { useState, useEffect } from 'react'
import { API_URL } from '../../config/api'

interface Notification {
  id: string
  user_id: string
  user_name: string
  type: 'email' | 'sms' | 'push' | 'in_app'
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  link: string
  is_read: boolean
  read_at: string
  created_at: string
}

const priorityLabels: Record<string, string> = {
  'low': '低',
  'normal': '普通',
  'high': '高',
  'urgent': '紧急'
}

const priorityColors: Record<string, string> = {
  'low': 'bg-gray-100 text-gray-700',
  'normal': 'bg-blue-100 text-blue-700',
  'high': 'bg-orange-100 text-orange-700',
  'urgent': 'bg-red-100 text-red-700'
}

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [unreadOnly])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const userId = 'current-user'
      const url = `${API_URL.NOTIFICATIONS.LIST}?user_id=${userId}${unreadOnly ? '&is_read=false' : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error('加载通知失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(API_URL.NOTIFICATIONS.MARK_READ(id), { method: 'POST' })
      loadNotifications()
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(API_URL.NOTIFICATIONS.MARK_ALL_READ, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'current-user' })
      })
      loadNotifications()
    } catch (error) {
      console.error('全部标记已读失败:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }
    setSelectedNotification(notification)
    if (notification.link) {
      window.location.href = notification.link
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
          <p className="text-gray-500 mt-1">查看系统通知和消息</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              unreadOnly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {unreadOnly ? '显示全部' : '仅显示未读'}
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            全部标记已读
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p>暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 mt-2 rounded-full ${
                    notification.is_read ? 'bg-gray-300' : 'bg-blue-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${priorityColors[notification.priority]}`}>
                        {priorityLabels[notification.priority]}
                      </span>
                      {!notification.is_read && (
                        <span className="text-xs text-blue-600">未读</span>
                      )}
                    </div>
                    <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(notification.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
