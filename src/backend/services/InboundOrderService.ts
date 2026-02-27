import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { enhancedWorkflowEngine } from './EnhancedWorkflowEngine.js';

export interface InboundOrder {
  id: string;
  order_no: string;
  inbound_type: 'purchase' | 'repair_return' | 'other';
  warehouse_id: string;
  warehouse_name: string;
  supplier: string;
  purchase_date: string;
  total_price: number;
  applicant_id: string;
  applicant_name: string;
  apply_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  approver_id: string;
  approve_time: string;
  approve_remark: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InboundItem {
  id: string;
  order_id: string;
  equipment_name: string;
  model_no: string;
  brand: string;
  category: 'instrument' | 'fake_load' | 'cable';
  unit: string;
  quantity: number;
  purchase_price: number;
  total_price: number;
  serial_numbers: string;
  factory_serial_no: string;
  certificate_no: string;
  certificate_issuer: string;
  accessory_desc: string;
  technical_doc: string;
  attachment: string;
  status: 'pending' | 'inbound' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CreateInboundOrderDto {
  inbound_type: 'purchase' | 'other';
  warehouse_id: string;
  supplier: string;
  purchase_date: string;
  notes?: string;
  items: Array<{
    equipment_name: string;
    model_no: string;
    category: 'instrument' | 'fake_load' | 'cable';
    unit?: string;
    quantity: number;
    purchase_price: number;
    total_price: number;
    serial_numbers?: string;
    factory_serial_no?: string;
    certificate_no?: string;
    certificate_issuer?: string;
    accessory_desc?: string;
    technical_doc?: string;
    attachment?: string;
  }>;
}

export class InboundOrderService {
  private db: any;

  constructor() {
    this.db = db;
  }

  async generateOrderNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const result = await this.db.queryOne(`
      SELECT COUNT(*) as count 
      FROM equipment_inbound_orders 
      WHERE order_no LIKE ?
    `, [`RK-${dateStr}-%`]);
    
    const count = (result as any)?.count || 0;
    const seq = (count + 1).toString().padStart(3, '0');
    
    return `RK-${dateStr}-${seq}`;
  }

  async createOrder(data: CreateInboundOrderDto, userId: string, userName: string): Promise<InboundOrder> {
    const connection = await this.db.beginTransaction();
    
    try {
      const orderNo = await this.generateOrderNo();
      const orderId = uuidv4();
      
      const warehouseId = data.warehouse_id === undefined || data.warehouse_id === '' ? null : data.warehouse_id;
      const warehouseInfo = await connection.query(
        'SELECT name FROM warehouses WHERE id = ?',
        [warehouseId]
      );
      
      const warehouse = warehouseInfo && warehouseInfo.length > 0 ? warehouseInfo[0] : null;
      if (!warehouse) {
        throw new Error('仓库不存在');
      }
      
      const totalPrice = data.items.reduce((sum, item) => sum + item.total_price, 0);
      
      const supplier = data.supplier === undefined || data.supplier === '' ? null : data.supplier;
      const notes = data.notes === undefined || data.notes === '' ? null : data.notes;
      const inboundType = data.inbound_type === undefined ? 'purchase' : data.inbound_type;
      const warehouseName = warehouse?.name || null;
      const purchaseDate = data.purchase_date === undefined || data.purchase_date === '' ? null : data.purchase_date;
      const finalUserId = userId === undefined || userId === '' ? 'system' : userId;
      const finalUserName = userName === undefined || userName === '' ? '系统' : userName;
      
      await connection.execute(`
        INSERT INTO equipment_inbound_orders 
        (id, order_no, inbound_type, warehouse_id, warehouse_name, supplier, 
         purchase_date, total_price, applicant_id, applicant_name, apply_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, orderNo, inboundType, warehouseId, warehouseName,
        supplier, purchaseDate, totalPrice, finalUserId, finalUserName, new Date().toISOString().split('T')[0], 'draft', notes
      ]);
      
      for (const item of data.items) {
        if (!item.equipment_name || !item.model_no) {
          throw new Error('请填写完整的设备名称和型号');
        }
        
        const serialNumbers = item.serial_numbers === undefined || item.serial_numbers === '' ? null : item.serial_numbers;
        const accessoryDesc = item.accessory_desc === undefined || item.accessory_desc === '' ? null : item.accessory_desc;
        const factorySerialNo = item.factory_serial_no === undefined || item.factory_serial_no === '' ? null : item.factory_serial_no;
        const certificateNo = item.certificate_no === undefined || item.certificate_no === '' ? null : item.certificate_no;
        const certificateIssuer = item.certificate_issuer === undefined || item.certificate_issuer === '' ? null : item.certificate_issuer;
        const attachment = item.attachment === undefined || item.attachment === '' ? null : item.attachment;
        
        await connection.execute(`
          INSERT INTO equipment_inbound_items 
          (id, order_id, equipment_name, model_no, brand, category, unit,
           quantity, purchase_price, total_price, serial_numbers, factory_serial_no, certificate_no, certificate_issuer, accessory_desc, technical_doc, attachment, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(), orderId, item.equipment_name, item.model_no, null, item.category, 
          item.unit || '台',
          item.quantity, item.purchase_price, item.total_price, serialNumbers,
          factorySerialNo, certificateNo, certificateIssuer, accessoryDesc, null, attachment, 'pending'
        ]);
      }
      
      await connection.commit();
      
      return this.getById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getOrders(filters: {
    status?: string;
    warehouse_id?: string;
    model_id?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: InboundOrder[]; total: number; totalPages: number }> {
    const { status, warehouse_id, model_id, page, pageSize } = filters;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '1=1';
    const params: any[] = [];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    if (warehouse_id) {
      whereClause += ' AND o.warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    if (model_id) {
      whereClause += ' AND o.id IN (SELECT order_id FROM equipment_inbound_items WHERE model_id = ?)';
      params.push(model_id);
    }
    
    const countResult = await this.db.queryOne(
      `SELECT COUNT(*) as total FROM equipment_inbound_orders o WHERE ${whereClause}`,
      params
    );
    const total = countResult?.total || 0;
    
    const data = await this.db.query(
      `SELECT o.*, 
              (SELECT equipment_name FROM equipment_inbound_items WHERE order_id = o.id LIMIT 1) as equipment_name,
              (SELECT category FROM equipment_inbound_items WHERE order_id = o.id LIMIT 1) as equipment_type,
              (SELECT SUM(quantity) FROM equipment_inbound_items WHERE order_id = o.id) as total_quantity
       FROM equipment_inbound_orders o
       WHERE ${whereClause}
       ORDER BY o.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { data, total, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<InboundOrder | undefined> {
    const res = await this.db.queryOne('SELECT * FROM equipment_inbound_orders WHERE id = ?', [id]);
    return res || undefined;
  }

  async submitOrder(id: string): Promise<InboundOrder> {
    const order = await this.getById(id);
    if (!order) {
      throw new Error('入库单不存在');
    }
    
    if (order.status !== 'draft') {
      throw new Error('只有草稿状态的入库单才能提交');
    }
    
    await this.db.execute(`
      UPDATE equipment_inbound_orders 
      SET status = 'pending'
      WHERE id = ?
    `, [id]);
    
    try {
      const items = await this.getItems(id);
      
      await enhancedWorkflowEngine.startProcess({
        processKey: 'equipment_inbound',
        businessKey: order.order_no,
        businessId: order.id,
        title: `设备入库 - ${order.order_no}`,
        initiator: {
          id: order.applicant_id,
          name: order.applicant_name
        },
        variables: {
          inbound_type: order.inbound_type,
          warehouse_id: order.warehouse_id,
          warehouse_name: order.warehouse_name,
          supplier: order.supplier,
          purchase_date: order.purchase_date,
          total_price: order.total_price,
          items: items.map(item => ({
            equipment_name: item.equipment_name,
            model_no: item.model_no,
            category: item.category,
            quantity: item.quantity,
            purchase_price: item.purchase_price,
            total_price: item.total_price
          }))
        }
      });
    } catch (error) {
      console.error('[InboundOrder] 创建工作流实例失败:', error);
    }
    
    return this.getById(id) as Promise<InboundOrder>;
  }

  async getItems(orderId: string): Promise<InboundItem[]> {
    const res = await this.db.query(
      'SELECT * FROM equipment_inbound_items WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    return res || [];
  }

  async approveOrder(id: string, approverId: string, approverName: string, remark?: string): Promise<void> {
    const connection = await this.db.beginTransaction();
    
    try {
      await connection.execute(`
        UPDATE equipment_inbound_orders 
        SET status = 'approved', approver_id = ?, approve_time = NOW(), approve_remark = ?
        WHERE id = ?
      `, [approverId, remark || null, id]);
      
      await connection.execute(`
        UPDATE equipment_inbound_items 
        SET status = 'inbound'
        WHERE order_id = ?
      `, [id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async rejectOrder(id: string, approverId: string, approverName: string, remark: string): Promise<void> {
    const connection = await this.db.beginTransaction();
    
    try {
      await connection.execute(`
        UPDATE equipment_inbound_orders 
        SET status = 'rejected', approver_id = ?, approve_time = NOW(), approve_remark = ?
        WHERE id = ?
      `, [approverId, remark, id]);
      
      await connection.execute(`
        UPDATE equipment_inbound_items 
        SET status = 'rejected'
        WHERE order_id = ?
      `, [id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async completeOrder(id: string): Promise<void> {
    const connection = await this.db.beginTransaction();
    
    try {
      const order = await connection.execute(
        'SELECT * FROM equipment_inbound_orders WHERE id = ?',
        [id]
      );
      
      if (!order[0]) {
        throw new Error('入库单不存在');
      }
      
      const items = await connection.execute(
        'SELECT * FROM equipment_inbound_items WHERE order_id = ?',
        [id]
      );
      
      for (const item of items[0]) {
        if (item.category === 'instrument') {
          await connection.execute(`
            INSERT INTO equipment_instances 
            (id, equipment_name, model_no, brand, category, unit, serial_number, factory_serial_no, manage_code, 
             equipment_type, equipment_source, health_status, usage_status, location_status, location_id, 
             purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, 
             accessory_desc, notes, technical_doc, attachment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            uuidv4(), 
            item.equipment_name, 
            item.model_no,
            item.brand,
            item.category,
            '台',
            item.serial_numbers || null,
            item.factory_serial_no || null,
            await this.generateManageCode(connection, item.equipment_name, item.model_no, item.category),
            item.category === 'instrument' ? 'instrument' : null,
            'owned',
            'normal', 
            'idle', 
            'warehouse', 
            order[0].warehouse_id || null,
            order[0].purchase_date || null, 
            item.purchase_price || 0, 
            null, 
            item.certificate_no || null,
            item.certificate_issuer || null,
            item.accessory_desc || null,
            null,
            item.technical_doc || null,
            item.attachment || null
          ]);
        } else {
          await connection.execute(`
            INSERT INTO equipment_instances 
            (id, equipment_name, model_no, brand, category, unit, quantity, serial_number, manage_code, 
             equipment_type, equipment_source, health_status, usage_status, location_status, location_id, 
             purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, 
             accessory_desc, notes, technical_doc, attachment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            uuidv4(), 
            item.equipment_name, 
            item.model_no,
            item.brand,
            item.category,
            item.unit || '台',
            item.quantity,
            null,
            await this.generateManageCode(connection, item.equipment_name, item.model_no, item.category),
            item.category === 'instrument' ? 'instrument' : (item.category === 'fake_load' ? 'fake_load' : null),
            'owned',
            'normal', 
            'idle', 
            'warehouse', 
            order[0].warehouse_id || null,
            order[0].purchase_date || null, 
            item.purchase_price || 0, 
            null, 
            null,
            null,
            item.accessory_desc || null,
            null,
            item.technical_doc || null,
            item.attachment || null
          ]);
        }
      }
      
      await connection.execute(`
        UPDATE equipment_inbound_orders 
        SET status = 'completed'
        WHERE id = ?
      `, [id]);
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async generateManageCode(connection: any, equipmentName: string, modelNo: string, category: string): Promise<string> {
    const prefix = category === 'instrument' ? 'EQ' : 'LD';
    
    const result = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM equipment_instances 
      WHERE equipment_name = ? AND model_no = ?
    `, [equipmentName, modelNo]);
    
    const count = result[0]?.[0]?.count || 0;
    const seq = (count + 1).toString().padStart(4, '0');
    
    return `${prefix}-${modelNo}-${seq}`;
  }
}

export const inboundOrderService = new InboundOrderService();
