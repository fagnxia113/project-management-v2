import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface DailyReport {
    id: string;
    employee_id: string;
    report_date: string;
    summary: string;
    plan?: string;
    problems?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewer_id?: string;
    reviewed_at?: string;
}

export interface TimesheetEntry {
    id: string;
    report_id: string;
    project_id: string;
    task_id?: string;
    duration: number;
    work_content?: string;
}

export class WorkTimeService {
    async submitDailyReport(
        reportData: Omit<DailyReport, 'id' | 'status'>,
        entries: Omit<TimesheetEntry, 'id' | 'report_id'>[]
    ): Promise<string> {
        const reportId = uuidv4();

        // Start transaction (simplified as connection.query for now, or using db wrapper)
        // Assume db.execute is consecutive here

        // 1. Insert Daily Report
        await db.execute(
            `INSERT INTO daily_reports (id, employee_id, report_date, summary, plan, problems, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [reportId, reportData.employee_id, reportData.report_date, reportData.summary, reportData.plan || null, reportData.problems || null]
        );

        // 2. Insert Timesheet Entries
        for (const entry of entries) {
            const entryId = uuidv4();
            await db.execute(
                `INSERT INTO timesheet_entries (id, report_id, project_id, task_id, duration, work_content)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [entryId, reportId, entry.project_id, entry.task_id || null, entry.duration, entry.work_content || null]
            );
        }

        return reportId;
    }

    async getReportWithEntries(reportId: string): Promise<{ report: DailyReport, entries: TimesheetEntry[] } | undefined> {
        const report = await db.queryOne<DailyReport>('SELECT * FROM daily_reports WHERE id = ?', [reportId]);
        if (!report) return undefined;

        const entries = await db.query<TimesheetEntry>('SELECT * FROM timesheet_entries WHERE report_id = ?', [reportId]);
        return { report, entries };
    }

    async getEmployeeWorkHistory(employeeId: string): Promise<any[]> {
        return db.query(`
      SELECT dr.*, SUM(te.duration) as total_duration 
      FROM daily_reports dr
      LEFT JOIN timesheet_entries te ON dr.id = te.report_id
      WHERE dr.employee_id = ?
      GROUP BY dr.id
      ORDER BY dr.report_date DESC
    `, [employeeId]);
    }

    /**
     * 按项目统计人工成本 (简单示例：时长 * 员工日成本/8)
     */
    async getProjectLaborCost(projectId: string): Promise<{ total_hours: number, estimated_cost: number }> {
        const rows = await db.query<{ duration: number, daily_cost: number }>(`
      SELECT te.duration, e.daily_cost
      FROM timesheet_entries te
      JOIN daily_reports dr ON te.report_id = dr.id
      JOIN employees e ON dr.employee_id = e.id
      WHERE te.project_id = ? AND dr.status = 'approved'
    `, [projectId]);

        let totalHours = 0;
        let estimatedCost = 0;

        for (const row of rows) {
            totalHours += Number(row.duration);
            estimatedCost += (Number(row.duration) * Number(row.daily_cost || 0)) / 8;
        }

        return { total_hours: totalHours, estimated_cost: estimatedCost };
    }
}

export const workTimeService = new WorkTimeService();
