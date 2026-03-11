/**
 * UserRepository
 *
 * 用户数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type User = Prisma.usersGetPayload<{}>

export class UserRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取用户
     */
    async findById(id: string): Promise<User | null> {
        return this.db.users.findUnique({
            where: { id }
        }) as any
    }

    /**
     * 根据用户名获取用户
     */
    async findByUsername(username: string): Promise<User | null> {
        return this.db.users.findUnique({
            where: { username }
        }) as any
    }

    /**
     * 根据邮箱获取用户
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.db.users.findUnique({
            where: { email }
        }) as any
    }

    /**
     * 获取所有用户
     */
    async findAll(params?: {
        where?: Prisma.usersWhereInput;
        orderBy?: Prisma.usersOrderByWithRelationInput;
    }): Promise<User[]> {
        return this.db.users.findMany({
            where: params?.where,
            orderBy: params?.orderBy || { created_at: 'desc' }
        }) as any
    }

    /**
     * 获取活跃用户
     */
    async findActive(): Promise<User[]> {
        return this.db.users.findMany({
            where: { status: 'active' }
        }) as any
    }

    /**
     * 创建用户
     */
    async create(data: Prisma.usersCreateInput): Promise<User> {
        return this.db.users.create({
            data: {
                ...data,
                created_at: new Date(),
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 更新用户
     */
    async update(id: string, data: Prisma.usersUpdateInput): Promise<User> {
        return this.db.users.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 删除用户
     */
    async delete(id: string): Promise<void> {
        await this.db.users.delete({
            where: { id }
        })
    }

    /**
     * 统计用户数量
     */
    async count(where?: Prisma.usersWhereInput): Promise<number> {
        return this.db.users.count({ where })
    }
}

export const userRepository = new UserRepository()
