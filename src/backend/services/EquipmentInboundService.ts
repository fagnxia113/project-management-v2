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

      let formData = instance.variables;
      if (typeof formData === 'string') {
        formData = JSON.parse(formData);
      }
      formData = formData?.formData || {};

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

      let warehouseName = null;
      if (formData.warehouse_id) {
        const [warehouseResult] = await db.query(
          'SELECT name, manager_id FROM warehouses WHERE id = ?',
          [formData.warehouse_id]
        );
        if (warehouseResult && warehouseResult.length > 0) {
          warehouseName = warehouseResult[0].name;
        }
      }

      await db.query(
        `INSERT INTO equipment_inbound_orders 
         (id, order_no, inbound_type, warehouse_id, warehouse_name, applicant, applicant_id, apply_date, status, inbound_reason, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inboundOrderId,
          orderNo,
          formData.inbound_type || 'purchase',
          formData.warehouse_id,
          warehouseName,
          initiator.name,
          initiator.id,
          new Date().toISOString().split('T')[0],
          'approved',
          formData.inbound_reason || '设备入库',
          formData.notes || ''
        ]
      );

      console.log(`[EquipmentInboundService] 入库单创建成功: ${inboundOrderId}`);

      let keeperId = null;
      if (formData.warehouse_manager_id) {
        keeperId = formData.warehouse_manager_id;
      } else if (formData.warehouse_id) {
        const [warehouseResult] = await db.query(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [formData.warehouse_id]
        );
        if (warehouseResult && warehouseResult.length > 0 && warehouseResult[0].manager_id) {
          keeperId = warehouseResult[0].manager_id;
        }
      }

      for (const item of formData.items) {
        const modelName = item.equipment_name || item.name;
        const modelNo = item.model_no || item.model;
        const category = item.category;

        let modelId;
        const [existingModels] = await db.query(
          'SELECT id FROM equipment_models WHERE name = ? AND model_no = ?',
          [modelName, modelNo]
        );

        if (existingModels && existingModels.length > 0) {
          modelId = existingModels[0].id;
          console.log(`[EquipmentInboundService] 使用现有型号: ${modelName} (${modelNo})`);
        } else {
          modelId = uuidv4();
          await db.query(
            `INSERT INTO equipment_models 
             (id, name, model_no, category, unit, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [modelId, modelName, modelNo, category, item.unit || '台']
          );
          console.log(`[EquipmentInboundService] 创建型号: ${modelName} (${modelNo})`);
        }

        const quantity = item.quantity || 1;
        const accessories = item.accessories && item.accessories.length > 0 
          ? JSON.stringify(item.accessories) 
          : null;

        const mainImages = item.main_images || [];
        const accessoryImages = item.accessory_images || [];

        if (category === 'instrument') {
          for (let i = 0; i < quantity; i++) {
            const instanceId = uuidv4();
            const manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 10000)}`;
            
            await db.query(
              `INSERT INTO equipment_instances 
               (id, model_id, serial_number, manage_code, quantity,
                health_status, usage_status, location_status, location_id, 
                purchase_date, purchase_price, calibration_expiry, notes, keeper_id, accessories, created_at)
               VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                instanceId,
                modelId,
                item.serial_number || null,
                manageCode,
                'normal',
                'idle',
                'warehouse',
                formData.warehouse_id,
                formData.purchase_date || null,
                item.purchase_price || item.unit_price || 0,
                item.certificate_expiry_date || null,
                item.item_notes || null,
                keeperId,
                accessories
              ]
            );

            for (const imageUrl of mainImages) {
              if (imageUrl) {
                await db.query(
                  `INSERT INTO equipment_images (id, equipment_id, image_type, image_url, created_at)
                   VALUES (?, ?, 'main', ?, NOW())`,
                  [uuidv4(), instanceId, imageUrl]
                );
              }
            }

            for (const imageUrl of accessoryImages) {
              if (imageUrl) {
                await db.query(
                  `INSERT INTO equipment_images (id, equipment_id, image_type, image_url, created_at)
                   VALUES (?, ?, 'accessory', ?, NOW())`,
                  [uuidv4(), instanceId, imageUrl]
                );
              }
            }
          }
          console.log(`[EquipmentInboundService] 创建 ${quantity} 台仪器设备: ${modelName}`);
        } else {
          const instanceId = uuidv4();
          const manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 10000)}`;
          
          await db.query(
            `INSERT INTO equipment_instances 
             (id, model_id, serial_number, manage_code, quantity,
              health_status, usage_status, location_status, location_id, 
              purchase_date, purchase_price, calibration_expiry, notes, keeper_id, accessories, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              instanceId,
              modelId,
              null,
              manageCode,
              quantity,
              'normal',
              'idle',
              'warehouse',
              formData.warehouse_id,
              formData.purchase_date || null,
              item.purchase_price || item.unit_price || 0,
              item.certificate_expiry_date || null,
              item.item_notes || null,
              keeperId,
              accessories
            ]
          );

          for (const imageUrl of mainImages) {
            if (imageUrl) {
              await db.query(
                `INSERT INTO equipment_images (id, equipment_id, image_type, image_url, created_at)
                 VALUES (?, ?, 'main', ?, NOW())`,
                [uuidv4(), instanceId, imageUrl]
              );
            }
          }

          for (const imageUrl of accessoryImages) {
            if (imageUrl) {
              await db.query(
                `INSERT INTO equipment_images (id, equipment_id, image_type, image_url, created_at)
                 VALUES (?, ?, 'accessory', ?, NOW())`,
                [uuidv4(), instanceId, imageUrl]
              );
            }
          }
          console.log(`[EquipmentInboundService] 创建汇总记录: ${modelName}, 数量: ${quantity}`);
        }
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