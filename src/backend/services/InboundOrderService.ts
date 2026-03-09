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
  certificate_no: string;
  certificate_issuer: string;
  certificate_expiry_date: string;
  accessory_desc: string;
  manufacturer: string;
  technical_params: string;
  item_notes: string;
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
    certificate_no?: string;
    certificate_issuer?: string;
    certificate_expiry_date?: string;
    accessory_desc?: string;
    manufacturer?: string;
    technical_params?: string;
    item_notes?: string;
    technical_doc?: string;
    attachment?: string;
    images?: Array<{
      image_url: string;
      image_type: 'main' | 'accessory';
      image_name?: string;
      notes?: string;
    }>;
    accessories?: Array<{
      accessory_name: string;
      model_no?: string;
      brand?: string;
      category: 'instrument' | 'fake_load' | 'cable';
      quantity: number;
      unit?: string;
      serial_number?: string;
      purchase_price?: number;
      notes?: string;
    }>;
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
      
      const totalPrice = data.items.reduce((sum, item) => {
        const itemTotal = item.total_price !== undefined ? item.total_price : (item.purchase_price || 0) * (item.quantity || 1);
        return sum + itemTotal;
      }, 0);
      
      const supplier = data.supplier === undefined || data.supplier === '' ? null : data.supplier;
      const notes = data.notes === undefined || data.notes === '' ? null : data.notes;
      const inboundType = data.inbound_type === undefined ? 'purchase' : data.inbound_type;
      const warehouseName = warehouse?.name || null;
      const purchaseDate = data.purchase_date === undefined || data.purchase_date === '' ? null : data.purchase_date;
      const finalUserId = userId === undefined || userId === '' ? 'system' : userId;
      const finalUserName = userName === undefined || userName === '' ? '系统' : userName;
      const inboundReason = data.inbound_reason || '设备入库';
      
      await connection.execute(`
        INSERT INTO equipment_inbound_orders 
        (id, order_no, inbound_type, warehouse_id, warehouse_name, supplier, 
         purchase_date, total_amount, applicant_id, applicant, apply_date, status, notes, inbound_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, orderNo, inboundType, warehouseId, warehouseName,
        supplier, purchaseDate, totalPrice, finalUserId, finalUserName, new Date().toISOString().split('T')[0], 'draft', notes, inboundReason
      ]);
      
      for (const item of data.items) {
        if (!item.equipment_name || !item.model_no) {
          throw new Error('请填写完整的设备名称和型号');
        }
        
        const serialNumbers = item.serial_numbers === undefined || item.serial_numbers === '' ? null : item.serial_numbers;
        const accessoryDesc = item.accessory_desc === undefined || item.accessory_desc === '' ? null : item.accessory_desc;
        const certificateNo = item.certificate_no === undefined || item.certificate_no === '' ? null : item.certificate_no;
        const certificateIssuer = item.certificate_issuer === undefined || item.certificate_issuer === '' ? null : item.certificate_issuer;
        const certificateExpiryDate = item.certificate_expiry_date === undefined || item.certificate_expiry_date === '' ? null : item.certificate_expiry_date;
        const manufacturer = item.manufacturer === undefined || item.manufacturer === '' ? null : item.manufacturer;
        const technicalParams = item.technical_params === undefined || item.technical_params === '' ? null : item.technical_params;
        const itemNotes = item.item_notes === undefined || item.item_notes === '' ? null : item.item_notes;
        const attachment = item.attachment === undefined || item.attachment === '' ? null : item.attachment;
        
        const itemId = uuidv4();
        
        const itemTotalPrice = item.total_price !== undefined ? item.total_price : (item.purchase_price || 0) * (item.quantity || 1);
        
        await connection.execute(`
          INSERT INTO equipment_inbound_items 
          (id, order_id, equipment_name, model_no, brand, category, unit,
           quantity, purchase_price, serial_numbers, certificate_no, certificate_issuer, certificate_expiry_date, accessory_desc, manufacturer, technical_params, item_notes, technical_doc, attachment, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId, orderId, item.equipment_name, item.model_no, null, item.category, 
          item.unit || '台',
          item.quantity, item.purchase_price, serialNumbers,
          certificateNo, certificateIssuer, certificateExpiryDate, accessoryDesc, manufacturer, technicalParams, itemNotes, null, attachment, 'pending'
        ]);
        
        // 处理设备图片
        if (item.images && item.images.length > 0) {
          for (const image of item.images) {
            await connection.execute(`
              INSERT INTO equipment_images 
              (id, equipment_id, image_type, image_url, image_name, created_at)
              VALUES (?, ?, ?, ?, ?, NOW())
            `, [
              uuidv4(),
              null, // equipment_id 将在审批通过后创建设备实例时更新
              image.image_type,
              image.image_url,
              image.image_name || null
            ]);
          }
        }
        
        // 处理附件清单（暂时跳过，因为 equipment_accessory_instances 表不存在）
        // TODO: 需要创建 equipment_accessory_instances 表或使用其他方式处理附件
        /*
        if (item.accessories && item.accessories.length > 0) {
          for (const accessory of item.accessories) {
            const accessoryId = uuidv4();
            
            // 创建附件实例
            await connection.execute(`
              INSERT INTO equipment_accessory_instances 
              (id, accessory_name, model_no, brand, category, unit, quantity, serial_number, purchase_price, notes, host_equipment_id, uploader_id, uploader_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              accessoryId,
              accessory.accessory_name,
              accessory.model_no || null,
              accessory.brand || null,
              accessory.category,
              accessory.unit || '个',
              accessory.quantity,
              accessory.serial_number || null,
              accessory.purchase_price || 0,
              accessory.notes || null,
              null, // host_equipment_id 将在审批通过后创建设备实例时更新
              finalUserId,
              finalUserName
            ]);
            
            // 创建附件关联记录（暂时关联到入库单明细，审批通过后更新）
            await connection.execute(`
              INSERT INTO equipment_accessories 
              (id, host_equipment_id, accessory_id, accessory_name, accessory_model, accessory_category, quantity, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(),
              itemId, // 暂时使用入库单明细ID，审批通过后更新为设备实例ID
              accessoryId,
              accessory.accessory_name,
              accessory.model_no || null,
              accessory.category,
              accessory.quantity,
              accessory.notes || null
            ]);
          }
        }
        */
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
      
      // 获取每个item的图片和附件信息
      const itemsWithDetails = await Promise.all(items.map(async (item) => {
        // 获取图片
        const images = await this.db.query(
          `SELECT * FROM equipment_images 
           WHERE business_type = 'inbound' AND business_id = ?
           ORDER BY created_at ASC`,
          [item.id]
        );
        
        // 获取附件（暂时跳过，因为 equipment_accessory_instances 表不存在）
        // TODO: 需要创建 equipment_accessory_instances 表或使用其他方式处理附件
        /*
        const accessories = await this.db.query(
          `SELECT ea.*, eai.accessory_name, eai.model_no, eai.brand, eai.category, eai.unit, eai.quantity, eai.serial_number, eai.purchase_price, eai.notes
           FROM equipment_accessories ea
           LEFT JOIN equipment_accessory_instances eai ON ea.accessory_id = eai.id
           WHERE ea.host_equipment_id = ?`,
          [item.id]
        );
        */
        const accessories = [];
        
        return {
          equipment_name: item.equipment_name,
          model_no: item.model_no,
          category: item.category,
          unit: item.unit,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          total_price: item.total_price,
          serial_numbers: item.serial_numbers,
          certificate_no: item.certificate_no,
          certificate_issuer: item.certificate_issuer,
          certificate_expiry_date: item.certificate_expiry_date,
          accessory_desc: item.accessory_desc,
          manufacturer: item.manufacturer,
          technical_params: item.technical_params,
          item_notes: item.item_notes,
          technical_doc: item.technical_doc,
          attachment: item.attachment,
          images: images,
          accessories: accessories
        };
      }));
      
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
          items: itemsWithDetails
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

  async completeOrder(id: string, formData?: any): Promise<void> {
    const connection = await this.db.beginTransaction();
    
    try {
      const [orderRows] = await connection.execute(
        'SELECT * FROM equipment_inbound_orders WHERE id = ?',
        [id]
      );
      
      if (!orderRows || orderRows.length === 0) {
        throw new Error('入库单不存在');
      }
      
      const order = orderRows[0];
      
      const [itemRows] = await connection.execute(
        'SELECT * FROM equipment_inbound_items WHERE order_id = ?',
        [id]
      );
      
      // 合并 formData 中的图片和附件清单信息到 itemRows
      const itemsWithFormData = itemRows.map((item, index) => {
        const formItem = formData?.items?.[index] || {};
        return {
          ...item,
          main_images: formItem.main_images || [],
          accessory_images: formItem.accessory_images || [],
          attachments: formItem.attachments || [],
          attachment: formItem.attachment || item.attachment || null,
          accessory_list: formItem.accessory_list || []
        };
      });
      
      for (const item of itemsWithFormData) {
        // 获取保管人ID
        let keeperId = null;
        if (order.warehouse_id) {
          // 从仓库获取管理员
          const [warehouseResult] = await connection.execute(
            'SELECT manager_id FROM warehouses WHERE id = ?',
            [order.warehouse_id]
          );
          if (warehouseResult[0] && warehouseResult[0].manager_id) {
            keeperId = warehouseResult[0].manager_id;
          }
        }
        
        // 查找或创建设备型号
        let modelId: string;
        const [existingModels] = await connection.execute(
          'SELECT id FROM equipment_models WHERE model_no = ?',
          [item.model_no]
        );
        
        if (existingModels.length > 0) {
          modelId = existingModels[0].id;
        } else {
          modelId = uuidv4();
          await connection.execute(`
            INSERT INTO equipment_models 
            (id, category, name, model_no, brand, manufacturer, unit, technical_params)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            modelId,
            item.category || 'other',
            item.equipment_name,
            item.model_no,
            item.brand || null,
            item.manufacturer || null,
            item.unit || '台',
            item.technical_params || null
          ]);
        }
        
        // 处理附件信息，将attachments数组转换为JSON字符串
        let attachmentJson = null;
        if (item.attachments && item.attachments.length > 0) {
          try {
            attachmentJson = JSON.stringify(item.attachments);
          } catch (error) {
            console.error('[InboundOrderService] 附件信息转换失败:', error);
          }
        } else if (item.attachment) {
          // 兼容单个附件的情况
          attachmentJson = JSON.stringify([{ file_url: item.attachment }]);
        }
        
        // 创建设备实例
        const manageCode = await this.generateManageCode(connection, item.equipment_name, item.model_no, item.category);
        let equipmentId: string | undefined;
        
        // 对于假负载和线缆类设备，检查是否已存在相同条件的记录
        if (item.category === 'fake_load' || item.category === 'cable') {
          const [existingEquipmentRows] = await connection.execute(
            `SELECT ei.id, ei.quantity 
             FROM equipment_instances ei
             JOIN equipment_models em ON ei.model_id = em.id
             WHERE em.name = ? 
               AND em.model_no = ? 
               AND ei.health_status = 'normal'
               AND ei.usage_status = 'idle'
               AND ei.location_status = 'warehouse'
               AND ei.location_id = ?`,
            [item.equipment_name, item.model_no, order.warehouse_id]
          );
          
          if (existingEquipmentRows && existingEquipmentRows.length > 0) {
            const existingEquipment = existingEquipmentRows[0];
            // 更新数量
            await connection.execute(
              `UPDATE equipment_instances 
               SET quantity = quantity + ?, updated_at = NOW()
               WHERE id = ?`,
              [item.quantity || 1, existingEquipment.id]
            );
            equipmentId = existingEquipment.id;
            console.log(`[InboundOrderService] 假负载/线缆类设备已合并: ${existingEquipment.id} (+${item.quantity || 1})`);
          } else {
            // 创建新记录
            equipmentId = uuidv4();
            await connection.execute(`
              INSERT INTO equipment_instances 
              (id, model_id, serial_number, manage_code, quantity, health_status, usage_status, location_status, location_id, 
               purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, 
               accessory_desc, notes, technical_doc, attachment, keeper_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              equipmentId, 
              modelId,
              item.serial_numbers || null,
              manageCode,
              item.quantity || 1,
              'normal', 
              'idle', 
              'warehouse', 
              order.warehouse_id || null,
              order.purchase_date || null, 
              item.purchase_price || 0, 
              item.certificate_expiry_date || null, 
              item.certificate_no || null,
              item.certificate_issuer || null,
              item.accessory_desc || null,
              item.item_notes || null,
              item.technical_doc || null,
              attachmentJson,
              keeperId
            ]);
            console.log(`[InboundOrderService] 假负载/线缆类设备已创建: ${equipmentId} (数量: ${item.quantity || 1})`);
          }
        } else {
          // 仪器类设备，直接创建新记录
          equipmentId = uuidv4();
          await connection.execute(`
            INSERT INTO equipment_instances 
            (id, model_id, serial_number, manage_code, quantity, health_status, usage_status, location_status, location_id, 
             purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, 
             accessory_desc, notes, technical_doc, attachment, keeper_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            equipmentId, 
            modelId,
            item.serial_numbers || null,
            manageCode,
            item.quantity || 1,
            'normal', 
            'idle', 
            'warehouse', 
            order.warehouse_id || null,
            order.purchase_date || null, 
            item.purchase_price || 0, 
            item.certificate_expiry_date || null, 
            item.certificate_no || null,
            item.certificate_issuer || null,
            item.accessory_desc || null,
            item.item_notes || null,
            item.technical_doc || null,
            attachmentJson,
            keeperId
          ]);
          console.log(`[InboundOrderService] 仪器类设备已创建: ${equipmentId} (数量: ${item.quantity || 1})`);
        }
        
        // 确保设备ID已正确设置
        if (!equipmentId && (item.category === 'fake_load' || item.category === 'cable')) {
          const [existingEquipmentRows] = await connection.execute(
            `SELECT ei.id 
             FROM equipment_instances ei
             JOIN equipment_models em ON ei.model_id = em.id
             WHERE em.name = ? 
               AND em.model_no = ? 
               AND ei.health_status = 'normal'
               AND ei.usage_status = 'idle'
               AND ei.location_status = 'warehouse'
               AND ei.location_id = ?`,
            [item.equipment_name, item.model_no, order.warehouse_id]
          );
          if (existingEquipmentRows && existingEquipmentRows.length > 0) {
            equipmentId = existingEquipmentRows[0].id;
          }
        }
        
        // 插入设备图片
        if (equipmentId) {
          if (item.main_images && item.main_images.length > 0) {
            for (const imageUrl of item.main_images) {
              if (imageUrl) {
                await connection.execute(`
                  INSERT INTO equipment_images 
                  (id, equipment_id, image_type, image_url, created_at)
                  VALUES (?, ?, 'main', ?, NOW())
                `, [uuidv4(), equipmentId, imageUrl]);
              }
            }
          }
          
          if (item.accessory_images && item.accessory_images.length > 0) {
            for (const imageUrl of item.accessory_images) {
              if (imageUrl) {
                await connection.execute(`
                  INSERT INTO equipment_images 
                  (id, equipment_id, image_type, image_url, created_at)
                  VALUES (?, ?, 'accessory', ?, NOW())
                `, [uuidv4(), equipmentId, imageUrl]);
              }
            }
          }
          
          // 处理附件信息
          if (item.attachments && item.attachments.length > 0) {
            for (const attachment of item.attachments) {
              if (attachment && attachment.file_url) {
                // 这里可以根据需要将附件信息存储到适当的表中
                // 目前我们已经在创建设备实例时存储了attachment字段
                console.log(`[InboundOrderService] 附件已关联到设备: ${equipmentId}`, attachment);
              }
            }
          }
        }
        
        // 插入附件清单
        console.log(`[InboundOrderService] 处理配件清单:`, item.accessory_list);
        if (equipmentId && item.accessory_list && item.accessory_list.length > 0) {
          console.log(`[InboundOrderService] 开始处理 ${item.accessory_list.length} 个配件`);
          for (const accessory of item.accessory_list) {
            console.log(`[InboundOrderService] 处理配件:`, accessory);
            // 创建附件实例
            const accessoryId = uuidv4();
            const accessoryManageCode = `AC${Date.now()}${Math.floor(Math.random() * 10000)}`;
            
            await connection.execute(`
              INSERT INTO equipment_accessory_instances 
              (id, accessory_name, model_no, brand, category, unit, quantity, serial_number, manage_code, 
               health_status, usage_status, location_status, location_id, host_equipment_id, 
               purchase_date, purchase_price, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              accessoryId,
              accessory.accessory_name,
              accessory.accessory_model || null,
              null,
              item.category,
              accessory.accessory_unit || '个',
              accessory.accessory_quantity,
              null,
              accessoryManageCode,
              'normal',
              'idle',
              'warehouse',
              order.warehouse_id || null,
              equipmentId,
              order.purchase_date || null,
              0,
              null
            ]);
            
            // 创建附件关联记录
            await connection.execute(`
              INSERT INTO equipment_accessories 
              (id, host_equipment_id, accessory_id, accessory_name, accessory_model, accessory_category, quantity, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(),
              equipmentId,
              accessoryId,
              accessory.accessory_name,
              accessory.accessory_model || null,
              item.category,
              accessory.accessory_quantity,
              null
            ]);
            console.log(`[InboundOrderService] 配件创建成功: ${accessory.accessory_name}`);
          }
          
          // 更新设备实例的附件信息
          await connection.execute(`
            UPDATE equipment_instances 
            SET has_accessories = true, accessory_count = ?
            WHERE id = ?
          `, [item.accessory_list.length, equipmentId]);
          console.log(`[InboundOrderService] 配件清单处理完成，共 ${item.accessory_list.length} 个配件`);
        } else {
          console.log(`[InboundOrderService] 没有配件清单需要处理`);
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
      FROM equipment_instances ei
      JOIN equipment_models em ON ei.model_id = em.id
      WHERE em.model_no = ?
    `, [modelNo]);
    
    const count = result[0]?.[0]?.count || 0;
    const seq = (count + 1).toString().padStart(4, '0');
    
    return `${prefix}-${modelNo}-${seq}`;
  }
}

export const inboundOrderService = new InboundOrderService();
