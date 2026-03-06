import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export class EquipmentInboundService {
  async createEquipmentFromWorkflow(instanceId: string): Promise<string | null> {
    try {
      console.log(`[EquipmentInboundService] 开始处理流程实例: ${instanceId}`);

      const [instances] = await db.query(
        `SELECT id, initiator_id, initiator_name, variables, business_id
         FROM workflow_instances 
         WHERE id = ? AND definition_key = 'equipment-inbound'`,
        [instanceId]
      );

      if (!instances || instances.length === 0) {
        console.log(`[EquipmentInboundService] 流程实例不存在: ${instanceId}`);
        return null;
      }

      const instance = instances[0];
      
      if (instance.business_id) {
        console.log(`[EquipmentInboundService] 流程实例已关联业务ID: ${instance.business_id}`);
        return instance.business_id;
      }

      const formData = instance.variables?.formData || {};
      const initiator = {
        id: instance.initiator_id,
        name: instance.initiator_name
      };

      console.log(`[EquipmentInboundService] formData:`, JSON.stringify(formData, null, 2));

      if (!formData.items || !Array.isArray(formData.items) || formData.items.length === 0) {
        console.log(`[EquipmentInboundService] 没有设备明细，跳过`);
        return null;
      }

      const inboundOrderId = uuidv4();
      const orderNo = `IN-${Date.now()}`;

      await db.query(
        `INSERT INTO equipment_inbound_orders 
         (id, order_no, inbound_type, warehouse_id, warehouse_name, applicant, apply_date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inboundOrderId,
          orderNo,
          formData.inbound_type || 'purchase',
          formData.warehouse_id,
          null,
          initiator.name,
          new Date().toISOString().split('T')[0],
          'approved',
          formData.notes || ''
        ]
      );

      console.log(`[EquipmentInboundService] 入库单创建成功: ${inboundOrderId}`);

      let keeperId = null;
      if (formData.warehouse_id) {
        const [warehouseResult] = await db.query(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [formData.warehouse_id]
        );
        if (warehouseResult && warehouseResult.length > 0 && warehouseResult[0].manager_id) {
          keeperId = warehouseResult[0].manager_id;
        }
      }

      for (const item of formData.items) {
        const manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 1000)}`;
        let equipmentId = null;

        if (item.category === 'instrument') {
          const result = await db.query(
            `INSERT INTO equipment_instances 
             (id, equipment_name, model_no, brand, category, unit, serial_number, manage_code, 
              health_status, usage_status, location_status, location_id, 
              purchase_date, purchase_price, calibration_expiry, notes, keeper_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              uuidv4(),
              item.equipment_name || item.name,
              item.model_no || item.model,
              null,
              'instrument',
              '台',
              item.serial_number || null,
              manageCode,
              'normal',
              'idle',
              'warehouse',
              formData.warehouse_id,
              formData.purchase_date || null,
              item.purchase_price || item.unit_price || 0,
              item.calibration_expiry_date || null,
              item.item_notes || null,
              keeperId
            ]
          );
          equipmentId = result.insertId;
        } else {
          const quantity = item.quantity || 1;
          for (let i = 0; i < quantity; i++) {
            const instanceManageCode = `EQ${Date.now()}${Math.floor(Math.random() * 1000)}`;
            const result = await db.query(
              `INSERT INTO equipment_instances 
               (id, equipment_name, model_no, brand, category, unit, serial_number, manage_code, 
                health_status, usage_status, location_status, location_id, 
                purchase_date, purchase_price, notes, keeper_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                uuidv4(),
                item.equipment_name || item.name,
                item.model_no || item.model,
                null,
                item.category,
                '台',
                null,
                instanceManageCode,
                'normal',
                'idle',
                'warehouse',
                formData.warehouse_id,
                formData.purchase_date || null,
                item.purchase_price || item.unit_price || 0,
                item.item_notes || null,
                keeperId
              ]
            );
            if (i === 0) {
              equipmentId = result.insertId;
            }
          }
        }

        console.log(`[EquipmentInboundService] 设备台账创建成功: ${item.equipment_name || item.name}`);
      }

      await db.query(
        'UPDATE workflow_instances SET business_id = ? WHERE id = ?',
        [inboundOrderId, instanceId]
      );

      console.log(`[EquipmentInboundService] 流程实例 ${instanceId} 处理完成，业务ID: ${inboundOrderId}`);
      return inboundOrderId;
    } catch (error) {
      console.error(`[EquipmentInboundService] 处理流程实例 ${instanceId} 失败:`, error);
      throw error;
    }
  }
}

export const equipmentInboundService = new EquipmentInboundService();