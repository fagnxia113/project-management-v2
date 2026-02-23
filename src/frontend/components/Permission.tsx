import React, { ReactNode } from 'react'
import { usePermission } from '../contexts/PermissionContext'

interface HasPermissionProps {
  code: string | string[]
  mode?: 'any' | 'all'
  fallback?: ReactNode
  children: ReactNode
}

export const HasPermission: React.FC<HasPermissionProps> = ({
  code,
  mode = 'all',
  fallback = null,
  children
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()

  const codes = Array.isArray(code) ? code : [code]
  const hasAccess = mode === 'any'
    ? hasAnyPermission(codes)
    : hasAllPermissions(codes)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

interface IfRoleProps {
  role: string | string[]
  fallback?: ReactNode
  children: ReactNode
}

export const IfRole: React.FC<IfRoleProps> = ({
  role,
  fallback = null,
  children
}) => {
  const { role: userRole } = usePermission()

  const roles = Array.isArray(role) ? role : [role]
  const hasRole = roles.includes(userRole)

  return hasRole ? <>{children}</> : <>{fallback}</>
}

interface CanProps {
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve'
  resource: string
  fallback?: ReactNode
  children: ReactNode
}

export const Can: React.FC<CanProps> = ({
  action,
  resource,
  fallback = null,
  children
}) => {
  const { hasPermission } = usePermission()

  const permissionCode = `${resource}:${action}`
  const wildcardCode = `${resource}:*`

  const hasAccess = hasPermission(permissionCode) || hasPermission(wildcardCode)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string
  resource?: string
  action?: 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve'
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  resource,
  action,
  children,
  ...props
}) => {
  const { hasPermission } = usePermission()

  let hasAccess = true
  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (resource && action) {
    const permissionCode = `${resource}:${action}`
    const wildcardCode = `${resource}:*`
    hasAccess = hasPermission(permissionCode) || hasPermission(wildcardCode)
  }

  if (!hasAccess) {
    return null
  }

  return <button {...props}>{children}</button>
}

export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => {
  return <IfRole role="admin" fallback={fallback}>{children}</IfRole>
}

export const ManagerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback = null
}) => {
  return (
    <IfRole role={['admin', 'project_manager', 'hr_manager', 'equipment_manager']} fallback={fallback}>
      {children}
    </IfRole>
  )
}
