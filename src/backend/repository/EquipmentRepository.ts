import { v4 as uuidv4 } from 'uuid'
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type EquipmentInstance = Prisma.equipment_instancesGetPayload<object>

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
            where: { id }
        })
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
                        manage_code: (source as any).category === 'fake_load' ? null : source.manage_code, // 假负载类调拨出去的不强制保留唯一编码
                        created_at: new Date(),
                        updated_at: new Date()
                    } as any
                })

                // 3. 同步复制图片记录和附件
                // 附件链接已包含在 source.attachment / source.attachments 中，这里重点复制 equipment_images 表记录
                const images = await client.equipment_images.findMany({
                    where: { equipment_id: sourceId }
                })
                
                if (images.length > 0) {
                    const newImages = images.map(img => {
                        const { id, ...imgData } = img
                        return {
                            ...imgData,
                            id: uuidv4(),
                            equipment_id: newId,
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    })
                    await client.equipment_images.createMany({
                        data: newImages as any
                    })
                }

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
        skip?: number
        take?: number
        orderBy?: Prisma.equipment_instancesOrderByWithRelationInput
        merge?: boolean
    }): Promise<{ data: any[]; total: number }> {
        const { where, skip = 0, take = 50, orderBy, merge = false } = params || {}
        
        if (merge) {
            // 实现合显示逻辑（针对假负载/线缆等非独立编码资产）
            // 聚合字段：名称、型号、健康状态、使用状态、位置ID、采购日期
            
            // Prisma 弱于复杂 GROUP BY + 多表关联，这里使用原始 SQL 或分步处理
            // 为保持一致性，先查出所有满足条件的 raw IDs，然后再聚合
            
            // 这里的业务逻辑是：如果 category 是 fake_load，则进行合并
            // 实际上用户说：如果管理编码也都一样，你都可以合并汇总。
            // 我们采用 SQL 聚合方案。
            
            const countSql = Prisma.sql`
                SELECT COUNT(*) as total FROM (
                    SELECT 1 FROM equipment_instances 
                    WHERE ${Prisma.join(this.buildWhereSql(where), ' AND ')}
                    GROUP BY equipment_name, model_no, health_status, usage_status, location_status, location_id, purchase_date
                ) as t`
            
            // 注意：Prisma.sql 构造较为复杂，这里改用分步查询或简化逻辑
            // 先尝试一个更通用的方案：在全量查询后内存合并，或者写原始 SQL
            
            const rawSql = `
                SELECT 
                    MAX(id) as id,
                    equipment_name, model_no, category, brand, manufacturer, unit,
                    SUM(quantity) as quantity,
                    health_status, usage_status, location_status, location_id,
                    purchase_date,
                    MAX(purchase_price) as purchase_price,
                    GROUP_CONCAT(manage_code) as manage_codes,
                    GROUP_CONCAT(id) as instance_ids,
                    'aggregated' as display_type
                FROM equipment_instances
                WHERE ${this.buildRawWhere(where)}
                GROUP BY equipment_name, model_no, health_status, usage_status, location_status, location_id, purchase_date
                ORDER BY MAX(created_at) DESC
                LIMIT ${skip}, ${take}
            `
            const data = await this.db.$queryRawUnsafe(rawSql) as any[]
            
            const totalResult = await this.db.$queryRawUnsafe(`
                SELECT COUNT(DISTINCT CONCAT_WS('-', equipment_name, model_no, health_status, usage_status, location_status, location_id, purchase_date)) as total 
                FROM equipment_instances 
                WHERE ${this.buildRawWhere(where)}
            `) as any[]
            
            const total = Number(totalResult[0]?.total || 0)

            // 补全模型信息和图片
            if (data.length > 0) {
                for (const item of data) {
                    // 查询其中一个实例的详细信息作为代表
                    const detail = await this.db.equipment_instances.findUnique({
                        where: { id: item.id }
                    })
                    // item.equipment_models = detail?.equipment_models // 型号关系不存在，略过
                    
                    // 合并图片
                    const instanceIds = item.instance_ids.split(',')
                    const images = await this.db.equipment_images.findMany({
                        where: { equipment_id: { in: instanceIds.slice(0, 10) } }, // 限制数量防止过大
                        take: 5
                    })
                    item.images = images.map(img => img.image_url)
                }
            }

            return { data, total }
        }

        const [data, total] = await Promise.all([
            this.db.equipment_instances.findMany({ where, skip, take, orderBy }),
            this.db.equipment_instances.count({ where })
        ])
        return { data, total }
    }

    private buildRawWhere(where?: Prisma.equipment_instancesWhereInput): string {
        if (!where) return '1=1'
        const parts: string[] = ['1=1']
        if (where.category) parts.push(`category = '${where.category}'`)
        if (where.location_id) parts.push(`location_id = '${where.location_id}'`)
        if (where.location_status) parts.push(`location_status = '${where.location_status}'`)
        // 简单处理，实际可根据需要扩充
        return parts.join(' AND ')
    }

    private buildWhereSql(where?: Prisma.equipment_instancesWhereInput): Prisma.Sql[] {
        // 这里只是示意，实际 buildRawWhere 足够 verify
        return [Prisma.sql`1=1`]
    }

    async count(where?: Prisma.equipment_instancesWhereInput): Promise<number> {
        return this.db.equipment_instances.count({ where })
    }
}

export const equipmentRepository = new EquipmentRepository()
