/**
 * TransferOrderServiceV2
 *
 * 设备调拨单业务逻辑层（重构版）
 * - 使用 TransferOrderRepository 替代原始 SQL
 * - Service 只负责业务逻辑（不关心 SQL 怎么写）
 * - 清晰可测试，类型安全
 */
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../database/prisma.js'
import { Prisma } from '@prisma/client'
import { NotFoundError, ValidationError, DatabaseError } from '../errors/AppError.js'
import {
    transferOrderRepository,
    TransferOrderRepository,
    CreateOrderData,
    CreateOrderItemData,
    GetOrdersParams,
    TransferOrderWithItems,
} from '../repository/TransferOrderRepository.js'
import { equipmentAccessoryServiceV2 as equipmentAccessoryService } from './EquipmentAccessoryServiceV2.js'
import { equipmentRepository } from '../repository/EquipmentRepository.js'

// =====================================================================
// DTO 定义
// =====================================================================

export interface CreateTransferOrderDto {
    from_location_type: string
    from_warehouse_id?: string
    from_project_id?: string
    to_location_type: string
    to_warehouse_id?: string
    to_project_id?: string
    transfer_reason?: string
    estimated_arrival_date?: string
    estimated_ship_date?: string
    items: TransferItemDto[]
}

export interface TransferItemDto {
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
    accessories?: any[]
    accessory_desc?: string
    is_accessory?: boolean
}

// =====================================================================
// 服务类
// =====================================================================

export class TransferOrderServiceV2 {
    constructor(private readonly repo: TransferOrderRepository = transferOrderRepository) { }

    // -------------------------------------------------------------------
    // 创建调拨单
    // -------------------------------------------------------------------
    async createOrder(
        dto: CreateTransferOrderDto,
        userId: string,
        userName: string
    ): Promise<TransferOrderWithItems> {
        const id = uuidv4()
        const orderNo = this.generateOrderNo()

        // 1. 并行获取源/目标位置名称
        const [fromInfo, toInfo] = await Promise.all([
            this.resolveLocationInfo(dto.from_location_type, dto.from_warehouse_id, dto.from_project_id),
            this.resolveLocationInfo(dto.to_location_type, dto.to_warehouse_id, dto.to_project_id),
        ])

        // 2. 构建 order data
        const firstItem = dto.items[0]
        const orderData: CreateOrderData = {
            id,
            order_no: orderNo,
            transfer_scene: 'A',
            applicant_id: userId,
            applicant: userName,
            apply_date: new Date(),
            from_location_type: dto.from_location_type,
            from_warehouse_id: dto.from_warehouse_id,
            from_warehouse_name: fromInfo.locationName ?? undefined,
            from_project_id: dto.from_project_id,
            from_project_name: dto.from_location_type === 'project' ? fromInfo.locationName ?? undefined : undefined,
            to_location_type: dto.to_location_type,
            to_warehouse_id: dto.to_warehouse_id,
            to_warehouse_name: dto.to_location_type === 'warehouse' ? toInfo.locationName ?? undefined : undefined,
            to_project_id: dto.to_project_id,
            to_project_name: dto.to_location_type === 'project' ? toInfo.locationName ?? undefined : undefined,
            transfer_reason: dto.transfer_reason,
            status: 'pending_from',
            total_items: dto.items.length,
            total_requested_quantity: dto.items.reduce((s, i) => s + i.quantity, 0),
            total_quantity: dto.items.reduce((s, i) => s + i.quantity, 0)
        }

        // 3. 构建 items data（并行获取配件信息）
        const itemsData: CreateOrderItemData[] = await Promise.all(
            dto.items.map(async (item) => {
                let accessoryInfo: any = undefined

                if (item.category === 'instrument') {
                    if (item.accessories && item.accessories.length > 0) {
                        accessoryInfo = item.accessories
                    } else if (item.equipment_id) {
                        const accessories = await equipmentAccessoryService.getAccessoriesWithDetails(item.equipment_id)
                        if (accessories && accessories.length > 0) {
                            accessoryInfo = accessories
                        }
                    }
                }

                return {
                    id: uuidv4(),
                    order_id: id,
                    equipment_id: item.equipment_id,
                    equipment_name: item.equipment_name,
                    model_no: item.model_no,
                    brand: item.brand,
                    category: item.category,
                    unit: item.unit ?? '台',
                    manage_code: item.manage_code,
                    serial_number: item.serial_number,
                    quantity: item.quantity,
                    notes: item.notes,
                    accessory_info: accessoryInfo,
                    accessory_desc: item.accessory_desc,
                    is_accessory: item.is_accessory ?? false
                } satisfies CreateOrderItemData
            })
        )

        // 4. 一次性事务写入
        return this.repo.createWithItems(orderData, itemsData)
    }

