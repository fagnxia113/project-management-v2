/**
 * EquipmentRepairServiceV2
 *
 * 设备维修服务 - 使用 Prisma ORM + Repository
 */
import { EquipmentRepairOrderRepository, equipmentRepairOrderRepository } from '../repository/EquipmentRepairOrderRepository.js'
import { EquipmentRepository, equipmentRepository } from '../repository/EquipmentRepository.js'
import { Prisma } from '@prisma/client'

export interface RepairOrder {
  id: string
  order_no: string
  equipment_id: string
  equipment_name?: string
  fault_description?: string
  repair_quantity?: number
  status?: string
  created_at?: string
  updated_at?: string
}

export class EquipmentRepairServiceV2 {
  private repo: EquipmentRepairOrderRepository
  private equipmentRepo: EquipmentRepository

  constructor(
    repo: EquipmentRepairOrderRepository = equipmentRepairOrderRepository,
    equipmentRepo: EquipmentRepository = equipmentRepository
  ) {
    this.repo = repo
    this.equipmentRepo = equipmentRepo
  }

  async createRepairOrder(data: Partial<RepairOrder>): Promise<RepairOrder> {
    return (await this.repo.create(data as any)) as RepairOrder
  }

  async getById(id: string): Promise<RepairOrder | null> {
    return (await this.repo.findById(id)) as RepairOrder | null
  }

  async list(filters?: {
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: RepairOrder[]; total: number }> {
    const where: Prisma.equipment_repair_ordersWhereInput = {}
    if (filters?.status) where.status = filters.status as any

    return await this.repo.findAll({
      where,
      skip: ((filters?.page || 1) - 1) * (filters?.pageSize || 50),
      take: filters?.pageSize || 50,
      orderBy: { created_at: 'desc' }
    })
  }

  async approveRepairOrder(id: string): Promise<boolean> {
    await this.repo.update(id, { status: 'approved' as any })
    return true
  }

  async rejectRepairOrder(id: string): Promise<boolean> {
    await this.repo.update(id, { status: 'rejected' as any })
    return true
  }

  async shipRepairOrder(id: string, shippingNo: string): Promise<boolean> {
    await this.repo.update(id, { 
      status: 'shipped' as any,
      shipping_no: shippingNo
    } as any)
    return true
  }

  async receiveRepairOrder(id: string): Promise<boolean> {
    await this.repo.update(id, { status: 'completed' as any })
    return true
  }

  async setEquipmentStatusToRepairing(equipmentId: string): Promise<void> {
    await this.equipmentRepo.update(equipmentId, { 
      location_status: 'repairing' as any 
    })
  }

  async restoreEquipmentFromRepairing(equipmentId: string): Promise<void> {
    await this.equipmentRepo.update(equipmentId, { 
      location_status: 'idle' as any 
    })
  }
}

export const equipmentRepairServiceV2 = new EquipmentRepairServiceV2()
