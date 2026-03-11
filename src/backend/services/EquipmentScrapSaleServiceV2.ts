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
    return (await this.repo.create(data as any)) as ScrapSaleOrder
  }

  async getById(id: string): Promise<ScrapSaleOrder | null> {
    return (await this.repo.findById(id)) as ScrapSaleOrder | null
  }

  async list(filters?: {
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: ScrapSaleOrder[]; total: number }> {
    const where: Prisma.equipment_scrap_ordersWhereInput = {}
    if (filters?.status) where.status = filters.status as any

    return await this.repo.findAll({
      where,
      skip: ((filters?.page || 1) - 1) * (filters?.pageSize || 50),
      take: filters?.pageSize || 50,
      orderBy: { created_at: 'desc' }
    })
  }

  async approveScrapSaleOrder(id: string): Promise<boolean> {
    await this.repo.update(id, { status: 'approved' as any })
    return true
  }

  async rejectScrapSaleOrder(id: string): Promise<boolean> {
    await this.repo.update(id, { status: 'rejected' as any })
    return true
  }

  async processScrapSaleOrder(id: string): Promise<boolean> {
    await this.repo.update(id, { status: 'completed' as any })
    return true
  }

  async setEquipmentStatusToScrapped(equipmentId: string): Promise<void> {
    await this.equipmentRepo.update(equipmentId, { 
      location_status: 'scrapped' as any 
    })
  }
}

export const equipmentScrapSaleServiceV2 = new EquipmentScrapSaleServiceV2()
