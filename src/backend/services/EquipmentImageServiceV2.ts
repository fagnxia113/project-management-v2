/**
 * EquipmentImageServiceV2
 *
 * 设备图片服务 - 使用 Prisma ORM + Repository
 */
import { EquipmentImageRepository, equipmentImageRepository } from '../repository/EquipmentImageRepository.js'

export interface EquipmentImage {
  id: string
  equipment_id: string
  image_url?: string
  image_type?: string
  sort_order?: number
  business_type?: string
  business_id?: string
  created_at?: string
}

export class EquipmentImageServiceV2 {
  private repo: EquipmentImageRepository

  constructor(repo: EquipmentImageRepository = equipmentImageRepository) {
    this.repo = repo
  }

  async createImage(data: Partial<EquipmentImage>): Promise<EquipmentImage> {
    return await this.repo.create(data)
  }

  async createBatchImages(dtos: Partial<EquipmentImage>[]): Promise<EquipmentImage[]> {
    const results: EquipmentImage[] = []
    for (const dto of dtos) {
      const created = await this.repo.create(dto)
      results.push(created)
    }
    return results
  }

  async getById(id: string): Promise<EquipmentImage | null> {
    return await this.repo.findById(id)
  }

  async getByEquipmentId(equipmentId: string): Promise<EquipmentImage[]> {
    return await this.repo.findByEquipmentId(equipmentId)
  }

  async getByBusiness(businessType: string, businessId: string): Promise<EquipmentImage[]> {
    return await this.repo.findAll({ where: { business_type: businessType, business_id: businessId } as any }).then(r => r.data)
  }

  async getByType(equipmentId: string, imageType: string): Promise<EquipmentImage[]> {
    return await this.repo.findAll({ where: { equipment_id: equipmentId, image_type: imageType } as any }).then(r => r.data)
  }

  async getLatestImage(equipmentId: string, imageType: string): Promise<EquipmentImage | null> {
    const images = await this.getByType(equipmentId, imageType)
    return images[0] || null
  }

  async updateImage(id: string, updates: Partial<EquipmentImage>): Promise<boolean> {
    await this.repo.update(id, updates)
    return true
  }

  async deleteImage(id: string): Promise<boolean> {
    await this.repo.delete(id)
    return true
  }

  async getInboundImages(equipmentId: string): Promise<EquipmentImage[]> {
    return this.getByBusiness('inbound', equipmentId)
  }

  async getTransferImages(transferOrderId: string): Promise<EquipmentImage[]> {
    return this.getByBusiness('transfer', transferOrderId)
  }
}

export const equipmentImageServiceV2 = new EquipmentImageServiceV2()