    // -------------------------------------------------------------------
    // 查询调拨单列表
    // -------------------------------------------------------------------
    async getList(params: GetOrdersParams): Promise<{ data: TransferOrderWithItems[]; total: number }> {
        return this.repo.findMany(params)
    }

    // -------------------------------------------------------------------
    // 查询单个调拨单（含配件信息处理）
    // -------------------------------------------------------------------
    async getById(id: string, tx?: Prisma.TransactionClient): Promise<TransferOrderWithItems | null> {
        const order = await this.repo.findById(id)
        if (!order) return null

        // 处理仪器类配件查询（并行化提升性能）
        await Promise.all(order.items.map(async (item) => {
            if (item.category === 'instrument' && item.equipment_id) {
                if (item.accessory_info) {
                    (item as any).accessories = item.accessory_info
                } else {
                    const accessories = await equipmentAccessoryService.getAccessoriesWithDetails(item.equipment_id);
                    (item as any).accessories = accessories ?? []
                }
            } else {
                (item as any).accessories = []
            }
        }))

        return order
    }

    // -------------------------------------------------------------------
    // 更新状态
    // -------------------------------------------------------------------
    async updateStatus(id: string, status: string, comment?: string): Promise<boolean> {
        try {
            await this.repo.updateStatus(id, status, comment ? { receive_comment: comment } : undefined)
            return true
        } catch {
            return false
        }
    }

    // -------------------------------------------------------------------
    // 审批（出发地/目的地）
    // -------------------------------------------------------------------
    async approveFromLocation(id: string, approvedBy: string, comment?: string): Promise<boolean> {
        const order = await this.repo.findById(id)
        if (!order) return false

        if (order.status !== 'pending_from') {
            throw new Error(`调拨单状态不正确，当前状态: ${order.status}`)
        }

        await this.repo.updateStatus(id, 'pending_to', {
            from_approved_at: new Date(),
            from_approved_by: approvedBy,
            from_approval_comment: comment
        })
        return true
    }

    async approveToLocation(id: string, approvedBy: string, comment?: string): Promise<boolean> {
        const order = await this.repo.findById(id)
        if (!order) return false

        if (order.status !== 'pending_to') {
            throw new Error(`调拨单状态不正确，当前状态: ${order.status}`)
        }

        await this.repo.updateStatus(id, 'shipping', {
            to_approved_at: new Date(),
            to_approved_by: approvedBy,
            to_approval_comment: comment
        })
        return true
    }

    /**
     * 提交调拨单
     */
    async submitOrder(id: string): Promise<boolean> {
        const order = await this.repo.findById(id)
        if (!order) return false
        if (order.status !== 'draft' as any) {
            // 如果已经是 pending_from 就不报错
            if (order.status === 'pending_from' as any) return true
            throw new Error(`只有草稿状态可以提交，当前状态: ${order.status}`)
        }
        await this.repo.updateStatus(id, 'pending_from')
        return true
    }

    /**
     * 通用审批（根据当前状态决定审批阶段）
     */
    async approveOrder(id: string, userId: string, userName: string, comment?: string): Promise<boolean> {
        const order = await this.repo.findById(id)
        if (!order) return false

        if (order.status === 'pending_from') {
            return this.approveFromLocation(id, userId, comment)
        } else if (order.status === 'pending_to') {
            return this.approveToLocation(id, userId, comment)
        } else {
            throw new Error(`当前状态无法审批: ${order.status}`)
        }
    }

    /**
     * 驳回调拨单
     */
    async rejectOrder(id: string, userId: string, userName: string, comment?: string): Promise<boolean> {
        const order = await this.repo.findById(id)
        if (!order) return false

        await this.repo.updateStatus(id, 'rejected', {
            // 存入对应的驳回信息（借用 approval_comment）
            from_approval_comment: order.status === 'pending_from' ? comment : undefined,
            to_approval_comment: order.status === 'pending_to' ? comment : undefined,
            updated_at: new Date()
        })
        return true
    }

