/**
 * WorkflowDefinitionRepository
 *
 * 工作流定义数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type WorkflowDefinition = Prisma.workflow_definitionsGetPayload<{}>

export class WorkflowDefinitionRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<WorkflowDefinition | null> {
        return this.db.workflow_definitions.findUnique({ where: { id } }) as any
    }

    async findByKey(key: string): Promise<WorkflowDefinition | null> {
        return this.db.workflow_definitions.findUnique({ where: { key } }) as any
    }

    async findAll(params?: {
        where?: Prisma.workflow_definitionsWhereInput;
        orderBy?: Prisma.workflow_definitionsOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: WorkflowDefinition[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.workflow_definitions.findMany({ where, orderBy, skip, take }),
            this.db.workflow_definitions.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.workflow_definitionsCreateInput): Promise<WorkflowDefinition> {
        return this.db.workflow_definitions.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.workflow_definitionsUpdateInput): Promise<WorkflowDefinition> {
        return this.db.workflow_definitions.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.workflow_definitions.delete({ where: { id } })
    }

    async count(where?: Prisma.workflow_definitionsWhereInput): Promise<number> {
        return this.db.workflow_definitions.count({ where })
    }
}

export const workflowDefinitionRepository = new WorkflowDefinitionRepository()
