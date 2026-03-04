import { db } from '../database/connection.js'

interface ValidationResult {
  isValid: boolean
  errors: Array<{ field: string; message: string }>
  sanitizedData: Record<string, any>
}

interface SanitizeOptions {
  stripHtml?: boolean
  trimStrings?: boolean
  maxLength?: number
  allowedTags?: string[]
}

export class FormDataValidator {
  private static instance: FormDataValidator

  private constructor() {}

  static getInstance(): FormDataValidator {
    if (!FormDataValidator.instance) {
      FormDataValidator.instance = new FormDataValidator()
    }
    return FormDataValidator.instance
  }

  sanitizeString(value: any, options: SanitizeOptions = {}): string {
    if (typeof value !== 'string') {
      return String(value)
    }

    let result = value

    if (options.trimStrings !== false) {
      result = result.trim()
    }

    if (options.stripHtml !== false) {
      result = this.stripHtmlTags(result, options.allowedTags)
    }

    if (options.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength)
    }

    return result
  }

  private stripHtmlTags(html: string, allowedTags: string[] = []): string {
    if (!html) return ''
    
    const allowed = allowedTags.join('|')
    const regex = allowed 
      ? new RegExp(`<(?!\/?(?:${allowed})\b)[^>]+>`, 'gi')
      : /<[^>]+>/gi
    
    return html.replace(regex, '')
  }

  sanitizeNumber(value: any, min?: number, max?: number): number | null {
    if (typeof value === 'number') {
      if (min !== undefined && value < min) return min
      if (max !== undefined && value > max) return max
      return value
    }

    const parsed = parseFloat(value)
    if (isNaN(parsed)) return null

    if (min !== undefined && parsed < min) return min
    if (max !== undefined && parsed > max) return max

    return parsed
  }

  sanitizeDate(value: any): Date | null {
    if (value instanceof Date) return value
    
    const parsed = new Date(value)
    if (isNaN(parsed.getTime())) return null

    return parsed
  }

  sanitizeArray(value: any, itemSanitizer?: (item: any) => any): any[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value.map(item => itemSanitizer ? itemSanitizer(item) : item)
  }

  sanitizeObject(value: any, fieldSanitizers: Record<string, (value: any) => any> = {}): Record<string, any> {
    if (typeof value !== 'object' || value === null) {
      return {}
    }

    const result: Record<string, any> = {}
    
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        if (fieldSanitizers[key]) {
          result[key] = fieldSanitizers[key](value[key])
        } else {
          result[key] = value[key]
        }
      }
    }

    return result
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  validatePhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  validateUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  validateSqlInjection(value: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION)\b)/i,
      /(--)|(\/\*)|(\*\/)/,
      /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i,
      /(\bOR\b|\bAND\b)\s*['"]?[\w\s]+['"]?\s*=\s*['"]?[\w\s]+['"]?/i,
      /;\s*(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i,
      /(\bEXEC\b|\bEXECUTE\b)/i
    ]

    return !sqlPatterns.some(pattern => pattern.test(value))
  }

  validateXss(value: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<\s*img[^>]+src\s*=\s*['"]?javascript:/gi,
      /<\s*body[^>]+on\w+\s*=/gi
    ]

    return !xssPatterns.some(pattern => pattern.test(value))
  }

  async validateBusinessData(module: string, entityType: string, businessId: string): Promise<boolean> {
    try {
      let tableName = ''
      let idField = 'id'

      switch (module) {
        case 'project':
          tableName = 'projects'
          break
        case 'equipment':
          switch (entityType) {
            case 'EquipmentInbound':
              tableName = 'equipment_inbound_orders'
              idField = 'id'
              break
            case 'EquipmentTransfer':
              tableName = 'equipment_transfer_orders'
              idField = 'id'
              break
            case 'EquipmentRepair':
              tableName = 'equipment_repairs'
              idField = 'id'
              break
            case 'EquipmentScrapSale':
              tableName = 'equipment_scrap_sales'
              idField = 'id'
              break
            default:
              return false
          }
          break
        case 'personnel':
          tableName = 'employees'
          break
        default:
          return false
      }

      const result = await db.queryOne<any>(
        `SELECT 1 FROM ${tableName} WHERE ${idField} = ? LIMIT 1`,
        [businessId]
      )

      return !!result
    } catch (error) {
      console.error('验证业务数据失败:', error)
      return false
    }
  }

  async validateUser(userId: string): Promise<boolean> {
    try {
      const result = await db.queryOne<any>(
        `SELECT 1 FROM users WHERE id = ? LIMIT 1`,
        [userId]
      )

      return !!result
    } catch (error) {
      console.error('验证用户失败:', error)
      return false
    }
  }

  async validateDepartment(departmentId: string): Promise<boolean> {
    try {
      const result = await db.queryOne<any>(
        `SELECT 1 FROM departments WHERE id = ? LIMIT 1`,
        [departmentId]
      )

      return !!result
    } catch (error) {
      console.error('验证部门失败:', error)
      return false
    }
  }

  sanitizeFormData(
    formData: Record<string, any>,
    fieldDefinitions: Array<{
      name: string
      type: string
      required?: boolean
      minLength?: number
      maxLength?: number
      min?: number
      max?: number
      pattern?: string
      stripHtml?: boolean
    }>
  ): ValidationResult {
    const errors: Array<{ field: string; message: string }> = []
    const sanitizedData: Record<string, any> = {}

    for (const field of fieldDefinitions) {
      const value = formData[field.name]
      const fieldName = field.name

      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: fieldName, message: `${fieldName}不能为空` })
        continue
      }

      if (value === undefined || value === null || value === '') {
        sanitizedData[fieldName] = value
        continue
      }

      switch (field.type) {
        case 'text':
        case 'textarea':
          const sanitizedString = this.sanitizeString(value, {
            stripHtml: field.stripHtml !== false,
            trimStrings: true,
            maxLength: field.maxLength
          })

          if (field.minLength && sanitizedString.length < field.minLength) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}长度不能少于${field.minLength}个字符` 
            })
          }

          if (field.maxLength && sanitizedString.length > field.maxLength) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}长度不能超过${field.maxLength}个字符` 
            })
          }

          if (field.pattern && !new RegExp(field.pattern).test(sanitizedString)) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}格式不正确` 
            })
          }

          if (!this.validateSqlInjection(sanitizedString)) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}包含非法字符` 
            })
          }

          if (!this.validateXss(sanitizedString)) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}包含非法内容` 
            })
          }

          sanitizedData[fieldName] = sanitizedString
          break

        case 'number':
          const sanitizedNumber = this.sanitizeNumber(value, field.min, field.max)

          if (sanitizedNumber === null) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}必须是有效的数字` 
            })
          }

          sanitizedData[fieldName] = sanitizedNumber
          break

        case 'date':
          const sanitizedDate = this.sanitizeDate(value)

          if (sanitizedDate === null) {
            errors.push({ 
              field: fieldName, 
              message: `${fieldName}必须是有效的日期` 
            })
          }

          sanitizedData[fieldName] = sanitizedDate
          break

        case 'boolean':
          sanitizedData[fieldName] = Boolean(value)
          break

        case 'select':
        case 'user':
        case 'lookup':
          sanitizedData[fieldName] = this.sanitizeString(value, {
            trimStrings: true
          })
          break

        case 'array':
          sanitizedData[fieldName] = this.sanitizeArray(value)
          break

        default:
          sanitizedData[fieldName] = value
      }
    }

    // 执行跨字段验证
    const crossFieldErrors = this.validateCrossFields(sanitizedData, fieldDefinitions)
    errors.push(...crossFieldErrors)

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    }
  }

  validateCrossFields(
    data: Record<string, any>,
    fieldDefinitions: Array<{ name: string; type: string; label?: string }>
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = []

    // 日期范围验证
    const startDateFields = ['start_date', 'startDate', 'start_time', 'startTime']
    const endDateFields = ['end_date', 'endDate', 'end_time', 'endTime']

    for (const startField of startDateFields) {
      const endField = endDateFields.find(f => f.toLowerCase().includes(startField.replace(/_date|_time|Date|Time/g, '').toLowerCase()))
      
      if (endField && data[startField] && data[endField]) {
        const start = new Date(data[startField])
        const end = new Date(data[endField])

        if (start > end) {
          const startLabel = this.getFieldLabel(startField, fieldDefinitions)
          const endLabel = this.getFieldLabel(endField, fieldDefinitions)
          errors.push({
            field: startField,
            message: `${startLabel} 必须早于 ${endLabel}`
          })
        }
      }
    }

    // 数值范围验证
    const minFields = ['min', 'minimum', 'min_value', 'minValue']
    const maxFields = ['max', 'maximum', 'max_value', 'maxValue']

    for (const minField of minFields) {
      const maxField = maxFields.find(f => f.toLowerCase().includes(minField.replace(/_/g, '').toLowerCase()))
      
      if (maxField && data[minField] !== undefined && data[maxField] !== undefined) {
        const minVal = parseFloat(data[minField])
        const maxVal = parseFloat(data[maxField])

        if (minVal > maxVal) {
          const minLabel = this.getFieldLabel(minField, fieldDefinitions)
          const maxLabel = this.getFieldLabel(maxField, fieldDefinitions)
          errors.push({
            field: minField,
            message: `${minLabel} 不能大于 ${maxLabel}`
          })
        }
      }
    }

    // 密码确认验证
    if (data.password && data.confirm_password && data.password !== data.confirm_password) {
      errors.push({
        field: 'confirm_password',
        message: '两次输入的密码不一致'
      })
    }

    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: '两次输入的密码不一致'
      })
    }

    // 邮箱确认验证
    if (data.email && data.confirm_email && data.email !== data.confirm_email) {
      errors.push({
        field: 'confirm_email',
        message: '两次输入的邮箱不一致'
      })
    }

    if (data.email && data.confirmEmail && data.email !== data.confirmEmail) {
      errors.push({
        field: 'confirmEmail',
        message: '两次输入的邮箱不一致'
      })
    }

    // 数量验证
    if (data.quantity !== undefined && data.available_quantity !== undefined) {
      const quantity = parseFloat(data.quantity)
      const available = parseFloat(data.available_quantity)

      if (quantity > available) {
        errors.push({
          field: 'quantity',
          message: `数量不能超过可用数量 (${available})`
        })
      }
    }

    // 金额验证
    if (data.amount !== undefined && data.budget !== undefined) {
      const amount = parseFloat(data.amount)
      const budget = parseFloat(data.budget)

      if (amount > budget) {
        errors.push({
          field: 'amount',
          message: `金额不能超过预算 (${budget})`
        })
      }
    }

    // 自定义验证规则
    if (data._customValidations) {
      const customErrors = this.executeCustomValidations(data._customValidations, data, fieldDefinitions)
      errors.push(...customErrors)
    }

    return errors
  }

  private getFieldLabel(fieldName: string, fieldDefinitions: Array<{ name: string; label?: string }>): string {
    const field = fieldDefinitions.find(f => f.name === fieldName)
    return field?.label || fieldName
  }

  private executeCustomValidations(
    customValidations: any[],
    data: Record<string, any>,
    fieldDefinitions: Array<{ name: string; label?: string }>
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = []

    for (const validation of customValidations) {
      try {
        const { type, fields, message, condition } = validation

        switch (type) {
          case 'sumEquals':
            const sum = fields.reduce((acc: number, field: string) => acc + (parseFloat(data[field]) || 0), 0)
            const target = parseFloat(data[validation.targetField] || 0)
            if (Math.abs(sum - target) > 0.01) {
              errors.push({
                field: fields[0],
                message: message || `字段总和 (${sum}) 必须等于 ${target}`
              })
            }
            break

          case 'sumLessThan':
            const sum1 = fields.reduce((acc: number, field: string) => acc + (parseFloat(data[field]) || 0), 0)
            const target1 = parseFloat(data[validation.targetField] || 0)
            if (sum1 > target1) {
              errors.push({
                field: fields[0],
                message: message || `字段总和 (${sum1}) 不能超过 ${target1}`
              })
            }
            break

          case 'allOrNone':
            const hasValue = fields.some((field: string) => this.hasValue(data[field]))
            const allFilled = fields.every((field: string) => this.hasValue(data[field]))
            if (hasValue && !allFilled) {
              errors.push({
                field: fields.find((f: string) => !this.hasValue(data[f]))!,
                message: message || '必须填写所有相关字段或全部不填'
              })
            }
            break

          case 'atLeastOne':
            const atLeastOne = fields.some((field: string) => this.hasValue(data[field]))
            if (!atLeastOne) {
              errors.push({
                field: fields[0],
                message: message || '至少需要填写一个字段'
              })
            }
            break

          case 'conditionalRequired':
            if (condition && this.evaluateCondition(condition, data)) {
              const requiredFields = fields.filter((f: string) => !this.hasValue(data[f]))
              if (requiredFields.length > 0) {
                errors.push({
                  field: requiredFields[0],
                  message: message || `当条件满足时，必须填写 ${requiredFields.join(', ')}`
                })
              }
            }
            break

          case 'custom':
            if (typeof validation.validator === 'function') {
              const result = validation.validator(data)
              if (!result.valid) {
                errors.push({
                  field: result.field || fields[0],
                  message: result.message || message || '自定义验证失败'
                })
              }
            }
            break
        }
      } catch (error) {
        console.error('执行自定义验证失败:', error)
      }
    }

    return errors
  }

  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    if (!condition) return false

    const { field, operator, value } = condition
    const fieldValue = data[field]

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'notEquals':
        return fieldValue !== value
      case 'greaterThan':
        return fieldValue > value
      case 'lessThan':
        return fieldValue < value
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'notContains':
        return !String(fieldValue).includes(String(value))
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue)
      default:
        return false
    }
  }

  private hasValue(value: any): boolean {
    return value !== undefined && value !== null && value !== ''
  }
}

export const formDataValidator = FormDataValidator.getInstance()
