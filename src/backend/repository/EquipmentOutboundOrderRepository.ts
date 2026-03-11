/**
 * EquipmentOutboundOrderRepository
 *
 * 设备出库单数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type EquipmentOutboundOrder = Prisma.equipment_outbound_ordersGetPayload<{}>

export class EquipmentOutboundOrderRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<EquipmentOutboundOrder | null> {
        return this.db.equipment_outbound_orders.findUnique({ where: { id } }) as any
    }

    async findAll(params?: {
        where?: Prisma.equipment_outbound_ordersWhereInput;
        orderBy?: Prisma.equipment_outbound_ordersOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: EquipmentOutboundOrder[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.equipment_outbound_orders.findMany({ where, orderBy, skip, take }),
            this.db.equipment_outbound_orders.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.equipment_outbound_ordersCreateInput): Promise<EquipmentOutboundOrder> {
        return this.db.equipment_outbound_orders.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.equipment_outbound_ordersUpdateInput): Promise<EquipmentOutboundOrder> {
        return this.db.equipment_outbound_orders.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.equipment_outbound_orders.delete({ where: { id } })
    }

    async count(where?: Prisma.equipment_outbound_ordersWhereInput): Promise<number> {
        return this.db.equipment_outbound_orders.count({ where })
    }
}

export const equipmentOutboundOrderRepository = new EquipmentOutboundOrderRepository()
