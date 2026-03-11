/**
 * WorkTimeRepository
 *
 * 工时/工时记录 Repository - 使用 Prisma ORM
 */
import { PrismaClient, timesheet_entries } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export interface TimesheetEntry {
  id: string
  employee_id?: string
  project_id?: string
  date?: string
  hours?: number
  description?: string
  status?: string
  created_at?: string
}

export class WorkTimeRepository {
  async findById(id: string): Promise<TimesheetEntry | null> {
    return await prisma.timesheet_entries.findUnique({ where: { id } }) as TimesheetEntry | null
  }

  async findAll(params?: {
    where?: Partial<TimesheetEntry>
    skip?: number
    take?: number
  }): Promise<{ data: TimesheetEntry[]; total: number }> {
    const { where, skip = 0, take = 50 } = params || {}
    const [data, total] = await Promise.all([
      prisma.timesheet_entries.findMany({ where: where as any, skip, take }),
      prisma.timesheet_entries.count({ where: where as any })
    ])
    return { data: data as TimesheetEntry[], total }
  }

  async findByEmployee(employeeId: string): Promise<TimesheetEntry[]> {
    return await prisma.timesheet_entries.findMany({
      where: { employee_id: employeeId },
      orderBy: { date: 'desc' }
    }) as TimesheetEntry[]
  }

  async findByProject(projectId: string): Promise<TimesheetEntry[]> {
    return await prisma.timesheet_entries.findMany({
      where: { project_id: projectId }
    }) as TimesheetEntry[]
  }

  async create(data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    return await prisma.timesheet_entries.create({ data: data as any }) as TimesheetEntry
  }

  async update(id: string, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    return await prisma.timesheet_entries.update({ where: { id }, data: data as any }) as TimesheetEntry
  }

  async delete(id: string): Promise<void> {
    await prisma.timesheet_entries.delete({ where: { id } })
  }
}

export const workTimeRepository = new WorkTimeRepository()
