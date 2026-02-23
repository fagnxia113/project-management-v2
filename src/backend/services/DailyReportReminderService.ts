import { db } from '../database/connection.js';
import { notificationService } from './NotificationService.js';
import { v4 as uuidv4 } from 'uuid';

export interface DailyReportStatus {
  project_id: string;
  project_name: string;
  total_members: number;
  submitted_count: number;
  unsubmitted_count: number;
  submitted_members: Array<{
    id: string;
    name: string;
    submitted_at: Date;
  }>;
  unsubmitted_members: Array<{
    id: string;
    name: string;
  }>;
}

export class DailyReportReminderService {
  private readonly REMINDER_HOUR = 18;
  private readonly REMINDER_MINUTE = 0;

  /**
   * 获取今日日报提交状态
   */
  async getTodayReportStatus(projectId?: string): Promise<DailyReportStatus[]> {
    const today = new Date().toISOString().split('T')[0];
    const statuses: DailyReportStatus[] = [];

    // 获取所有进行中的项目
    let projects = await db.query<{ id: string; name: string }>(
      `SELECT id, name FROM projects WHERE status IN ('in_progress', 'delayed')`
    );

    if (projectId) {
      projects = projects.filter(p => p.id === projectId);
    }

    for (const project of projects) {
      // 获取项目在岗人员
      const members = await db.query<{ id: string; name: string }>(
        `SELECT e.id, e.name 
         FROM project_personnel pp
         JOIN employees e ON e.id = pp.employee_id
         WHERE pp.project_id = ? AND pp.on_duty_status = 'on_duty' AND e.status IN ('active', 'probation')`,
        [project.id]
      );

      if (members.length === 0) continue;

      // 获取今日已提交日报的人员
      const submittedReports = await db.query<{
        person_id: string;
        person_name: string;
        created_at: Date;
      }>(
        `SELECT person_id, person_name, created_at 
         FROM daily_reports 
         WHERE project_id = ? AND report_date = ?`,
        [project.id, today]
      );

      const submittedIds = new Set(submittedReports.map(r => r.person_id));
      
      const submittedMembers = submittedReports.map(r => ({
        id: r.person_id,
        name: r.person_name,
        submitted_at: r.created_at
      }));

      const unsubmittedMembers = members
        .filter(m => !submittedIds.has(m.id))
        .map(m => ({
          id: m.id,
          name: m.name
        }));

      statuses.push({
        project_id: project.id,
        project_name: project.name,
        total_members: members.length,
        submitted_count: submittedMembers.length,
        unsubmitted_count: unsubmittedMembers.length,
        submitted_members: submittedMembers,
        unsubmitted_members: unsubmittedMembers
      });
    }

    return statuses;
  }

  /**
   * 发送日报提交提醒
   */
  async sendDailyReportReminder(projectId?: string): Promise<{
    total_reminded: number;
    projects: Array<{
      project_id: string;
      project_name: string;
      reminded_count: number;
    }>;
  }> {
    const statuses = await this.getTodayReportStatus(projectId);
    let totalReminded = 0;
    const projectResults: Array<{
      project_id: string;
      project_name: string;
      reminded_count: number;
    }> = [];

    for (const status of statuses) {
      if (status.unsubmitted_members.length === 0) continue;

      // 发送通知给未提交的人员
      for (const member of status.unsubmitted_members) {
        await notificationService.sendNotification({
          user_id: member.id,
          user_name: member.name,
          type: 'in_app',
          title: '【日报提醒】今日日报尚未提交',
          content: `您在项目「${status.project_name}」的今日日报尚未提交，请尽快完成提交。`,
          priority: 'high',
          link: '/reports'
        });

        totalReminded++;
      }

      // 同时通知项目经理
      const projectManager = await db.queryOne<{ manager_id: string; manager: string }>(
        'SELECT manager_id, manager FROM projects WHERE id = ?',
        [status.project_id]
      );

      if (projectManager?.manager_id) {
        const unsubmittedNames = status.unsubmitted_members.map(m => m.name).join('、');
        
        await notificationService.sendNotification({
          user_id: projectManager.manager_id,
          user_name: projectManager.manager,
          type: 'in_app',
          title: `【日报统计】${status.project_name} - ${status.unsubmitted_count}人未提交`,
          content: `今日日报提交情况：\n已提交：${status.submitted_count}/${status.total_members}人\n未提交：${unsubmittedNames}`,
          priority: 'normal',
          link: '/reports/dashboard'
        });
      }

      projectResults.push({
        project_id: status.project_id,
        project_name: status.project_name,
        reminded_count: status.unsubmitted_members.length
      });
    }

    console.log(`[DailyReportReminderService] 已发送 ${totalReminded} 条日报提醒`);

    return {
      total_reminded: totalReminded,
      projects: projectResults
    };
  }

  /**
   * 检查是否到提醒时间
   */
  shouldSendReminder(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    return hour === this.REMINDER_HOUR && minute === this.REMINDER_MINUTE;
  }

  /**
   * 获取日报提交统计（用于大屏展示）
   */
  async getReportStatistics(date?: string): Promise<{
    date: string;
    total_projects: number;
    total_members: number;
    total_submitted: number;
    total_unsubmitted: number;
    submission_rate: number;
    projects: DailyReportStatus[];
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const statuses = await this.getTodayReportStatus();

    const totalMembers = statuses.reduce((sum, s) => sum + s.total_members, 0);
    const totalSubmitted = statuses.reduce((sum, s) => sum + s.submitted_count, 0);
    const totalUnsubmitted = statuses.reduce((sum, s) => sum + s.unsubmitted_count, 0);

    return {
      date: targetDate,
      total_projects: statuses.length,
      total_members: totalMembers,
      total_submitted: totalSubmitted,
      total_unsubmitted: totalUnsubmitted,
      submission_rate: totalMembers > 0 ? Math.round((totalSubmitted / totalMembers) * 100) : 0,
      projects: statuses
    };
  }

  /**
   * 一键提醒所有未提交人员
   */
  async remindAllUnsubmitted(): Promise<{
    success: boolean;
    reminded_count: number;
    message: string;
  }> {
    const result = await this.sendDailyReportReminder();

    return {
      success: true,
      reminded_count: result.total_reminded,
      message: `已向 ${result.total_reminded} 人发送日报提交提醒`
    };
  }

  /**
   * 获取历史日报提交率
   */
  async getHistoricalSubmissionRate(days: number = 7): Promise<Array<{
    date: string;
    submission_rate: number;
    total_members: number;
    submitted_count: number;
  }>> {
    const results: Array<{
      date: string;
      submission_rate: number;
      total_members: number;
      submitted_count: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // 获取当天在岗人员总数
      const membersResult = await db.queryOne<{ count: number }>(
        `SELECT COUNT(DISTINCT pp.employee_id) as count
         FROM project_personnel pp
         JOIN employees e ON e.id = pp.employee_id
         WHERE pp.on_duty_status = 'on_duty' AND e.status IN ('active', 'probation')
         AND pp.transfer_in_date <= ?`,
        [dateStr]
      );

      // 获取当天提交日报的人数
      const submittedResult = await db.queryOne<{ count: number }>(
        `SELECT COUNT(DISTINCT person_id) as count
         FROM daily_reports
         WHERE report_date = ?`,
        [dateStr]
      );

      const totalMembers = membersResult?.count || 0;
      const submittedCount = submittedResult?.count || 0;

      results.push({
        date: dateStr,
        submission_rate: totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0,
        total_members: totalMembers,
        submitted_count: submittedCount
      });
    }

    return results.reverse();
  }
}

export const dailyReportReminderService = new DailyReportReminderService();
