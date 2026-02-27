import { db } from '../database/connection.js';

export interface Employee {
  id: string;
  employee_no: string;
  name: string;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  department_id: string;
  position: string;
  status: 'active' | 'resigned' | 'probation';
  current_status: 'on_duty' | 'leave' | 'business_trip' | 'other';
  hire_date: string;
  leave_date: string;
  role: 'admin' | 'project_manager' | 'hr_manager' | 'equipment_manager' | 'implementer' | 'user';
  daily_cost: number;
  skills: any;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export class EmployeeService {
  async getEmployees(filters: {
    search?: string;
    status?: string;
    department_id?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Employee[]; total: number; totalPages: number }> {
    const { search, status, department_id, role, page = 1, pageSize = 100 } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '1=1';
    const params: any[] = [];
    
    if (search) {
      whereClause += ' AND (e.name LIKE ? OR e.employee_no LIKE ? OR e.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
      whereClause += ' AND e.status = ?';
      params.push(status);
    }
    
    if (department_id) {
      whereClause += ' AND e.department_id = ?';
      params.push(department_id);
    }
    
    if (role) {
      whereClause += ' AND e.role = ?';
      params.push(role);
    }
    
    const countResult = await db.queryOne(
      `SELECT COUNT(*) as total FROM employees e WHERE ${whereClause}`,
      params
    );
    const total = countResult?.total || 0;
    
    const data = await db.query(
      `SELECT e.*, d.name as department_name 
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    return { data, total, totalPages: Math.ceil(total / pageSize) };
  }
  
  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const res = await db.queryOne(
      `SELECT e.*, d.name as department_name 
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = ?`,
      [id]
    );
    return res || undefined;
  }
  
  async getActiveEmployees(): Promise<Employee[]> {
    const res = await db.query(
      `SELECT e.*, d.name as department_name 
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.status = 'active'
       ORDER BY e.name ASC`
    );
    return res || [];
  }
}

export const employeeService = new EmployeeService();
