import React, { ReactNode } from 'react'
import { UserProvider } from './UserContext'
import { PermissionProvider } from './PermissionContext'
import { NotificationProvider } from './NotificationContext'
import { TaskProvider } from './TaskContext'

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <UserProvider>
      <PermissionProvider>
        <NotificationProvider>
          <TaskProvider>
            {children}
          </TaskProvider>
        </NotificationProvider>
      </PermissionProvider>
    </UserProvider>
  )
}
