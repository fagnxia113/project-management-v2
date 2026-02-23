import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  Department, 
  DepartmentTree, 
  CreateDepartmentParams, 
  UpdateDepartmentParams 
} from '../types/organization.js';

export class DepartmentService {
  async generateCode(): Promise<string> {
    const result = await db.queryOne<{ maxCode: string }>(
      'SELECT code as maxCode FROM departments ORDER BY code DESC LIMIT 1'
    );
    
    if (!result?.maxCode) {
      return 'BM-00001';
    }
    
    const currentNum = parseInt(result.maxCode.replace('BM-', ''), 10);
    const nextNum = currentNum + 1;
    return `BM-${nextNum.toString().padStart(5, '0')}`;
  }

  async calculateLevel(parentId?: string): Promise<number> {
    if (!parentId) return 1;
    const parent = await this.getDepartmentById(parentId);
    return parent ? parent.level + 1 : 1;
  }

  async calculatePath(parentId?: string, name?: string): Promise<string> {
    if (!parentId) return `/${name || ''}`;
    const parent = await this.getDepartmentById(parentId);
    if (!parent) return `/${name || ''}`;
    return `${parent.path}/${name || ''}`;
  }

  async createDepartment(params: CreateDepartmentParams): Promise<Department> {
    const id = uuidv4();
    const code = await this.generateCode();
    const level = await this.calculateLevel(params.parent_id);
    const path = await this.calculatePath(params.parent_id, params.name);

    let managerName: string | undefined;
    if (params.manager_id) {
      const manager = await db.queryOne<{ name: string }>(
        'SELECT name FROM employees WHERE id = ?', 
        [params.manager_id]
      );
      managerName = manager?.name;
    }

    await db.execute(
      `INSERT INTO departments (
        id, code, name, parent_id, manager_id, manager_name, level, path, 
        sort_order, status, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, code, params.name, params.parent_id || null, 
        params.manager_id || null, managerName || null,
        level, path, params.sort_order || 0, 'active', params.description || null
      ]
    );

    return this.getDepartmentById(id) as Promise<Department>;
  }

  async getDepartmentById(id: string): Promise<Department | undefined> {
    const dept = await db.queryOne<Department>(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    
    if (dept) {
      dept.employee_count = await this.getEmployeeCount(id);
    }
    
    return dept ?? undefined;
  }

  async getDepartmentByCode(code: string): Promise<Department | undefined> {
    const dept = await db.queryOne<Department>(
      'SELECT * FROM departments WHERE code = ?',
      [code]
    );
    
    if (dept) {
      dept.employee_count = await this.getEmployeeCount(dept.id);
    }
    
    return dept ?? undefined;
  }

  async getDepartments(params?: {
    parent_id?: string;
    status?: string;
    include_inactive?: boolean;
  }): Promise<Department[]> {
    let sql = 'SELECT * FROM departments WHERE 1=1';
    const values: any[] = [];

    if (params?.parent_id !== undefined) {
      if (params.parent_id === null || params.parent_id === '') {
        sql += ' AND parent_id IS NULL';
      } else {
        sql += ' AND parent_id = ?';
        values.push(params.parent_id);
      }
    }

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    } else if (!params?.include_inactive) {
      sql += " AND status = 'active'";
    }

    sql += ' ORDER BY sort_order, created_at';

    const departments = await db.query<Department>(sql, values);
    
    for (const dept of departments) {
      dept.employee_count = await this.getEmployeeCount(dept.id);
    }
    
    return departments;
  }

  async getDepartmentTree(): Promise<DepartmentTree[]> {
    const departments = await this.getDepartments({ include_inactive: false });
    return this.buildTree(departments);
  }

  private buildTree(departments: Department[], parentId?: string): DepartmentTree[] {
    return departments
      .filter(dept => (parentId ? dept.parent_id === parentId : !dept.parent_id))
      .map(dept => ({
        ...dept,
        children: this.buildTree(departments, dept.id)
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async updateDepartment(id: string, params: UpdateDepartmentParams): Promise<Department | undefined> {
    const dept = await this.getDepartmentById(id);
    if (!dept) return undefined;

    const updates: string[] = [];
    const values: any[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
      
      const newPath = await this.calculatePath(dept.parent_id, params.name);
      updates.push('path = ?');
      values.push(newPath);
    }

    if (params.parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(params.parent_id || null);
      
      const newLevel = await this.calculateLevel(params.parent_id);
      updates.push('level = ?');
      values.push(newLevel);
      
      const newPath = await this.calculatePath(params.parent_id, params.name || dept.name);
      updates.push('path = ?');
      values.push(newPath);
    }

    if (params.manager_id !== undefined) {
      updates.push('manager_id = ?');
      values.push(params.manager_id || null);
      
      if (params.manager_id) {
        const manager = await db.queryOne<{ name: string }>(
          'SELECT name FROM employees WHERE id = ?',
          [params.manager_id]
        );
        updates.push('manager_name = ?');
        values.push(manager?.name || null);
      } else {
        updates.push('manager_name = ?');
        values.push(null);
      }
    }

    if (params.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(params.sort_order);
    }

    if (params.status !== undefined) {
      updates.push('status = ?');
      values.push(params.status);
    }

    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description || null);
    }

    if (updates.length === 0) return dept;

    await db.execute(
      `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    return this.getDepartmentById(id);
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const children = await this.getDepartments({ parent_id: id });
    if (children.length > 0) {
      throw new Error('该部门下存在子部门，无法删除');
    }

    const employees = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ?',
      [id]
    );
    
    if (employees && employees.count > 0) {
      throw new Error('该部门下存在员工，无法删除');
    }

    const result = await db.execute(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  async getEmployeeCount(departmentId: string): Promise<number> {
    const result = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM employees WHERE department_id = ? AND status != 'resigned'",
      [departmentId]
    );
    return result?.count || 0;
  }

  async getDepartmentManagers(): Promise<Array<{ id: string; name: string; department_id: string; department_name: string }>> {
    return db.query(`
      SELECT e.id, e.name, d.id as department_id, d.name as department_name
      FROM employees e
      INNER JOIN departments d ON d.manager_id = e.id
      WHERE e.status = 'active' AND d.status = 'active'
    `);
  }

  async getDepartmentByManager(managerId: string): Promise<Department | undefined> {
    return db.queryOne<Department>(
      'SELECT * FROM departments WHERE manager_id = ?',
      [managerId]
    );
  }

  async getParentDepartment(departmentId: string): Promise<Department | undefined> {
    const dept = await this.getDepartmentById(departmentId);
    if (!dept || !dept.parent_id) return undefined;
    return this.getDepartmentById(dept.parent_id);
  }

  async getDepartmentPath(departmentId: string): Promise<Department[]> {
    const path: Department[] = [];
    let current = await this.getDepartmentById(departmentId);
    
    while (current) {
      path.unshift(current);
      if (current.parent_id) {
        current = await this.getDepartmentById(current.parent_id);
      } else {
        break;
      }
    }
    
    return path;
  }

  async getAllChildren(departmentId: string): Promise<Department[]> {
    const allDepts = await this.getDepartments({ include_inactive: false });
    const children: Department[] = [];
    
    const findChildren = (parentId: string) => {
      const depts = allDepts.filter(d => d.parent_id === parentId);
      for (const dept of depts) {
        children.push(dept);
        findChildren(dept.id);
      }
    };
    
    findChildren(departmentId);
    return children;
  }
}

export const departmentService = new DepartmentService();
