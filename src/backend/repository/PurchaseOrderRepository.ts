/**
 * PurchaseOrderRepository
 *
 * 采购订单数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type PurchaseOrder = Prisma.purchase_ordersGetPayload<{}>

export class PurchaseOrderRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<PurchaseOrder | null> {
        return this.db.purchase_orders.findUnique({ where: { id } }) as any
    }

    async findByOrderNo(orderNo: string): Promise<PurchaseOrder | null> {
        return this.db.purchase_orders.findUnique({ where: { order_no: orderNo } }) as any
    }

    async findAll(params?: {
        where?: Prisma.purchase_ordersWhereInput;
        orderBy?: Prisma.purchase_ordersOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: PurchaseOrder[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.purchase_orders.findMany({ where, orderBy, skip, take }),
            this.db.purchase_orders.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.purchase_ordersCreateInput): Promise<PurchaseOrder> {
        return this.db.purchase_orders.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.purchase_ordersUpdateInput): Promise<PurchaseOrder> {
        return this.db.purchase_orders.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.purchase_orders.delete({ where: { id } })
    }

    async count(where?: Prisma.purchase_ordersWhereInput): Promise<number> {
        return this.db.purchase_orders.count({ where })
    }
}

export const purchaseOrderRepository = new PurchaseOrderRepository()
