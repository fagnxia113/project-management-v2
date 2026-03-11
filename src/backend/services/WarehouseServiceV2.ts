/**
 * WarehouseServiceV2
 *
 * 仓库服务 - 使用 Prisma ORM + Repository
 */
import { WarehouseRepository, warehouseRepository } from '../repository/WarehouseRepository.js'
import { employeeRepository, EmployeeRepository } from '../repository/EmployeeRepository.js'
import { Prisma } from '@prisma/client'

export interface Warehouse {
  id: string
  warehouse_no: string
  name: string
  type?: 'main' | 'sub' | 'virtual'
  location?: string
  address?: string
  manager_id?: string
  status?: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export class WarehouseServiceV2 {
  private repo: WarehouseRepository
  private employeeRepo: EmployeeRepository

  constructor(repo: WarehouseRepository = warehouseRepository, employeeRepo: EmployeeRepository = employeeRepository) {
    this.repo = repo
    this.employeeRepo = employeeRepo
  }

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    return (await this.repo.create(data as any)) as Warehouse
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    return (await this.repo.findById(id)) as Warehouse | null
  }

  async getWarehouseByNo(warehouseNo: string): Promise<Warehouse | null> {
    return (await this.repo.findByWarehouseNo(warehouseNo)) as Warehouse | null
  }

  async getWarehouses(params?: {
    status?: string
    type?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Warehouse[]; total: number; totalPages: number }> {
    const { status, type, search, page = 1, pageSize = 10 } = params || {}
    
    const where: Prisma.warehousesWhereInput = {}
    if (status) where.status = status as any
    if (type) where.type = type as any
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { warehouse_no: { contains: search } },
        { location: { contains: search } }
      ]
    }

    const result = await this.repo.findAll({ 
      where, 
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { created_at: 'desc' }
    })

    const warehousesWithManager = await Promise.all(
      (result.data as Warehouse[]).map(async (warehouse) => {
        if (warehouse.manager_id) {
          try {
            const employee = await this.employeeRepo.findById(warehouse.manager_id)
            return { ...warehouse, manager_name: employee?.name || null }
          } catch (e) {
            console.error('[WarehouseServiceV2] 查询员工失败:', e)
            return { ...warehouse, manager_name: null }
          }
        }
        return { ...warehouse, manager_name: null }
      })
    )

    return {
      data: warehousesWithManager as Warehouse[],
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  }

  async getActiveWarehouses(): Promise<Warehouse[]> {
    const result = await this.repo.findAll({ 
      where: { status: 'active' }
    })
    return result.data as Warehouse[]
  }

  async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    return (await this.repo.update(id, data as any)) as Warehouse
  }

  async deleteWarehouse(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getWarehouseEquipment(warehouseId: string, filters: {
    search?: string
    page: number
    pageSize: number
  }): Promise<{ data: any[]; total: number; totalPages: number }> {
    const { search, page, pageSize } = filters
    const where: any = {
      location_id: warehouseId,
      location_type: 'warehouse'
    }
    
    const result = await this.repo.findAll({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { created_at: 'desc' }
    })

    return {
      data: result.data as any[],
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  }
}

export const warehouseServiceV2 = new WarehouseServiceV2()
