import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'huisheng-zhihe-secret-key-2026'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        username: string
        role: string
      }
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未认证，请先登录' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      username: string
      role: string
    }
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: '令牌无效或已过期' })
  }
}

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' })
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足，需要角色: ' + roles.join(' 或 ') })
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
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string
        username: string
        role: string
      }
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
      return res.status(401).json({ error: '未认证' })
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
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown'
    const now = Date.now()
    
    const record = requests.get(ip)
    
    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs })
      return next()
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' })
    }
    
    record.count++
    next()
  }
}
