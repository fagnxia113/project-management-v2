/**
 * EquipmentRepairOrderRepository
 *
 * 设备维修单数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type EquipmentRepairOrder = Prisma.equipment_repair_ordersGetPayload<{}>

export class EquipmentRepairOrderRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<EquipmentRepairOrder | null> {
        return this.db.equipment_repair_orders.findUnique({ where: { id } }) as any
    }

    async findAll(params?: {
        where?: Prisma.equipment_repair_ordersWhereInput;
        orderBy?: Prisma.equipment_repair_ordersOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: EquipmentRepairOrder[]; total: number }> {
        const { where, orderBy, skip = 0, take = 50 } = params || {}
        const [data, total] = await Promise.all([
            this.db.equipment_repair_orders.findMany({ where, orderBy, skip, take }),
            this.db.equipment_repair_orders.count({ where })
        ])
        return { data: data as any, total }
    }

    async create(data: Prisma.equipment_repair_ordersCreateInput): Promise<EquipmentRepairOrder> {
        return this.db.equipment_repair_orders.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.equipment_repair_ordersUpdateInput): Promise<EquipmentRepairOrder> {
        return this.db.equipment_repair_orders.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.equipment_repair_orders.delete({ where: { id } })
    }

    async count(where?: Prisma.equipment_repair_ordersWhereInput): Promise<number> {
        return this.db.equipment_repair_orders.count({ where })
    }
}

export const equipmentRepairOrderRepository = new EquipmentRepairOrderRepository()
