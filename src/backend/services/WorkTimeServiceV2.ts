/**
 * WorkTimeServiceV2
 *
 * 工时服务 - 使用 Prisma ORM + Repository
 */
import { WorkTimeRepository, workTimeRepository } from '../repository/WorkTimeRepository.js'

export interface TimesheetEntry {
  id: string
  employee_id?: string
  project_id?: string
  date?: string
  hours?: number
  description?: string
  status?: string
}

export class WorkTimeServiceV2 {
  private repo: WorkTimeRepository

  constructor(repo: WorkTimeRepository = workTimeRepository) {
    this.repo = repo
  }

  async getTimesheetEntries(filters?: {
    employeeId?: string
    projectId?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: TimesheetEntry[]; total: number }> {
    const where: any = {}
    if (filters?.employeeId) where.employee_id = filters.employeeId
    if (filters?.projectId) where.project_id = filters.projectId

    return await this.repo.findAll({
      where,
      skip: ((filters?.page || 1) - 1) * (filters?.pageSize || 50),
      take: filters?.pageSize || 50
    })
  }

  async submitTimesheetEntry(data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    return await this.repo.create(data)
  }

  async updateTimesheetEntry(id: string, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    return await this.repo.update(id, data)
  }

  async deleteTimesheetEntry(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getEmployeeWorkHistory(employeeId: string): Promise<TimesheetEntry[]> {
    return await this.repo.findByEmployee(employeeId)
  }

  async getProjectLaborCost(projectId: string): Promise<{ total_hours: number; estimated_cost: number }> {
    const entries = await this.repo.findByProject(projectId)
    const total_hours = entries.reduce((sum, e) => sum + (e.hours || 0), 0)
    return { total_hours, estimated_cost: total_hours * 100 }
  }

  async submitDailyReport(report: any, entries: any[]): Promise<string> {
    for (const entry of entries) {
      await this.repo.create(entry)
    }
    return 'report-' + Date.now()
  }

  async getReportWithEntries(reportId: string): Promise<{ report: any; entries: TimesheetEntry[] } | undefined> {
    return { report: { id: reportId }, entries: [] }
  }
}

export const workTimeServiceV2 = new WorkTimeServiceV2()
