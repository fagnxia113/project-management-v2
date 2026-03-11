/**
 * EmployeeRepository
 *
 * 员工数据访问层
 * 使用 Prisma ORM 替代原生 SQL
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'

export type Employee = Prisma.employeesGetPayload<{}>

export class EmployeeRepository {
    private db: PrismaClient

    constructor(db: PrismaClient = prisma) {
        this.db = db
    }

    /**
     * 根据ID获取员工
     */
    async findById(id: string): Promise<Employee | null> {
        return this.db.employees.findUnique({
            where: { id }
        }) as any
    }

    /**
     * 根据user_id获取员工
     */
    async findByUserId(userId: string): Promise<Employee | null> {
        return this.db.employees.findFirst({
            where: { user_id: userId }
        }) as any
    }

    /**
     * 根据员工编号获取员工
     */
    async findByEmployeeNo(employeeNo: string): Promise<Employee | null> {
        return this.db.employees.findUnique({
            where: { employee_no: employeeNo }
        }) as any
    }

    /**
     * 根据部门ID获取员工列表
     */
    async findByDepartment(departmentId: string): Promise<Employee[]> {
        return this.db.employees.findMany({
            where: { department_id: departmentId }
        }) as any
    }

    /**
     * 获取所有在职员工
     */
    async findActive(): Promise<Employee[]> {
        return this.db.employees.findMany({
            where: { 
                status: 'active',
                current_status: 'on_duty'
            }
        }) as any
    }

    /**
     * 获取所有员工（分页）
     */
    async findAll(params?: {
        skip?: number;
        take?: number;
        where?: Prisma.employeesWhereInput;
        orderBy?: Prisma.employeesOrderByWithRelationInput;
    }): Promise<{ data: Employee[]; total: number }> {
        const { skip = 0, take = 50, where, orderBy } = params || {}
        
        const [data, total] = await Promise.all([
            this.db.employees.findMany({
                skip,
                take,
                where,
                orderBy: orderBy || { created_at: 'desc' }
            }),
            this.db.employees.count({ where })
        ])

        return { data: data as any, total }
    }

    /**
     * 创建员工
     */
    async create(data: Prisma.employeesCreateInput): Promise<Employee> {
        return this.db.employees.create({
            data: {
                ...data,
                created_at: new Date(),
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 更新员工
     */
    async update(id: string, data: Prisma.employeesUpdateInput): Promise<Employee> {
        return this.db.employees.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            }
        }) as any
    }

    /**
     * 删除员工
     */
    async delete(id: string): Promise<void> {
        await this.db.employees.delete({
            where: { id }
        })
    }

    /**
     * 统计员工数量
     */
    async count(where?: Prisma.employeesWhereInput): Promise<number> {
        return this.db.employees.count({ where })
    }

    /**
     * 根据职位获取员工
     */
    async findByPosition(position: string): Promise<Employee[]> {
        return this.db.employees.findMany({
            where: { position }
        }) as any
    }
}

export const employeeRepository = new EmployeeRepository()
