/**
 * WarehouseRepository
 *
 * 仓库数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Warehouse = Prisma.warehousesGetPayload<{}>

export class WarehouseRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取仓库
     */
    async findById(id: string): Promise<Warehouse | null> {
        return this.db.warehouses.findUnique({
            where: { id }
        }) as any
    }

    /**
     * 根据仓库编号获取仓库
     */
    async findByWarehouseNo(warehouseNo: string): Promise<Warehouse | null> {
        return this.db.warehouses.findUnique({
            where: { warehouse_no: warehouseNo }
        }) as any
    }

    /**
     * 获取所有仓库（支持分页）
     */
    async findAll(params?: {
        where?: Prisma.warehousesWhereInput;
        orderBy?: Prisma.warehousesOrderByWithRelationInput;
        skip?: number;
        take?: number;
    }): Promise<{ data: Warehouse[]; total: number }> {
        const { where, orderBy, skip, take } = params || {}
        
        const [data, total] = await Promise.all([
            this.db.warehouses.findMany({
                where,
                orderBy: orderBy || { created_at: 'desc' },
                skip,
                take
            }),
            this.db.warehouses.count({ where })
        ])

        return { data: data as any, total }
    }

    /**
     * 获取活跃仓库
     */
    async findActive(): Promise<Warehouse[]> {
        return this.db.warehouses.findMany({
            where: { status: 'active' },
            orderBy: { created_at: 'desc' }
        }) as any
    }

    /**
     * 创建仓库
     */
    async create(data: Prisma.warehousesCreateInput): Promise<Warehouse> {
        const id = data.id || require('uuid').v4();
        return this.db.warehouses.create({
            data: {
                ...data,
                id,
                created_at: new Date(),
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 更新仓库
     */
    async update(id: string, data: Prisma.warehousesUpdateInput): Promise<Warehouse> {
        return this.db.warehouses.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 删除仓库
     */
    async delete(id: string): Promise<void> {
        await this.db.warehouses.delete({
            where: { id }
        })
    }

    /**
     * 统计仓库数量
     */
    async count(where?: Prisma.warehousesWhereInput): Promise<number> {
        return this.db.warehouses.count({ where })
    }
}

export const warehouseRepository = new WarehouseRepository()
