/**
 * EquipmentInboundOrderRepository
 *
 * 设备入库单数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type EquipmentInboundOrder = Prisma.equipment_inbound_ordersGetPayload<{}>

export class EquipmentInboundOrderRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<EquipmentInboundOrder | null> {
        return this.db.equipment_inbound_orders.findUnique({ where: { id } }) as any
    }

    async findAll(params?: {
        where?: Prisma.equipment_inbound_ordersWhereInput;
        orderBy?: Prisma.equipment_inbound_ordersOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: EquipmentInboundOrder[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.equipment_inbound_orders.findMany({ where, orderBy, skip, take }),
            this.db.equipment_inbound_orders.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.equipment_inbound_ordersCreateInput): Promise<EquipmentInboundOrder> {
        return this.db.equipment_inbound_orders.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.equipment_inbound_ordersUpdateInput): Promise<EquipmentInboundOrder> {
        return this.db.equipment_inbound_orders.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.equipment_inbound_orders.delete({ where: { id } })
    }

    async count(where?: Prisma.equipment_inbound_ordersWhereInput): Promise<number> {
        return this.db.equipment_inbound_orders.count({ where })
    }
}

export const equipmentInboundOrderRepository = new EquipmentInboundOrderRepository()
