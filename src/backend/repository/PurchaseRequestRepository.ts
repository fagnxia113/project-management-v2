/**
 * PurchaseRequestRepository
 *
 * 采购申请数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type PurchaseRequest = Prisma.purchase_requestsGetPayload<{}>

export class PurchaseRequestRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<PurchaseRequest | null> {
        return this.db.purchase_requests.findUnique({ where: { id } }) as any
    }

    async findAll(params?: {
        where?: Prisma.purchase_requestsWhereInput;
        orderBy?: Prisma.purchase_requestsOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: PurchaseRequest[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.purchase_requests.findMany({ where, orderBy, skip, take }),
            this.db.purchase_requests.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.purchase_requestsCreateInput): Promise<PurchaseRequest> {
        return this.db.purchase_requests.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.purchase_requestsUpdateInput): Promise<PurchaseRequest> {
        return this.db.purchase_requests.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.purchase_requests.delete({ where: { id } })
    }

    async count(where?: Prisma.purchase_requestsWhereInput): Promise<number> {
        return this.db.purchase_requests.count({ where })
    }
}

export const purchaseRequestRepository = new PurchaseRequestRepository()
