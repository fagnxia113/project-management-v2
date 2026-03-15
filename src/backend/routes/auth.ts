/**
 * 认证路由 - 连接真实数据库
 */
import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/connection.js'
import { jwtService } from '../utils/jwt.js'
import { ValidationError, AuthenticationError } from '../errors/AppError.js'
import { validateBody } from '../middleware/validator.js'
import { commonValidators } from '../validators/common.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const router = Router()

// 确保users表存在
async function ensureUsersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      role ENUM('admin', 'project_manager', 'hr_manager', 'equipment_manager', 'implementer', 'user') DEFAULT 'user',
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // 检查是否有默认管理员，没有则插入
  const count = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users')
  if (!count || count.count === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await db.query(`
      INSERT INTO users (id, username, password, name, email, role) VALUES
      ('1', 'admin', ?, '管理员', 'admin@company.com', 'admin')
    `, [hashedPassword])
    logger.info('默认管理员已初始化（密码已哈希）')
  }
}

// 导出初始化函数，供server.ts调用
export const initUsersTable = ensureUsersTable

// 登录
router.post('/login', validateBody([
  commonValidators.username(),
  commonValidators.password(),
]), asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body

  const user = await db.queryOne<{ id: string; username: string; password: string; name: string; email: string; role: string; status: string }>(
    'SELECT * FROM users WHERE username = ?',
    [username]
  )

  if (!user) {
    throw new AuthenticationError('用户名或密码错误')
  }

  // 支持 bcrypt 哈希和明文密码的兼容性验证（迁移过渡期）
  const isPasswordValid = user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : password === user.password

  if (!isPasswordValid) {
    throw new AuthenticationError('用户名或密码错误')
  }

  if (user.status === 'inactive') {
    throw new AuthenticationError('该账号已被禁用')
  }

  const employee = await db.queryOne<{ id: string }>(
    'SELECT id FROM employees WHERE user_id = ?',
    [user.id]
  )

  const token = jwtService.generateToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })

  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, employee_id: employee?.id || null },
    message: '登录成功'
  })
}))

// 验证Token
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('未提供认证令牌')
  }

  const token = authHeader.substring(7)
  const decoded = jwtService.verifyToken(token)

  const user = await db.queryOne<{ id: string; username: string; name: string; email: string; role: string; status: string }>(
    'SELECT id, username, name, email, role, status FROM users WHERE id = ?',
    [decoded.id]
  )

  if (!user) {
    throw new AuthenticationError('用户不存在')
  }

  if (user.status === 'inactive') {
    throw new AuthenticationError('该账号已被禁用')
  }

  const employee = await db.queryOne<{ id: string }>(
    'SELECT id FROM employees WHERE user_id = ?',
    [user.id]
  )

  res.json({ success: true, user: { ...user, employee_id: employee?.id || null } })
}))

// 登出
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已退出登录' })
}))

// 获取用户列表（管理员权限）
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const users = await db.query<{ id: string; username: string; name: string; email: string; role: string; status: string; created_at: string }>(
    'SELECT id, username, name, email, role, status, created_at FROM users ORDER BY created_at DESC'
  )
  res.json({ success: true, data: users })
}))

// 新增用户（管理员权限）
router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const { username, password, name, email, role } = req.body

  const existing = await db.queryOne('SELECT id FROM users WHERE username = ?', [username])
  if (existing) {
    throw new ValidationError('用户名已存在')
  }

  const id = uuidv4()
  const hashedPassword = await bcrypt.hash(password, 10)
  await db.insert(
    'INSERT INTO users (id, username, password, name, email, role) VALUES (?, ?, ?, ?, ?, ?)',
    [id, username, hashedPassword, name, email || `${username}@company.com`, role || 'user']
  )

  res.json({ success: true, message: '用户创建成功', data: { id } })
}))

// 更新用户（管理员权限）
router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, email, role } = req.body

  await db.update(
    'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
    [name, email, role, id]
  )

  res.json({ success: true, message: '用户更新成功' })
}))

