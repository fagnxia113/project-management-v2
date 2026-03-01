import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';

export type ScrapSaleStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
export type ScrapSaleType = 'scrap' | 'sale';

export interface ScrapSaleOrder {
  id: string;
  order_no: string;
  type: ScrapSaleType;
  applicant_id: string;
  applicant: string;
  apply_date: string;
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  scrap_sale_quantity?: number;
  original_location_type: string;
  original_location_id: string;
  reason: string;
  sale_price?: number;
  buyer?: string;
  status: ScrapSaleStatus;
  approval_id?: string;
  approved_at?: string;
  approved_by?: string;
  approval_comment?: string;
  processed_at?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

export class EquipmentScrapSaleService {
  private generateOrderNo(type: ScrapSaleType): string {
    const prefix = type === 'scrap' ? 'BF' : 'XS';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${date}-${random}`;
  }

  async createScrapSaleOrder(data: any, userId: string, userName: string): Promise<ScrapSaleOrder> {
    const connection = await db.beginTransaction();

    try {
      const orderNo = this.generateOrderNo(data.type);

      const order: Partial<ScrapSaleOrder> = {
        id: uuidv4(),
        order_no: orderNo,
        type: data.type,
        applicant_id: userId,
        applicant: userName,
        apply_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        equipment_id: data.equipment_id,
        equipment_name: data.equipment_name,
        equipment_category: data.equipment_category,
        scrap_sale_quantity: data.scrap_sale_quantity || 1,
        original_location_type: data.original_location_type,
        original_location_id: data.original_location_id,
        reason: data.reason,
        sale_price: data.sale_price || null,
        buyer: data.buyer || null,
        status: 'pending',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      await connection.execute(
        `INSERT INTO equipment_scrap_sales 
        (id, order_no, type, applicant_id, applicant, apply_date, equipment_id, equipment_name, equipment_category, 
         scrap_sale_quantity, original_location_type, original_location_id, reason, sale_price, buyer, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id, order.order_no, order.type, order.applicant_id, order.applicant, order.apply_date,
          order.equipment_id, order.equipment_name, order.equipment_category, order.scrap_sale_quantity,
          order.original_location_type, order.original_location_id, order.reason, order.sale_price, order.buyer,
          order.status, order.created_at, order.updated_at
        ]
      );

