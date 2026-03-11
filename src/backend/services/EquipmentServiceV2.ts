/**
 * EquipmentServiceV2
 *
 * 设备服务 - 使用 Prisma ORM + Repository
 */
import { EquipmentRepository, equipmentRepository } from '../repository/EquipmentRepository.js'
import { EquipmentModelRepository, equipmentModelRepository } from '../repository/EquipmentModelRepository.js'
import { EquipmentAccessoryRepository, equipmentAccessoryRepository } from '../repository/EquipmentAccessoryRepository.js'
import { Prisma } from '@prisma/client'
import { db } from '../database/connection.js'

export interface EquipmentInstance {
  id: string
  equipment_no: string
  name: string
  category: 'instrument' | 'fake_load' | 'cable'
  model_id?: string
  location_type?: 'warehouse' | 'project'
  location_id?: string
  location_status?: 'idle' | 'in_use' | 'transferring' | 'repairing' | 'scrapped'
  usage_status?: 'idle' | 'in_use' | 'maintenance'
  keeper_id?: string
  quantity?: number
  created_at?: string
  updated_at?: string
}

export class EquipmentServiceV2 {
  private repo: EquipmentRepository
  private modelRepo: EquipmentModelRepository
  private accessoryRepo: EquipmentAccessoryRepository

  constructor(
    repo: EquipmentRepository = equipmentRepository,
    modelRepo: EquipmentModelRepository = equipmentModelRepository,
    accessoryRepo: EquipmentAccessoryRepository = equipmentAccessoryRepository
  ) {
    this.repo = repo
    this.modelRepo = modelRepo
    this.accessoryRepo = accessoryRepo
  }

  async getEquipmentById(id: string): Promise<EquipmentInstance | null> {
    return (await this.repo.findById(id)) as EquipmentInstance | null
  }

