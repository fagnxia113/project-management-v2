import { Request, Response, NextFunction } from 'express'
import { db } from '../database/connection.js'
import { executionLogger } from '../services/ExecutionLogger.js'
import { logger } from '../utils/logger.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        username: string
        name?: string
        role: string
      }
    }
  }
}

interface WorkflowPermissionOptions {
  requireOwner?: boolean
  requireAssignee?: boolean
  requireInitiator?: boolean
  requireRole?: string[]
  allowAdmin?: boolean
}

export const checkWorkflowPermission = (options: WorkflowPermissionOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' })
    }

    const { userId, role } = req.user
    const { id } = req.params

    if (options.allowAdmin !== false && role === 'admin') {
      return next()
    }

    if (options.requireRole && options.requireRole.length > 0) {
      if (!options.requireRole.includes(role)) {
        return res.status(403).json({ error: '权限不足' })
      }
    }

    try {
      const instance = await db.queryOne<any>(
        `SELECT * FROM workflow_instances WHERE id = ?`,
        [id]
      )

      if (!instance) {
        return res.status(404).json({ error: '流程实例不存在' })
      }

      if (options.requireInitiator && instance.initiator_id !== userId) {
        await executionLogger.log({
          executionId: instance.id,
          action: 'permission_denied',
          instanceId: instance.id,
          operator: { id: userId, name: req.user?.name || userId },
          reason: `用户 ${userId} 尝试操作非发起人的流程 ${id}`
        })
        return res.status(403).json({ error: '只有发起人可以执行此操作' })
      }

      next()
    } catch (error: any) {
      logger.error('权限验证失败', error)
      return res.status(500).json({ error: '权限验证失败' })
    }
  }
}

export const checkTaskPermission = (options: WorkflowPermissionOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' })
    }

    const { userId, role } = req.user
    const { id } = req.params

    if (options.allowAdmin !== false && role === 'admin') {
      return next()
    }

    if (options.requireRole && options.requireRole.length > 0) {
      if (!options.requireRole.includes(role)) {
        return res.status(403).json({ error: '权限不足' })
      }
    }

    try {
      const task = await db.queryOne<any>(
        `SELECT t.*, i.initiator_id, i.initiator_name
         FROM workflow_tasks t
         LEFT JOIN workflow_instances i ON t.instance_id = i.id
         WHERE t.id = ?`,
        [id]
      )

      if (!task) {
        return res.status(404).json({ error: '任务不存在' })
      }

      // assignee_id 已经是用户ID，直接使用
      const actualAssigneeId = task.assignee_id

      // 对于认领任务，检查任务状态和候选人
      if (!options.requireAssignee && task.status === 'created') {
        // 检查是否在候选人列表中
        if (task.candidate_users && Array.isArray(task.candidate_users)) {
          if (!task.candidate_users.includes(userId)) {
            await executionLogger.log({
              executionId: task.instance_id,
              action: 'permission_denied',
              instanceId: task.instance_id,
              taskId: task.id,
              operator: { id: userId, name: req.user?.name || userId },
              reason: `用户 ${userId} 不在任务 ${id} 的候选人列表中`
            })
            return res.status(403).json({ error: '您没有权限认领此任务' })
          }
        }
        return next()
      }

      if (options.requireAssignee && actualAssigneeId !== userId) {
        console.log('[checkTaskPermission] 权限检查失败:', {
          actualAssigneeId,
          userId,
          taskAssigneeId: task.assignee_id,
          taskStatus: task.status
        });
        await executionLogger.log({
          executionId: task.instance_id,
          action: 'permission_denied',
          instanceId: task.instance_id,
          taskId: task.id,
          operator: { id: userId, name: req.user?.name || userId },
          reason: `用户 ${userId} 尝试操作非分配的任务 ${id}`
        })
        return res.status(403).json({ error: '只有任务分配者可以执行此操作' })
      }

      if (options.requireInitiator && task.initiator_id !== userId) {
        await executionLogger.log({
          executionId: task.instance_id,
          action: 'permission_denied',
          instanceId: task.instance_id,
          taskId: task.id,
          operator: { id: userId, name: req.user?.name || userId },
          reason: `用户 ${userId} 尝试操作非发起人的任务 ${id}`
        })
        return res.status(403).json({ error: '只有发起人可以执行此操作' })
      }

      req.task = task
      next()
    } catch (error: any) {
      logger.error('任务权限验证失败', error)
      return res.status(500).json({ error: '任务权限验证失败' })
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      task?: any
    }
  }
}

export const checkFormPermission = (formTemplateId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' })
    }

    const { userId, role } = req.user

    if (role === 'admin') {
      return next()
    }

    try {
      const template = await db.queryOne<any>(
        `SELECT * FROM unified_form_templates WHERE id = ?`,
        [formTemplateId]
      )

      if (!template) {
        return res.status(404).json({ error: '表单模板不存在' })
      }

      if (template.status !== 'active') {
        return res.status(403).json({ error: '表单模板未激活' })
      }

      next()
    } catch (error: any) {
      logger.error('表单权限验证失败', error)
      return res.status(500).json({ error: '表单权限验证失败' })
    }
  }
}

export const validateOperator = (req: Request, res: Response, next: NextFunction) => {
  const { operator } = req.body

  if (!operator || !operator.id) {
    return res.status(400).json({ error: '操作人信息不完整' })
  }

  if (req.user && operator.id !== req.user.userId) {
    return res.status(403).json({ error: '操作人与当前用户不匹配' })
  }

  next()
}

export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json.bind(res)
    
    res.json = function(data: any) {
      if (req.user && (data.success || res.statusCode < 400)) {
        executionLogger.log({
          executionId: req.params.id || req.params.taskId || 'unknown',
          action,
          instanceId: req.params.id,
          taskId: req.params.taskId,
          operator: { id: req.user.userId, name: req.user.name || req.user.username },
          result: 'success',
          metadata: {
            method: req.method,
            path: req.path,
            body: JSON.stringify(req.body)
          },
          timestamp: new Date()
        }).catch(err => logger.error('审计日志记录失败', err))
      }
      
      return originalSend(data)
    }
    
    next()
  }
}
