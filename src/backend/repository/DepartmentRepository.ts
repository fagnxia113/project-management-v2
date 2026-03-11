/**
 * DepartmentRepository
 *
 * 部门数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Department = Prisma.departmentsGetPayload<{}>

export class DepartmentRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取部门
     */
    async findById(id: string): Promise<Department | null> {
        return this.db.departments.findUnique({
            where: { id }
        }) as any
    }

    /**
     * 根据部门编码获取部门
     */
    async findByCode(code: string): Promise<Department | null> {
        return this.db.departments.findUnique({
            where: { code }
        }) as any
    }

    /**
     * 获取所有部门
     */
    async findAll(params?: {
        where?: Prisma.departmentsWhereInput;
        orderBy?: Prisma.departmentsOrderByWithRelationInput;
    }): Promise<Department[]> {
        return this.db.departments.findMany({
            where: params?.where,
            orderBy: params?.orderBy || { sort_order: 'asc' }
        }) as any
    }

    /**
     * 获取顶级部门（无父部门）
     */
    async findRoot(): Promise<Department[]> {
        return this.db.departments.findMany({
            where: { parent_id: null },
            orderBy: { sort_order: 'asc' }
        }) as any
    }

    /**
     * 获取子部门
     */
    async findChildren(parentId: string): Promise<Department[]> {
        return this.db.departments.findMany({
            where: { parent_id: parentId },
            orderBy: { sort_order: 'asc' }
        }) as any
    }

    /**
     * 创建部门
     */
    async create(data: Prisma.departmentsCreateInput): Promise<Department> {
        return this.db.departments.create({
            data: {
                ...data,
                created_at: new Date(),
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 更新部门
     */
    async update(id: string, data: Prisma.departmentsUpdateInput): Promise<Department> {
        return this.db.departments.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 删除部门
     */
    async delete(id: string): Promise<void> {
        await this.db.departments.delete({
            where: { id }
        })
    }

    /**
     * 统计部门数量
     */
    async count(where?: Prisma.departmentsWhereInput): Promise<number> {
        return this.db.departments.count({ where })
    }
}

export const departmentRepository = new DepartmentRepository()
