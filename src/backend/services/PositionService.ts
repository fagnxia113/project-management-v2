import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  Position, 
  CreatePositionParams, 
  UpdatePositionParams 
} from '../types/organization.js';

export class PositionService {
  async generateCode(): Promise<string> {
    const result = await db.queryOne<{ maxCode: string }>(
      'SELECT code as maxCode FROM positions ORDER BY code DESC LIMIT 1'
    );
    
    if (!result?.maxCode) {
      return 'GW-00001';
    }
    
    const currentNum = parseInt(result.maxCode.replace('GW-', ''), 10);
    const nextNum = currentNum + 1;
    return `GW-${nextNum.toString().padStart(5, '0')}`;
  }

  async createPosition(params: CreatePositionParams): Promise<Position> {
    const id = uuidv4();
    const code = await this.generateCode();

    let departmentName: string | undefined;
    if (params.department_id) {
      const dept = await db.queryOne<{ name: string }>(
        'SELECT name FROM departments WHERE id = ?',
        [params.department_id]
      );
      departmentName = dept?.name;
    }

    await db.execute(
      `INSERT INTO positions (
        id, code, name, department_id, department_name, level, category, 
        description, requirements, sort_order, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, code, params.name, params.department_id || null,
        departmentName || null, params.level || 1, params.category || null,
        params.description || null, params.requirements || null,
        params.sort_order || 0, 'active'
      ]
    );

    return this.getPositionById(id) as Promise<Position>;
  }

  async getPositionById(id: string): Promise<Position | undefined> {
    const position = await db.queryOne<Position>(
      'SELECT * FROM positions WHERE id = ?',
      [id]
    );
    
    if (position) {
      position.employee_count = await this.getEmployeeCount(id);
    }
    
    return position ?? undefined;
  }

  async getPositionByCode(code: string): Promise<Position | undefined> {
    const position = await db.queryOne<Position>(
      'SELECT * FROM positions WHERE code = ?',
      [code]
    );
    
    if (position) {
      position.employee_count = await this.getEmployeeCount(position.id);
    }
    
    return position ?? undefined;
  }

  async getPositions(params?: {
    department_id?: string;
    status?: string;
    category?: string;
    include_inactive?: boolean;
  }): Promise<Position[]> {
    let sql = 'SELECT * FROM positions WHERE 1=1';
    const values: any[] = [];

    if (params?.department_id) {
      sql += ' AND department_id = ?';
      values.push(params.department_id);
    }

    if (params?.status) {
      sql += ' AND status = ?';
      values.push(params.status);
    } else if (!params?.include_inactive) {
      sql += " AND status = 'active'";
    }

    if (params?.category) {
      sql += ' AND category = ?';
      values.push(params.category);
    }

    sql += ' ORDER BY sort_order, created_at';

    const positions = await db.query<Position>(sql, values);
    
    for (const pos of positions) {
      pos.employee_count = await this.getEmployeeCount(pos.id);
    }
    
    return positions;
  }

  async updatePosition(id: string, params: UpdatePositionParams): Promise<Position | undefined> {
    const position = await this.getPositionById(id);
    if (!position) return undefined;

    const updates: string[] = [];
    const values: any[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
    }

    if (params.department_id !== undefined) {
      updates.push('department_id = ?');
      values.push(params.department_id || null);
      
      if (params.department_id) {
        const dept = await db.queryOne<{ name: string }>(
          'SELECT name FROM departments WHERE id = ?',
          [params.department_id]
        );
        updates.push('department_name = ?');
        values.push(dept?.name || null);
      } else {
        updates.push('department_name = ?');
        values.push(null);
      }
    }

    if (params.level !== undefined) {
      updates.push('level = ?');
      values.push(params.level);
    }

    if (params.category !== undefined) {
      updates.push('category = ?');
      values.push(params.category || null);
    }

    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description || null);
    }

    if (params.requirements !== undefined) {
      updates.push('requirements = ?');
      values.push(params.requirements || null);
    }

    if (params.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(params.sort_order);
    }

    if (params.status !== undefined) {
      updates.push('status = ?');
      values.push(params.status);
    }

    if (updates.length === 0) return position;

    await db.execute(
      `UPDATE positions SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    return this.getPositionById(id);
  }

  async deletePosition(id: string): Promise<boolean> {
    const employees = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM employees WHERE position_id = ?',
      [id]
    );
    
    if (employees && employees.count > 0) {
      throw new Error('该岗位下存在员工，无法删除');
    }

    const result = await db.execute(
      'DELETE FROM positions WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  async getEmployeeCount(positionId: string): Promise<number> {
    const result = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM employees WHERE position_id = ? AND status != 'resigned'",
      [positionId]
    );
    return result?.count || 0;
  }

  async getPositionsByDepartment(departmentId: string): Promise<Position[]> {
    return this.getPositions({ department_id: departmentId });
  }

  async getPositionCategories(): Promise<string[]> {
    const result = await db.query<{ category: string }>(
      'SELECT DISTINCT category FROM positions WHERE category IS NOT NULL ORDER BY category'
    );
    return result.map(r => r.category);
  }

  async getPositionsByCategory(category: string): Promise<Position[]> {
    return this.getPositions({ category });
  }
}

export const positionService = new PositionService();
