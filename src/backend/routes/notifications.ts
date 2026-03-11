/**
 * 通知路由 (v2 重构版)
 * 对照 SYSTEM_DESIGN.md 第 7.2.8 节，完整实现所有通知接口
 * 修复：
 *  - unread-count 中 req.user.userId vs req.user.id 字段不一致
 *  - read-all 从 body 取 user_id 改为从认证 token 取（安全）
 *  - 新增 DELETE /notifications/:id
 *  - 新增 GET /notifications/:id
 *  - PUT /notifications/:id/read（原为 POST，改为 PUT 符合 REST 规范）
 */
import { Router, Request, Response } from 'express'
import { notificationRepository } from '../repository/NotificationRepository.js'
import { progressAlertService } from '../services/ProgressAlertService.js'
import { dailyReportReminderService } from '../services/DailyReportReminderService.js'
import { schedulerService } from '../services/SchedulerService.js'
import { purchaseReminderService } from '../services/PurchaseReminderService.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { prisma } from '../database/prisma.js'

const router = Router()
router.use(authenticate)

// =====================================================================
// 通知 CRUD（对照设计文档 7.2.8）
// =====================================================================

/**
 * GET /api/notifications
 * 获取当前用户通知列表（支持 is_read / type / limit 过滤）
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { is_read, type, limit, page, pageSize } = req.query
    const userId = req.user!.id

    const result = await notificationRepository.findByUser(userId, {
      is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
      type: typeof type === 'string' ? type : undefined,
      limit: typeof limit === 'string' ? parseInt(limit) : undefined,
      page: typeof page === 'string' ? parseInt(page) : 1,
      pageSize: typeof pageSize === 'string' ? parseInt(pageSize) : 20
    })

    res.json({ success: true, data: result.data, total: result.total })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/notifications/unread-count
 * 获取未读通知数量
 * 修复：原代码用 req.user!.userId（undefined），统一改为 req.user!.id
 */
