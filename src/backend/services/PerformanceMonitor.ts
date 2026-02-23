import { EventEmitter } from 'events';

// 性能指标
interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

// 性能统计
interface PerformanceStats {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
}

// 性能监控服务
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private eventBus: EventEmitter;
  private readonly maxMetricsSize = 10000;
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    this.eventBus = new EventEmitter();
    this.startCleanupTimer();
  }

  // 记录性能指标
  record(operation: string, duration: number, success: boolean = true, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      metadata
    };

    this.metrics.push(metric);

    // 检查是否需要触发告警
    this.checkAlert(operation, duration);

    // 限制指标数量
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // 触发实时事件
    this.eventBus.emit('metric.recorded', metric);
  }

  // 记录操作时间
  async measure<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.record(operation, duration, true, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.record(operation, duration, false, { ...metadata, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // 获取性能统计
  getStats(timeWindow?: number): Record<string, PerformanceStats> {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const filteredMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    const grouped = this.groupByOperation(filteredMetrics);
    const stats: Record<string, PerformanceStats> = {};

    for (const [operation, metrics] of grouped) {
      stats[operation] = this.calculateStats(operation, metrics);
    }

    return stats;
  }

  // 获取特定操作的统计
  getOperationStats(operation: string, timeWindow?: number): PerformanceStats | null {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const metrics = this.metrics.filter(
      m => m.operation === operation && m.timestamp >= cutoffTime
    );

    if (metrics.length === 0) return null;

    return this.calculateStats(operation, metrics);
  }

  // 设置告警阈值
  setAlertThreshold(operation: string, thresholdMs: number): void {
    this.alertThresholds.set(operation, thresholdMs);
  }

  // 移除告警阈值
  removeAlertThreshold(operation: string): void {
    this.alertThresholds.delete(operation);
  }

  // 订阅告警
  onAlert(callback: (alert: { operation: string; duration: number; threshold: number; timestamp: number }) => void): void {
    this.eventBus.on('alert', callback);
  }

  // 订阅指标记录
  onMetricRecorded(callback: (metric: PerformanceMetric) => void): void {
    this.eventBus.on('metric.recorded', callback);
  }

  // 获取实时指标
  getRealtimeMetrics(): {
    totalOperations: number;
    avgResponseTime: number;
    errorRate: number;
    throughput: number; // 每秒操作数
  } {
    const oneMinuteAgo = Date.now() - 60000;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneMinuteAgo);

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        avgResponseTime: 0,
        errorRate: 0,
        throughput: 0
      };
    }

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const errorCount = recentMetrics.filter(m => !m.success).length;

    return {
      totalOperations: recentMetrics.length,
      avgResponseTime: totalDuration / recentMetrics.length,
      errorRate: errorCount / recentMetrics.length,
      throughput: recentMetrics.length / 60 // 每秒
    };
  }

  // 获取趋势数据
  getTrendData(operation: string, intervalMinutes: number = 5, periods: number = 12): {
    timestamps: number[];
    avgDurations: number[];
    throughputs: number[];
    errorRates: number[];
  } {
    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;
    
    const timestamps: number[] = [];
    const avgDurations: number[] = [];
    const throughputs: number[] = [];
    const errorRates: number[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const startTime = now - (i + 1) * intervalMs;
      const endTime = now - i * intervalMs;

      const periodMetrics = this.metrics.filter(
        m => m.operation === operation && m.timestamp >= startTime && m.timestamp < endTime
      );

      timestamps.push(endTime);

      if (periodMetrics.length === 0) {
        avgDurations.push(0);
        throughputs.push(0);
        errorRates.push(0);
      } else {
        const totalDuration = periodMetrics.reduce((sum, m) => sum + m.duration, 0);
        const errorCount = periodMetrics.filter(m => !m.success).length;

        avgDurations.push(totalDuration / periodMetrics.length);
        throughputs.push(periodMetrics.length / (intervalMinutes * 60));
        errorRates.push(errorCount / periodMetrics.length);
      }
    }

    return { timestamps, avgDurations, throughputs, errorRates };
  }

  // 生成性能报告
  generateReport(): {
    summary: {
      totalOperations: number;
      overallAvgDuration: number;
      overallErrorRate: number;
      topSlowestOperations: string[];
    };
    details: Record<string, PerformanceStats>;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const allMetrics = Object.values(stats);

    // 计算总体指标
    const totalOperations = allMetrics.reduce((sum, s) => sum + s.count, 0);
    const overallAvgDuration = allMetrics.reduce((sum, s) => sum + s.avgDuration * s.count, 0) / totalOperations;
    const overallErrorRate = allMetrics.reduce((sum, s) => sum + s.errorRate * s.count, 0) / totalOperations;

    // 找出最慢的操作
    const topSlowestOperations = allMetrics
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5)
      .map(s => s.operation);

    // 生成建议
    const recommendations: string[] = [];

    for (const [operation, stat] of Object.entries(stats)) {
      if (stat.avgDuration > 1000) {
        recommendations.push(`操作 "${operation}" 平均响应时间超过1秒，建议优化`);
      }
      if (stat.errorRate > 0.05) {
        recommendations.push(`操作 "${operation}" 错误率超过5%，需要检查`);
      }
      if (stat.p95Duration > stat.avgDuration * 3) {
        recommendations.push(`操作 "${operation}" P95延迟明显高于平均值，可能存在性能瓶颈`);
      }
    }

    return {
      summary: {
        totalOperations,
        overallAvgDuration,
        overallErrorRate,
        topSlowestOperations
      },
      details: stats,
      recommendations
    };
  }

  // 清除历史数据
  clear(): void {
    this.metrics = [];
  }

  // 按操作分组
  private groupByOperation(metrics: PerformanceMetric[]): Map<string, PerformanceMetric[]> {
    const grouped = new Map<string, PerformanceMetric[]>();

    for (const metric of metrics) {
      if (!grouped.has(metric.operation)) {
        grouped.set(metric.operation, []);
      }
      grouped.get(metric.operation)!.push(metric);
    }

    return grouped;
  }

  // 计算统计信息
  private calculateStats(operation: string, metrics: PerformanceMetric[]): PerformanceStats {
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const errorCount = metrics.filter(m => !m.success).length;

    const count = durations.length;
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / count;
    const minDuration = durations[0];
    const maxDuration = durations[count - 1];

    // 计算百分位数
    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      operation,
      count,
      avgDuration,
      minDuration,
      maxDuration,
      p50Duration: durations[p50Index],
      p95Duration: durations[p95Index] || durations[count - 1],
      p99Duration: durations[p99Index] || durations[count - 1],
      errorRate: errorCount / count
    };
  }

  // 检查告警
  private checkAlert(operation: string, duration: number): void {
    const threshold = this.alertThresholds.get(operation);
    if (threshold && duration > threshold) {
      this.eventBus.emit('alert', {
        operation,
        duration,
        threshold,
        timestamp: Date.now()
      });
    }
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    // 每小时清理一次超过24小时的数据
    setInterval(() => {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
      this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    }, 60 * 60 * 1000);
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();
