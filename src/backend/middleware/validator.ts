import { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../errors/AppError.js'

export interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
  items?: ValidationRule[]
  properties?: ValidationRule[]
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
      this.validateField(data, rule, '', errors)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private validateField(data: any, rule: ValidationRule, parentField: string, errors: Array<{ field: string; message: string }>) {
    const fieldPath = parentField ? `${parentField}.${rule.field}` : rule.field
    const value = this.getValueByPath(data, rule.field)

    if (rule.required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
      errors.push({ field: fieldPath, message: `${fieldPath} 是必填项` })
      return
    }

    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return
    }

    const typeError = this.validateType(value, rule, fieldPath)
    if (typeError) {
      errors.push({ field: fieldPath, message: typeError })
      return
    }

    const lengthError = this.validateLength(value, rule, fieldPath)
    if (lengthError) {
      errors.push({ field: fieldPath, message: lengthError })
      return
    }

    const rangeError = this.validateRange(value, rule, fieldPath)
    if (rangeError) {
      errors.push({ field: fieldPath, message: rangeError })
      return
    }

    const patternError = this.validatePattern(value, rule, fieldPath)
    if (patternError) {
      errors.push({ field: fieldPath, message: patternError })
      return
    }

    const enumError = this.validateEnum(value, rule, fieldPath)
    if (enumError) {
      errors.push({ field: fieldPath, message: enumError })
      return
    }

    if (rule.custom) {
      const customResult = rule.custom(value)
      if (customResult !== true) {
        errors.push({ 
          field: fieldPath, 
          message: typeof customResult === 'string' ? customResult : `${fieldPath} 验证失败` 
        })
        return
      }
    }

    // 验证数组项
    if (rule.type === 'array' && Array.isArray(value) && rule.items) {
      value.forEach((item, index) => {
        rule.items!.forEach(itemRule => {
          this.validateField(item, { ...itemRule, field: index.toString() }, fieldPath, errors)
        })
      })
    }

    // 验证对象属性
    if (rule.type === 'object' && typeof value === 'object' && rule.properties) {
      rule.properties.forEach(propRule => {
        this.validateField(value, propRule, fieldPath, errors)
      })
    }
  }

  private getValueByPath(data: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, data)
  }

  private validateType(value: any, rule: ValidationRule, fieldPath: string): string | null {
    if (!rule.type) return null

    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${fieldPath} 必须是字符串`
        }
        break
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${fieldPath} 必须是数字`
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${fieldPath} 必须是布尔值`
        }
        break
      case 'array':
        if (!Array.isArray(value)) {
          return `${fieldPath} 必须是数组`
        }
        break
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `${fieldPath} 必须是对象`
        }
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return `${fieldPath} 必须是有效的邮箱地址`
        }
        break
      case 'url':
        try {
          new URL(value)
        } catch {
          return `${fieldPath} 必须是有效的URL`
        }
        break
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(value)) {
          return `${fieldPath} 必须是有效的UUID`
        }
        break
      case 'date':
        if (isNaN(Date.parse(value))) {
          return `${fieldPath} 必须是有效的日期`
        }
        break
    }

    return null
  }

  private validateLength(value: any, rule: ValidationRule, fieldPath: string): string | null {
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `${fieldPath} 长度不能少于 ${rule.minLength} 个字符`
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `${fieldPath} 长度不能超过 ${rule.maxLength} 个字符`
      }
    } else if (Array.isArray(value)) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `${fieldPath} 数组长度不能少于 ${rule.minLength} 个元素`
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `${fieldPath} 数组长度不能超过 ${rule.maxLength} 个元素`
      }
    }

    return null
  }

  private validateRange(value: any, rule: ValidationRule, fieldPath: string): string | null {
    if (typeof value !== 'number') return null

    if (rule.min !== undefined && value < rule.min) {
      return `${fieldPath} 不能小于 ${rule.min}`
    }

    if (rule.max !== undefined && value > rule.max) {
      return `${fieldPath} 不能大于 ${rule.max}`
    }

    return null
  }

  private validatePattern(value: any, rule: ValidationRule, fieldPath: string): string | null {
    if (!rule.pattern) return null

    if (!rule.pattern.test(value)) {
      return `${fieldPath} 格式不正确`
    }

    return null
  }

  private validateEnum(value: any, rule: ValidationRule, fieldPath: string): string | null {
    if (!rule.enum) return null

    if (!rule.enum.includes(value)) {
      return `${fieldPath} 必须是以下值之一: ${rule.enum.join(', ')}`
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
    // 转换查询参数类型
    const convertedQuery = Object.fromEntries(
      Object.entries(req.query).map(([key, value]) => {
        if (value === 'true') return [key, true]
        if (value === 'false') return [key, false]
        if (!isNaN(Number(value)) && value !== '') return [key, Number(value)]
        return [key, value]
      })
    )

    const result = validator.validate(convertedQuery)

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
