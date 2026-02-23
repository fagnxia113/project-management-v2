import { progressAlertService } from './ProgressAlertService.js';
import { dailyReportReminderService } from './DailyReportReminderService.js';
import { db } from '../database/connection.js';

type ScheduledTaskType = 'progress_check' | 'daily_report_reminder' | 'equipment_maintenance_check';

interface ScheduledTask {
  id: string;
  type: ScheduledTaskType;
  cron_expression: string;
  last_run: Date | null;
  next_run: Date | null;
  status: 'active' | 'paused';
  config: Record<string, any>;
}

export class SchedulerService {
  private tasks: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  /**
   * 启动调度服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SchedulerService] 调度服务已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('[SchedulerService] 启动调度服务...');

    // 加载并启动所有活动任务
    await this.loadTasks();

    console.log('[SchedulerService] 调度服务启动完成');
  }

  /**
   * 停止调度服务
   */
  stop(): void {
    console.log('[SchedulerService] 停止调度服务...');

    this.tasks.forEach((timer, taskId) => {
      clearInterval(timer);
      console.log(`[SchedulerService] 已停止任务: ${taskId}`);
    });

    this.tasks.clear();
    this.isRunning = false;

    console.log('[SchedulerService] 调度服务已停止');
  }

  /**
   * 加载任务配置
   */
  private async loadTasks(): Promise<void> {
    // 进度检查 - 每小时执行一次
    this.scheduleTask('progress_check', 60 * 60 * 1000, async () => {
      console.log('[SchedulerService] 执行进度偏离检查...');
      try {
        const result = await progressAlertService.runScheduledCheck();
        console.log(`[SchedulerService] 进度检查完成: 阶段预警 ${result.phases.length} 个, 任务预警 ${result.tasks.length} 个`);
      } catch (error) {
        console.error('[SchedulerService] 进度检查失败:', error);
      }
    });

    // 日报提醒 - 每天18:00执行
    this.scheduleDailyTask(18, 0, async () => {
      console.log('[SchedulerService] 执行日报提醒...');
      try {
        const result = await dailyReportReminderService.sendDailyReportReminder();
        console.log(`[SchedulerService] 日报提醒完成: 已发送 ${result.total_reminded} 条提醒`);
      } catch (error) {
        console.error('[SchedulerService] 日报提醒失败:', error);
      }
    });

    // 设备维护检查 - 每天上午9:00执行
    this.scheduleDailyTask(9, 0, async () => {
      console.log('[SchedulerService] 执行设备维护检查...');
      try {
        await this.checkEquipmentMaintenance();
      } catch (error) {
        console.error('[SchedulerService] 设备维护检查失败:', error);
      }
    });
  }

  /**
   * 调度间隔任务
   */
  private scheduleTask(taskId: string, intervalMs: number, callback: () => Promise<void>): void {
    // 立即执行一次
    callback();

    // 设置定时执行
    const timer = setInterval(callback, intervalMs);
    this.tasks.set(taskId, timer);

    console.log(`[SchedulerService] 已调度任务: ${taskId}, 间隔: ${intervalMs / 1000}秒`);
  }

  /**
   * 调度每日定时任务
   */
  private scheduleDailyTask(hour: number, minute: number, callback: () => Promise<void>): void {
    const execute = async () => {
      const now = new Date();
      const targetTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0
      );

      // 如果目标时间已过，设置为明天
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const delay = targetTime.getTime() - now.getTime();

      console.log(`[SchedulerService] 下次执行时间: ${targetTime.toLocaleString('zh-CN')}`);

      setTimeout(async () => {
        await callback();
        // 执行完后设置下一次
        execute();
      }, delay);
    };

    execute();
  }

  /**
   * 检查设备维护状态
   */
  private async checkEquipmentMaintenance(): Promise<void> {
    // 检查即将过期的校准证书（30天内）
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiringCalibrations = await db.query<{
      id: string;
      name: string;
      manage_code: string;
      calibration_expiry: Date;
    }>(
      `SELECT i.id, m.name, i.manage_code, i.calibration_expiry 
       FROM equipment_instances i
       JOIN equipment_models m ON i.model_id = m.id
       WHERE i.calibration_expiry IS NOT NULL 
       AND i.calibration_expiry <= ? 
       AND i.calibration_expiry > NOW()`,
      [thirtyDaysLater]
    );

    if (expiringCalibrations.length > 0) {
      console.log(`[SchedulerService] 发现 ${expiringCalibrations.length} 台设备校准证书即将过期`);
      // TODO: 发送通知给设备管理员
    }

    // 检查即将过期的维护周期
    const maintenanceDue = await db.query<{
      id: string;
      name: string;
      manage_code: string;
      last_maintenance: Date;
      maintenance_cycle: number;
    }>(
      `SELECT i.id, m.name, i.manage_code, i.last_maintenance, m.calibration_cycle as maintenance_cycle 
       FROM equipment_instances i
       JOIN equipment_models m ON i.model_id = m.id
       WHERE i.last_maintenance IS NOT NULL 
       AND m.calibration_cycle IS NOT NULL
       AND DATE_ADD(i.last_maintenance, INTERVAL m.calibration_cycle MONTH) <= ?
       AND DATE_ADD(i.last_maintenance, INTERVAL m.calibration_cycle MONTH) > NOW()`,
      [thirtyDaysLater]
    );

    if (maintenanceDue.length > 0) {
      console.log(`[SchedulerService] 发现 ${maintenanceDue.length} 台设备即将需要维护`);
      // TODO: 发送通知给设备管理员
    }
  }

  /**
   * 手动触发任务
   */
  async triggerTask(taskType: ScheduledTaskType): Promise<{ success: boolean; message: string }> {
    try {
      switch (taskType) {
        case 'progress_check':
          const progressResult = await progressAlertService.runScheduledCheck();
          return {
            success: true,
            message: `进度检查完成: 阶段预警 ${progressResult.phases.length} 个, 任务预警 ${progressResult.tasks.length} 个`
          };

        case 'daily_report_reminder':
          const reportResult = await dailyReportReminderService.sendDailyReportReminder();
          return {
            success: true,
            message: `日报提醒完成: 已发送 ${reportResult.total_reminded} 条提醒`
          };

        case 'equipment_maintenance_check':
          await this.checkEquipmentMaintenance();
          return {
            success: true,
            message: '设备维护检查完成'
          };

        default:
          return {
            success: false,
            message: `未知的任务类型: ${taskType}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `任务执行失败: ${error.message}`
      };
    }
  }

  /**
   * 获取调度服务状态
   */
  getStatus(): {
    isRunning: boolean;
    activeTasks: string[];
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.tasks.keys())
    };
  }
}

export const schedulerService = new SchedulerService();
