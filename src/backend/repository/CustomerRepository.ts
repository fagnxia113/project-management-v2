/**
 * CustomerRepository
 *
 * 客户数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Customer = Prisma.customersGetPayload<{}>

export class CustomerRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取客户
     */
    async findById(id: string): Promise<Customer | null> {
        return this.db.customers.findUnique({
            where: { id }
        }) as any
    }

    /**
     * 根据客户编号获取客户
     */
    async findByCustomerNo(customerNo: string): Promise<Customer | null> {
        return this.db.customers.findUnique({
            where: { customer_no: customerNo }
        }) as any
    }

    /**
     * 获取所有客户
     */
    async findAll(params?: {
        where?: Prisma.customersWhereInput;
        orderBy?: Prisma.customersOrderByWithRelationInput;
    }): Promise<Customer[]> {
        return this.db.customers.findMany({
            where: params?.where,
            orderBy: params?.orderBy || { created_at: 'desc' }
        }) as any
    }

    /**
     * 搜索客户
     */
    async search(keyword: string): Promise<Customer[]> {
        return this.db.customers.findMany({
            where: {
                OR: [
                    { name: { contains: keyword } },
                    { customer_no: { contains: keyword } },
                    { contact: { contains: keyword } }
                ]
            }
        }) as any
    }

    /**
     * 创建客户
     */
    async create(data: Prisma.customersCreateInput): Promise<Customer> {
        return this.db.customers.create({
            data: {
                ...data,
                created_at: new Date(),
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 更新客户
     */
    async update(id: string, data: Prisma.customersUpdateInput): Promise<Customer> {
        return this.db.customers.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 删除客户
     */
    async delete(id: string): Promise<void> {
        await this.db.customers.delete({
            where: { id }
        })
    }

    /**
     * 统计客户数量
     */
    async count(where?: Prisma.customersWhereInput): Promise<number> {
        return this.db.customers.count({ where })
    }
}

export const customerRepository = new CustomerRepository()
