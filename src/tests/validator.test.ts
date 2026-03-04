import { describe, it, expect } from 'vitest'
import { Validator, ValidationRule } from '../backend/middleware/validator.js'

describe('Validator', () => {
  describe('基本验证', () => {
    it('应该验证必填字段', () => {
      const rules: ValidationRule[] = [
        { field: 'username', required: true },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ username: 'test' })
      expect(result1.valid).toBe(true)
      expect(result1.errors).toHaveLength(0)

      const result2 = validator.validate({})
      expect(result2.valid).toBe(false)
      expect(result2.errors).toHaveLength(1)
      expect(result2.errors[0].field).toBe('username')
    })

    it('应该验证字符串类型', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ name: 'test' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ name: 123 })
      expect(result2.valid).toBe(false)
    })

    it('应该验证数字类型', () => {
      const rules: ValidationRule[] = [
        { field: 'age', type: 'number' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ age: 25 })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ age: '25' })
      expect(result2.valid).toBe(false)
    })

    it('应该验证布尔类型', () => {
      const rules: ValidationRule[] = [
        { field: 'active', type: 'boolean' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ active: true })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ active: 'true' })
      expect(result2.valid).toBe(false)
    })

    it('应该验证邮箱类型', () => {
      const rules: ValidationRule[] = [
        { field: 'email', type: 'email' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ email: 'test@example.com' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ email: 'invalid-email' })
      expect(result2.valid).toBe(false)
    })

    it('应该验证URL类型', () => {
      const rules: ValidationRule[] = [
        { field: 'website', type: 'url' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ website: 'https://example.com' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ website: 'not-a-url' })
      expect(result2.valid).toBe(false)
    })

    it('应该验证UUID类型', () => {
      const rules: ValidationRule[] = [
        { field: 'id', type: 'uuid' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ id: '550e8400-e29b-41d4-a716-446655440000' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ id: 'not-a-uuid' })
      expect(result2.valid).toBe(false)
    })

    it('应该验证日期类型', () => {
      const rules: ValidationRule[] = [
        { field: 'date', type: 'date' },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ date: '2024-01-01' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ date: 'not-a-date' })
      expect(result2.valid).toBe(false)
    })
  })

  describe('长度验证', () => {
    it('应该验证最小长度', () => {
      const rules: ValidationRule[] = [
        { field: 'username', minLength: 3 },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ username: 'abc' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ username: 'ab' })
      expect(result2.valid).toBe(false)
    })

    it('应该验证最大长度', () => {
      const rules: ValidationRule[] = [
        { field: 'username', maxLength: 10 },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ username: 'abc' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ username: 'abcdefghijk' })
      expect(result2.valid).toBe(false)
    })
  })

  describe('范围验证', () => {
    it('应该验证最小值', () => {
      const rules: ValidationRule[] = [
        { field: 'age', type: 'number', min: 18 },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ age: 20 })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ age: 17 })
      expect(result2.valid).toBe(false)
    })

    it('应该验证最大值', () => {
      const rules: ValidationRule[] = [
        { field: 'age', type: 'number', max: 100 },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ age: 50 })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ age: 101 })
      expect(result2.valid).toBe(false)
    })
  })

  describe('模式验证', () => {
    it('应该验证正则表达式模式', () => {
      const rules: ValidationRule[] = [
        { field: 'phone', pattern: /^[0-9]{11}$/ },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ phone: '13800138000' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ phone: '1380013800' })
      expect(result2.valid).toBe(false)

      const result3 = validator.validate({ phone: '138001380000' })
      expect(result3.valid).toBe(false)
    })
  })

  describe('枚举验证', () => {
    it('应该验证枚举值', () => {
      const rules: ValidationRule[] = [
        { field: 'status', enum: ['active', 'inactive', 'pending'] },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ status: 'active' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ status: 'unknown' })
      expect(result2.valid).toBe(false)
    })
  })

  describe('自定义验证', () => {
    it('应该支持自定义验证函数', () => {
      const rules: ValidationRule[] = [
        {
          field: 'password',
          custom: (value) => {
            if (value.length < 8) {
              return '密码长度不能少于8位'
            }
            if (!/[A-Z]/.test(value)) {
              return '密码必须包含大写字母'
            }
            return true
          },
        },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({ password: 'Password123' })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({ password: 'pass' })
      expect(result2.valid).toBe(false)
      expect(result2.errors[0].message).toBe('密码长度不能少于8位')

      const result3 = validator.validate({ password: 'password123' })
      expect(result3.valid).toBe(false)
      expect(result3.errors[0].message).toBe('密码必须包含大写字母')
    })
  })

  describe('复杂场景', () => {
    it('应该能够验证多个字段', () => {
      const rules: ValidationRule[] = [
        { field: 'username', required: true, minLength: 3, maxLength: 20 },
        { field: 'email', required: true, type: 'email' },
        { field: 'age', type: 'number', min: 18, max: 100 },
      ]

      const validator = new Validator(rules)

      const result1 = validator.validate({
        username: 'testuser',
        email: 'test@example.com',
        age: 25,
      })
      expect(result1.valid).toBe(true)

      const result2 = validator.validate({
        username: 'te',
        email: 'invalid-email',
        age: 15,
      })
      expect(result2.valid).toBe(false)
      expect(result2.errors.length).toBeGreaterThan(0)
    })

    it('应该跳过未提供的可选字段', () => {
      const rules: ValidationRule[] = [
        { field: 'username', required: true },
        { field: 'email', type: 'email' },
      ]

      const validator = new Validator(rules)

      const result = validator.validate({ username: 'test' })
      expect(result.valid).toBe(true)
    })
  })
})
