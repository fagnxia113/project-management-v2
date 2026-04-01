/**
 * CacheService
 *
 * 缓存服务，用于存储频繁访问的数据，减少数据库查询
 */
class CacheService {
  private cache: Map<string, {
    data: any
    timestamp: number
    ttl: number
  }> = new Map()

  private defaultTTL: number = 5 * 60 * 1000 // 默认缓存时间：5分钟

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 缓存时间（毫秒），默认5分钟
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // 清理过期缓存
    this.cleanup()
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期返回null
   */
  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param ...args 其他参数
   */
  generateKey(prefix: string, ...args: any[]): string {
    return `${prefix}:${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(':')}`
  }
}

// 导出单例
export const cacheService = new CacheService()
export { CacheService }
