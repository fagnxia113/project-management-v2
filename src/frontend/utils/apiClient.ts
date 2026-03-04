import { API_URL } from '../config/api'

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, any>
  timeout?: number
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

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

class ApiClient {
  private baseURL: string
  private defaultTimeout: number = 30000

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

  private async request<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.defaultTimeout
    } = config

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

      const data: ApiResponse<T> = JSON.parse(text)

      if (!data.success) {
        throw new ApiError(
          data.error || data.message || '操作失败',
          response.status,
          data.error
        )
      }

      return data.data as T
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new ApiError('请求超时', 408, 'TIMEOUT')
      }

      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof SyntaxError) {
        throw new ApiError('响应解析失败', 500, 'PARSE_ERROR')
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
    const authHeader = this.getAuthHeader()
    const fullURL = this.buildURL(url, config?.params)

    const requestHeaders: Record<string, string> = {
      ...config?.headers,
      ...authHeader
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || this.defaultTimeout)

    try {
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data: ApiResponse<T> = await response.json()

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
}

export const apiClient = new ApiClient(API_URL.BASE)
export { ApiError }
export type { ApiResponse, RequestConfig }
