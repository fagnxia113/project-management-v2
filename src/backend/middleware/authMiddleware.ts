import { Request, Response, NextFunction } from 'express'
import { jwtService } from '../utils/jwt.js'
import { AuthenticationError, AuthorizationError } from '../errors/AppError.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        username: string
        name: string
        role: string
        departmentId?: string
        positionId?: string
      }
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('未认证，请先登录')
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwtService.verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    throw error
  }
}

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('未认证')
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError('权限不足，需要角色: ' + roles.join(' 或 '))
    }

    next()
  }
}

export const requireAdmin = requireRole('admin')

export const requireManager = requireRole('admin', 'project_manager', 'hr_manager', 'equipment_manager')

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = jwtService.verifyToken(token)
      req.user = decoded
    } catch (error) {
      // Token无效，但继续执行
    }
  }

  next()
}

export const checkResourceAccess = (resourceType: 'project' | 'employee' | 'equipment') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('未认证')
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      return next()
    }

    // 其他角色根据数据权限过滤
    // 这里可以扩展更细粒度的权限控制
    next()
  }
}

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>()

  // 每 5 分钟清理过期记录，防止内存泄漏
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of requests) {
      if (now > record.resetTime) {
        requests.delete(key)
      }
    }
  }, 5 * 60 * 1000)

  // 避免 setInterval 阻止进程退出
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown'
    const now = Date.now()

    const record = requests.get(ip)

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (record.count >= maxRequests) {
      throw new AuthorizationError('请求过于频繁，请稍后再试')
    }

    record.count++
    next()
  }
}
