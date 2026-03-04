import { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../errors/AppError.js'

export interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
}

export interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

export class Validator {
  private rules: ValidationRule[]

  constructor(rules: ValidationRule[]) {
    this.rules = rules
  }

  validate(data: any): ValidationResult {
    const errors: Array<{ field: string; message: string }> = []

    for (const rule of this.rules) {
      const value = data[rule.field]

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: rule.field, message: `${rule.field} 是必填项` })
        continue
      }

      if (value === undefined || value === null || value === '') {
        continue
      }

      const typeError = this.validateType(value, rule)
      if (typeError) {
        errors.push({ field: rule.field, message: typeError })
        continue
      }

      const lengthError = this.validateLength(value, rule)
      if (lengthError) {
        errors.push({ field: rule.field, message: lengthError })
        continue
      }

      const rangeError = this.validateRange(value, rule)
      if (rangeError) {
        errors.push({ field: rule.field, message: rangeError })
        continue
      }

      const patternError = this.validatePattern(value, rule)
      if (patternError) {
        errors.push({ field: rule.field, message: patternError })
        continue
      }

      const enumError = this.validateEnum(value, rule)
      if (enumError) {
        errors.push({ field: rule.field, message: enumError })
        continue
      }

      if (rule.custom) {
        const customResult = rule.custom(value)
        if (customResult !== true) {
          errors.push({ 
            field: rule.field, 
            message: typeof customResult === 'string' ? customResult : `${rule.field} 验证失败` 
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private validateType(value: any, rule: ValidationRule): string | null {
    if (!rule.type) return null

    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${rule.field} 必须是字符串`
        }
        break
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${rule.field} 必须是数字`
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${rule.field} 必须是布尔值`
        }
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return `${rule.field} 必须是有效的邮箱地址`
        }
        break
      case 'url':
        try {
          new URL(value)
        } catch {
          return `${rule.field} 必须是有效的URL`
        }
        break
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(value)) {
          return `${rule.field} 必须是有效的UUID`
        }
        break
      case 'date':
        if (isNaN(Date.parse(value))) {
          return `${rule.field} 必须是有效的日期`
        }
        break
    }

    return null
  }

  private validateLength(value: any, rule: ValidationRule): string | null {
    if (typeof value !== 'string') return null

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `${rule.field} 长度不能少于 ${rule.minLength} 个字符`
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${rule.field} 长度不能超过 ${rule.maxLength} 个字符`
    }

    return null
  }

  private validateRange(value: any, rule: ValidationRule): string | null {
    if (typeof value !== 'number') return null

    if (rule.min !== undefined && value < rule.min) {
      return `${rule.field} 不能小于 ${rule.min}`
    }

    if (rule.max !== undefined && value > rule.max) {
      return `${rule.field} 不能大于 ${rule.max}`
    }

    return null
  }

  private validatePattern(value: any, rule: ValidationRule): string | null {
    if (!rule.pattern) return null

    if (!rule.pattern.test(value)) {
      return `${rule.field} 格式不正确`
    }

    return null
  }

  private validateEnum(value: any, rule: ValidationRule): string | null {
    if (!rule.enum) return null

    if (!rule.enum.includes(value)) {
      return `${rule.field} 必须是以下值之一: ${rule.enum.join(', ')}`
    }

    return null
  }
}

export function validateBody(rules: ValidationRule[]) {
  const validator = new Validator(rules)

  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator.validate(req.body)

    if (!result.valid) {
      throw new ValidationError('请求参数验证失败', result.errors)
    }

    next()
  }
}

export function validateQuery(rules: ValidationRule[]) {
  const validator = new Validator(rules)

  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator.validate(req.query)

    if (!result.valid) {
      throw new ValidationError('查询参数验证失败', result.errors)
    }

    next()
  }
}

export function validateParams(rules: ValidationRule[]) {
  const validator = new Validator(rules)

  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator.validate(req.params)

    if (!result.valid) {
      throw new ValidationError('路径参数验证失败', result.errors)
    }

    next()
  }
}