    /**
     * 回退到发货中（从收货中状态回退）
     */
    async returnToShipping(id: string, userId: string, comment?: string): Promise<boolean> {
        const order = await this.repo.findById(id)
        if (!order) return false
        if (order.status !== 'receiving') throw new Error('只有等待收货状态可以回退发货')

        await this.repo.updateStatus(id, 'shipping', {
            return_comment: comment,
            updated_at: new Date()
        })
        return true
    }

    // -------------------------------------------------------------------
    // 确认发货
    // -------------------------------------------------------------------
    async confirmShipping(
        id: string,
        params: {
            shipping_no?: string
            shipped_by?: string
            shipped_at?: string
            shipping_attachment?: string
            item_images?: { item_id: string; images: string[] }[]
            package_images?: string[]
        }
    ): Promise<TransferOrderWithItems> {
        return prisma.$transaction(async (tx) => {
            // 1. 更新订单基本信息
            await this.repo.confirmShipping(id, {
                shipping_no: params.shipping_no,
                shipped_by: params.shipped_by,
                shipped_at: params.shipped_at ? new Date(params.shipped_at) : new Date(),
                shipping_attachment: params.shipping_attachment,
                shipping_package_images: params.package_images
            }, tx)

            // 2. 更新库存状态（改为运输中）
            const items = await this.repo.findItems(id)
            for (const item of items) {
                if (!item.equipment_id) continue

                if ((item as any).is_accessory) {
                    await tx.equipment_accessory_instances.update({
                        where: { id: item.equipment_id },
                        data: { location_status: 'transferring' }
                    })
                } else if (item.category === 'instrument') {
                    await equipmentRepository.update(item.equipment_id, {
                        location_status: 'transferring'
                    }, tx)
                    // 同步更新绑定配件的状态为运输中
                    await tx.equipment_accessory_instances.updateMany({
                        where: { host_equipment_id: item.equipment_id },
                        data: { location_status: 'transferring' }
                    })
                } else {
                    // 假负载/线缆类：分拆数量
                    await equipmentRepository.splitForTransfer(item.equipment_id, item.quantity, id, tx)
                }
            }

            const updatedOrder = await this.getById(id, tx)
            if (!updatedOrder) throw new NotFoundError('调拨单更新后未找到')
            return updatedOrder
        })
    }

    // -------------------------------------------------------------------
    // 确认收货（支持事务）
    // -------------------------------------------------------------------
    async confirmReceiving(
        id: string,
        params: {
            received_by?: string
            receive_status?: string
            receive_comment?: string
            item_images?: { item_id: string; images: string[] }[]
            package_images?: string[]
            received_items?: { item_id: string; received_quantity: number }[]
        }
    ): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            const items = await this.repo.findItems(id)
            let isPartial = false
            let totalReceived = 0

            // 1. 处理明细收货
            if (params.received_items && params.received_items.length > 0) {
                for (const item of items) {
                    const receivedInfo = params.received_items.find(ri => ri.item_id === item.id)
                    const received = receivedInfo?.received_quantity ?? 0
                    totalReceived += received
                    if (received < item.quantity) isPartial = true

                    await this.repo.updateItem(item.id, {
                        received_quantity: received,
                        status: (received > 0 ? 'transferred' : 'returned') as any
                    }, tx)
                }
            } else {
                totalReceived = items.reduce((s, i) => s + i.quantity, 0)
                // 默认全收
                for (const item of items) {
                    await this.repo.updateItem(item.id, {
                        received_quantity: item.quantity,
                        status: 'transferred' as any
                    }, tx)
                }
            }

            // 更新明细收货图片
            if (params.item_images && params.item_images.length > 0) {
                await Promise.all(
                    params.item_images.map(img =>
                        this.repo.updateItem(img.item_id, { receiving_images: img.images }, tx)
                    )
                )
            }

            // 2. 更新主单据状态
            await this.repo.confirmReceiving(id, {
                received_by: params.received_by,
                receive_status: params.receive_status,
                receive_comment: params.receive_comment,
                receiving_package_images: params.package_images,
                total_received_quantity: totalReceived,
                isPartial
            }, tx)

