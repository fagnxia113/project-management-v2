import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JwtService } from '../backend/utils/jwt.js'

describe('JwtService', () => {
  let jwtService: JwtService

  beforeEach(() => {
    jwtService = new JwtService()
  })

  it('应该能够生成有效的 token', () => {
    const payload = {
      id: 'user-123',
      username: 'testuser',
      name: '测试用户',
      role: 'admin',
    }

    const token = jwtService.generateToken(payload)

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('应该能够验证有效的 token', () => {
    const payload = {
      id: 'user-123',
      username: 'testuser',
      name: '测试用户',
      role: 'admin',
    }

    const token = jwtService.generateToken(payload)
    const decoded = jwtService.verifyToken(token)

    expect(decoded).toBeDefined()
    expect(decoded.id).toBe(payload.id)
    expect(decoded.username).toBe(payload.username)
    expect(decoded.name).toBe(payload.name)
    expect(decoded.role).toBe(payload.role)
  })

  it('应该能够验证过期的 token', () => {
    const payload = {
      id: 'user-123',
      username: 'testuser',
      name: '测试用户',
      role: 'admin',
    }

    const token = jwtService.generateToken(payload, { expiresIn: '-1s' })

    expect(() => {
      jwtService.verifyToken(token)
    }).toThrow('Token已过期')
  })

  it('应该能够拒绝无效的 token', () => {
    const invalidToken = 'invalid.token.here'

    expect(() => {
      jwtService.verifyToken(invalidToken)
    }).toThrow('Token无效')
  })

  it('应该能够使用自定义过期时间生成 token', () => {
    const payload = {
      id: 'user-123',
      username: 'testuser',
      name: '测试用户',
      role: 'admin',
    }

    const token = jwtService.generateToken(payload, { expiresIn: '1h' })
    const decoded = jwtService.verifyToken(token)

    expect(decoded).toBeDefined()
    expect(decoded.id).toBe(payload.id)
  })
})
