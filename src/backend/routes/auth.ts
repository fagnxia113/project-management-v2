/**
 * 认证路由 - 连接真实数据库
 */
import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/connection.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'siweixinwang-secret-key-2026'

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
  const count = await db.queryOne<{count: number}>('SELECT COUNT(*) as count FROM users')
  if (!count || count.count === 0) {
    await db.query(`
      INSERT INTO users (id, username, password, name, email, role) VALUES
      ('1', 'admin', 'admin123', '管理员', 'admin@company.com', 'admin')
    `)
    console.log('✅ 默认管理员已初始化')
  }
}

// 导出初始化函数，供server.ts调用
export const initUsersTable = ensureUsersTable

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' })
    }

    const user = await db.queryOne<{ id: string; username: string; password: string; name: string; email: string; role: string; status: string }>(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    )
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    if (user.status === 'inactive') {
      return res.status(401).json({ error: '该账号已被禁用' })
    }

    const employee = await db.queryOne<{ id: string }>(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    )

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, employee_id: employee?.id || null },
      message: '登录成功'
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// 验证Token
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    const user = await db.queryOne<{ id: string; username: string; name: string; email: string; role: string; status: string }>(
      'SELECT id, username, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    )
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }

    if (user.status === 'inactive') {
      return res.status(401).json({ error: '该账号已被禁用' })
    }

    const employee = await db.queryOne<{ id: string }>(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    )

    res.json({ success: true, user: { ...user, employee_id: employee?.id || null } })
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: '令牌已过期，请重新登录' })
    }
    res.status(401).json({ error: '无效的令牌' })
  }
})

// 登出
router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: '已退出登录' })
})

// 获取用户列表（管理员权限）
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await db.query<{ id: string; username: string; name: string; email: string; role: string; status: string; created_at: string }>(
      'SELECT id, username, name, email, role, status, created_at FROM users ORDER BY created_at DESC'
    )
    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ error: '获取用户列表失败' })
  }
})

// 新增用户（管理员权限）
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { username, password, name, email, role } = req.body
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: '请填写必填项' })
    }

    const existing = await db.queryOne('SELECT id FROM users WHERE username = ?', [username])
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' })
    }

    const id = uuidv4()
    await db.insert(
      'INSERT INTO users (id, username, password, name, email, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, password, name, email || `${username}@company.com`, role || 'user']
    )

    res.json({ success: true, message: '用户创建成功', data: { id } })
  } catch (error) {
    res.status(500).json({ error: '创建用户失败' })
  }
})

// 更新用户（管理员权限）
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, email, role } = req.body

    await db.update(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
      [name, email, role, id]
    )

    res.json({ success: true, message: '用户更新成功' })
  } catch (error) {
    res.status(500).json({ error: '更新用户失败' })
  }
})

// 删除用户（管理员权限）
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // 不允许删除admin用户
    const user = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id])
    if (user?.username === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账号' })
    }

    await db.delete('DELETE FROM users WHERE id = ?', [id])
    res.json({ success: true, message: '用户删除成功' })
  } catch (error) {
    res.status(500).json({ error: '删除用户失败' })
  }
})

// 切换用户状态（管理员权限）
router.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    // 不允许禁用admin用户
    const user = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id])
    if (user?.username === 'admin') {
      return res.status(400).json({ error: '不能禁用管理员账号' })
    }

    await db.update('UPDATE users SET status = ? WHERE id = ?', [status, id])
    res.json({ success: true, message: '状态更新成功' })
  } catch (error) {
    res.status(500).json({ error: '更新状态失败' })
  }
})

// 管理员重置用户密码（管理员权限）
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' })
    }

    await db.update('UPDATE users SET password = ? WHERE id = ?', [newPassword, id])
    res.json({ success: true, message: '密码重置成功' })
  } catch (error) {
    res.status(500).json({ error: '重置密码失败' })
  }
})

// 管理员修改用户名（管理员权限）
router.put('/users/:id/username', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { username } = req.body
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: '用户名长度至少3位' })
    }

    // 检查是否为admin用户
    const user = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = ?', [id])
    if (user?.username === 'admin') {
      return res.status(400).json({ error: '不能修改管理员账号的用户名' })
    }

    // 检查新用户名是否已存在
    const existing = await db.queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, id])
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' })
    }

    await db.update('UPDATE users SET username = ? WHERE id = ?', [username, id])
    res.json({ success: true, message: '用户名修改成功' })
  } catch (error) {
    res.status(500).json({ error: '修改用户名失败' })
  }
})

// 修改密码
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: '未认证' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    const { oldPassword, newPassword } = req.body
    
    const user = await db.queryOne<{ password: string }>('SELECT password FROM users WHERE id = ?', [decoded.userId])
    if (!user || user.password !== oldPassword) {
      return res.status(400).json({ error: '原密码错误' })
    }

    await db.update('UPDATE users SET password = ? WHERE id = ?', [newPassword, decoded.userId])
    res.json({ success: true, message: '密码修改成功' })
  } catch (error) {
    res.status(500).json({ error: '修改失败' })
  }
})

export default router
