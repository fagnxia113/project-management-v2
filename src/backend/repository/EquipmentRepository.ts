/**
 * EquipmentRepository
 *
 * 设备实例数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type EquipmentInstance = Prisma.equipment_instancesGetPayload<{
    include: {
        equipment_models: true
    }
}>

export class EquipmentRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取设备实例（含型号信息）
     */
    async findById(id: string): Promise<EquipmentInstance | null> {
        return this.db.equipment_instances.findUnique({
            where: { id },
            include: {
                equipment_models: true
            }
        }) as any
    }

    /**
     * 更新设备状态/位置
     */
    async update(id: string, data: Prisma.equipment_instancesUncheckedUpdateInput): Promise<any> {
        return this.db.equipment_instances.update({
            where: { id },
            data: { ...data, updated_at: new Date() }
        })
    }

    /**
     * 更新设备位置并同步配件位置
     */
    async transferEquipment(
        id: string,
        params: {
            location_id: string;
            location_status: any;
            usage_status?: any;
            keeper_id?: string;
        }
    ): Promise<void> {
        const { location_id, location_status, usage_status = 'idle', keeper_id } = params

        await this.db.$transaction(async (tx) => {
            // 1. 更新主设备
            await tx.equipment_instances.update({
                where: { id },
                data: {
                    location_id,
                    location_status,
                    usage_status,
                    keeper_id,
                    updated_at: new Date()
                }
            })

            // 2. 更新关联配件
            await tx.equipment_accessory_instances.updateMany({
                where: { host_equipment_id: id },
                data: {
                    location_id,
                    location_status,
                    updated_at: new Date()
                }
            })
        })
    }

    /**
     * 针对非仪器类设备（假负载/线缆）的调拨处理：分拆或合并记录
     */
    async splitForTransfer(
        sourceId: string,
        quantity: number,
        transferOrderId: string
    ): Promise<string> {
        return this.db.$transaction(async (tx) => {
            const source = await tx.equipment_instances.findUnique({ where: { id: sourceId } })
            if (!source) throw new Error('源设备不存在')
            if ((source.quantity ?? 1) < quantity) throw new Error('库存不足')

            // 1. 扣减源设备数量
            if (source.quantity === quantity) {
                // 如果刚好相等，直接变状态
                await tx.equipment_instances.update({
                    where: { id: sourceId },
                    data: { location_status: 'transferring', updated_at: new Date() }
                })
                return sourceId
            } else {
                await tx.equipment_instances.update({
                    where: { id: sourceId },
                    data: { quantity: { decrement: quantity }, updated_at: new Date() }
                })

                // 2. 创建新记录（运输中）
                const newId = `TR-${sourceId.slice(0, 8)}-${transferOrderId.slice(-4)}`
                await tx.equipment_instances.create({
                    data: {
                        ...source,
                        id: newId,
                        quantity: quantity,
                        location_status: 'transferring',
                        created_at: new Date(),
                        updated_at: new Date()
                    } as any
                })
                return newId
            }
        })
    }

    /**
     * 删除设备实例
     */
    async delete(id: string): Promise<void> {
        await this.db.equipment_instances.delete({ where: { id } })
    }

    async findAll(params?: {
        where?: Prisma.equipment_instancesWhereInput
        include?: Prisma.equipment_instancesInclude
        skip?: number
        take?: number
        orderBy?: Prisma.equipment_instancesOrderByWithRelationInput
    }): Promise<{ data: any[]; total: number }> {
        const { where, include, skip = 0, take = 50, orderBy } = params || {}
        const [data, total] = await Promise.all([
            this.db.equipment_instances.findMany({ where, include, skip, take, orderBy }),
            this.db.equipment_instances.count({ where })
        ])
        return { data, total }
    }

    async count(where?: Prisma.equipment_instancesWhereInput): Promise<number> {
        return this.db.equipment_instances.count({ where })
    }
}

export const equipmentRepository = new EquipmentRepository()
