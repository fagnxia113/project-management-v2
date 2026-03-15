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
    async update(
        id: string,
        data: Prisma.equipment_instancesUncheckedUpdateInput,
        tx?: Prisma.TransactionClient
    ): Promise<any> {
        const client = tx || this.db
        return client.equipment_instances.update({
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
        },
        tx?: Prisma.TransactionClient
    ): Promise<void> {
        const { location_id, location_status, usage_status = 'idle', keeper_id } = params

        const execute = async (client: Prisma.TransactionClient) => {
            // 1. 更新主设备
            await client.equipment_instances.update({
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
            await client.equipment_accessory_instances.updateMany({
                where: { host_equipment_id: id },
                data: {
                    location_id,
                    location_status,
                    updated_at: new Date()
                }
            })
        }

        return tx ? execute(tx) : this.db.$transaction(execute)
    }

    /**
     * 针对非仪器类设备（假负载/线缆）的调拨处理：分拆或合并记录
     */
    async splitForTransfer(
        sourceId: string,
        quantity: number,
        transferOrderId: string,
        tx?: Prisma.TransactionClient
    ): Promise<string> {
        const execute = async (client: Prisma.TransactionClient) => {
            const source = await client.equipment_instances.findUnique({ where: { id: sourceId } })
            if (!source) throw new Error('源设备不存在')
            if ((source.quantity ?? 1) < quantity) throw new Error('库存不足')

            // 1. 扣减源设备数量
            if (source.quantity === quantity) {
                // 如果刚好相等，直接变状态
                await client.equipment_instances.update({
                    where: { id: sourceId },
                    data: { location_status: 'transferring', updated_at: new Date() }
                })
                return sourceId
            } else {
                await client.equipment_instances.update({
                    where: { id: sourceId },
                    data: { quantity: { decrement: quantity }, updated_at: new Date() }
                })

                // 2. 创建新记录（运输中）
                const newId = `TR-${sourceId.slice(0, 8)}-${transferOrderId.slice(-4)}`
                await client.equipment_instances.create({
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
        }

        return tx ? execute(tx) : this.db.$transaction(execute)
    }

    /**
     * 报废设备及其绑定的配件（支持批次设备部分报废）
     */
    async scrapEquipment(id: string, quantity: number = 1, tx?: Prisma.TransactionClient): Promise<void> {
        const execute = async (client: Prisma.TransactionClient) => {
            const source = await client.equipment_instances.findUnique({ where: { id } })
            if (!source) throw new Error('设备不存在')

            const currentQty = source.quantity ?? 1

            if (currentQty > quantity) {
                // 1. 部分报废：原记录扣减数量
                await client.equipment_instances.update({
                    where: { id },
                    data: { quantity: { decrement: quantity }, updated_at: new Date() }
                })

                // 2. 创建一条新的报废记录
                await client.equipment_instances.create({
                    data: {
                        ...source,
                        id: `SCR-${id.slice(0, 8)}-${Date.now().toString().slice(-4)}`,
                        quantity: quantity,
                        location_status: 'scrapped' as any,
                        health_status: 'scrapped' as any,
                        usage_status: 'scrapped' as any,
                        location_id: null,
                        keeper_id: null,
                        created_at: new Date(),
                        updated_at: new Date()
                    } as any
                })
                // 注意：部分报废通常不联动报废配件，因为配件是绑定在整体上的，
                // 如果是批次物资，通常不绑定精密配件。如果是仪器类，quantity 恒为 1，会走下方的全额报废逻辑。
            } else {
                // 3. 全额报废：原记录直接变状态
                await client.equipment_instances.update({
                    where: { id },
                    data: {
                        location_status: 'scrapped' as any,
                        health_status: 'scrapped' as any,
                        usage_status: 'scrapped' as any,
                        location_id: null,
                        keeper_id: null,
                        updated_at: new Date()
                    }
                })

                // 联动报废所有绑定的配件
                await client.equipment_accessory_instances.updateMany({
                    where: { host_equipment_id: id },
                    data: {
                        location_status: 'scrapped' as any,
                        location_id: null,
                        keeper_id: null,
                        updated_at: new Date()
                    }
                })
            }
        }

        return tx ? execute(tx) : this.db.$transaction(execute)
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
