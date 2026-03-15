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
    return (await this.repo.create(data as any)) as unknown as RepairOrder
  }

  async getById(id: string): Promise<RepairOrder | null> {
    return (await this.repo.findById(id)) as unknown as RepairOrder | null
  }

  async list(filters?: {
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: RepairOrder[]; total: number }> {
    const where: Prisma.equipment_repair_ordersWhereInput = {}
    if (filters?.status) where.status = filters.status as any

    const result = await this.repo.findAll({
      where,
      skip: ((filters?.page || 1) - 1) * (filters?.pageSize || 50),
      take: filters?.pageSize || 50,
      orderBy: { created_at: 'desc' }
    })
    return result as unknown as { data: RepairOrder[]; total: number }
  }

  async approveRepairOrder(id: string, approvedBy: string, approvedByName?: string, comment?: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'shipping' as any,
      approved_by: approvedBy,
      approval_comment: comment,
      approved_at: new Date()
    } as any)
    return true
  }

  async rejectRepairOrder(id: string, rejectedBy: string, rejectedByName?: string, comment?: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'rejected' as any,
      approved_by: rejectedBy,
      approval_comment: comment,
      approved_at: new Date()
    } as any)
    return true
  }

  async shipRepairOrder(id: string, shippingNo: string, shippedBy: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'repairing' as any,
      shipping_no: shippingNo,
      shipped_by: shippedBy,
      shipped_at: new Date()
    } as any)
    return true
  }

  async receiveRepairOrder(id: string, receivedBy: string): Promise<boolean> {
    await this.repo.update(id, {
      status: 'completed' as any,
      received_by: receivedBy,
      received_at: new Date()
    } as any)
    return true
  }

  async createBatchRepairOrders(dto: {
    equipment_data: Array<{
      equipment_id: string;
      equipment_name: string;
      equipment_category: string;
      repair_quantity?: number;
    }>;
    original_location_type: string;
    original_location_id: string;
    fault_description: string;
    repair_service_provider?: string;
  }, userId: string, userName: string): Promise<RepairOrder[]> {
    const orders: RepairOrder[] = []
    for (const equipment of dto.equipment_data) {
      const order = await this.createRepairOrder({
        equipment_id: equipment.equipment_id,
        equipment_name: equipment.equipment_name,
        fault_description: dto.fault_description,
        repair_quantity: equipment.repair_quantity || 1,
        status: 'pending',
        // 其他字段根据 Repository 需求补充
      } as any)
      orders.push(order)
    }
    return orders
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
