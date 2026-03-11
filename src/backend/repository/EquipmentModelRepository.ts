/**
 * EquipmentModelRepository
 *
 * 设备型号数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type EquipmentModel = Prisma.equipment_modelsGetPayload<{}>

export class EquipmentModelRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    async findById(id: string): Promise<EquipmentModel | null> {
        return this.db.equipment_models.findUnique({ where: { id } }) as any
    }

    async findAll(params?: {
        where?: Prisma.equipment_modelsWhereInput;
        orderBy?: Prisma.equipment_modelsOrderByWithRelationInput;
    }): Promise<EquipmentModel[]> {
        return this.db.equipment_models.findMany(params as any) as any
    }

    async create(data: Prisma.equipment_modelsCreateInput): Promise<EquipmentModel> {
        return this.db.equipment_models.create({ data: data as any }) as any
    }

    async update(id: string, data: Prisma.equipment_modelsUpdateInput): Promise<EquipmentModel> {
        return this.db.equipment_models.update({ where: { id }, data: data as any }) as any
    }

    async delete(id: string): Promise<void> {
        await this.db.equipment_models.delete({ where: { id } })
    }

    async count(where?: Prisma.equipment_modelsWhereInput): Promise<number> {
        return this.db.equipment_models.count({ where })
    }
}

export const equipmentModelRepository = new EquipmentModelRepository()