            // 3. 更新物理库存位置
            const order = await tx.equipment_transfer_orders.findUnique({ where: { id } })
            if (!order) throw new NotFoundError('调拨单不存在')

            const { managerId } = await this.resolveLocationInfo(
                order.to_location_type,
                order.to_warehouse_id ?? undefined,
                order.to_project_id ?? undefined
            )

            const targetLocationId = (order.to_location_type === 'warehouse' ? order.to_warehouse_id : order.to_project_id) as string
            const targetStatus = order.to_location_type === 'warehouse' ? 'warehouse' : 'in_project'

            for (const item of items) {
                if (!item.equipment_id) continue

                const receivedInfo = params.received_items?.find(ri => ri.item_id === item.id)
                const receivedQty = receivedInfo?.received_quantity ?? item.quantity

                if (receivedQty <= 0) {
                    // 如果没收到，状态应回退或标记异常，这里简单处理为回到在库（实际上可能需要回退到发货地）
                    continue
                }

                if ((item as any).is_accessory) {
                    // 如果是独立配件，更新配件表
                    await tx.equipment_accessory_instances.update({
                        where: { id: item.equipment_id },
                        data: {
                            location_id: targetLocationId,
                            location_status: targetStatus as any,
                            keeper_id: managerId ?? undefined,
                            updated_at: new Date()
                        }
                    })
                } else if (item.category === 'instrument') {
                    // 如果是主设备（仪器类），更新主表并同步其绑定的配件
                    await equipmentRepository.transferEquipment(item.equipment_id, {
                        location_id: targetLocationId,
                        location_status: targetStatus,
                        keeper_id: managerId ?? undefined
                    }, tx)
                } else {
                    // 非仪器类主设备（线缆/假负载）
                    await equipmentRepository.update(item.equipment_id, {
                        location_id: targetLocationId,
                        location_status: targetStatus,
                        keeper_id: managerId ?? undefined,
                        updated_at: new Date()
                    }, tx)
                }
            }

            return true
        })
    }

    // -------------------------------------------------------------------
    // 撤回/取消
    // -------------------------------------------------------------------
    async cancelOrder(id: string, reason?: string): Promise<TransferOrderWithItems> {
        await this.repo.updateStatus(id, 'cancelled', reason ? { return_comment: reason } : undefined)
        return this.getById(id) as Promise<TransferOrderWithItems>
    }

    async withdrawOrder(id: string, reason?: string): Promise<boolean> {
        await this.repo.updateStatus(id, 'withdrawn', reason ? { return_comment: reason } : undefined)
        return true
    }

    // -------------------------------------------------------------------
    // 辅助方法
    // -------------------------------------------------------------------

    /**
     * 解析位置信息（仓库 or 项目）
     */
    private async resolveLocationInfo(
        locationType: string,
        warehouseId?: string,
        projectId?: string
    ): Promise<{ locationName: string | null; managerId: string | null; managerName: string | null }> {
        if (locationType === 'warehouse' && warehouseId) {
            const wh = await prisma.warehouses.findUnique({
                where: { id: warehouseId }
            })
            if (!wh) return { locationName: null, managerId: null, managerName: null }

            let managerName: string | null = null
            if (wh.manager_id) {
                const manager = await prisma.employees.findUnique({ where: { id: wh.manager_id } })
                managerName = manager?.name ?? null
            }
            return { locationName: wh.name, managerId: wh.manager_id ?? null, managerName }
        }

        if ((locationType === 'project') && projectId) {
            const proj = await prisma.projects.findUnique({
                where: { id: projectId }
            })
            if (!proj) return { locationName: null, managerId: null, managerName: null }

            let managerName: string | null = null
            if (proj.manager_id) {
                const manager = await prisma.employees.findUnique({ where: { id: proj.manager_id } })
                managerName = manager?.name ?? null
            }
            return { locationName: proj.name, managerId: proj.manager_id ?? null, managerName }
        }

        return { locationName: null, managerId: null, managerName: null }
    }

    /**
     * 生成调拨单号
     */
    private generateOrderNo(): string {
        const now = new Date()
        const dateStr = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0')
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `DB${dateStr}${random}`
    }
}

// 导出单例
export const transferOrderServiceV2 = new TransferOrderServiceV2()
