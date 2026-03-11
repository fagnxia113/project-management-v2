/**
 * WorkflowInstanceRepository
 *
 * 工作流实例数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type WorkflowInstance = Prisma.workflow_instancesGetPayload<{}>

export class WorkflowInstanceRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<WorkflowInstance | null> {
        return this.db.workflow_instances.findUnique({ where: { id } }) as any
    }

    async findByDefinition(definitionId: string): Promise<WorkflowInstance[]> {
        return this.db.workflow_instances.findMany({ where: { definition_id: definitionId } }) as any
    }

    async findAll(params?: {
        where?: Prisma.workflow_instancesWhereInput;
        orderBy?: Prisma.workflow_instancesOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: WorkflowInstance[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.workflow_instances.findMany({ where, orderBy, skip, take }),
            this.db.workflow_instances.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.workflow_instancesCreateInput): Promise<WorkflowInstance> {
        return this.db.workflow_instances.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.workflow_instancesUpdateInput): Promise<WorkflowInstance> {
        return this.db.workflow_instances.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.workflow_instances.delete({ where: { id } })
    }

    async count(where?: Prisma.workflow_instancesWhereInput): Promise<number> {
        return this.db.workflow_instances.count({ where })
    }
}

export const workflowInstanceRepository = new WorkflowInstanceRepository()