  async getEquipments(params?: {
    category?: string
    location_type?: string
    location_status?: string
    location_id?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: EquipmentInstance[]; total: number }> {
    const where: Prisma.equipment_instancesWhereInput = {}
    if (params?.category) where.category = params.category as any
    if (params?.location_type) where.location_type = params.location_type as any
    if (params?.location_status) where.location_status = params.location_status as any
    if (params?.location_id) where.location_id = params.location_id

    return await this.repo.findAll({
      where,
      skip: ((params.page || 1) - 1) * (params.pageSize || 50),
      take: params.pageSize || 50
    })
  }

  async createEquipment(data: Partial<EquipmentInstance>): Promise<EquipmentInstance> {
    return (await this.repo.create(data as any)) as EquipmentInstance
  }

  async updateEquipment(id: string, data: Partial<EquipmentInstance>): Promise<EquipmentInstance> {
    return (await this.repo.update(id, data as any)) as EquipmentInstance
  }

  async deleteEquipment(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async transferEquipment(
    id: string,
    params: {
      location_id: string
      location_status: any
      usage_status?: any
      keeper_id?: string
    }
  ): Promise<void> {
    await this.repo.transferEquipment(id, params)
  }

  async getEquipmentByLocation(locationId: string): Promise<EquipmentInstance[]> {
    return (await this.repo.findAll({ 
      where: { location_id: locationId },
      take: 1000
    })).data as EquipmentInstance[]
  }

  async getInstances(filters: {
    location_id?: string
    status?: string
    search?: string
    category?: string
    health_status?: string
    usage_status?: string
    location_status?: string
    equipment_source?: string
    page: number
    pageSize: number
  }): Promise<{ data: any[]; total: number; totalPages: number }> {
    const { location_id, status, search, category, health_status, usage_status, location_status, equipment_source, page, pageSize } = filters
    const offset = (page - 1) * pageSize
    
    let whereClause = '1=1'
    const params: any[] = []

    if (location_id) { whereClause += ' AND i.location_id = ?'; params.push(location_id) }
    if (status) { whereClause += ' AND i.location_status = ?'; params.push(status) }
    if (category) { whereClause += ' AND m.category = ?'; params.push(category) }
    if (health_status) { whereClause += ' AND i.health_status = ?'; params.push(health_status) }
    if (usage_status) { whereClause += ' AND i.usage_status = ?'; params.push(usage_status) }
    if (location_status) { whereClause += ' AND i.location_status = ?'; params.push(location_status) }
    if (equipment_source) { whereClause += ' AND i.equipment_source = ?'; params.push(equipment_source) }
    if (search) {
      whereClause += ' AND (i.manage_code LIKE ? OR i.serial_number LIKE ? OR m.name LIKE ? OR m.model_no LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    const countRes = await db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM equipment_instances i 
       LEFT JOIN equipment_models m ON i.model_id = m.id
       WHERE ${whereClause}`,
      params
    )
    const total = countRes?.total || 0

    const data = await db.query(
      `SELECT i.*, 
          m.name as equipment_name,
          m.model_no,
          m.category,
          m.brand,
          m.unit,
          i.manufacturer,
          i.technical_params,
          i.certificate_no,
          i.certificate_issuer,
          i.accessory_desc,
          CASE 
              WHEN i.location_status = 'warehouse' THEN (SELECT name FROM warehouses WHERE id = i.location_id)
              WHEN i.location_status = 'in_project' THEN (SELECT name FROM projects WHERE id = i.location_id)
              ELSE NULL
          END as location_name,
          CASE WHEN m.category = 'instrument' THEN 'instrument' ELSE 'aggregated' END as display_type
 FROM equipment_instances i 
 LEFT JOIN equipment_models m ON i.model_id = m.id
 WHERE ${whereClause} 
 ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    for (const item of data) {
      try {
        const accessories = await db.query(
          `SELECT 
              eai.id,
              eai.accessory_name,
              eai.model_no as accessory_model,
              eai.quantity as accessory_quantity,
              eai.category as accessory_category,
              eai.health_status as accessory_health_status,
              eai.usage_status as accessory_usage_status,
              eai.manage_code as accessory_manage_code,
              eai.brand as accessory_brand,
              eai.unit as accessory_unit,
              eai.serial_number as accessory_serial_number,
              eai.notes as accessory_notes
          FROM equipment_accessory_instances eai
          WHERE eai.host_equipment_id = ?`,
          [item.id]
        )
        item.accessories = accessories || []
      } catch (error) {
        console.error('[EquipmentServiceV2] 获取配件数据失败:', error)
        item.accessories = []
      }
    }

    return { data, total, totalPages: Math.ceil(total / pageSize) }
  }

  async getAggregatedInstances(filters: {
    location_id?: string
    status?: string
    search?: string
    category?: string
    health_status?: string
    usage_status?: string
    location_status?: string
    equipment_source?: string
    page: number
    pageSize: number
  }): Promise<{ data: any[]; total: number; totalPages: number }> {
    return this.getInstances(filters)
  }

  async getStatistics(): Promise<any> {
    const total = await this.repo.count()
    const inWarehouse = await this.repo.count({ location_status: 'idle', location_type: 'warehouse' })
    const inProject = await this.repo.count({ location_type: 'project' })
    const repairing = await this.repo.count({ location_status: 'repairing' })
    
    return { total, inWarehouse, inProject, repairing }
  }

  async getEquipmentNames(): Promise<string[]> {
    const models = await this.modelRepo.findAll({})
    const names = [...new Set((models as any[]).map(m => m.name).filter(Boolean))]
    return names
  }

  async getModelsByName(equipmentName: string): Promise<any[]> {
    return (await this.modelRepo.findAll({
      where: { name: equipmentName }
    })) as any[]
  }

  async getModelsByCategory(category: string): Promise<any[]> {
    return (await this.modelRepo.findAll({
      where: { category: category as any }
    })) as any[]
  }

  async getAllModels(): Promise<any[]> {
    return (await this.modelRepo.findAll({})) as any[]
  }

  async getInstanceById(id: string): Promise<any> {
    const result = await this.repo.findById(id)
    
    if (result) {
      try {
        const accessories = await db.query(
          `SELECT 
              eai.id,
              eai.accessory_name,
              eai.model_no as accessory_model,
              eai.quantity as accessory_quantity,
              eai.category as accessory_category,
              eai.health_status as accessory_health_status,
              eai.usage_status as accessory_usage_status,
              eai.manage_code as accessory_manage_code,
              eai.brand as accessory_brand,
              eai.unit as accessory_unit,
              eai.serial_number as accessory_serial_number,
              eai.notes as accessory_notes
          FROM equipment_accessory_instances eai
          WHERE eai.host_equipment_id = ?`,
          [id]
        )
        result.accessories = accessories || []
      } catch (error) {
        console.error('[EquipmentServiceV2] getInstanceById 获取配件数据失败:', error)
        result.accessories = []
      }
    }
    
    return result
  }

  async createInstance(data: any): Promise<any> {
    return await this.repo.create(data)
  }

  async updateInstance(id: string, updates: any): Promise<any> {
    return await this.repo.update(id, updates)
  }

  async updateInstanceStatus(id: string, data: any): Promise<void> {
    await this.repo.update(id, data)
  }

  async deleteInstance(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getStockDistribution(equipmentName: string, modelNo: string): Promise<any[]> {
    const where: any = {}
    if (equipmentName) where.name = equipmentName
    if (modelNo) where.model_no = modelNo
    
    const models = await this.modelRepo.findAll({ where })
    return models as any[]
  }

  async getImagesByEquipmentId(equipmentId: string): Promise<any[]> {
    const result = await db.query(
      'SELECT * FROM equipment_images WHERE equipment_id = ? ORDER BY created_at DESC',
      [equipmentId]
    )
    return result
  }
}

export const equipmentServiceV2 = new EquipmentServiceV2()
