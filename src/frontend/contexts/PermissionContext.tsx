import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_URL } from '../config/api'

interface PermissionContextType {
  permissions: string[]
  menus: string[]
  role: string
  loading: boolean
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
  hasAllPermissions: (codes: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | null>(null)

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([])
  const [menus, setMenus] = useState<string[]>([])
  const [role, setRole] = useState<string>('user')
  const [loading, setLoading] = useState(true)

  const refreshPermissions = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const [permRes, menuRes] = await Promise.all([
        fetch(API_URL.PERMISSIONS.LIST, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(API_URL.PERMISSIONS.MENUS, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (permRes.ok) {
        const text = await permRes.text()
        if (text) {
          const data = JSON.parse(text)
          setPermissions(data.data || [])
        }
      }

      if (menuRes.ok) {
        const text = await menuRes.text()
        if (text) {
          const data = JSON.parse(text)
          setMenus(data.data || [])
        }
      }

      const userStr = localStorage.getItem('user')
      if (userStr && userStr !== 'undefined') {
        try {
          const user = JSON.parse(userStr)
          setRole(user.role || 'user')
        } catch (e) {
          console.warn('解析用户信息失败', e)
        }
      }
    } catch (error) {
      console.error('加载权限失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshPermissions()
  }, [])

  const hasPermission = (code: string): boolean => {
    if (permissions.includes('*')) return true
    return permissions.includes(code)
  }

  const hasAnyPermission = (codes: string[]): boolean => {
    if (permissions.includes('*')) return true
    return codes.some(code => permissions.includes(code))
  }

  const hasAllPermissions = (codes: string[]): boolean => {
    if (permissions.includes('*')) return true
    return codes.every(code => permissions.includes(code))
  }

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        menus,
        role,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermission = () => {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider')
  }
  return context
}

export const useHasPermission = (code: string | string[], mode: 'any' | 'all' = 'all'): boolean => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()
  
  if (Array.isArray(code)) {
    return mode === 'any' ? hasAnyPermission(code) : hasAllPermissions(code)
  }
  
  return hasPermission(code)
}