      await connection.commit();
      return order as ScrapSaleOrder;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createBatchScrapSaleOrders(data: any, userId: string, userName: string): Promise<ScrapSaleOrder[]> {
    const connection = await db.beginTransaction();

    try {
      const orders: ScrapSaleOrder[] = [];

      if (data.equipment_data && Array.isArray(data.equipment_data)) {
        for (const item of data.equipment_data) {
          const orderNo = this.generateOrderNo(data.type);

          const order: Partial<ScrapSaleOrder> = {
            id: uuidv4(),
            order_no: orderNo,
            type: data.type,
            applicant_id: userId,
            applicant: userName,
            apply_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            equipment_id: item.equipment_id,
            equipment_name: item.equipment_name,
            equipment_category: item.equipment_category,
            scrap_sale_quantity: item.scrap_sale_quantity || 1,
            original_location_type: data.original_location_type,
            original_location_id: data.original_location_id,
            reason: data.reason,
            sale_price: data.sale_price || null,
            buyer: data.buyer || null,
            status: 'pending',
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
          };

          await connection.execute(
            `INSERT INTO equipment_scrap_sales 
            (id, order_no, type, applicant_id, applicant, apply_date, equipment_id, equipment_name, equipment_category, 
             scrap_sale_quantity, original_location_type, original_location_id, reason, sale_price, buyer, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              order.id, order.order_no, order.type, order.applicant_id, order.applicant, order.apply_date,
              order.equipment_id, order.equipment_name, order.equipment_category, order.scrap_sale_quantity,
              order.original_location_type, order.original_location_id, order.reason, order.sale_price, order.buyer,
              order.status, order.created_at, order.updated_at
            ]
          );

          orders.push(order as ScrapSaleOrder);
        }
      }

      await connection.commit();
      return orders;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getById(id: string): Promise<ScrapSaleOrder | null> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_scrap_sales WHERE id = ?',
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async list(filters?: {
    status?: ScrapSaleStatus;
    applicant_id?: string;
    equipment_id?: string;
    type?: ScrapSaleType;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: ScrapSaleOrder[]; total: number; totalPages: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT s.*, 
        CASE 
          WHEN s.original_location_type = 'warehouse' THEN (SELECT name FROM warehouses WHERE id = s.original_location_id)
          WHEN s.original_location_type = 'in_project' THEN (SELECT name FROM projects WHERE id = s.original_location_id)
          ELSE NULL
        END as original_location_name,
        (SELECT username FROM users WHERE id = s.approved_by) as approved_by_name,
        (SELECT username FROM users WHERE id = s.processed_by) as processed_by_name
      FROM equipment_scrap_sales s WHERE 1=1
    `;
    const countQuery = 'SELECT COUNT(*) as total FROM equipment_scrap_sales WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND s.status = ?';
      countQuery += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.applicant_id) {
      query += ' AND s.applicant_id = ?';
      countQuery += ' AND applicant_id = ?';
      params.push(filters.applicant_id);
    }

    if (filters?.equipment_id) {
      query += ' AND s.equipment_id = ?';
      countQuery += ' AND equipment_id = ?';
      params.push(filters.equipment_id);
    }

    if (filters?.type) {
      query += ' AND s.type = ?';
      countQuery += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.search) {
      query += ' AND (s.order_no LIKE ? OR s.equipment_name LIKE ? OR s.reason LIKE ?)';
      countQuery += ' AND (order_no LIKE ? OR equipment_name LIKE ? OR reason LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY s.apply_date DESC LIMIT ? OFFSET ?';

    const countRows = await db.query(countQuery, params);
    const total = countRows[0]?.total || 0;

    const rows = await db.query(query, [...params, pageSize, offset]);
    const data = rows || [];

    return {
      data,
      total,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async approveScrapSaleOrder(id: string, approvedBy: string, approvedByName: string, comment?: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const [orderRows] = await connection.query<any>(
        'SELECT * FROM equipment_scrap_sales WHERE id = ?',
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;

      if (!order) {
        throw new Error('报废/售出单不存在');
      }

      await connection.execute(
        `UPDATE equipment_scrap_sales 
         SET status = 'approved', 
             approved_at = NOW(), 
             approved_by = ?,
             approval_comment = ?
         WHERE id = ?`,
        [approvedBy, comment, id]
      );

      await this.setEquipmentStatusToScrapped(connection, order);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async rejectScrapSaleOrder(id: string, rejectedBy: string, rejectedByName: string, comment: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const [orderRows] = await connection.query<any>(
        'SELECT * FROM equipment_scrap_sales WHERE id = ?',
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;

      if (!order) {
        throw new Error('报废/售出单不存在');
      }

      await connection.execute(
        `UPDATE equipment_scrap_sales 
         SET status = 'rejected', 
             approved_at = NOW(), 
             approved_by = ?,
             approval_comment = ?
         WHERE id = ?`,
        [rejectedBy, comment, id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async processScrapSaleOrder(id: string, processedBy: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const [orderRows] = await connection.query<any>(
        'SELECT * FROM equipment_scrap_sales WHERE id = ?',
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;

      if (!order) {
        throw new Error('报废/售出单不存在');
      }

      await connection.execute(
        `UPDATE equipment_scrap_sales 
         SET status = 'completed', 
             processed_at = NOW(), 
             processed_by = ?
         WHERE id = ?`,
        [processedBy, id]
      );

      await this.setEquipmentStatusToScrapped(connection, order);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async setEquipmentStatusToScrapped(connection: any, order: ScrapSaleOrder): Promise<void> {
    const scrapSaleQuantity = order.scrap_sale_quantity || 1;

    if (order.equipment_category === 'instrument') {
      await connection.execute(
        `UPDATE equipment_instances 
         SET location_status = 'scrapped',
             health_status = 'scrapped',
             updated_at = NOW()
         WHERE id = ?`,
        [order.equipment_id]
      );
    } else {
      const [equipmentRows] = await connection.query<any>(
        `SELECT * FROM equipment_instances WHERE id = ?`,
        [order.equipment_id]
      );
      const equipment = equipmentRows && equipmentRows.length > 0 ? equipmentRows[0] : null;

      if (!equipment) {
        throw new Error('设备不存在');
      }

      await connection.execute(
        `UPDATE equipment_instances SET quantity = GREATEST(0, quantity - ?) WHERE id = ?`,
        [scrapSaleQuantity, order.equipment_id]
      );
    }
  }
}

export const equipmentScrapSaleService = new EquipmentScrapSaleService();