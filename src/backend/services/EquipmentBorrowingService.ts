import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface EquipmentBorrowing {
  id: string;
  borrowing_no: string;
  equipment_id: string;
  equipment_name: string;
  manage_code: string;
  lender: string;
  borrow_date: string;
  return_deadline: string;
  contract_no: string;
  project_id: string;
  project_name: string;
  return_date: string;
  return_to: string;
  return_location_id: string;
  status: 'borrowing' | 'returned' | 'overdue';
  notes: string;
  applicant_id: string;
  applicant_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBorrowingDto {
  equipment_id: string;
  lender: string;
  borrow_date: string;
  return_deadline?: string;
  contract_no?: string;
  project_id?: string;
  notes?: string;
}

export class EquipmentBorrowingService {
  private db: any;

  constructor() {
    this.db = db;
  }

  async generateBorrowingNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const result = await this.db.queryOne(`
      SELECT COUNT(*) as count 
      FROM equipment_borrowings 
      WHERE borrowing_no LIKE ?
    `, [`JY-${dateStr}-%`]);
    
    const count = (result as any)?.count || 0;
    const seq = (count + 1).toString().padStart(3, '0');
    
    return `JY-${dateStr}-${seq}`;
  }

  async createBorrowing(data: CreateBorrowingDto, userId: string, userName: string): Promise<EquipmentBorrowing> {
    const connection = await this.db.beginTransaction();
    
    try {
      const borrowingNo = await this.generateBorrowingNo();
      
      const [equipmentInfo] = await connection.query(
        'SELECT id, manage_code, equipment_name, category FROM equipment_instances WHERE id = ?',
        [data.equipment_id]
      ) as any[];
      
      const equipment = equipmentInfo;
      if (!equipment) {
        throw new Error('设备不存在');
      }
      
      const [projectInfo] = await connection.query(
        'SELECT name FROM projects WHERE id = ?',
        [data.project_id || '']
      ) as any[];
      const projectName = projectInfo?.name || null;
      
      const [borrowingResult] = await connection.execute(`
        INSERT INTO equipment_borrowings 
        (id, borrowing_no, equipment_id, equipment_name, manage_code, lender, borrow_date, 
         return_deadline, contract_no, project_id, project_name, status, notes, applicant_id, applicant_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), borrowingNo, data.equipment_id, equipment.equipment_name, equipment.manage_code,
        data.lender, data.borrow_date, data.return_deadline || null, data.contract_no || null,
        data.project_id || null, projectName || null, 'borrowing', data.notes || null,
        userId, userName
      ]);
      
      await connection.execute(`
        UPDATE equipment_instances 
        SET equipment_source = 'borrowed', lender = ?, location_status = 'in_project', location_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [data.lender, data.project_id || null, data.equipment_id]);
      
      await connection.commit();
      
      return this.getById((borrowingResult as any).insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getBorrowings(filters: {
    status?: string;
    project_id?: string;
    lender?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: EquipmentBorrowing[]; total: number; totalPages: number }> {
    const { status, project_id, lender, page, pageSize } = filters;
    const offset = (page - 1) * pageSize;
    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (project_id) {
      whereClause += ' AND project_id = ?';
      params.push(project_id);
    }
    if (lender) {
      whereClause += ' AND lender LIKE ?';
      params.push(`%${lender}%`);
    }

    const countRes = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM equipment_borrowings WHERE ${whereClause}`,
      params
    );
    const total = countRes?.total || 0;

    const data = await this.db.query(
      `SELECT * FROM equipment_borrowings WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { data, total, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<EquipmentBorrowing | undefined> {
    const res = await this.db.queryOne<EquipmentBorrowing>('SELECT * FROM equipment_borrowings WHERE id = ?', [id]);
    return res || undefined;
  }

  async returnBorrowing(id: string, returnData: {
    return_to: 'lender' | 'warehouse';
    return_location_id?: string;
    return_date: string;
    notes?: string;
  }): Promise<void> {
    const connection = await this.db.beginTransaction();
    
    try {
      const [borrowing] = await connection.query(
        'SELECT * FROM equipment_borrowings WHERE id = ?',
        [id]
      ) as any[];
      
      if (!borrowing) {
        throw new Error('借用记录不存在');
      }
      
      await connection.execute(`
        UPDATE equipment_borrowings 
        SET return_date = ?, return_to = ?, return_location_id = ?, status = 'returned', updated_at = NOW()
        WHERE id = ?
      `, [returnData.return_date, returnData.return_to, returnData.return_location_id || null, id]);
      
      if (returnData.return_to === 'warehouse') {
        await connection.execute(`
          UPDATE equipment_instances 
          SET location_status = 'warehouse', location_id = ?, updated_at = NOW()
          WHERE id = ?
        `, [returnData.return_location_id, borrowing.equipment_id]);
      } else {
        await connection.execute(`
          UPDATE equipment_instances 
          SET equipment_source = 'owned', lender = NULL, location_status = 'warehouse', location_id = NULL, updated_at = NOW()
          WHERE id = ?
        `, [borrowing.equipment_id]);
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateBorrowingProject(id: string, projectId: string, projectName: string): Promise<void> {
    await this.db.execute(`
      UPDATE equipment_borrowings 
      SET project_id = ?, project_name = ?, updated_at = NOW()
      WHERE id = ?
    `, [projectId, projectName, id]);
  }

  async checkOverdueBorrowings(): Promise<void> {
    const overdueBorrowings = await this.db.query(`
      SELECT id FROM equipment_borrowings 
      WHERE status = 'borrowing' AND return_deadline < CURDATE()
    `);
    
    for (const borrowing of overdueBorrowings) {
      await this.db.execute(`
        UPDATE equipment_borrowings 
        SET status = 'overdue', updated_at = NOW()
        WHERE id = ?
      `, [borrowing.id]);
    }
  }
}

export const equipmentBorrowingService = new EquipmentBorrowingService();