router.get('/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const count = await notificationRepository.getUnreadCount(userId)
    res.json({ success: true, data: { count } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/notifications/:id
 * 获取通知详情（新增接口）
 */
router.get('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const notification = await notificationRepository.findById(req.params.id)
    if (!notification) {
      return res.status(404).json({ success: false, error: '通知不存在' })
    }
    res.json({ success: true, data: notification })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/notifications/:id/read
 * 标记单条通知为已读（改为 PUT，符合 REST 规范）
 */
router.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await notificationRepository.markAsRead(req.params.id)
    res.json({ success: true, message: '已标记为已读' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/notifications/read-all
 * 全部标记为已读
 * 修复：不再从 body 取 user_id，改为从认证 token 取（安全，防止越权）
 */
router.put('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id   // ✅ 修复：不再信任 body.user_id
    await notificationRepository.markAllAsRead(userId)
    res.json({ success: true, message: '已全部标记为已读' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/notifications/:id
 * 删除通知（新增接口，对照设计文档）
 */
router.delete('/notifications/:id', async (req: Request, res: Response) => {
  try {
    await notificationRepository.delete(req.params.id)
    res.json({ success: true, message: '通知已删除' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// =====================================================================
// 兼容：保留旧路由（POST /notifications/:id/read）
// =====================================================================
router.post('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await notificationRepository.markAsRead(req.params.id)
    res.json({ success: true, message: '已标记为已读' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    // 兼容旧 body.user_id，但优先用 token 中的 id
    const userId = req.user!.id || req.body.user_id
    if (!userId) return res.status(400).json({ success: false, error: '缺少用户ID' })
    await notificationRepository.markAllAsRead(userId)
    res.json({ success: true, message: '已全部标记为已读' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// =====================================================================
// 进度预警（使用 Prisma 直接查询，补全 ProgressAlertService 缺少的方法）
// =====================================================================

router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { project_id, entity_type, alert_level, status } = req.query
    // ProgressAlertService 没有 getAlerts 方法，直接用 Prisma 查询
    const where: any = {}
    if (typeof project_id === 'string') where.project_id = project_id
    if (typeof entity_type === 'string') where.entity_type = entity_type
    if (typeof alert_level === 'string') where.alert_level = alert_level
    if (typeof status === 'string') where.status = status

    const alerts = await (prisma.progress_alerts as any).findMany({
      where,
      orderBy: { created_at: 'desc' }
    })
    res.json({ success: true, data: alerts })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/alerts/check', async (req: Request, res: Response) => {
  try {
    const result = await progressAlertService.runScheduledCheck()
    res.json({
      success: true,
      data: {
        phase_alerts: result.phases.length,
        task_alerts: result.tasks.length,
        total_alerts: result.phases.length + result.tasks.length
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { acknowledged_by } = req.body
    if (!acknowledged_by) return res.status(400).json({ error: '缺少确认人ID' })
    // 直接用 Prisma 更新，不依赖 Service 未实现的方法
    await prisma.progress_alerts.update({
      where: { id: req.params.id },
      data: {
        status: 'acknowledged',
        acknowledged_by,
        acknowledged_at: new Date()
      }
    })
    res.json({ success: true, message: '预警已确认' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { resolution_note } = req.body
    if (!resolution_note) return res.status(400).json({ error: '缺少解决说明' })
    await prisma.progress_alerts.update({
      where: { id: req.params.id },
      data: {
        status: 'resolved',
        resolution_note,
        resolved_at: new Date()
      }
    })
    res.json({ success: true, message: '预警已解决' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// =====================================================================
// 日报提醒（原有功能，保留不动）
// =====================================================================

router.get('/daily-reports/status', async (req: Request, res: Response) => {
  try {
    const statuses = await dailyReportReminderService.getTodayReportStatus(req.query.project_id as string)
    res.json({ success: true, data: statuses })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/daily-reports/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = await dailyReportReminderService.getReportStatistics(req.query.date as string)
    res.json({ success: true, data: statistics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/daily-reports/remind', async (req: Request, res: Response) => {
  try {
    const result = await dailyReportReminderService.sendDailyReportReminder(req.body.project_id)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/daily-reports/remind-all', async (req: Request, res: Response) => {
  try {
    const result = await dailyReportReminderService.remindAllUnsubmitted()
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/daily-reports/history', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7
    const history = await dailyReportReminderService.getHistoricalSubmissionRate(days)
    res.json({ success: true, data: history })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// =====================================================================
// 调度器（原有功能）
// =====================================================================

router.get('/scheduler/status', async (req: Request, res: Response) => {
  try {
    const status = schedulerService.getStatus()
    res.json({ success: true, data: status })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/scheduler/trigger', async (req: Request, res: Response) => {
  try {
    const { task_type } = req.body
    if (!task_type) return res.status(400).json({ error: '缺少任务类型' })
    const result = await schedulerService.triggerTask(task_type)
    res.json({ success: result.success, message: result.message })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// =====================================================================
// 采购提醒（原有功能）
// =====================================================================

router.get('/purchase/check-inventory', async (req: Request, res: Response) => {
  try {
    const result = await purchaseReminderService.checkInventoryAndRemind()
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/purchase/requests', async (req: Request, res: Response) => {
  try {
    const { status, project_id, requester_id } = req.query
    const requests = await purchaseReminderService.getPurchaseRequests({
      status: status as string,
      project_id: project_id as string,
      requester_id: requester_id as string
    })
    res.json({ success: true, data: requests })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/purchase/requests', async (req: Request, res: Response) => {
  try {
    const request = await purchaseReminderService.createPurchaseRequest(req.body)
    res.status(201).json({ success: true, data: request })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/purchase/requests/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body as { status: string; notes?: string }
    if (!status) return res.status(400).json({ error: '缺少状态' })
    await purchaseReminderService.updatePurchaseRequestStatus(req.params.id, status, notes)
    res.json({ success: true, message: '状态更新成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
