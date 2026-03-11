/**
 * UserServiceV2
 *
 * 用户服务 - 使用 Prisma ORM + Repository
 */
import { UserRepository, userRepository } from '../repository/UserRepository.js'
import { Prisma } from '@prisma/client'

export interface User {
  id: string
  username: string
  name: string
  email?: string
  role?: string
  status?: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export class UserServiceV2 {
  private repo: UserRepository

  constructor(repo: UserRepository = userRepository) {
    this.repo = repo
  }

  async getUserById(id: string): Promise<User | null> {
    return (await this.repo.findById(id)) as User | null
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return (await this.repo.findByUsername(username)) as User | null
  }

  async getUsers(params?: {
    status?: string
    role?: string
  }): Promise<User[]> {
    const where: Prisma.usersWhereInput = {}
    if (params?.status) where.status = params.status as any
    if (params?.role) where.role = params.role

    return (await this.repo.findAll({ where })) as User[]
  }

  async getActiveUsers(): Promise<User[]> {
    return (await this.repo.findActive()) as User[]
  }

  async createUser(data: Partial<User>): Promise<User> {
    return (await this.repo.create(data as any)) as User
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return (await this.repo.update(id, data as any)) as User
  }

  async deleteUser(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}

export const userServiceV2 = new UserServiceV2()
