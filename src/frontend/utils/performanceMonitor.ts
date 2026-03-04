interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceEntry {
  name: string
  startTime: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private entries: Map<string, PerformanceEntry> = new Map()
  private enabled: boolean = true
  private maxMetricsPerName: number = 100

  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.init()
    }
  }

  private init() {
    this.collectWebVitals()
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  startMeasure(name: string, metadata?: Record<string, any>): string {
    if (!this.enabled) return ''

    const entry: PerformanceEntry = {
      name,
      startTime: Date.now(),
      metadata
    }

    const id = `${name}_${entry.startTime}`
    this.entries.set(id, entry)

    return id
  }

  endMeasure(id: string): number {
    if (!this.enabled || !this.entries.has(id)) {
      return 0
    }

    const entry = this.entries.get(id)!
    const duration = Date.now() - entry.startTime

    this.recordMetric(entry.name, duration, entry.metadata)
    this.entries.delete(id)

    return duration
  }

  measure(name: string, fn: () => void | Promise<void>, metadata?: Record<string, any>): number {
    const id = this.startMeasure(name, metadata)

    const result = fn()

    if (result instanceof Promise) {
      return result.then(() => this.endMeasure(id))
    }

    return this.endMeasure(id)
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.enabled) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metrics = this.metrics.get(name)!
    metrics.push(metric)

    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift()
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || []
    }

    const allMetrics: PerformanceMetric[] = []
    this.metrics.forEach(metrics => {
      allMetrics.push(...metrics)
    })

    return allMetrics
  }

  getAverageMetric(name: string): number | null {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null

    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  getMetricStats(name: string) {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null

    const values = metrics.map(m => m.value)
    values.sort((a, b) => a - b)

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    }
  }

  clearMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name)
    } else {
      this.metrics.clear()
    }
  }

  private collectWebVitals() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart)
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart)
            this.recordMetric('first_paint', navEntry.responseStart - navEntry.fetchStart)
          } else if (entry.entryType === 'paint') {
            this.recordMetric(`paint_${entry.name}`, entry.startTime)
          } else if (entry.entryType === 'largest-contentful-paint') {
            this.recordMetric('lcp', entry.startTime)
          } else if (entry.entryType === 'first-input') {
            const fidEntry = entry as any
            this.recordMetric('fid', fidEntry.processingStart - fidEntry.startTime)
          } else if (entry.entryType === 'layout-shift') {
            const clsEntry = entry as any
            if (!clsEntry.hadRecentInput) {
              this.recordMetric('cls', clsEntry.value)
            }
          }
        }
      })

      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error)
    }
  }

  exportMetrics(): string {
    const data = {
      timestamp: Date.now(),
      metrics: Array.from(this.metrics.entries()).map(([name, metrics]) => ({
        name,
        metrics,
        stats: this.getMetricStats(name)
      }))
    }

    return JSON.stringify(data, null, 2)
  }

  async uploadMetrics(url: string, headers?: Record<string, string>): Promise<void> {
    const data = this.exportMetrics()

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: data
      })
    } catch (error) {
      console.error('Failed to upload metrics:', error)
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()

export function measurePerformance(name: string, fn: () => void | Promise<void>, metadata?: Record<string, any>) {
  return performanceMonitor.measure(name, fn, metadata)
}

export function recordMetric(name: string, value: number, metadata?: Record<string, any>) {
  performanceMonitor.recordMetric(name, value, metadata)
}

export function getPerformanceMetrics(name?: string) {
  return performanceMonitor.getMetrics(name)
}

export function getPerformanceStats(name: string) {
  return performanceMonitor.getMetricStats(name)
}
