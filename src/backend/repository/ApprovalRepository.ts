/**
 * ApprovalRepository
 *
 * 审批数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Approval = Prisma.approvalsGetPayload<{}>

export class ApprovalRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<Approval | null> {
        return this.db.approvals.findUnique({ where: { id } }) as any
    }

    async findByOrderId(orderId: string): Promise<Approval[]> {
        return this.db.approvals.findMany({ where: { order_id: orderId } }) as any
    }

    async findPendingByUser(userId: string): Promise<Approval[]> {
        return this.db.approvals.findMany({
            where: {
                approver_id: userId,
                status: 'pending'
            }
        }) as any
    }

    async findAll(params?: {
        where?: Prisma.approvalsWhereInput;
        orderBy?: Prisma.approvalsOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: Approval[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.approvals.findMany({ where, orderBy, skip, take }),
            this.db.approvals.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.approvalsCreateInput): Promise<Approval> {
        return this.db.approvals.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.approvalsUpdateInput): Promise<Approval> {
        return this.db.approvals.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.approvals.delete({ where: { id } })
    }

    async count(where?: Prisma.approvalsWhereInput): Promise<number> {
        return this.db.approvals.count({ where })
    }
}

export const approvalRepository = new ApprovalRepository()
