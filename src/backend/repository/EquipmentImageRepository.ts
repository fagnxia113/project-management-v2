/**
 * EquipmentImageRepository
 *
 * 设备图片 Repository - 使用 Prisma ORM
 */
import { PrismaClient, equipment_images } from '@prisma/client'

const prisma = new PrismaClient()

export interface EquipmentImage {
  id: string
  equipment_id?: string
  image_url?: string
  image_type?: string
  sort_order?: number
  business_type?: string
  business_id?: string
  created_at?: string
}

export class EquipmentImageRepository {
  async findById(id: string): Promise<EquipmentImage | null> {
    return await prisma.equipment_images.findUnique({ where: { id } }) as EquipmentImage | null
  }

  async findAll(params?: {
    where?: Partial<EquipmentImage>
    skip?: number
    take?: number
    orderBy?: any
  }): Promise<{ data: EquipmentImage[]; total: number }> {
    const { where, skip = 0, take = 50, orderBy } = params || {}
    const [data, total] = await Promise.all([
      prisma.equipment_images.findMany({ where: where as any, skip, take, orderBy }),
      prisma.equipment_images.count({ where: where as any })
    ])
    return { data: data as EquipmentImage[], total }
  }

  async findByEquipmentId(equipmentId: string): Promise<EquipmentImage[]> {
    return await prisma.equipment_images.findMany({
      where: { equipment_id: equipmentId },
      orderBy: { sort_order: 'asc' }
    }) as EquipmentImage[]
  }

  async create(data: Partial<EquipmentImage>): Promise<EquipmentImage> {
    return await prisma.equipment_images.create({ data: data as any }) as EquipmentImage
  }

  async update(id: string, data: Partial<EquipmentImage>): Promise<EquipmentImage> {
    return await prisma.equipment_images.update({ where: { id }, data: data as any }) as EquipmentImage
  }

  async delete(id: string): Promise<void> {
    await prisma.equipment_images.delete({ where: { id } })
  }

  async deleteByBusiness(businessType: string, businessId: string): Promise<void> {
    await prisma.equipment_images.deleteMany({
      where: { business_type: businessType, business_id: businessId }
    })
  }
}

export const equipmentImageRepository = new EquipmentImageRepository()
