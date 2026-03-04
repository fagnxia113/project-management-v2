import React, { useState, useEffect } from 'react'
import { performanceMonitor } from '../utils/performanceMonitor'

interface PerformanceStats {
  count: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
}

export const PerformanceMonitorPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Record<string, PerformanceStats>>({})
  const [refreshInterval, setRefreshInterval] = useState(2000)

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      const allMetrics = performanceMonitor.getMetrics()
      const uniqueNames = Array.from(new Set(allMetrics.map(m => m.name)))
      
      const stats: Record<string, PerformanceStats> = {}
      uniqueNames.forEach(name => {
        const metricStats = performanceMonitor.getMetricStats(name)
        if (metricStats) {
          stats[name] = metricStats
        }
      })

      setMetrics(stats)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isOpen, refreshInterval])

  const handleExport = () => {
    const data = performanceMonitor.exportMetrics()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    performanceMonitor.clearMetrics()
    setMetrics({})
  }

  const formatValue = (value: number): string => {
    if (value < 1) {
      return `${(value * 1000).toFixed(2)}ms`
    }
    return `${value.toFixed(2)}ms`
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 10000
        }}
      >
        📊 性能监控
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '800px',
        maxHeight: '80vh',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3 style={{ margin: 0 }}>性能监控面板</h3>
        <div>
          <button onClick={handleExport} style={{ marginRight: '10px' }}>
            导出数据
          </button>
          <button onClick={handleClear} style={{ marginRight: '10px' }}>
            清除数据
          </button>
          <button onClick={() => setIsOpen(false)}>关闭</button>
        </div>
      </div>

      <div style={{ padding: '15px', borderBottom: '1px solid #dee2e6' }}>
        <label>
          刷新间隔 (ms):
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            min={500}
            max={10000}
            step={500}
            style={{ marginLeft: '10px', width: '100px' }}
          />
        </label>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
        {Object.keys(metrics).length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6c757d' }}>
            暂无性能数据
          </p>
        ) : (
          <div>
            <h4>性能指标概览</h4>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '20px'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>指标名称</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>次数</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>最小值</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>最大值</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>平均值</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>P95</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>P99</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics).map(([name, stats]) => (
                  <tr
                    key={name}
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      cursor: 'pointer',
                      backgroundColor: selectedMetric === name ? '#e9ecef' : 'transparent'
                    }}
                    onClick={() => setSelectedMetric(name)}
                  >
                    <td style={{ padding: '8px' }}>{name}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {stats.count}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatValue(stats.min)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatValue(stats.max)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatValue(stats.avg)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatValue(stats.p95)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {formatValue(stats.p99)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedMetric && (
              <div>
                <h4>{selectedMetric} - 详细数据</h4>
                <div
                  style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>时间</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>值</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>元数据</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceMonitor.getMetrics(selectedMetric).map((metric, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '8px' }}>
                            {new Date(metric.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {formatValue(metric.value)}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {metric.metadata ? JSON.stringify(metric.metadata) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
