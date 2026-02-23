import { db } from '../database/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface Permission {
  id: string
  code: string
  name: string
  type: 'menu' | 'button' | 'api'
  parent_id: string | null
  path: string | null
  method: string | null
  sort_order: number
  status: 'active' | 'inactive'
}

export interface Role {
  id: string
  code: string
  name: string
  description: string
  status: 'active' | 'inactive'
  permissions: string[]
}

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'admin': ['*'],
  'project_manager': [
    'menu:dashboard', 'menu:projects', 'menu:tasks', 'menu:equipment',
    'project:view', 'project:create', 'project:update',
    'task:view', 'task:create', 'task:update', 'task:assign',
    'report:view', 'report:create'
  ],
  'hr_manager': [
    'menu:dashboard', 'menu:personnel', 'menu:organization',
    'employee:view', 'employee:create', 'employee:update',
    'onboard:approve', 'offboard:approve', 'regular:approve',
    'leave:approve', 'trip:approve'
  ],
  'equipment_manager': [
    'menu:dashboard', 'menu:equipment', 'menu:purchase',
    'equipment:view', 'equipment:create', 'equipment:update',
    'transfer:approve', 'repair:approve', 'scrap:approve',
    'purchase:view', 'purchase:create', 'purchase:approve'
  ],
  'implementer': [
    'menu:dashboard', 'menu:tasks', 'menu:reports',
    'task:view', 'task:update',
    'report:view', 'report:create'
  ],
  'user': [
    'menu:dashboard',
    'task:view',
    'report:view', 'report:create'
  ]
}

export class PermissionService {
  /**
   * 获取用户所有权限
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await db.queryOne<{ role: string }>(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    )

    if (!user) return []

    // 管理员拥有所有权限
    if (user.role === 'admin') {
      return ['*']
    }

    // 返回角色对应的权限
    return DEFAULT_ROLE_PERMISSIONS[user.role] || []
  }

  /**
   * 检查用户是否有某权限
   */
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId)
    
    // 管理员拥有所有权限
    if (permissions.includes('*')) return true
    
    return permissions.includes(permissionCode)
  }

  /**
   * 批量检查权限
   */
  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId)
    
    if (permissions.includes('*')) return true
    
    return permissionCodes.some(code => permissions.includes(code))
  }

  /**
   * 获取用户可访问的菜单
   */
  async getUserMenus(userId: string): Promise<string[]> {
    const permissions = await this.getUserPermissions(userId)
    
    if (permissions.includes('*')) {
      return ['*'] // 所有菜单
    }

    return permissions
      .filter(p => p.startsWith('menu:'))
      .map(p => p.replace('menu:', ''))
  }

  /**
   * 根据数据权限过滤查询
   */
  async applyDataPermission(
    userId: string,
    baseQuery: string,
    baseParams: any[],
    tableName: string = 't'
  ): Promise<{ query: string; params: any[] }> {
    const user = await db.queryOne<{
      role: string
      data_permission: string
      department_id: string | null
    }>(
      `SELECT u.role, e.data_permission, e.department_id 
       FROM users u 
       LEFT JOIN employees e ON e.user_id = u.id 
       WHERE u.id = ?`,
      [userId]
    )

    if (!user) {
      return { query: baseQuery + ' AND 1=0', params: baseParams }
    }

    // 管理员或全部权限可以查看所有数据
    if (user.role === 'admin' || user.data_permission === 'all') {
      return { query: baseQuery, params: baseParams }
    }

    // 本部门权限
    if (user.data_permission === 'department' && user.department_id) {
      return {
        query: baseQuery + ` AND ${tableName}.department_id = ?`,
        params: [...baseParams, user.department_id]
      }
    }

    // 仅本人数据
    return {
      query: baseQuery + ` AND ${tableName}.created_by = ?`,
      params: [...baseParams, userId]
    }
  }

  /**
   * 获取所有角色
   */
  async getRoles(): Promise<Array<{ code: string; name: string; permissions: string[] }>> {
    return [
      { code: 'admin', name: '管理员', permissions: DEFAULT_ROLE_PERMISSIONS['admin'] },
      { code: 'project_manager', name: '项目经理', permissions: DEFAULT_ROLE_PERMISSIONS['project_manager'] },
      { code: 'hr_manager', name: '人事管理员', permissions: DEFAULT_ROLE_PERMISSIONS['hr_manager'] },
      { code: 'equipment_manager', name: '设备管理员', permissions: DEFAULT_ROLE_PERMISSIONS['equipment_manager'] },
      { code: 'implementer', name: '实施人员', permissions: DEFAULT_ROLE_PERMISSIONS['implementer'] },
      { code: 'user', name: '普通用户', permissions: DEFAULT_ROLE_PERMISSIONS['user'] }
    ]
  }

  /**
   * 获取角色详情
   */
  async getRoleByCode(code: string): Promise<{ code: string; name: string; permissions: string[] } | null> {
    const roleNames: Record<string, string> = {
      'admin': '管理员',
      'project_manager': '项目经理',
      'hr_manager': '人事管理员',
      'equipment_manager': '设备管理员',
      'implementer': '实施人员',
      'user': '普通用户'
    }

    if (!DEFAULT_ROLE_PERMISSIONS[code]) return null

    return {
      code,
      name: roleNames[code] || code,
      permissions: DEFAULT_ROLE_PERMISSIONS[code]
    }
  }
}

export const permissionService = new PermissionService()
