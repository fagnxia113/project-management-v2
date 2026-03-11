/**
 * DepartmentServiceV2
 *
 * 部门服务 - 使用 Prisma ORM + Repository
 */
import { DepartmentRepository, departmentRepository } from '../repository/DepartmentRepository.js'
import { Prisma } from '@prisma/client'

export interface Department {
  id: string
  code: string
  name: string
  parent_id?: string
  manager_id?: string
  manager_name?: string
  level?: number
  path?: string
  sort_order?: number
  status?: 'active' | 'inactive'
  description?: string
  created_at?: string
  updated_at?: string
}

export interface DepartmentTree extends Department {
  children?: DepartmentTree[]
}

export class DepartmentServiceV2 {
  private repo: DepartmentRepository

  constructor(repo: DepartmentRepository = departmentRepository) {
    this.repo = repo
  }

  async createDepartment(data: Partial<Department>): Promise<Department> {
    return (await this.repo.create(data as any)) as Department
  }

  async getDepartmentById(id: string): Promise<Department | null> {
    return (await this.repo.findById(id)) as Department | null
  }

  async getDepartmentByCode(code: string): Promise<Department | null> {
    return (await this.repo.findByCode(code)) as Department | null
  }

  async getDepartments(params?: {
    status?: string
    parent_id?: string
  }): Promise<Department[]> {
    const where: Prisma.departmentsWhereInput = {}
    if (params?.status) where.status = params.status as any
    if (params?.parent_id) where.parent_id = params.parent_id

    return (await this.repo.findAll({ where, orderBy: { sort_order: 'asc' } })) as Department[]
  }

  async getDepartmentTree(): Promise<DepartmentTree[]> {
    const allDepts = (await this.repo.findAll({})) as Department[]
    return this.buildTree(allDepts)
  }

  private buildTree(departments: Department[]): DepartmentTree[] {
    const map = new Map<string, DepartmentTree>()
    const roots: DepartmentTree[] = []

    departments.forEach(dept => {
      map.set(dept.id, { ...dept, children: [] })
    })

    departments.forEach(dept => {
      const node = map.get(dept.id)!
      if (dept.parent_id && map.has(dept.parent_id)) {
        map.get(dept.parent_id)!.children!.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  async updateDepartment(id: string, data: Partial<Department>): Promise<Department> {
    return (await this.repo.update(id, data as any)) as Department
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async getEmployeeCount(departmentId: string): Promise<number> {
    return await this.repo.count({ department_id: departmentId })
  }

  async getDepartmentPath(departmentId: string): Promise<Department[]> {
    const path: Department[] = []
    let current = await this.repo.findById(departmentId)

    while (current) {
      path.unshift(current as Department)
      if (current.parent_id) {
        current = await this.repo.findById(current.parent_id)
      } else {
        break
      }
    }

    return path
  }

  async getAllChildren(departmentId: string): Promise<Department[]> {
    const allDepts = (await this.repo.findAll({})) as Department[]
    const children: Department[] = []
    const queue = [departmentId]
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      for (const dept of allDepts) {
        if (dept.parent_id === currentId) {
          children.push(dept)
          queue.push(dept.id)
        }
      }
    }
    
    return children
  }
}

export const departmentServiceV2 = new DepartmentServiceV2()
