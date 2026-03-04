import jwt from 'jsonwebtoken'
import { AuthenticationError } from '../errors/AppError.js'
import { logger } from './logger.js'

const { TokenExpiredError, JsonWebTokenError } = jwt

interface TokenPayload {
  id: string
  username: string
  name: string
  role: string
  departmentId?: string
  positionId?: string
}

interface TokenOptions {
  expiresIn?: string
}

export class JwtService {
  private secret: string
  private defaultExpiresIn: string

  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    this.defaultExpiresIn = process.env.JWT_EXPIRES_IN || '24h'

    if (this.secret === 'your-secret-key-change-in-production') {
      logger.warn('使用默认的JWT密钥，请在生产环境中设置JWT_SECRET环境变量')
    }
  }

  generateToken(payload: TokenPayload, options?: TokenOptions): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: options?.expiresIn || this.defaultExpiresIn,
    })
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload
      return decoded
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AuthenticationError('Token已过期')
      }
      if (error instanceof JsonWebTokenError) {
        throw new AuthenticationError('Token无效')
      }
      throw new AuthenticationError('Token验证失败')
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload
      return decoded
    } catch (error) {
      return null
    }
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: '7d',
    })
  }
}

export const jwtService = new JwtService()
