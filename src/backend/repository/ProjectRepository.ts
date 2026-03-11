/**
 * ProjectRepository
 * 项目管理数据访问层 - 使用 Prisma 替代裸 SQL
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.js'
import { v4 as uuidv4 } from 'uuid'

export type Project = Prisma.projectsGetPayload<object>
export type Task = Prisma.tasksGetPayload<object>

export interface GetProjectsParams {
    search?: string
    status?: string
    manager_id?: string
    page?: number
    pageSize?: number
}

export class ProjectRepository {
    constructor(private db: PrismaClient = prisma) { }

    // -------------------------------------------------------
    // Projects
    // -------------------------------------------------------

    async create(data: Prisma.projectsUncheckedCreateInput): Promise<Project> {
        return this.db.projects.create({ data: data as any })
    }

    async findById(id: string): Promise<Project | null> {
        return this.db.projects.findUnique({ where: { id } })
    }

    async findMany(params: GetProjectsParams): Promise<{ data: Project[]; total: number }> {
        const { search, status, manager_id, page = 1, pageSize = 10 } = params

        const where: Prisma.projectsWhereInput = {}
        if (status) where.status = status as any
        if (manager_id) where.manager_id = manager_id
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } }
            ]
        }

        const [total, data] = await Promise.all([
            this.db.projects.count({ where }),
            this.db.projects.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize
            })
        ])

        return { data, total }
    }

    async update(id: string, data: Prisma.projectsUncheckedUpdateInput): Promise<Project> {
        return this.db.projects.update({ where: { id }, data: { ...data, updated_at: new Date() } as any })
    }

    async delete(id: string): Promise<void> {
        // 删除项目前先删除关联任务
        await this.db.tasks.deleteMany({ where: { project_id: id } })
        await this.db.projects.delete({ where: { id } })
    }

    // -------------------------------------------------------
    // Tasks
    // -------------------------------------------------------

    async findTaskById(id: string): Promise<Task | null> {
        return this.db.tasks.findUnique({ where: { id } })
    }

    async findTasksByProject(projectId: string): Promise<Task[]> {
        return this.db.tasks.findMany({
            where: { project_id: projectId },
            orderBy: { wbs_code: 'asc' }
        })
    }

    async findChildTasks(parentId: string): Promise<Pick<Task, 'progress'>[]> {
        const rows = await this.db.tasks.findMany({
            where: { parent_id: parentId },
            select: { progress: true }
        })
        return rows.map(r => ({ progress: r.progress ?? 0 }))
    }

    async countRootTasks(projectId: string): Promise<number> {
        return this.db.tasks.count({
            where: { project_id: projectId, parent_id: null }
        })
    }

    async countChildTasks(parentId: string): Promise<number> {
        return this.db.tasks.count({ where: { parent_id: parentId } })
    }

    async createTask(data: Prisma.tasksUncheckedCreateInput): Promise<Task> {
        return this.db.tasks.create({ data: data as any })
    }

    async updateTaskProgress(id: string, progress: number): Promise<void> {
        await this.db.tasks.update({
            where: { id },
            data: { progress, updated_at: new Date() }
        })
    }

    async updateProjectProgress(projectId: string, progress: number): Promise<void> {
        await this.db.projects.update({
            where: { id: projectId },
            data: { progress, updated_at: new Date() }
        })
    }

    async findRootTasksProgress(projectId: string): Promise<{ progress: number }[]> {
        const rows = await this.db.tasks.findMany({
            where: { project_id: projectId, parent_id: null },
            select: { progress: true }
        })
        return rows.map(r => ({ progress: r.progress ?? 0 }))
    }

    async findSiblingTasksProgress(parentId: string): Promise<{ progress: number }[]> {
        const rows = await this.db.tasks.findMany({
            where: { parent_id: parentId },
            select: { progress: true }
        })
        return rows.map(r => ({ progress: r.progress ?? 0 }))
    }

    /**
     * 获取项目成员
     */
    async findMembers(projectId: string): Promise<any[]> {
        return this.db.project_personnel.findMany({
            where: { project_id: projectId }
        })
    }

    /**
     * 添加项目成员
     */
    async addMember(data: { project_id: string; employee_id: string; role?: string }): Promise<any> {
        return this.db.project_personnel.create({
            data: {
                id: uuidv4(),
                project_id: data.project_id,
                employee_id: data.employee_id,
                role_in_project: data.role || 'member',
                transfer_in_date: new Date()
            }
        })
    }

    /**
     * 移除项目成员
     */
    async removeMember(projectId: string, employeeId: string): Promise<void> {
        // 由于没有单一主键 ID 删除比较麻烦，我们先通过 findFirst 找到 ID 再删除，或者使用 deleteMany
        await this.db.project_personnel.deleteMany({
            where: {
                project_id: projectId,
                employee_id: employeeId
            }
        })
    }
}

export const projectRepository = new ProjectRepository()
