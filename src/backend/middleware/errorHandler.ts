import { Request, Response, NextFunction } from 'express'
import { AppError, ValidationError, DatabaseError } from '../errors/AppError.js'
import { logger } from '../utils/logger.js'

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn({
      type: 'APP_ERROR',
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id,
    })

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err instanceof ValidationError && err.details && { details: err.details }),
    })
    return
  }

  if (err.name === 'ValidationError') {
    logger.warn({
      type: 'VALIDATION_ERROR',
      message: err.message,
      path: req.path,
      method: req.method,
    })

    res.status(400).json({
      success: false,
      error: '请求参数验证失败',
      message: err.message,
    })
    return
  }

  if (err.name === 'UnauthorizedError') {
    logger.warn({
      type: 'UNAUTHORIZED',
      message: err.message,
      path: req.path,
      method: req.method,
    })

    res.status(401).json({
      success: false,
      error: '未授权访问',
    })
    return
  }

  logger.error('未预期的错误', err, {
    type: 'UNEXPECTED_ERROR',
    name: err.name,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  })

  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({
    type: 'NOT_FOUND',
    path: req.path,
    method: req.method,
  })

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `路径 ${req.path} 不存在`,
  })
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
