/**
 * EmployeeServiceV2
 *
 * 员工服务 - 使用 Prisma ORM + Repository
 */
import { EmployeeRepository, employeeRepository } from '../repository/EmployeeRepository.js'
import { Prisma } from '@prisma/client'
import { BaseService } from './BaseService.js'

export interface Employee {
  id: string
  employee_no: string
  name: string
  gender: 'male' | 'female'
  phone: string
  email: string
  department_id: string
  position: string
  status: 'active' | 'resigned' | 'probation'
  current_status: 'on_duty' | 'leave' | 'business_trip' | 'other'
  hire_date: string
  leave_date: string
  role: 'admin' | 'project_manager' | 'hr_manager' | 'equipment_manager' | 'implementer' | 'user'
  daily_cost: number
  skills: any
  avatar_color: string
  created_at: string
  updated_at: string
}

export class EmployeeServiceV2 extends BaseService<Employee> {
  constructor(repo: EmployeeRepository = employeeRepository) {
    super(repo)
  }

  async getEmployees(filters: {
    search?: string
    status?: string
    department_id?: string
    role?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Employee[]; total: number; totalPages: number }> {
    const { search, status, department_id, role, page = 1, pageSize = 100 } = filters

    const where: Prisma.employeesWhereInput = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { employee_no: { contains: search } },
        { phone: { contains: search } }
      ]
    }
    if (status) where.status = status as any
    if (department_id) where.department_id = department_id
    if (role) where.role = role as any

    const result = await this.getAll({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return {
      data: result.data as Employee[],
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    return (await this.getById(id)) as Employee | null
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return (await (this.repo as any).findActive()) as Employee[]
  }

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    return (await this.create(data as any)) as Employee
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    return (await this.update(id, data as any)) as Employee
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.delete(id)
  }

  async getEmployeeByUserId(userId: string): Promise<Employee | null> {
    return (await (this.repo as any).findByUserId(userId)) as Employee | null
  }
}

export const employeeServiceV2 = new EmployeeServiceV2()
