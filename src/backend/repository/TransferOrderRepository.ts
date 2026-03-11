/**
 * TransferOrderRepository
 *
 * 设备调拨单的数据访问层 (Data Access Layer)
 * 职责：封装所有数据库操作，暴露语义清晰的方法给 Service 层
 * 使用 Prisma ORM 替代手写原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

// =====================================================================
// 类型定义
// =====================================================================

export type TransferOrder = Prisma.equipment_transfer_ordersGetPayload<object>
export type TransferOrderItem = Prisma.equipment_transfer_order_itemsGetPayload<object>

export type TransferOrderWithItems = TransferOrder & {
    items: TransferOrderItem[]
}

export interface GetOrdersParams {
    status?: string
    from_warehouse_id?: string
    from_project_id?: string
    to_warehouse_id?: string
    to_project_id?: string
    applicant_id?: string
    search?: string
    page?: number
    pageSize?: number
}

export interface CreateOrderData {
    id: string
    order_no: string
    transfer_scene: string
    applicant_id: string
    applicant?: string
    apply_date?: Date
    from_location_type?: string
    from_warehouse_id?: string
    from_warehouse_name?: string
    from_project_id?: string
    from_project_name?: string
    to_location_type: string
    to_warehouse_id?: string
    to_warehouse_name?: string
    to_project_id?: string
    to_project_name?: string
    transfer_reason?: string
    status?: string
    total_items?: number
    total_requested_quantity?: number
    total_quantity?: number
}

export interface CreateOrderItemData {
    id: string
    order_id: string
    equipment_id?: string
    equipment_name: string
    model_no?: string
    brand?: string
    category: string
    unit?: string
    manage_code?: string
    serial_number?: string
    quantity: number
    notes?: string
    accessory_info?: any
    accessory_desc?: string
}

// =====================================================================
// Repository 类
// =====================================================================

export class TransferOrderRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取调拨单（含明细）
     */
    async findById(id: string): Promise<TransferOrderWithItems | null> {
        const order = await this.db.equipment_transfer_orders.findUnique({
            where: { id }
        })
        if (!order) return null

        const items = await this.db.equipment_transfer_order_items.findMany({
            where: { order_id: id }
        })

        return { ...order, items }
    }

    /**
     * 根据单号获取调拨单
     */
    async findByOrderNo(orderNo: string): Promise<TransferOrder | null> {
        return this.db.equipment_transfer_orders.findUnique({
            where: { order_no: orderNo }
        })
    }

    /**
     * 分页查询调拨单列表
     */
    async findMany(params: GetOrdersParams): Promise<{ data: TransferOrderWithItems[]; total: number }> {
        const {
            status,
            from_warehouse_id,
            from_project_id,
            to_warehouse_id,
            to_project_id,
            applicant_id,
            search,
            page = 1,
            pageSize = 20
        } = params

        // 构建动态 where 条件
        const where: Prisma.equipment_transfer_ordersWhereInput = {}

        if (status) where.status = status as any
        if (from_warehouse_id) where.from_warehouse_id = from_warehouse_id
        if (from_project_id) where.from_project_id = from_project_id
        if (to_warehouse_id) where.to_warehouse_id = to_warehouse_id
        if (to_project_id) where.to_project_id = to_project_id
        if (applicant_id) where.applicant_id = applicant_id
        if (search) {
            where.OR = [
                { order_no: { contains: search } },
                { applicant: { contains: search } },
                { from_warehouse_name: { contains: search } },
                { to_warehouse_name: { contains: search } },
                { from_project_name: { contains: search } },
                { to_project_name: { contains: search } }
            ]
        }

        const [total, orders] = await Promise.all([
            this.db.equipment_transfer_orders.count({ where }),
            this.db.equipment_transfer_orders.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize
            })
        ])

        // 批量获取所有订单的明细（避免 N+1 查询）
        const orderIds = orders.map(o => o.id)
        const allItems = orderIds.length > 0
            ? await this.db.equipment_transfer_order_items.findMany({
                where: { order_id: { in: orderIds } }
            })
            : []

        // 按 order_id 分组
        const itemsByOrderId = allItems.reduce<Record<string, TransferOrderItem[]>>((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = []
            acc[item.order_id].push(item)
            return acc
        }, {})

        const data = orders.map(order => ({
            ...order,
            items: itemsByOrderId[order.id] ?? []
        }))

        return { data, total }
    }

    /**
     * 创建调拨单（事务）
     */
    async createWithItems(
        orderData: CreateOrderData,
        itemsData: CreateOrderItemData[]
    ): Promise<TransferOrderWithItems> {
        return this.db.$transaction(async (tx) => {
            const order = await tx.equipment_transfer_orders.create({
                data: {
                    id: orderData.id,
                    order_no: orderData.order_no,
                    transfer_scene: orderData.transfer_scene as any,
                    applicant_id: orderData.applicant_id,
                    applicant: orderData.applicant,
                    apply_date: orderData.apply_date ?? new Date(),
                    from_location_type: orderData.from_location_type as any,
                    from_warehouse_id: orderData.from_warehouse_id,
                    from_warehouse_name: orderData.from_warehouse_name,
                    from_project_id: orderData.from_project_id,
                    from_project_name: orderData.from_project_name,
                    to_location_type: orderData.to_location_type as any,
                    to_warehouse_id: orderData.to_warehouse_id,
                    to_warehouse_name: orderData.to_warehouse_name,
                    to_project_id: orderData.to_project_id,
                    to_project_name: orderData.to_project_name,
                    transfer_reason: orderData.transfer_reason,
                    status: (orderData.status ?? 'draft') as any,
                    total_items: orderData.total_items ?? itemsData.length,
                    total_requested_quantity: orderData.total_requested_quantity ?? itemsData.reduce((s, i) => s + i.quantity, 0),
                    total_quantity: orderData.total_quantity ?? itemsData.reduce((s, i) => s + i.quantity, 0)
                }
            })

            const items = await Promise.all(
                itemsData.map(item =>
                    tx.equipment_transfer_order_items.create({
                        data: {
                            id: item.id,
                            order_id: order.id,
                            equipment_id: item.equipment_id,
                            equipment_name: item.equipment_name,
                            model_no: item.model_no,
                            brand: item.brand,
                            category: item.category as any,
                            unit: item.unit ?? '台',
                            manage_code: item.manage_code,
                            serial_number: item.serial_number,
                            quantity: item.quantity,
                            notes: item.notes,
                            accessory_info: item.accessory_info ?? undefined,
                            accessory_desc: item.accessory_desc
                        }
                    })
                )
            )

            return { ...order, items }
        })
    }

    /**
     * 更新调拨单状态
     */
    async updateStatus(
        id: string,
        status: string,
        extra?: Partial<Prisma.equipment_transfer_ordersUpdateInput>
    ): Promise<TransferOrder> {
        return this.db.equipment_transfer_orders.update({
            where: { id },
            data: {
                status: status as any,
                updated_at: new Date(),
                ...extra
            }
        })
    }

    /**
     * 获取调拨单的所有明细
     */
    async findItems(orderId: string): Promise<TransferOrderItem[]> {
        return this.db.equipment_transfer_order_items.findMany({
            where: { order_id: orderId }
        })
    }

    /**
     * 更新单个明细项
     */
    async updateItem(
        itemId: string,
        data: Partial<Prisma.equipment_transfer_order_itemsUpdateInput>
    ): Promise<TransferOrderItem> {
        return this.db.equipment_transfer_order_items.update({
            where: { id: itemId },
            data: { ...data, updated_at: new Date() }
        })
    }

    /**
     * 确认发货 - 更新订单状态及发货信息
     */
    async confirmShipping(
        id: string,
        shippingData: {
            shipping_no?: string
            shipped_by?: string
            shipped_at?: Date
            shipping_attachment?: string
            shipping_package_images?: any
        }
    ): Promise<TransferOrder> {
        return this.db.equipment_transfer_orders.update({
            where: { id },
            data: {
                status: 'in_transit' as any,
                shipping_no: shippingData.shipping_no,
                shipped_by: shippingData.shipped_by,
                shipped_at: shippingData.shipped_at ?? new Date(),
                shipping_attachment: shippingData.shipping_attachment,
                shipping_package_images: shippingData.shipping_package_images,
                updated_at: new Date()
            }
        })
    }

    /**
     * 确认收货 - 更新订单状态及收货信息
     */
    async confirmReceiving(
        id: string,
        receivingData: {
            received_by?: string
            receive_status?: string
            receive_comment?: string
            receiving_package_images?: any
            total_received_quantity?: number
            isPartial?: boolean
        }
    ): Promise<TransferOrder> {
        const status = receivingData.isPartial ? 'partial_received' : 'completed'
        return this.db.equipment_transfer_orders.update({
            where: { id },
            data: {
                status: status as any,
                received_by: receivingData.received_by,
                received_at: new Date(),
                receive_status: receivingData.receive_status as any ?? (receivingData.isPartial ? 'partial' : 'normal'),
                receive_comment: receivingData.receive_comment,
                receiving_package_images: receivingData.receiving_package_images,
                total_received_quantity: receivingData.total_received_quantity ?? 0,
                updated_at: new Date()
            }
        })
    }

    /**
     * 统计调拨单（用于仪表盘等）
     */
    async count(where?: Prisma.equipment_transfer_ordersWhereInput): Promise<number> {
        return this.db.equipment_transfer_orders.count({ where })
    }
}

// 导出单例
export const transferOrderRepository = new TransferOrderRepository()
