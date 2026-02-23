import { db } from '../database/connection.js';
import { notificationService } from './NotificationService.js';
import { v4 as uuidv4 } from 'uuid';

export interface ProgressAlert {
  id: string;
  project_id: string;
  project_name: string;
  entity_type: 'project' | 'phase' | 'task';
  entity_id: string;
  entity_name: string;
  planned_progress: number;
  actual_progress: number;
  deviation: number;
  deviation_threshold: number;
  alert_level: 'warning' | 'severe';
  status: 'active' | 'acknowledged' | 'resolved';
  manager_id: string;
  manager_name: string;
  created_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  resolved_at?: Date;
  resolution_note?: string;
}

export class ProgressAlertService {
  private readonly WARNING_THRESHOLD = 5;
  private readonly SEVERE_THRESHOLD = 15;

  calculateDeviation(plannedProgress: number, actualProgress: number): number {
    return actualProgress - plannedProgress;
  }

  calculatePlannedProgress(
    plannedStartDate: Date,
    plannedEndDate: Date,
    currentDate: Date = new Date()
  ): number {
    const totalDays = Math.ceil((plannedEndDate.getTime() - plannedStartDate.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return 100;
    const elapsedDays = Math.ceil((currentDate.getTime() - plannedStartDate.getTime()) / (1000 * 60 * 60 * 24));
    if (elapsedDays <= 0) return 0;
    if (elapsedDays >= totalDays) return 100;
    return Math.round((elapsedDays / totalDays) * 100);
  }

  /**
   * 检查里程碑进度偏离 (原 Phase 逻辑，现对应 milestone 类型的 tasks)
   */
  async checkPhaseProgress(): Promise<ProgressAlert[]> {
    const alerts: ProgressAlert[] = [];

    // 获取进行中的里程碑任务
    const milestones = await db.query<{
      id: string;
      project_id: string;
      project_name: string;
      name: string;
      planned_start_date: Date;
      planned_end_date: Date;
      progress: number;
      assignee_id: string;
    }>(
      `SELECT 
        t.id, t.project_id, p.name as project_name, t.name,
        t.planned_start_date, t.planned_end_date, t.progress,
        t.assignee_id
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.task_type = 'milestone' AND t.status = 'in_progress'`
    );

    for (const milestone of milestones) {
      const plannedProgress = this.calculatePlannedProgress(
        new Date(milestone.planned_start_date),
        new Date(milestone.planned_end_date)
      );

      const deviation = this.calculateDeviation(plannedProgress, milestone.progress);

      if (deviation <= -this.SEVERE_THRESHOLD) {
        alerts.push(await this.createAlert({
          project_id: milestone.project_id,
          project_name: milestone.project_name,
          entity_type: 'phase',
          entity_id: milestone.id,
          entity_name: milestone.name,
          planned_progress: plannedProgress,
          actual_progress: milestone.progress,
          deviation: Math.abs(deviation),
          deviation_threshold: this.SEVERE_THRESHOLD,
          alert_level: 'severe',
          manager_id: milestone.assignee_id,
          manager_name: '负责人' // Simple placeholder
        }));
      }
    }
    return alerts;
  }

  async checkTaskProgress(): Promise<ProgressAlert[]> {
    const alerts: ProgressAlert[] = [];

    const tasks = await db.query<{
      id: string;
      project_id: string;
      project_name: string;
      name: string;
      planned_start_date: Date;
      planned_end_date: Date;
      progress: number;
      assignee_id: string;
    }>(
      `SELECT 
        t.id, t.project_id, p.name as project_name, t.name,
        t.planned_start_date, t.planned_end_date, t.progress,
        t.assignee_id
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.task_type = 'subtask' AND t.status IN ('in_progress', 'accepted')`
    );

    for (const task of tasks) {
      const plannedProgress = this.calculatePlannedProgress(
        new Date(task.planned_start_date),
        new Date(task.planned_end_date)
      );

      const deviation = this.calculateDeviation(plannedProgress, task.progress);

      if (deviation <= -this.SEVERE_THRESHOLD) {
        alerts.push(await this.createAlert({
          project_id: task.project_id,
          project_name: task.project_name,
          entity_type: 'task',
          entity_id: task.id,
          entity_name: task.name,
          planned_progress: plannedProgress,
          actual_progress: task.progress,
          deviation: Math.abs(deviation),
          deviation_threshold: this.SEVERE_THRESHOLD,
          alert_level: 'severe',
          manager_id: task.assignee_id,
          manager_name: '执行人'
        }));
      }
    }
    return alerts;
  }

  private async createAlert(params: any): Promise<ProgressAlert> {
    const id = uuidv4();
    const existing = await db.queryOne('SELECT id FROM progress_alerts WHERE entity_type = ? AND entity_id = ? AND status = "active"',
      [params.entity_type, params.entity_id]);

    if (existing) {
      await db.execute(
        `UPDATE progress_alerts SET planned_progress = ?, actual_progress = ?, deviation = ?, alert_level = ?, updated_at = NOW() WHERE id = ?`,
        [params.planned_progress, params.actual_progress, params.deviation, params.alert_level, existing.id]
      );
      return (await db.queryOne('SELECT * FROM progress_alerts WHERE id = ?', [existing.id])) as ProgressAlert;
    }

    await db.insert(
      `INSERT INTO progress_alerts (id, project_id, project_name, entity_type, entity_id, entity_name, planned_progress, actual_progress, deviation, deviation_threshold, alert_level, status, manager_id, manager_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW())`,
      [id, params.project_id, params.project_name, params.entity_type, params.entity_id, params.entity_name, params.planned_progress, params.actual_progress, params.deviation, params.deviation_threshold, params.alert_level, params.manager_id, params.manager_name]
    );

    return (await db.queryOne('SELECT * FROM progress_alerts WHERE id = ?', [id])) as ProgressAlert;
  }

  async runScheduledCheck(): Promise<{ phases: ProgressAlert[]; tasks: ProgressAlert[]; }> {
    const phaseAlerts = await this.checkPhaseProgress();
    const taskAlerts = await this.checkTaskProgress();
    return { phases: phaseAlerts, tasks: taskAlerts };
  }
}

export const progressAlertService = new ProgressAlertService();
