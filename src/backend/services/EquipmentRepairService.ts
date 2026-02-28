import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';
import { instanceService } from './InstanceService.js';

export type RepairOrderStatus = 'draft' | 'pending' | 'shipping' | 'repairing' | 'receiving' | 'completed' | 'rejected';

export interface RepairOrder {
  id: string;
  order_no: string;
  applicant_id: string;
  applicant: string;
  apply_date: string;
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  repair_quantity?: number;
  original_location_type: string;
  original_location_id: string;
  fault_description: string;
  repair_service_provider?: string;
  shipped_at?: string;
  shipped_by?: string;
  shipping_no?: string;
  received_at?: string;
  received_by?: string;
  status: RepairOrderStatus;
  approval_id?: string;
  approved_at?: string;
  approved_by?: string;
  approval_comment?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface CreateRepairOrderDto {
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  original_location_type: string;
  original_location_id: string;
  fault_description: string;
  repair_service_provider?: string;
  repair_quantity?: number;
}

export interface CreateBatchRepairOrderDto {
  equipment_data: CreateRepairOrderDto[];
  original_location_type: string;
  original_location_id: string;
  fault_description: string;
  repair_service_provider?: string;
}

export class EquipmentRepairService {

  private generateOrderNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `WX${year}${month}${random}`;
  }

