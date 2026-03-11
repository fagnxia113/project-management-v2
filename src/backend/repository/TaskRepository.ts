/**
 * TaskRepository
 *
 * 任务数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Task = Prisma.tasksGetPayload<{}>

export class TaskRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<Task | null> {
        return this.db.tasks.findUnique({ where: { id } }) as any
    }

    async findByProject(projectId: string): Promise<Task[]> {
        return this.db.tasks.findMany({ where: { project_id: projectId } }) as any
    }

    async findAll(params?: {
        where?: Prisma.tasksWhereInput;
        orderBy?: Prisma.tasksOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: Task[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.tasks.findMany({ where, orderBy, skip, take }),
            this.db.tasks.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.tasksCreateInput): Promise<Task> {
        return this.db.tasks.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.tasksUpdateInput): Promise<Task> {
        return this.db.tasks.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.tasks.delete({ where: { id } })
    }

    async count(where?: Prisma.tasksWhereInput): Promise<number> {
        return this.db.tasks.count({ where })
    }
}

export const taskRepository = new TaskRepository()
