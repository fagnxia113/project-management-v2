/**
 * EquipmentAccessoryRepository
 *
 * 设备配件 Repository - 使用 Prisma ORM
 */
import { PrismaClient, equipment_accessories, equipment_accessory_instances } from '@prisma/client'

const prisma = new PrismaClient()

export interface EquipmentAccessory {
  id: string
  accessory_name?: string
  accessory_model?: string
  accessory_brand?: string
  category?: string
  unit?: string
  created_at?: string
}

export interface EquipmentAccessoryInstance {
  id: string
  equipment_id: string
  accessory_id: string
  quantity?: number
  accessory_desc?: string
  created_at?: string
}

export interface AccessoryRelation {
  id: string
  host_equipment_id: string
  accessory_equipment_id: string
  created_at?: string
}

export class EquipmentAccessoryRepository {
  async findById(id: string): Promise<EquipmentAccessory | null> {
    return await prisma.equipment_accessories.findUnique({ where: { id } }) as EquipmentAccessory | null
  }

  async findAll(params?: {
    where?: Partial<EquipmentAccessory>
    skip?: number
    take?: number
  }): Promise<{ data: EquipmentAccessory[]; total: number }> {
    const { where, skip = 0, take = 50 } = params || {}
    const [data, total] = await Promise.all([
      prisma.equipment_accessories.findMany({ where: where as any, skip, take }),
      prisma.equipment_accessories.count({ where: where as any })
    ])
    return { data: data as EquipmentAccessory[], total }
  }

  async findByEquipmentId(equipmentId: string): Promise<EquipmentAccessoryInstance[]> {
    return await prisma.equipment_accessory_instances.findMany({
      where: { equipment_id: equipmentId },
      include: { accessories: true }
    }) as any as EquipmentAccessoryInstance[]
  }

  async findRelationsByHost(hostEquipmentId: string): Promise<AccessoryRelation[]> {
    return await prisma.equipment_accessories.findMany({
      where: { id: hostEquipmentId }
    }) as any as AccessoryRelation[]
  }

  async findWithDetails(equipmentId: string): Promise<any[]> {
    return await prisma.equipment_accessory_instances.findMany({
      where: { equipment_id: equipmentId },
      include: { accessories: true }
    })
  }

  async create(data: Partial<EquipmentAccessory>): Promise<EquipmentAccessory> {
    return await prisma.equipment_accessories.create({ data: data as any }) as EquipmentAccessory
  }

  async update(id: string, data: Partial<EquipmentAccessory>): Promise<EquipmentAccessory> {
    return await prisma.equipment_accessories.update({ where: { id }, data: data as any }) as EquipmentAccessory
  }

  async delete(id: string): Promise<void> {
    await prisma.equipment_accessories.delete({ where: { id } })
  }

  async createInstance(data: Partial<EquipmentAccessoryInstance>): Promise<EquipmentAccessoryInstance> {
    return await prisma.equipment_accessory_instances.create({ data: data as any }) as EquipmentAccessoryInstance
  }

  async updateInstance(id: string, data: Partial<EquipmentAccessoryInstance>): Promise<EquipmentAccessoryInstance> {
    return await prisma.equipment_accessory_instances.update({ where: { id }, data: data as any }) as EquipmentAccessoryInstance
  }

  async deleteInstance(id: string): Promise<void> {
    await prisma.equipment_accessory_instances.delete({ where: { id } })
  }

  async deleteByEquipmentId(equipmentId: string): Promise<void> {
    await prisma.equipment_accessory_instances.deleteMany({ where: { equipment_id: equipmentId } })
  }

  async createRelation(data: Partial<AccessoryRelation>): Promise<AccessoryRelation> {
    return await prisma.equipment_accessories.create({ data: data as any }) as any as AccessoryRelation
  }

  async updateRelation(id: string, data: Partial<AccessoryRelation>): Promise<AccessoryRelation> {
    return await prisma.equipment_accessories.update({ where: { id }, data: data as any }) as any as AccessoryRelation
  }

  async deleteRelation(id: string): Promise<void> {
    await prisma.equipment_accessories.delete({ where: { id } })
  }
}

export const equipmentAccessoryRepository = new EquipmentAccessoryRepository()
