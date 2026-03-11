/**
 * PositionServiceV2
 *
 * 职位服务 - 使用 Prisma ORM + Repository
 */
import { PositionRepository, positionRepository } from '../repository/PositionRepository.js'
import { Prisma } from '@prisma/client'

export interface Position {
  id: string
  code: string
  name: string
  department_id?: string
  department_name?: string
  level?: number
  category?: string
  description?: string
  requirements?: string
  status?: 'active' | 'inactive'
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export class PositionServiceV2 {
  private repo: PositionRepository

  constructor(repo: PositionRepository = positionRepository) {
    this.repo = repo
  }

  async createPosition(data: Partial<Position>): Promise<Position> {
    return (await this.repo.create(data as any)) as Position
  }

  async getPositionById(id: string): Promise<Position | null> {
    return (await this.repo.findById(id)) as Position | null
  }

  async getPositionByCode(code: string): Promise<Position | null> {
    return (await this.repo.findByCode(code)) as Position | null
  }

  async getPositions(params?: {
    department_id?: string
    status?: string
  }): Promise<Position[]> {
    const where: Prisma.positionsWhereInput = {}
    if (params?.department_id) where.department_id = params.department_id
    if (params?.status) where.status = params.status as any

    return (await this.repo.findAll({ where, orderBy: { sort_order: 'asc' } })) as Position[]
  }

  async getPositionsByDepartment(departmentId: string): Promise<Position[]> {
    return this.getPositions({ department_id: departmentId })
  }

  async getActivePositions(): Promise<Position[]> {
    return (await this.repo.findActive()) as Position[]
  }

  async updatePosition(id: string, data: Partial<Position>): Promise<Position> {
    return (await this.repo.update(id, data as any)) as Position
  }

  async deletePosition(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}

export const positionServiceV2 = new PositionServiceV2()
