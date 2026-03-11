/**
 * PositionRepository
 *
 * 职位数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Position = Prisma.positionsGetPayload<{}>

export class PositionRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取职位
     */
    async findById(id: string): Promise<Position | null> {
        return this.db.positions.findUnique({
            where: { id }
        }) as any
    }

    /**
     * 根据职位编码获取职位
     */
    async findByCode(code: string): Promise<Position | null> {
        return this.db.positions.findUnique({
            where: { code }
        }) as any
    }

    /**
     * 根据部门ID获取职位列表
     */
    async findByDepartment(departmentId: string): Promise<Position[]> {
        return this.db.positions.findMany({
            where: { department_id: departmentId }
        }) as any
    }

    /**
     * 获取所有职位
     */
    async findAll(params?: {
        where?: Prisma.positionsWhereInput;
        orderBy?: Prisma.positionsOrderByWithRelationInput;
    }): Promise<Position[]> {
        return this.db.positions.findMany({
            where: params?.where,
            orderBy: params?.orderBy || { sort_order: 'asc' }
        }) as any
    }

    /**
     * 获取活跃职位
     */
    async findActive(): Promise<Position[]> {
        return this.db.positions.findMany({
            where: { status: 'active' },
            orderBy: { sort_order: 'asc' }
        }) as any
    }

    /**
     * 创建职位
     */
    async create(data: Prisma.positionsCreateInput): Promise<Position> {
        return this.db.positions.create({
            data: {
                ...data,
                created_at: new Date(),
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 更新职位
     */
    async update(id: string, data: Prisma.positionsUpdateInput): Promise<Position> {
        return this.db.positions.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 删除职位
     */
    async delete(id: string): Promise<void> {
        await this.db.positions.delete({
            where: { id }
        })
    }

    /**
     * 统计职位数量
     */
    async count(where?: Prisma.positionsWhereInput): Promise<number> {
        return this.db.positions.count({ where })
    }
}

export const positionRepository = new PositionRepository()
