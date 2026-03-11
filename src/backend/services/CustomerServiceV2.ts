/**
 * CustomerServiceV2
 *
 * 客户服务 - 使用 Prisma ORM + Repository
 */
import { CustomerRepository, customerRepository } from '../repository/CustomerRepository.js'
import { Prisma } from '@prisma/client'

export interface Customer {
  id: string
  customer_no: string
  name: string
  contact: string
  phone: string
  address?: string
  type?: 'direct' | 'partner'
  created_at?: string
  updated_at?: string
}

export class CustomerServiceV2 {
  private repo: CustomerRepository

  constructor(repo: CustomerRepository = customerRepository) {
    this.repo = repo
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return (await this.repo.findById(id)) as Customer | null
  }

  async getCustomerByNo(customerNo: string): Promise<Customer | null> {
    return (await this.repo.findByCustomerNo(customerNo)) as Customer | null
  }

  async getCustomers(params?: {
    search?: string
    type?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Customer[]; total: number }> {
    const where: Prisma.customersWhereInput = {}
    if (params?.type) where.type = params.type as any

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search } },
        { customer_no: { contains: params.search } },
        { contact: { contains: params.search } }
      ]
    }

    return {
      data: (await this.repo.findAll({ where })) as Customer[],
      total: await this.repo.count(where)
    }
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    return (await this.repo.create(data as any)) as Customer
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return (await this.repo.update(id, data as any)) as Customer
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}

export const customerServiceV2 = new CustomerServiceV2()
