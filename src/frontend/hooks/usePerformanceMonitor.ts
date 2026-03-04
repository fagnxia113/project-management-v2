import { useEffect, useRef } from 'react'
import { performanceMonitor } from '../utils/performanceMonitor'

export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0)
  const mountTimeRef = useRef(Date.now())

  useEffect(() => {
    renderCountRef.current++

    if (renderCountRef.current === 1) {
      const mountTime = Date.now() - mountTimeRef.current
      performanceMonitor.recordMetric(`component_mount_${componentName}`, mountTime)
    } else {
      performanceMonitor.recordMetric(`component_render_${componentName}`, 1)
    }
  })

  useEffect(() => {
    return () => {
      const unmountTime = Date.now() - mountTimeRef.current
      performanceMonitor.recordMetric(`component_unmount_${componentName}`, unmountTime)
    }
  }, [componentName])

  const measureAsync = async <T,>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const id = performanceMonitor.startMeasure(`${componentName}_${name}`, metadata)
    try {
      return await fn()
    } finally {
      performanceMonitor.endMeasure(id)
    }
  }

  const measureSync = <T,>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T => {
    const id = performanceMonitor.startMeasure(`${componentName}_${name}`, metadata)
    try {
      return fn()
    } finally {
      performanceMonitor.endMeasure(id)
    }
  }

  return {
    measureAsync,
    measureSync,
    renderCount: renderCountRef.current
  }
}

export function usePerformanceMeasure(name: string, enabled: boolean = true) {
  const startTimeRef = useRef<number>()

  useEffect(() => {
    if (enabled) {
      startTimeRef.current = performance.now()
    }
  }, [name, enabled])

  const end = () => {
    if (enabled && startTimeRef.current !== undefined) {
      const duration = performance.now() - startTimeRef.current
      performanceMonitor.recordMetric(name, duration)
      return duration
    }
    return 0
  }

  return { end }
}
