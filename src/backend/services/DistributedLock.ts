import { db } from '../database/connection.js'

interface Lock {
  id: string
  key: string
  owner: string
  acquiredAt: Date
  expiresAt: Date
}

interface LockOptions {
  ttl?: number
  retryCount?: number
  retryDelay?: number
}

export class DistributedLock {
  private static instance: DistributedLock
  private locks: Map<string, Lock>
  private cleanupInterval: NodeJS.Timeout | null

  private constructor() {
    this.locks = new Map()
    this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 60000)
  }

  static getInstance(): DistributedLock {
    if (!DistributedLock.instance) {
      DistributedLock.instance = new DistributedLock()
    }
    return DistributedLock.instance
  }

  async acquire(
    key: string,
    owner: string,
    options: LockOptions = {}
  ): Promise<boolean> {
    const {
      ttl = 30000,
      retryCount = 3,
      retryDelay = 100
    } = options

    for (let attempt = 0; attempt < retryCount; attempt++) {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + ttl)

      try {
        const result = await db.queryOne<any>(
          `SELECT * FROM workflow_locks WHERE lock_key = ? FOR UPDATE`,
          [key]
        )

        if (!result) {
          await db.insert(
            `INSERT INTO workflow_locks (id, lock_key, owner, acquired_at, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [`${key}-${owner}`, key, owner, now, expiresAt]
          )

          this.locks.set(key, {
            id: `${key}-${owner}`,
            key,
            owner,
            acquiredAt: now,
            expiresAt
          })

          return true
        } else if (new Date(result.expires_at) < now) {
          await db.execute(
            `UPDATE workflow_locks 
             SET owner = ?, acquired_at = ?, expires_at = ? 
             WHERE lock_key = ? AND expires_at < ?`,
            [owner, now, expiresAt, key, now]
          )

          this.locks.set(key, {
            id: `${key}-${owner}`,
            key,
            owner,
            acquiredAt: now,
            expiresAt
          })

          return true
        }

        if (attempt < retryCount - 1) {
          await this.sleep(retryDelay)
        }
      } catch (error) {
        console.error(`获取锁失败 (尝试 ${attempt + 1}/${retryCount}):`, error)
        if (attempt < retryCount - 1) {
          await this.sleep(retryDelay)
        }
      }
    }

    return false
  }

  async release(key: string, owner: string): Promise<boolean> {
    try {
      const result = await db.execute(
        `DELETE FROM workflow_locks 
         WHERE lock_key = ? AND owner = ?`,
        [key, owner]
      )

      this.locks.delete(key)
      return true
    } catch (error) {
      console.error('释放锁失败:', error)
      return false
    }
  }

  async extend(key: string, owner: string, ttl: number = 30000): Promise<boolean> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + ttl)

      const result = await db.execute(
        `UPDATE workflow_locks 
         SET expires_at = ? 
         WHERE lock_key = ? AND owner = ? AND expires_at > ?`,
        [expiresAt, key, owner, now]
      )

      if (result.affectedRows > 0) {
        const lock = this.locks.get(key)
        if (lock) {
          lock.expiresAt = expiresAt
        }
        return true
      }

      return false
    } catch (error) {
      console.error('延长锁失败:', error)
      return false
    }
  }

  isLocked(key: string): boolean {
    const lock = this.locks.get(key)
    if (!lock) return false

    return new Date() < lock.expiresAt
  }

  getLock(key: string): Lock | undefined {
    const lock = this.locks.get(key)
    if (!lock) return undefined

    if (new Date() >= lock.expiresAt) {
      this.locks.delete(key)
      return undefined
    }

    return lock
  }

  private cleanupExpiredLocks(): void {
    const now = new Date()
    const expiredKeys: string[] = []

    for (const [key, lock] of this.locks.entries()) {
      if (now >= lock.expiresAt) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.locks.delete(key)
    }

    if (expiredKeys.length > 0) {
      db.execute(
        `DELETE FROM workflow_locks WHERE expires_at < ?`,
        [now]
      ).catch(err => console.error('清理过期锁失败:', err))
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async withLock<T>(
    key: string,
    owner: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const acquired = await this.acquire(key, owner, options)

    if (!acquired) {
      throw new Error(`无法获取锁: ${key}`)
    }

    try {
      return await fn()
    } finally {
      await this.release(key, owner)
    }
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export const distributedLock = DistributedLock.getInstance()

export class TaskLockManager {
  private static instance: TaskLockManager

  private constructor() {}

  static getInstance(): TaskLockManager {
    if (!TaskLockManager.instance) {
      TaskLockManager.instance = new TaskLockManager()
    }
    return TaskLockManager.instance
  }

  async completeTask(taskId: string, userId: string, fn: () => Promise<any>): Promise<any> {
    const lockKey = `task:complete:${taskId}`
    return distributedLock.withLock(lockKey, userId, fn, {
      ttl: 30000,
      retryCount: 5,
      retryDelay: 200
    })
  }

  async claimTask(taskId: string, userId: string, fn: () => Promise<any>): Promise<any> {
    const lockKey = `task:claim:${taskId}`
    return distributedLock.withLock(lockKey, userId, fn, {
      ttl: 15000,
      retryCount: 3,
      retryDelay: 100
    })
  }

  async delegateTask(taskId: string, userId: string, fn: () => Promise<any>): Promise<any> {
    const lockKey = `task:delegate:${taskId}`
    return distributedLock.withLock(lockKey, userId, fn, {
      ttl: 20000,
      retryCount: 3,
      retryDelay: 100
    })
  }

  async transferTask(taskId: string, userId: string, fn: () => Promise<any>): Promise<any> {
    const lockKey = `task:transfer:${taskId}`
    return distributedLock.withLock(lockKey, userId, fn, {
      ttl: 20000,
      retryCount: 3,
      retryDelay: 100
    })
  }

  async terminateProcess(instanceId: string, userId: string, fn: () => Promise<any>): Promise<any> {
    const lockKey = `process:terminate:${instanceId}`
    return distributedLock.withLock(lockKey, userId, fn, {
      ttl: 30000,
      retryCount: 5,
      retryDelay: 200
    })
  }

  async withdrawProcess(instanceId: string, userId: string, fn: () => Promise<any>): Promise<any> {
    const lockKey = `process:withdraw:${instanceId}`
    return distributedLock.withLock(lockKey, userId, fn, {
      ttl: 30000,
      retryCount: 5,
      retryDelay: 200
    })
  }
}

export const taskLockManager = TaskLockManager.getInstance()
