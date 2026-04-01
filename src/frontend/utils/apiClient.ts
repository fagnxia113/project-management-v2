import { API_URL } from '../config/api'

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, any>
  timeout?: number
  retry?: number
  cache?: boolean | number
  cacheKey?: string
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 401错误处理回调
let onUnauthorized: (() => void) | null = null

// 请求拦截器
let requestInterceptors: Array<(config: RequestConfig, url: string) => RequestConfig> = []

// 响应拦截器
let responseInterceptors: Array<(response: any) => any> = []

// 缓存
const cache = new Map<string, { data: any; timestamp: number }>()

// 缓存默认过期时间（毫秒）
const DEFAULT_CACHE_TTL = 5 * 60 * 1000 // 5分钟

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export function addRequestInterceptor(interceptor: (config: RequestConfig, url: string) => RequestConfig) {
  requestInterceptors.push(interceptor)
}

export function addResponseInterceptor(interceptor: (response: any) => any) {
  responseInterceptors.push(interceptor)
}

class ApiClient {
  private baseURL: string
  private defaultTimeout: number = 30000
  private defaultRetry: number = 1

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private getAuthHeader(): Record<string, string> | undefined {
    const token = localStorage.getItem('token')
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return undefined
  }

  private buildURL(url: string, params?: Record<string, any>): string {
    let finalURL = url.startsWith('http') ? url : `${this.baseURL}${url}`
    
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        finalURL += `?${queryString}`
      }
    }
    
    return finalURL
  }

  private generateCacheKey(url: string, params?: Record<string, any>): string {
    const fullURL = this.buildURL(url, params)
    return fullURL
  }

  private getFromCache(key: string): any | null {
    const cached = cache.get(key)
    if (!cached) return null

    const ttl = DEFAULT_CACHE_TTL
    if (Date.now() - cached.timestamp > ttl) {
      cache.delete(key)
      return null
    }

    return cached.data
  }

  private setToCache(key: string, data: any, ttl?: number): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    })

    // 清理过期缓存
    this.cleanupCache()
  }

  private cleanupCache(): void {
    const now = Date.now()
    cache.forEach((value, key) => {
      if (now - value.timestamp > DEFAULT_CACHE_TTL) {
        cache.delete(key)
      }
    })
  }

  private async request<T = any>(url: string, config: RequestConfig = {}, retryCount: number = 0): Promise<T> {
    // 应用请求拦截器
    let processedConfig = { ...config }
    for (const interceptor of requestInterceptors) {
      processedConfig = interceptor(processedConfig, url)
    }

    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.defaultTimeout,
      retry = this.defaultRetry,
      cache: useCache = false,
      cacheKey: customCacheKey
    } = processedConfig

    // 检查缓存
    if (method === 'GET' && useCache) {
      const cacheKey = customCacheKey || this.generateCacheKey(url, params)
      const cachedData = this.getFromCache(cacheKey)
      if (cachedData) {
        return cachedData as T
      }
    }

    const fullURL = this.buildURL(url, params)
    const authHeader = this.getAuthHeader()

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
      ...authHeader
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(fullURL, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const text = await response.text()
      
      if (response.status === 401) {
        // 401错误，调用登出回调
        if (onUnauthorized) {
          onUnauthorized()
        }
        throw new ApiError('未授权，请重新登录', 401, 'UNAUTHORIZED')
      }
      
      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = text ? JSON.parse(text) : {}
        } catch (e) {
          errorData = { message: text || '请求失败' }
        }
        throw new ApiError(
          errorData.error || errorData.message || '请求失败',
          response.status,
          errorData.error
        )
      }

      if (!text) {
        throw new ApiError('响应为空', response.status, 'EMPTY_RESPONSE')
      }

      let data: ApiResponse<T> = JSON.parse(text)

      // 应用响应拦截器
      for (const interceptor of responseInterceptors) {
        const interceptedData = interceptor(data)
        if (interceptedData) {
          data = interceptedData
        }
      }

      if (!data.success) {
        throw new ApiError(
          data.error || data.message || '操作失败',
          response.status,
          data.error
        )
      }

      // 缓存响应
      if (method === 'GET' && useCache) {
        const cacheKey = customCacheKey || this.generateCacheKey(url, params)
        this.setToCache(cacheKey, data.data)
      }

      return data.data as T
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new ApiError('请求超时', 408, 'TIMEOUT')
      }

      if (error instanceof ApiError) {
        // 网络错误且未达到最大重试次数，进行重试
        if ((error.code === 'NETWORK_ERROR' || error.statusCode === 408) && retryCount < retry) {
          console.log(`请求失败，正在重试 (${retryCount + 1}/${retry})...`)
          // 指数退避
          const delay = Math.pow(2, retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.request<T>(url, config, retryCount + 1)
        }
        throw error
      }

      if (error instanceof SyntaxError) {
        throw new ApiError('响应解析失败', 500, 'PARSE_ERROR')
      }

      // 网络错误且未达到最大重试次数，进行重试
      if (retryCount < retry) {
        console.log(`网络错误，正在重试 (${retryCount + 1}/${retry})...`)
        // 指数退避
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request<T>(url, config, retryCount + 1)
      }

      throw new ApiError(
        error.message || '网络错误',
        0,
        'NETWORK_ERROR'
      )
    }
  }

  async get<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' })
  }

  async post<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.request<T>(url, { ...config, method: 'POST', body: data })
  }

  async put<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.request<T>(url, { ...config, method: 'PUT', body: data })
  }

  async patch<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.request<T>(url, { ...config, method: 'PATCH', body: data })
  }

  async delete<T = any>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' })
  }

  async upload<T = any>(url: string, formData: FormData, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    // 应用请求拦截器
    let processedConfig = { ...config }
    for (const interceptor of requestInterceptors) {
      processedConfig = interceptor(processedConfig, url)
    }

    const authHeader = this.getAuthHeader()
    const fullURL = this.buildURL(url, processedConfig?.params)

    const requestHeaders: Record<string, string> = {
      ...processedConfig?.headers,
      ...authHeader
    }

    const timeout = processedConfig?.timeout || this.defaultTimeout
    const retry = processedConfig?.retry || this.defaultRetry

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      let data: ApiResponse<T> = await response.json()

      // 应用响应拦截器
      for (const interceptor of responseInterceptors) {
        const interceptedData = interceptor(data)
        if (interceptedData) {
          data = interceptedData
        }
      }

      if (!response.ok || !data.success) {
        throw new ApiError(
          data.error || data.message || '上传失败',
          response.status,
          data.error
        )
      }

      return data.data as T
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new ApiError('上传超时', 408, 'TIMEOUT')
      }

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError(
        error.message || '网络错误',
        0,
        'NETWORK_ERROR'
      )
    }
  }

  // 清除缓存
  clearCache(): void {
    cache.clear()
  }

  // 清除特定缓存
  clearCacheByKey(key: string): void {
    cache.delete(key)
  }
}

export const apiClient = new ApiClient(API_URL.BASE)
export { ApiError }
export type { ApiResponse, RequestConfig }
