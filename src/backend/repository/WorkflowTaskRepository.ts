/**
 * WorkflowTaskRepository
 *
 * 工作流任务数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type WorkflowTask = Prisma.workflow_tasksGetPayload<{}>

export class WorkflowTaskRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<WorkflowTask | null> {
        return this.db.workflow_tasks.findUnique({ where: { id } }) as any
    }

    async findByInstance(instanceId: string): Promise<WorkflowTask[]> {
        return this.db.workflow_tasks.findMany({ where: { instance_id: instanceId } }) as any
    }

    async findByAssignee(assigneeId: string): Promise<WorkflowTask[]> {
        return this.db.workflow_tasks.findMany({ where: { assignee_id: assigneeId } }) as any
    }

    async findPendingByAssignee(assigneeId: string): Promise<WorkflowTask[]> {
        return this.db.workflow_tasks.findMany({
            where: {
                assignee_id: assigneeId,
                status: { in: ['created', 'assigned', 'in_progress'] }
            }
        }) as any
    }

    async findAll(params?: {
        where?: Prisma.workflow_tasksWhereInput;
        orderBy?: Prisma.workflow_tasksOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: WorkflowTask[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.workflow_tasks.findMany({ where, orderBy, skip, take }),
            this.db.workflow_tasks.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.workflow_tasksCreateInput): Promise<WorkflowTask> {
        return this.db.workflow_tasks.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.workflow_tasksUpdateInput): Promise<WorkflowTask> {
        return this.db.workflow_tasks.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.workflow_tasks.delete({ where: { id } })
    }

    async count(where?: Prisma.workflow_tasksWhereInput): Promise<number> {
        return this.db.workflow_tasks.count({ where })
    }
}

export const workflowTaskRepository = new WorkflowTaskRepository()