// 删除用户（管理员权限）
router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const user = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id])
  if (user?.username === 'admin') {
    throw new ValidationError('不能删除管理员账号')
  }

  await db.executeTransaction(async (connection) => {
    await connection.execute('DELETE FROM users WHERE id = ?', [id])
    await connection.execute('DELETE FROM employees WHERE user_id = ?', [id])

    const definitions = await connection.query<any>(
      'SELECT id, node_config FROM workflow_definitions'
    )

    for (const def of definitions) {
      let nodeConfig = def.node_config
      let updated = false

      if (typeof nodeConfig === 'string') {
        nodeConfig = JSON.parse(nodeConfig)
      }

      if (nodeConfig && nodeConfig.nodes) {
        nodeConfig.nodes.forEach((node: any) => {
          if (node.config && node.config.approverSource) {
            if (node.config.approverSource.type === 'user') {
              const userIds = node.config.approverSource.value ? node.config.approverSource.value.split(',') : []
              const filteredUserIds = userIds.filter((uid: string) => uid !== id)

              if (filteredUserIds.length !== userIds.length) {
                updated = true
                if (filteredUserIds.length === 0) {
                  delete node.config.approverSource
                } else {
                  node.config.approverSource.value = filteredUserIds.join(',')
                }
              }
            }
          }
        })
      }

      if (updated) {
        await connection.execute(
          'UPDATE workflow_definitions SET node_config = ? WHERE id = ?',
          [JSON.stringify(nodeConfig), def.id]
        )
      }
    }

    await connection.execute(
      'DELETE FROM workflow_tasks WHERE assignee_id = ? AND status = "assigned"',
      [id]
    )

    await connection.execute(
      'UPDATE workflow_tasks SET assignee_id = NULL, assignee_name = NULL WHERE assignee_id = ?',
      [id]
    )
  })

  res.json({ success: true, message: '用户删除成功' })
}))

// 切换用户状态（管理员权限）
router.patch('/users/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body

  const user = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id])
  if (user?.username === 'admin') {
    throw new ValidationError('不能禁用管理员账号')
  }

  await db.update('UPDATE users SET status = ? WHERE id = ?', [status, id])
  res.json({ success: true, message: '状态更新成功' })
}))

// 管理员重置用户密码（管理员权限）
router.post('/users/:id/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { newPassword } = req.body

  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError('密码长度至少6位')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await db.update('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id])
  res.json({ success: true, message: '密码重置成功' })
}))

// 管理员修改用户名（管理员权限）
router.put('/users/:id/username', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { username } = req.body

  if (!username || username.length < 3) {
    throw new ValidationError('用户名长度至少3位')
  }

  const user = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id])
  if (user?.username === 'admin') {
    throw new ValidationError('不能修改管理员账号的用户名')
  }

  const existing = await db.queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, id])
  if (existing) {
    throw new ValidationError('用户名已存在')
  }

  await db.update('UPDATE users SET username = ? WHERE id = ?', [username, id])
  res.json({ success: true, message: '用户名修改成功' })
}))

// 修改密码
router.post('/change-password', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    throw new AuthenticationError('未认证')
  }

  const token = authHeader.substring(7)
  const decoded = jwtService.verifyToken(token)

  const { oldPassword, newPassword } = req.body

  const user = await db.queryOne<{ password: string }>('SELECT password FROM users WHERE id = ?', [decoded.id])
  if (!user) {
    throw new ValidationError('用户不存在')
  }

  // 兼容 bcrypt 哈希和明文密码
  const isOldPasswordValid = user.password.startsWith('$2')
    ? await bcrypt.compare(oldPassword, user.password)
    : oldPassword === user.password

  if (!isOldPasswordValid) {
    throw new ValidationError('原密码错误')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await db.update('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.id])
  res.json({ success: true, message: '密码修改成功' })
}))

export default router
