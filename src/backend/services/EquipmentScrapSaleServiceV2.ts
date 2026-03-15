/**
 * EquipmentScrapSaleServiceV2
 *
 * 设备报废/销售服务 - 使用 Prisma ORM + Repository
 */
import { EquipmentScrapOrderRepository, equipmentScrapOrderRepository } from '../repository/EquipmentScrapOrderRepository.js'
import { EquipmentRepository, equipmentRepository } from '../repository/EquipmentRepository.js'
import { Prisma } from '@prisma/client'

export interface ScrapSaleOrder {
  id: string
  order_no: string
  equipment_id: string
  equipment_name?: string
  scrap_reason?: string
  scrap_quantity?: number
  status?: string
  created_at?: string
  updated_at?: string
}

export class EquipmentScrapSaleServiceV2 {
  private repo: EquipmentScrapOrderRepository
  private equipmentRepo: EquipmentRepository

  constructor(
    repo: EquipmentScrapOrderRepository = equipmentScrapOrderRepository,
    equipmentRepo: EquipmentRepository = equipmentRepository
  ) {
    this.repo = repo
    this.equipmentRepo = equipmentRepo
  }

  async createScrapSaleOrder(data: Partial<ScrapSaleOrder>): Promise<ScrapSaleOrder> {
    return (await this.repo.create(data as any)) as unknown as ScrapSaleOrder
  }

  async getById(id: string): Promise<ScrapSaleOrder | null> {
    return (await this.repo.findById(id)) as unknown as ScrapSaleOrder | null
  }

  async list(filters?: {
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: ScrapSaleOrder[]; total: number }> {
    const where: Prisma.equipment_scrap_ordersWhereInput = {}
    if (filters?.status) where.status = filters.status as any

    const result = await this.repo.findAll({
      where,
      skip: ((filters?.page || 1) - 1) * (filters?.pageSize || 50),
      take: filters?.pageSize || 50,
      orderBy: { created_at: 'desc' }
    })
    return result as unknown as { data: ScrapSaleOrder[]; total: number }
  }

  async approveScrapSaleOrder(id: string, approvedBy: string, approvedByName?: string, comment?: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'processing' as any,
      approved_by: approvedBy,
      approval_comment: comment,
      approved_at: new Date()
    } as any)
    return true
  }

  async rejectScrapSaleOrder(id: string, rejectedBy: string, rejectedByName?: string, comment?: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'rejected' as any,
      approved_by: rejectedBy,
      approval_comment: comment,
      approved_at: new Date()
    } as any)
    return true
  }

  async processScrapSaleOrder(id: string, processedBy: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'completed' as any,
      processed_by: processedBy,
      processed_at: new Date()
    } as any)
    return true
  }

  async createBatchScrapSaleOrders(dto: {
    equipment_data: Array<{
      equipment_id: string;
      equipment_name: string;
      equipment_category: string;
      scrap_quantity?: number;
    }>;
    original_location_type: string;
    original_location_id: string;
    scrap_reason: string;
    process_mode: string;
  }, userId: string, userName: string): Promise<ScrapSaleOrder[]> {
    const orders: ScrapSaleOrder[] = []
    for (const equipment of dto.equipment_data) {
      const order = await this.createScrapSaleOrder({
        equipment_id: equipment.equipment_id,
        equipment_name: equipment.equipment_name,
        scrap_reason: dto.scrap_reason,
        scrap_quantity: equipment.scrap_quantity || 1,
        status: 'pending'
      } as any)
      orders.push(order)
    }
    return orders
  }

  async setEquipmentStatusToScrapped(equipmentId: string, quantity: number = 1): Promise<void> {
    await this.equipmentRepo.scrapEquipment(equipmentId, quantity)
  }
}

export const equipmentScrapSaleServiceV2 = new EquipmentScrapSaleServiceV2()