  async createRepairOrder(dto: CreateRepairOrderDto, userId: string, userName: string): Promise<RepairOrder> {
    const connection = await db.beginTransaction();

    try {
      const id = uuidv4();
      const orderNo = this.generateOrderNo();

      const applyDate = new Date().toISOString().slice(0, 10);

      await connection.execute(
        `INSERT INTO equipment_repair_orders (
          id, order_no, applicant_id, applicant, apply_date,
          equipment_id, equipment_name, equipment_category, repair_quantity,
          original_location_type, original_location_id,
          fault_description, repair_service_provider,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [
          id, orderNo, userId, userName, applyDate,
          dto.equipment_id, dto.equipment_name, dto.equipment_category, dto.repair_quantity || 1,
          dto.original_location_type, dto.original_location_id,
          dto.fault_description, dto.repair_service_provider || null
        ]
      );

      await connection.commit();

      const order = await this.getById(id) as Promise<RepairOrder>;

      if (order) {
        try {
          const instance = await instanceService.createInstance({
            definitionId: 'wf-equipment-repair-001',
            businessKey: orderNo,
            businessId: id,
            title: `设备维修申请 - ${dto.equipment_name}`,
            variables: {
              order_no: orderNo,
              equipment_name: dto.equipment_name,
              equipment_category: dto.equipment_category,
              repair_quantity: dto.repair_quantity || 1,
              fault_description: dto.fault_description,
              repair_service_provider: dto.repair_service_provider
            },
            initiator: { id: userId, name: userName }
          });

          await connection.execute(
            `UPDATE equipment_repair_orders SET approval_id = ? WHERE id = ?`,
            [instance.id, id]
          );

          await connection.commit();
        } catch (workflowError) {
          console.error('[Repair] Failed to create workflow instance:', workflowError);
        }
      }

      return this.getById(id) as Promise<RepairOrder>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createBatchRepairOrders(dto: CreateBatchRepairOrderDto, userId: string, userName: string): Promise<RepairOrder[]> {
    const connection = await db.beginTransaction();

    try {
      const orders: RepairOrder[] = [];
      const applyDate = new Date().toISOString().slice(0, 10);

      for (const equipment of dto.equipment_data) {
        const id = uuidv4();
        const orderNo = this.generateOrderNo();

        await connection.execute(
          `INSERT INTO equipment_repair_orders (
            id, order_no, applicant_id, applicant, apply_date,
            equipment_id, equipment_name, equipment_category, repair_quantity,
            original_location_type, original_location_id,
            fault_description, repair_service_provider,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
          [
            id, orderNo, userId, userName, applyDate,
            equipment.equipment_id, equipment.equipment_name, equipment.equipment_category, equipment.repair_quantity || 1,
            dto.original_location_type, dto.original_location_id,
            dto.fault_description, dto.repair_service_provider || null
          ]
        );

        orders.push({
          id,
          order_no: orderNo,
          applicant_id: userId,
          applicant: userName,
          apply_date: applyDate,
          equipment_id: equipment.equipment_id,
          equipment_name: equipment.equipment_name,
          equipment_category: equipment.equipment_category,
          repair_quantity: equipment.repair_quantity || 1,
          original_location_type: dto.original_location_type,
          original_location_id: dto.original_location_id,
          fault_description: dto.fault_description,
          repair_service_provider: dto.repair_service_provider,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as RepairOrder);
      }

      await connection.commit();

      for (const order of orders) {
        try {
          const instance = await instanceService.createInstance({
            definitionId: 'wf-equipment-repair-001',
            businessKey: order.order_no,
            businessId: order.id,
            title: `设备维修申请 - ${order.equipment_name}`,
            variables: {
              order_no: order.order_no,
              equipment_name: order.equipment_name,
              equipment_category: order.equipment_category,
              repair_quantity: order.repair_quantity || 1,
              fault_description: dto.fault_description,
              repair_service_provider: dto.repair_service_provider
            },
            initiator: { id: userId, name: userName }
          });

          await connection.execute(
            `UPDATE equipment_repair_orders SET approval_id = ? WHERE id = ?`,
            [instance.id, order.id]
          );

          await connection.commit();
        } catch (workflowError) {
          console.error('[Repair] Failed to create workflow instance for order:', order.order_no, workflowError);
        }
      }

      return orders;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getById(id: string): Promise<RepairOrder | null> {
    const [rows] = await db.query(
      'SELECT * FROM equipment_repair_orders WHERE id = ?',
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async list(filters?: {
    status?: RepairOrderStatus;
    applicant_id?: string;
    equipment_id?: string;
  }): Promise<RepairOrder[]> {
    let query = 'SELECT * FROM equipment_repair_orders WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.applicant_id) {
      query += ' AND applicant_id = ?';
      params.push(filters.applicant_id);
    }

    if (filters?.equipment_id) {
      query += ' AND equipment_id = ?';
      params.push(filters.equipment_id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  async approveRepairOrder(id: string, approvedBy: string, approvedByName?: string, comment?: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const order = await this.getById(id);
      if (!order) {
        throw new Error('维修单不存在');
      }

      if (order.status !== 'pending') {
        throw new Error('维修单状态不正确，无法审批');
      }

      await connection.execute(
        `UPDATE equipment_repair_orders 
         SET status = 'shipping', 
             approved_at = NOW(), 
             approved_by = ?,
             approval_comment = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [approvedBy, comment || null, id]
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

  async rejectRepairOrder(id: string, rejectedBy: string, rejectedByName?: string, comment?: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const order = await this.getById(id);
      if (!order) {
        throw new Error('维修单不存在');
      }

      if (order.status !== 'pending') {
        throw new Error('维修单状态不正确，无法驳回');
      }

      await connection.execute(
        `UPDATE equipment_repair_orders 
         SET status = 'rejected', 
             approved_at = NOW(), 
             approved_by = ?,
             approval_comment = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [rejectedBy, comment || null, id]
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

  async shipRepairOrder(id: string, shippingNo: string, shippedBy: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const [orderRows] = await connection.query<any>(
        'SELECT * FROM equipment_repair_orders WHERE id = ?',
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;

      if (!order) {
        throw new Error('维修单不存在');
      }

      await connection.execute(
        `UPDATE equipment_repair_orders 
         SET status = 'repairing', 
             shipped_at = NOW(), 
             shipped_by = ?,
             shipping_no = ?
         WHERE id = ?`,
        [shippedBy, shippingNo, id]
      );

      await this.setEquipmentStatusToRepairing(connection, order);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async receiveRepairOrder(id: string, receivedBy: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const [orderRows] = await connection.query<any>(
        'SELECT * FROM equipment_repair_orders WHERE id = ?',
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;

      if (!order) {
        throw new Error('维修单不存在');
      }

      await connection.execute(
        `UPDATE equipment_repair_orders 
         SET status = 'completed', 
             received_at = NOW(), 
             received_by = ?
         WHERE id = ?`,
        [receivedBy, id]
      );

      await this.restoreEquipmentFromRepairing(connection, order);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async setEquipmentStatusToRepairing(connection: any, order: RepairOrder): Promise<void> {
    const repairQuantity = order.repair_quantity || 1;

    if (order.equipment_category === 'instrument') {
      await connection.execute(
        `UPDATE equipment_instances 
         SET location_id = 'repairing', 
             health_status = 'repairing',
             location_status = 'repairing',
             updated_at = NOW()
         WHERE id = ?`,
        [order.equipment_id]
      );
    } else {
      const [equipmentRows] = await connection.query(
        `SELECT * FROM equipment_instances WHERE id = ?`,
        [order.equipment_id]
      );
      const equipment = equipmentRows && equipmentRows.length > 0 ? equipmentRows[0] : null;

      if (!equipment) {
        throw new Error('设备不存在');
      }

      await connection.execute(
        `UPDATE equipment_instances SET quantity = quantity - ? WHERE id = ?`,
        [repairQuantity, order.equipment_id]
      );

      const repairingId = uuidv4();
      await connection.execute(
        `INSERT INTO equipment_instances 
        (id, equipment_name, model_no, brand, category, unit, quantity, manage_code, 
         health_status, usage_status, location_status, location_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          repairingId,
          equipment.equipment_name,
          equipment.model_no,
          equipment.brand,
          equipment.category,
          equipment.unit,
          repairQuantity,
          equipment.manage_code + '-repairing',
          'repairing',
          'idle',
          'repairing',
          'repairing'
        ]
      );
    }
  }

  private async restoreEquipmentFromRepairing(connection: any, order: RepairOrder): Promise<void> {
    const repairQuantity = order.repair_quantity || 1;

    if (order.equipment_category === 'instrument') {
      const originalLocationId = order.original_location_id ?? null;
      const locationStatus = order.original_location_type === 'warehouse' ? 'warehouse' : 'in_project';
      
      await connection.execute(
        `UPDATE equipment_instances 
         SET location_id = ?, 
             health_status = 'normal',
             location_status = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [originalLocationId, locationStatus, order.equipment_id]
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
        `DELETE FROM equipment_instances 
         WHERE location_id = 'repairing' 
           AND manage_code LIKE '%-repairing'
           AND equipment_name = ? 
           AND model_no = ?`,
        [order.equipment_name, equipment.model_no ?? null]
      );

      await connection.execute(
        `UPDATE equipment_instances SET quantity = quantity + ? WHERE id = ?`,
        [repairQuantity, order.equipment_id]
      );
    }
  }
}

export const equipmentRepairService = new EquipmentRepairService();
