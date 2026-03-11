/**
 * EquipmentAccessoryServiceV2
 *
 * 设备配件服务 - 使用 Prisma ORM + Repository
 */
import { EquipmentAccessoryRepository, equipmentAccessoryRepository } from '../repository/EquipmentAccessoryRepository.js'

export interface EquipmentAccessory {
  id: string
  accessory_name?: string
  accessory_model?: string
  accessory_brand?: string
  category?: string
  unit?: string
}

export interface EquipmentAccessoryInstance {
  id: string
  equipment_id: string
  accessory_id: string
  quantity?: number
  accessory_desc?: string
}

export interface AccessoryRelation {
  id: string
  host_equipment_id: string
  accessory_equipment_id: string
}

export class EquipmentAccessoryServiceV2 {
  private repo: EquipmentAccessoryRepository

  constructor(repo: EquipmentAccessoryRepository = equipmentAccessoryRepository) {
    this.repo = repo
  }

  async createAccessoryInstance(data: Partial<EquipmentAccessoryInstance>): Promise<EquipmentAccessoryInstance> {
    return await this.repo.createInstance(data)
  }

  async createAccessoryRelation(data: Partial<AccessoryRelation>): Promise<AccessoryRelation> {
    return await this.repo.createRelation ? await this.repo.createRelation(data) : await this.repo.create(data as any) as any
  }

  async getAccessoryById(id: string): Promise<EquipmentAccessory | null> {
    return await this.repo.findById(id)
  }

  async getAccessoriesByHost(hostEquipmentId: string): Promise<EquipmentAccessoryInstance[]> {
    return await this.repo.findByEquipmentId(hostEquipmentId)
  }

  async getRelationsByHost(hostEquipmentId: string): Promise<AccessoryRelation[]> {
    return await this.repo.findRelationsByHost(hostEquipmentId)
  }

  async getAccessoriesWithDetails(hostEquipmentId: string): Promise<any[]> {
    return await this.repo.findWithDetails(hostEquipmentId)
  }

  async updateAccessoryInstance(id: string, updates: Partial<EquipmentAccessoryInstance>): Promise<boolean> {
    await this.repo.updateInstance(id, updates)
    return true
  }

  async updateAccessoryRelation(id: string, updates: Partial<AccessoryRelation>): Promise<boolean> {
    await this.repo.updateRelation ? await this.repo.updateRelation(id, updates) : await this.repo.update(id, updates as any)
    return true
  }

  async deleteAccessoryInstance(id: string): Promise<boolean> {
    await this.repo.deleteInstance(id)
    return true
  }

  async deleteAccessoryRelation(id: string): Promise<boolean> {
    await this.repo.deleteRelation ? await this.repo.deleteRelation(id) : await this.repo.delete(id)
    return true
  }

  async deleteAllAccessoriesByHost(hostEquipmentId: string): Promise<boolean> {
    await this.repo.deleteByEquipmentId(hostEquipmentId)
    return true
  }

  async getAccessoryStatistics(hostEquipmentId: string): Promise<any> {
    const accessories = await this.getAccessoriesByHost(hostEquipmentId)
    return {
      total_count: accessories.length,
      total_quantity: accessories.reduce((sum, a) => sum + (a.quantity || 0), 0)
    }
  }
}

export const equipmentAccessoryServiceV2 = new EquipmentAccessoryServiceV2()
