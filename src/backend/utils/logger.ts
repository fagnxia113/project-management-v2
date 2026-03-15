import * as fs from 'fs'
import * as path from 'path'
import { performance } from 'perf_hooks'

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: Record<string, any>
  context?: {
    userId?: string
    requestId?: string
    sessionId?: string
    ip?: string
    userAgent?: string
  }
  performance?: {
    duration?: number
    memory?: {
      used: number
      total: number
    }
  }
}

interface LogRotationConfig {
  maxSize: number
  maxFiles: number
  compress: boolean
}

class Logger {
  private logDir: string
  private logFile: string
  private errorLogFile: string
  private performanceLogFile: string
  private rotationConfig: LogRotationConfig
  private context: Map<string, any> = new Map()

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs')
    this.logFile = path.join(this.logDir, 'app.log')
    this.errorLogFile = path.join(this.logDir, 'error.log')
    this.performanceLogFile = path.join(this.logDir, 'performance.log')
    this.rotationConfig = {
      maxSize: 10 * 1024 * 1024,
      maxFiles: 10,
      compress: true
    }

    this.ensureLogDir()
    this.setupRotation()
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private setupRotation(): void {
    setInterval(() => {
      this.rotateLog(this.logFile)
      this.rotateLog(this.errorLogFile)
      this.rotateLog(this.performanceLogFile)
    }, 60 * 60 * 1000)
  }

  private rotateLog(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) return

      const stats = fs.statSync(filePath)
      if (stats.size < this.rotationConfig.maxSize) return

      const baseName = path.basename(filePath, path.extname(filePath))
      const ext = path.extname(filePath)
      const dir = path.dirname(filePath)

      for (let i = this.rotationConfig.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}${ext}`)
        const newFile = path.join(dir, `${baseName}.${i + 1}${ext}`)

        if (fs.existsSync(oldFile)) {
          if (i === this.rotationConfig.maxFiles - 1) {
            fs.unlinkSync(oldFile)
          } else {
            fs.renameSync(oldFile, newFile)
          }
        }
      }

      fs.renameSync(filePath, path.join(dir, `${baseName}.1${ext}`))
    } catch (error) {
      console.error('日志轮转失败:', error)
    }
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry)
  }

  private writeLog(entry: LogEntry): void {
    const logLine = this.formatLog(entry) + '\n'

    const levelColors: Record<LogLevel, string> = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[35m',
      trace: '\x1b[90m'
    }

    const color = levelColors[entry.level]
    const reset = '\x1b[0m'

    console.log(`${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`, entry.meta || '')

    // 使用异步写入，避免阻塞事件循环
    fs.promises.appendFile(this.logFile, logLine, 'utf8').catch(err => {
      console.error('写入日志失败:', err)
    })

    if (entry.level === 'error') {
      fs.promises.appendFile(this.errorLogFile, logLine, 'utf8').catch(err => {
        console.error('写入错误日志失败:', err)
      })
    }

    if (entry.performance) {
      fs.promises.appendFile(this.performanceLogFile, logLine, 'utf8').catch(err => {
        console.error('写入性能日志失败:', err)
      })
    }
  }

  private getContext(): Record<string, any> {
    const context: Record<string, any> = {}
    this.context.forEach((value, key) => {
      context[key] = value
    })
    return context
  }

  setContext(key: string, value: any): void {
    this.context.set(key, value)
  }

  clearContext(key?: string): void {
    if (key) {
      this.context.delete(key)
    } else {
      this.context.clear()
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      meta,
      context: this.getContext()
    })
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      meta,
      context: this.getContext()
    })
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      meta: {
        ...meta,
        error: error?.message,
        stack: error?.stack,
      },
      context: this.getContext()
    })
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.writeLog({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        meta,
        context: this.getContext()
      })
    }
  }

  trace(message: string, meta?: Record<string, any>): void {
    if (process.env.LOG_LEVEL === 'trace') {
      this.writeLog({
        timestamp: new Date().toISOString(),
        level: 'trace',
        message,
        meta,
        context: this.getContext()
      })
    }
  }

  performance(name: string, duration: number, meta?: Record<string, any>): void {
    const memoryUsage = process.memoryUsage()

    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Performance: ${name}`,
      meta,
      performance: {
        duration,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal
        }
      }
    })
  }

  measure<T>(name: string, fn: () => T, meta?: Record<string, any>): T {
    const startTime = performance.now()
    try {
      return fn()
    } finally {
      const duration = performance.now() - startTime
      this.performance(name, duration, meta)
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>, meta?: Record<string, any>): Promise<T> {
    const startTime = performance.now()
    try {
      return await fn()
    } finally {
      const duration = performance.now() - startTime
      this.performance(name, duration, meta)
    }
  }

  httpRequest(method: string, path: string, statusCode: number, duration: number, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `HTTP ${method} ${path} - ${statusCode}`,
      meta: {
        ...meta,
        method,
        path,
        statusCode,
        duration
      },
      performance: {
        duration
      }
    })
  }

  databaseQuery(query: string, duration: number, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: `Database Query`,
      meta: {
        ...meta,
        query: query.substring(0, 200)
      },
      performance: {
        duration
      }
    })
  }

  workflowEvent(event: string, instanceId: string, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Workflow Event: ${event}`,
      meta: {
        ...meta,
        event,
        instanceId
      }
    })
  }

  securityEvent(event: string, meta?: Record<string, any>): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: `Security Event: ${event}`,
      meta
    })
  }
}

export const logger = new Logger()
