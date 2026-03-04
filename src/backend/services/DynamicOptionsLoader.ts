import { db } from '../database/connection.js'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

interface DynamicOptionsConfig {
  source: string
  labelField: string
  valueField: string
  filter?: Record<string, any>
  cacheTTL?: number
}

interface BatchLoadRequest {
  field: string
  config: DynamicOptionsConfig
  parentValue?: any
}

export class DynamicOptionsCache {
  private cache: Map<string, CacheItem<any>>
  private defaultTTL: number
  private cleanupInterval: NodeJS.Timeout | null

  constructor(defaultTTL: number = 300000) {
    this.cache = new Map()
    this.defaultTTL = defaultTTL
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) {
      return false
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  clearByPattern(pattern: string): number {
    let count = 0
    const regex = new RegExp(pattern)

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key))

    if (expiredKeys.length > 0) {
      console.log(`[DynamicOptionsCache] 清理了 ${expiredKeys.length} 个过期缓存项`)
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export class DynamicOptionsLoader {
  private cache: DynamicOptionsCache

  constructor() {
    this.cache = new DynamicOptionsCache(300000)
  }

  async loadOptions(
    config: DynamicOptionsConfig,
    parentValue?: any
  ): Promise<Array<{ label: string; value: any }>> {
    const cacheKey = this.buildCacheKey(config, parentValue)

    const cached = this.cache.get<Array<{ label: string; value: any }>>(cacheKey)
    if (cached) {
      return cached
    }

    const options = await this.fetchOptions(config, parentValue)

    this.cache.set(cacheKey, options, config.cacheTTL)

    return options
  }

  async loadOptionsBatch(
    requests: BatchLoadRequest[]
  ): Promise<Map<string, Array<{ label: string; value: any }>>> {
    const results = new Map<string, Array<{ label: string; value: any }>>()
    const uncachedRequests: BatchLoadRequest[] = []

    for (const request of requests) {
      const cacheKey = this.buildCacheKey(request.config, request.parentValue)

      const cached = this.cache.get<Array<{ label: string; value: any }>>(cacheKey)
      if (cached) {
        results.set(request.field, cached)
      } else {
        uncachedRequests.push(request)
      }
    }

    if (uncachedRequests.length > 0) {
      const batchResults = await this.fetchOptionsBatch(uncachedRequests)

      for (const request of uncachedRequests) {
        const options = batchResults.get(request.field) || []
        const cacheKey = this.buildCacheKey(request.config, request.parentValue)

        this.cache.set(cacheKey, options, request.config.cacheTTL)
        results.set(request.field, options)
      }
    }

    return results
  }

  private async fetchOptions(
    config: DynamicOptionsConfig,
    parentValue?: any
  ): Promise<Array<{ label: string; value: any }>> {
    try {
      switch (config.source) {
        case 'department':
          return await this.loadDepartments(config.filter)
        case 'position':
          return await this.loadPositions(config.filter, parentValue)
        case 'user':
          return await this.loadUsers(config.filter, parentValue)
        case 'project':
          return await this.loadProjects(config.filter)
        case 'customer':
          return await this.loadCustomers(config.filter)
        case 'equipment':
          return await this.loadEquipment(config.filter, parentValue)
        default:
          if (config.source.startsWith('custom:')) {
            return await this.loadCustomOptions(config, parentValue)
          }
          return []
      }
    } catch (error) {
      console.error(`加载动态选项失败 (${config.source}):`, error)
      return []
    }
  }

  private async fetchOptionsBatch(
    requests: BatchLoadRequest[]
  ): Promise<Map<string, Array<{ label: string; value: any }>>> {
    const results = new Map<string, Array<{ label: string; value: any }>>()

    const groupedBySource = new Map<string, BatchLoadRequest[]>()
    for (const request of requests) {
      if (!groupedBySource.has(request.config.source)) {
        groupedBySource.set(request.config.source, [])
      }
      groupedBySource.get(request.config.source)!.push(request)
    }

    for (const [source, sourceRequests] of groupedBySource.entries()) {
      try {
        switch (source) {
          case 'department':
            await this.loadDepartmentsBatch(sourceRequests, results)
            break
          case 'position':
            await this.loadPositionsBatch(sourceRequests, results)
            break
          case 'user':
            await this.loadUsersBatch(sourceRequests, results)
            break
          case 'project':
            await this.loadProjectsBatch(sourceRequests, results)
            break
          case 'customer':
            await this.loadCustomersBatch(sourceRequests, results)
            break
          case 'equipment':
            await this.loadEquipmentBatch(sourceRequests, results)
            break
          default:
            if (source.startsWith('custom:')) {
              await this.loadCustomOptionsBatch(sourceRequests, results)
            }
        }
      } catch (error) {
        console.error(`批量加载动态选项失败 (${source}):`, error)
        for (const request of sourceRequests) {
          results.set(request.field, [])
        }
      }
    }

    return results
  }

  private async loadDepartments(
    filter?: Record<string, any>
  ): Promise<Array<{ label: string; value: any }>> {
    let query = `SELECT id, name FROM departments WHERE status = 'active'`
    const params: any[] = []

    if (filter) {
      const conditions: string[] = []
      for (const [key, value] of Object.entries(filter)) {
        conditions.push(`${key} = ?`)
        params.push(value)
      }
      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`
      }
    }

    query += ` ORDER BY name ASC`

    const rows = await db.query<any[]>(query, params)
    return rows.map(row => ({
      label: row.name,
      value: row.id
    }))
  }

  private async loadDepartmentsBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    const options = await this.loadDepartments()
    for (const request of requests) {
      results.set(request.field, options)
    }
  }

  private async loadPositions(
    filter?: Record<string, any>,
    departmentId?: any
  ): Promise<Array<{ label: string; value: any }>> {
    let query = `SELECT id, name FROM positions WHERE status = 'active'`
    const params: any[] = []

    if (departmentId) {
      query += ` AND department_id = ?`
      params.push(departmentId)
    }

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        query += ` AND ${key} = ?`
        params.push(value)
      }
    }

    query += ` ORDER BY name ASC`

    const rows = await db.query<any[]>(query, params)
    return rows.map(row => ({
      label: row.name,
      value: row.id
    }))
  }

  private async loadPositionsBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    const uniqueDepartmentIds = new Set<any>()
    for (const request of requests) {
      if (request.parentValue) {
        uniqueDepartmentIds.add(request.parentValue)
      }
    }

    if (uniqueDepartmentIds.size === 0) {
      const options = await this.loadPositions()
      for (const request of requests) {
        results.set(request.field, options)
      }
    } else {
      for (const request of requests) {
        const options = await this.loadPositions(undefined, request.parentValue)
        results.set(request.field, options)
      }
    }
  }

  private async loadUsers(
    filter?: Record<string, any>,
    departmentId?: any
  ): Promise<Array<{ label: string; value: any }>> {
    let query = `SELECT id, name, username FROM users WHERE status = 'active'`
    const params: any[] = []

    if (departmentId) {
      query += ` AND department_id = ?`
      params.push(departmentId)
    }

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        query += ` AND ${key} = ?`
        params.push(value)
      }
    }

    query += ` ORDER BY name ASC`

    const rows = await db.query<any[]>(query, params)
    return rows.map(row => ({
      label: row.name || row.username,
      value: row.id
    }))
  }

  private async loadUsersBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    const options = await this.loadUsers()
    for (const request of requests) {
      results.set(request.field, options)
    }
  }

  private async loadProjects(
    filter?: Record<string, any>
  ): Promise<Array<{ label: string; value: any }>> {
    let query = `SELECT id, name FROM projects WHERE status != 'deleted'`
    const params: any[] = []

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        query += ` AND ${key} = ?`
        params.push(value)
      }
    }

    query += ` ORDER BY name ASC`

    const rows = await db.query<any[]>(query, params)
    return rows.map(row => ({
      label: row.name,
      value: row.id
    }))
  }

  private async loadProjectsBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    const options = await this.loadProjects()
    for (const request of requests) {
      results.set(request.field, options)
    }
  }

  private async loadCustomers(
    filter?: Record<string, any>
  ): Promise<Array<{ label: string; value: any }>> {
    let query = `SELECT id, name FROM customers WHERE status = 'active'`
    const params: any[] = []

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        query += ` AND ${key} = ?`
        params.push(value)
      }
    }

    query += ` ORDER BY name ASC`

    const rows = await db.query<any[]>(query, params)
    return rows.map(row => ({
      label: row.name,
      value: row.id
    }))
  }

  private async loadCustomersBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    const options = await this.loadCustomers()
    for (const request of requests) {
      results.set(request.field, options)
    }
  }

  private async loadEquipment(
    filter?: Record<string, any>,
    positionId?: any
  ): Promise<Array<{ label: string; value: any }>> {
    let query = `SELECT id, name, code FROM equipment WHERE status = 'active'`
    const params: any[] = []

    if (positionId) {
      query += ` AND position_id = ?`
      params.push(positionId)
    }

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        query += ` AND ${key} = ?`
        params.push(value)
      }
    }

    query += ` ORDER BY name ASC`

    const rows = await db.query<any[]>(query, params)
    return rows.map(row => ({
      label: `${row.code} - ${row.name}`,
      value: row.id
    }))
  }

  private async loadEquipmentBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    const uniquePositionIds = new Set<any>()
    for (const request of requests) {
      if (request.parentValue) {
        uniquePositionIds.add(request.parentValue)
      }
    }

    if (uniquePositionIds.size === 0) {
      const options = await this.loadEquipment()
      for (const request of requests) {
        results.set(request.field, options)
      }
    } else {
      for (const request of requests) {
        const options = await this.loadEquipment(undefined, request.parentValue)
        results.set(request.field, options)
      }
    }
  }

  private async loadCustomOptions(
    config: DynamicOptionsConfig,
    parentValue?: any
  ): Promise<Array<{ label: string; value: any }>> {
    const tableName = config.source.replace('custom:', '')
    let query = `SELECT ${config.labelField} as label, ${config.valueField} as value FROM ${tableName}`
    const params: any[] = []

    if (config.filter) {
      const conditions: string[] = []
      for (const [key, value] of Object.entries(config.filter)) {
        conditions.push(`${key} = ?`)
        params.push(value)
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
      }
    }

    if (parentValue) {
      query += config.filter ? ` AND` : ` WHERE`
      query += ` parent_id = ?`
      params.push(parentValue)
    }

    query += ` ORDER BY ${config.labelField} ASC`

    const rows = await db.query<any[]>(query, params)
    return rows
  }

  private async loadCustomOptionsBatch(
    requests: BatchLoadRequest[],
    results: Map<string, Array<{ label: string; value: any }>>
  ): Promise<void> {
    for (const request of requests) {
      const options = await this.loadCustomOptions(request.config, request.parentValue)
      results.set(request.field, options)
    }
  }

  private buildCacheKey(config: DynamicOptionsConfig, parentValue?: any): string {
    const filterStr = config.filter ? JSON.stringify(config.filter) : ''
    const parentStr = parentValue !== undefined ? `_${parentValue}` : ''
    return `${config.source}_${filterStr}${parentStr}`
  }

  invalidateBySource(source: string): number {
    return this.cache.clearByPattern(`^${source}_`)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats()
  }

  stop(): void {
    this.cache.stop()
  }
}

export const dynamicOptionsLoader = new DynamicOptionsLoader()
