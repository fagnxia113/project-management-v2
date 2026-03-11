/**
 * InboundOrderServiceV2
 *
 * 设备入库服务 - 使用 Prisma ORM + Repository
 */
import { EquipmentInboundOrderRepository, equipmentInboundOrderRepository } from '../repository/EquipmentInboundOrderRepository.js'
import { EquipmentRepository, equipmentRepository } from '../repository/EquipmentRepository.js'
import { Prisma } from '@prisma/client'

export interface InboundOrder {
  id: string
  order_no: string
  type?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface InboundItem {
  id: string
  order_id: string
  equipment_id?: string
  equipment_name?: string
  quantity?: number
}

export class InboundOrderServiceV2 {
  private repo: EquipmentInboundOrderRepository
  private equipmentRepo: EquipmentRepository

  constructor(
    repo: EquipmentInboundOrderRepository = equipmentInboundOrderRepository,
    equipmentRepo: EquipmentRepository = equipmentRepository
  ) {
    this.repo = repo
    this.equipmentRepo = equipmentRepo
  }

  async createOrder(data: Partial<InboundOrder>): Promise<InboundOrder> {
    return (await this.repo.create(data as any)) as InboundOrder
  }

  async getOrders(filters?: {
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: InboundOrder[]; total: number }> {
    const where: Prisma.equipment_inbound_ordersWhereInput = {}
    if (filters?.status) where.status = filters.status as any

    return await this.repo.findAll({
      where,
      skip: ((filters?.page || 1) - 1) * (filters?.pageSize || 50),
      take: filters?.pageSize || 50,
      orderBy: { created_at: 'desc' }
    })
  }

  async getById(id: string): Promise<InboundOrder | null> {
    return (await this.repo.findById(id)) as InboundOrder | null
  }

  async submitOrder(id: string): Promise<InboundOrder> {
    return (await this.repo.update(id, { status: 'pending' as any })) as InboundOrder
  }

  async approveOrder(id: string): Promise<void> {
    await this.repo.update(id, { status: 'approved' as any })
  }

  async rejectOrder(id: string): Promise<void> {
    await this.repo.update(id, { status: 'rejected' as any })
  }

  async completeOrder(id: string): Promise<void> {
    await this.repo.update(id, { status: 'completed' as any })
  }

  async updateOrder(id: string, data: Partial<InboundOrder>): Promise<InboundOrder> {
    return (await this.repo.update(id, data as any)) as InboundOrder
  }

  async deleteOrder(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async cancelOrder(id: string, reason?: string): Promise<InboundOrder> {
    return (await this.repo.update(id, { status: 'cancelled' as any })) as InboundOrder
  }

  async getItems(orderId: string): Promise<InboundItem[]> {
    return []
  }
}

export const inboundOrderServiceV2 = new InboundOrderServiceV2()
