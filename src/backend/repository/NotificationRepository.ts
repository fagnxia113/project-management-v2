/**
 * NotificationRepository
 * 通知数据访问层 - 使用 Prisma 替代裸 SQL
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Notification = Prisma.notificationsGetPayload<object>

export interface GetNotificationsParams {
    is_read?: boolean
    type?: string
    limit?: number
    page?: number
    pageSize?: number
}

export class NotificationRepository {
    constructor(private db: PrismaClient = prisma) { }

    async create(data: {
        id: string
        user_id: string
        user_name?: string | null
        type?: string
        title: string
        content: string
        priority?: string
        link?: string | null
    }): Promise<Notification> {
        return this.db.notifications.create({
            data: {
                id: data.id,
                user_id: data.user_id,
                user_name: data.user_name ?? null,
                type: (data.type as any) ?? 'in_app',
                title: data.title,
                content: data.content,
                priority: (data.priority as any) ?? 'normal',
                link: data.link ?? null,
                is_read: false,
                status: 'pending'
            }
        })
    }

    async findById(id: string): Promise<Notification | null> {
        return this.db.notifications.findUnique({ where: { id } })
    }

    async findByUser(userId: string, params?: GetNotificationsParams): Promise<{ data: Notification[]; total: number }> {
        const where: Prisma.notificationsWhereInput = { user_id: userId }

        if (params?.is_read !== undefined) where.is_read = params.is_read
        if (params?.type) where.type = params.type as any

        const limit = params?.limit ?? params?.pageSize ?? 20
        const page = params?.page ?? 1

        const [total, data] = await Promise.all([
            this.db.notifications.count({ where }),
            this.db.notifications.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: params?.page ? (page - 1) * limit : 0
            })
        ])

        return { data, total }
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.db.notifications.count({
            where: { user_id: userId, is_read: false }
        })
    }

    async markAsRead(id: string): Promise<void> {
        await this.db.notifications.update({
            where: { id },
            data: { is_read: true, read_at: new Date() }
        })
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.db.notifications.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true, read_at: new Date() }
        })
    }

    async delete(id: string): Promise<void> {
        await this.db.notifications.delete({ where: { id } })
    }

    async updateStatus(id: string, status: string, errorMessage?: string): Promise<void> {
        await this.db.notifications.update({
            where: { id },
            data: {
                status: status as any,
                ...(status === 'sent' ? { sent_at: new Date() } : {}),
                ...(errorMessage ? { error_message: errorMessage } : {})
            }
        })
    }
}

export const notificationRepository = new NotificationRepository()
