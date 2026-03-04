import { Router, Request, Response } from 'express';
import { notificationService } from '../services/NotificationService.js';
import { progressAlertService } from '../services/ProgressAlertService.js';
import { dailyReportReminderService } from '../services/DailyReportReminderService.js';
import { schedulerService } from '../services/SchedulerService.js';
import { purchaseReminderService } from '../services/PurchaseReminderService.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { is_read, type, limit } = req.query;
    const userId = req.user!.userId;
    
    const notifications = await notificationService.getUserNotifications(
      userId,
      {
        is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
        type: type as any,
        limit: limit ? parseInt(limit as string) : 20
      }
    );
    
    res.json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await notificationService.markAsRead(req.params.id);
    res.json({ success: true, message: '已标记为已读' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: '缺少用户ID' });
    }
    
    await notificationService.markAllAsRead(user_id);
    res.json({ success: true, message: '已全部标记为已读' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { project_id, entity_type, alert_level, status } = req.query;
    
    const alerts = await progressAlertService.getAlerts({
      project_id: project_id as string,
      entity_type: entity_type as any,
      alert_level: alert_level as any,
      status: status as any
    });
    
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alerts/check', async (req: Request, res: Response) => {
  try {
    const result = await progressAlertService.runScheduledCheck();
    res.json({ 
      success: true, 
      data: {
        phase_alerts: result.phases.length,
        task_alerts: result.tasks.length,
        total_alerts: result.phases.length + result.tasks.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { acknowledged_by } = req.body;
    
    if (!acknowledged_by) {
      return res.status(400).json({ error: '缺少确认人ID' });
    }
    
    await progressAlertService.acknowledgeAlert(req.params.id, acknowledged_by);
    res.json({ success: true, message: '预警已确认' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { resolution_note } = req.body;
    
    if (!resolution_note) {
      return res.status(400).json({ error: '缺少解决说明' });
    }
    
    await progressAlertService.resolveAlert(req.params.id, resolution_note);
    res.json({ success: true, message: '预警已解决' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-reports/status', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;
    
    const statuses = await dailyReportReminderService.getTodayReportStatus(
      project_id as string
    );
    
    res.json({ success: true, data: statuses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-reports/statistics', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    
    const statistics = await dailyReportReminderService.getReportStatistics(
      date as string
    );
    
    res.json({ success: true, data: statistics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/daily-reports/remind', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.body;
    
    const result = await dailyReportReminderService.sendDailyReportReminder(
      project_id
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/daily-reports/remind-all', async (req: Request, res: Response) => {
  try {
    const result = await dailyReportReminderService.remindAllUnsubmitted();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-reports/history', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    
    const history = await dailyReportReminderService.getHistoricalSubmissionRate(
      days ? parseInt(days as string) : 7
    );
    
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/scheduler/status', async (req: Request, res: Response) => {
  try {
    const status = schedulerService.getStatus();
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/scheduler/trigger', async (req: Request, res: Response) => {
  try {
    const { task_type } = req.body;
    
    if (!task_type) {
      return res.status(400).json({ error: '缺少任务类型' });
    }
    
    const result = await schedulerService.triggerTask(task_type);
    res.json({ success: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/purchase/check-inventory', async (req: Request, res: Response) => {
  try {
    const result = await purchaseReminderService.checkInventoryAndRemind();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/purchase/requests', async (req: Request, res: Response) => {
  try {
    const { status, project_id, requester_id } = req.query;
    
    const requests = await purchaseReminderService.getPurchaseRequests({
      status: status as string,
      project_id: project_id as string,
      requester_id: requester_id as string
    });
    
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/purchase/requests', async (req: Request, res: Response) => {
  try {
    const request = await purchaseReminderService.createPurchaseRequest(req.body);
    res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/purchase/requests/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: '缺少状态' });
    }
    
    await purchaseReminderService.updatePurchaseRequestStatus(req.params.id, status, notes);
    res.json({ success: true, message: '状态更新成功' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
