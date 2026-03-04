import express from 'express'
import { performanceCollector } from '../middleware/performanceMiddleware'

const router = express.Router()

router.get('/stats/:metricName', (req, res) => {
  try {
    const { metricName } = req.params
    const stats = performanceCollector.getStats(metricName)

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: '未找到指定指标的数据'
      })
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

router.get('/metrics/:metricName', (req, res) => {
  try {
    const { metricName } = req.params
    const metrics = performanceCollector.getMetricsByType(metricName)

    res.json({
      success: true,
      data: metrics
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params
    const reports = performanceCollector.getReports(sessionId)

    res.json({
      success: true,
      data: reports
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

router.get('/export', (req, res) => {
  try {
    const data = performanceCollector.exportData()

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename=performance-data-${Date.now()}.json`)
    res.send(data)
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params
    performanceCollector.clearSession(sessionId)

    res.json({
      success: true,
      message: '会话数据已清除'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

router.delete('/all', (req, res) => {
  try {
    performanceCollector.clearAll()

    res.json({
      success: true,
      message: '所有性能数据已清除'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
