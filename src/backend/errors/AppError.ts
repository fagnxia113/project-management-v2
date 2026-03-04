export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: any[]) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = '数据库操作失败') {
    super(message, 500)
    this.name = 'DatabaseError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = '外部服务调用失败') {
    super(message, 502)
    this.name = 'ExternalServiceError'
  }
}
