import { Request, Response, NextFunction } from 'express'

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceReport {
  sessionId: string
  userId?: string
  url?: string
  userAgent?: string
  metrics: PerformanceMetric[]
  timestamp: number
}

class PerformanceCollector {
  private metrics: Map<string, PerformanceReport[]> = new Map()
  private maxReportsPerSession: number = 100

  collectReport(sessionId: string, report: Omit<PerformanceReport, 'sessionId' | 'timestamp'>) {
    const fullReport: PerformanceReport = {
      ...report,
      sessionId,
      timestamp: Date.now()
    }

    if (!this.metrics.has(sessionId)) {
      this.metrics.set(sessionId, [])
    }

    const reports = this.metrics.get(sessionId)!
    reports.push(fullReport)

    if (reports.length > this.maxReportsPerSession) {
      reports.shift()
    }
  }

  getReports(sessionId: string): PerformanceReport[] {
    return this.metrics.get(sessionId) || []
  }

  getAllReports(): PerformanceReport[] {
    const allReports: PerformanceReport[] = []
    this.metrics.forEach(reports => {
      allReports.push(...reports)
    })
    return allReports
  }

  getMetricsByType(metricName: string): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = []
    this.metrics.forEach(reports => {
      reports.forEach(report => {
        report.metrics.forEach(metric => {
          if (metric.name === metricName) {
            allMetrics.push(metric)
          }
        })
      })
    })
    return allMetrics
  }

  clearSession(sessionId: string) {
    this.metrics.delete(sessionId)
  }

  clearAll() {
    this.metrics.clear()
  }

  getStats(metricName: string) {
    const metrics = this.getMetricsByType(metricName)
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

  exportData(): string {
    const data = {
      timestamp: Date.now(),
      totalSessions: this.metrics.size,
      totalReports: this.getAllReports().length,
      sessions: Array.from(this.metrics.entries()).map(([sessionId, reports]) => ({
        sessionId,
        reportCount: reports.length,
        reports
      }))
    }

    return JSON.stringify(data, null, 2)
  }
}

export const performanceCollector = new PerformanceCollector()

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const sessionId = req.sessionID || 'unknown'
    const userId = (req as any).user?.id

    performanceCollector.collectReport(sessionId, {
      userId,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      metrics: [
        {
          name: `http_request_${req.method.toLowerCase()}_${req.route?.path || req.path}`,
          value: duration,
          timestamp: Date.now(),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        }
      ]
    })
  })

  next()
}
