import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';

// 类型定义
export type TransferOrderStatus = 'pending_from' | 'pending_to' | 'shipping' | 'receiving' | 'partial_received' | 'completed' | 'rejected' | 'cancelled' | 'withdrawn';
export type TransferScene = 'A' | 'B' | 'C';

export interface TransferOrderItem {
  id: string;
  order_id: string;
  equipment_id?: string;
  equipment_name: string;
  model_no: string;
  brand?: string;
  category: string;
  unit: string;
  manage_code?: string;
  serial_number?: string;
  quantity: number;
  status: string;
  notes?: string;
}

export interface TransferOrder {
  id: string;
  order_no: string;
  status: TransferOrderStatus;
  items: TransferOrderItem[];
  shipped_at?: string;
  shipping_no?: string;
  receive_status?: string;
  receive_comment?: string;
  [key: string]: any;
}

export interface CreateTransferOrderDto {
  from_location_type: string;
  from_warehouse_id?: string;
  from_project_id?: string;
  to_location_type: string;
  to_warehouse_id?: string;
  to_project_id?: string;
  transfer_reason?: string;
  estimated_arrival_date?: string;
  estimated_ship_date?: string;
  items: any[];
}

interface Employee { id: string; name: string; }
interface Warehouse { id: string; name: string; manager_id?: string; }
interface Project { id: string; name: string; manager_id?: string; }
interface EquipmentInstance { id: string; }

export class TransferOrderService {

  async createOrder(dto: CreateTransferOrderDto, userId: string, userName: string): Promise<TransferOrder> {
    const connection = await db.beginTransaction();

    try {
      const id = uuidv4();
      const orderNo = this.generateOrderNo();
      
      // 转换DTO为数据库格式
      const convertedDto = this.convertDtoToDbFormat(dto);
      
      // 获取位置信息
      let fromWarehouseName = null;
      let fromProjectName = null;
      let fromManagerId = null;
      let fromManager = null;
      
      if (convertedDto.from_location_type === 'warehouse') {
        const warehouse = await db.queryOne<Warehouse>(
          'SELECT * FROM warehouses WHERE id = ?',
          [convertedDto.from_warehouse_id]
        ) as any;
        
        if (warehouse) {
          fromWarehouseName = warehouse.name;
          fromManagerId = warehouse.manager_id;
          
          // 获取负责人信息
          const manager = await db.queryOne<Employee>(
            'SELECT * FROM employees WHERE id = ?',
            [warehouse.manager_id]
          ) as any;
          
          if (manager) {
            fromManager = manager.name;
          }
        }
      } else {
        const project = await db.queryOne<Project>(
          'SELECT * FROM projects WHERE id = ?',
          [convertedDto.from_project_id]
        ) as any;
        
        if (project) {
          fromProjectName = project.name;
          fromManagerId = project.manager_id;
          
          // 获取负责人信息
          const manager = await db.queryOne<Employee>(
            'SELECT * FROM employees WHERE id = ?',
            [project.manager_id]
          ) as any;
          
          if (manager) {
            fromManager = manager.name;
          }
        }
      }
      
      let toWarehouseName = null;
      let toProjectName = null;
      let toManagerId = null;
      let toManager = null;
      
      if (convertedDto.to_location_type === 'warehouse') {
        const warehouse = await db.queryOne<Warehouse>(
          'SELECT * FROM warehouses WHERE id = ?',
          [convertedDto.to_warehouse_id]
        ) as any;
        
        if (warehouse) {
          toWarehouseName = warehouse.name;
          toManagerId = warehouse.manager_id;
          
          // 获取负责人信息
          const manager = await db.queryOne<Employee>(
            'SELECT * FROM employees WHERE id = ?',
            [warehouse.manager_id]
          ) as any;
          
          if (manager) {
            toManager = manager.name;
          }
        }
      } else {
        const project = await db.queryOne<Project>(
          'SELECT * FROM projects WHERE id = ?',
          [convertedDto.to_project_id]
        ) as any;
        
        if (project) {
          toProjectName = project.name;
          toManagerId = project.manager_id;
          
          // 获取负责人信息
          const manager = await db.queryOne<Employee>(
            'SELECT * FROM employees WHERE id = ?',
            [project.manager_id]
          ) as any;
          
          if (manager) {
            toManager = manager.name;
          }
        }
      }
      
      const totalItems = convertedDto.items.length;
      const totalQuantity = convertedDto.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      const firstItem = convertedDto.items[0] || {};
      
      await connection.execute(`
        INSERT INTO equipment_transfer_orders (
          id, order_no, transfer_scene, applicant_id, applicant, apply_date,
          equipment_id, equipment_code, equipment_name, equipment_category,
          from_location_type, from_warehouse_id, from_warehouse_name, from_project_id, from_project_name,
          from_manager_id, from_manager,
          to_location_type, to_warehouse_id, to_warehouse_name, to_project_id, to_project_name,
          to_manager_id, to_manager,
          transfer_reason, estimated_ship_date, estimated_arrival_date, transport_method, tracking_no, notes,
          status,
          total_items, total_quantity, transfer_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, orderNo, 'A', userId, userName, new Date().toISOString().slice(0, 10),
        firstItem.equipment_id || null, firstItem.manage_code || null, firstItem.equipment_name || null, firstItem.category || null,
        convertedDto.from_location_type, convertedDto.from_warehouse_id || null, fromWarehouseName, convertedDto.from_project_id || null, fromProjectName,
        fromManagerId, fromManager,
        convertedDto.to_location_type, convertedDto.to_warehouse_id || null, toWarehouseName, convertedDto.to_project_id || null, toProjectName,
        toManagerId, toManager,
        convertedDto.transfer_reason, convertedDto.estimated_ship_date || null, convertedDto.estimated_arrival_date || null, null, null, null,
        'pending_from',
        totalItems, totalQuantity, 'single'
      ]);
      
      for (const item of convertedDto.items) {
        const itemId = uuidv4();
        await connection.execute(`
          INSERT INTO equipment_transfer_order_items (
            id, order_id, equipment_id, equipment_name, model_no, brand, category, unit,
            manage_code, serial_number, quantity, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          itemId, id, item.equipment_id || null, item.equipment_name, item.model_no, item.brand || null,
          item.category, item.unit || '台', item.manage_code || null, item.serial_number || null,
          item.quantity, 'pending', item.notes || null
        ]);
      }
      
      await connection.commit();
      
      return this.getById(id) as Promise<TransferOrder>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateOrderStatus(id: string, status: TransferOrderStatus, comment?: string): Promise<boolean> {
    try {
      const updateFields = ['status = ?'];
      const updateValues: any[] = [status];
      
      if (comment) {
        updateFields.push('notes = ?');
        updateValues.push(comment);
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);
      
      await db.execute(
        `UPDATE equipment_transfer_orders SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      return true;
    } catch (error) {
      console.error('更新调拨单状态失败:', error);
      return false;
    }
  }

  async approveFromLocation(id: string, approvedBy: string, comment?: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'shipping', 
             from_approved_at = NOW(), 
             from_approved_by = ?,
             from_approval_comment = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [approvedBy, comment || null, id]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('审批调出位置失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  async approveToLocation(id: string, approvedBy: string, comment?: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'shipping', 
             to_approved_at = NOW(), 
             to_approved_by = ?,
             to_approval_comment = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [approvedBy, comment || null, id]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('审批调入位置失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  async confirmShipping(id: string, shippingNo: string, shippedBy: string, attachment?: string, itemImages?: { item_id: string; images: string[] }[], packageImages?: string[], shippedAt?: string): Promise<boolean> {
    console.log(`[TransferOrderService] confirmShipping 被调用: id=${id}, shippingNo=${shippingNo}, shippedBy=${shippedBy}, shippedAt=${shippedAt}`);
    
    const connection = await db.beginTransaction();

    try {
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'receiving', 
             shipped_at = ?, 
             shipped_by = ?,
             shipping_no = ?,
             shipping_attachment = ?,
             shipping_package_images = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [shippedAt || new Date(), shippedBy, shippingNo, attachment || null, packageImages ? JSON.stringify(packageImages) : null, id]
      );
      
      console.log(`[TransferOrderService] 调拨单状态已更新为 receiving: ${id}`);
      
      if (itemImages && itemImages.length > 0) {
        for (const item of itemImages) {
          if (item.images && item.images.length > 0) {
            await connection.execute(
              `UPDATE equipment_transfer_order_items 
               SET shipping_images = ?, updated_at = NOW()
               WHERE id = ?`,
              [JSON.stringify(item.images), item.item_id]
            );
          }
        }
        console.log(`[TransferOrderService] 已更新 ${itemImages.length} 个明细的发货图片`);
      }
      
      await this.setEquipmentStatusToTransferring(connection, id);
      
      await connection.commit();
      console.log(`[TransferOrderService] 发货成功: ${id}`);
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('确认发货失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  /**
   * 将设备状态设置为运输中
   */
  private async setEquipmentStatusToTransferring(connection: any, transferOrderId: string): Promise<void> {
    console.log(`[TransferOrderService] setEquipmentStatusToTransferring 开始执行: ${transferOrderId}`);
    
    // 获取调拨单
    const [orderRows] = await connection.query<any>(
      `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
      [transferOrderId]
    );
    const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
    
    console.log(`[TransferOrderService] 调拨单信息:`, order);
    
    if (!order) {
      console.log(`[TransferOrderService] 调拨单不存在: ${transferOrderId}`);
      return;
    }
    
    // 获取调拨单项目
    const [itemRows] = await connection.query<any>(
      `SELECT * FROM equipment_transfer_order_items WHERE order_id = ?`,
      [transferOrderId]
    );
    const items = itemRows || [];
    
    console.log(`[TransferOrderService] 调拨单项目数量: ${items.length}`);
    
    if (!items || items.length === 0) {
      console.log(`[TransferOrderService] 调拨单没有项目`);
      return;
    }
    
    // 更新每个设备的状态
    for (const item of items) {
      console.log(`[TransferOrderService] 处理设备: ${item.equipment_name} ${item.model_no}, 类别: ${item.category}, equipment_id: ${item.equipment_id}`);
      
      if (item.equipment_id) {
        // 仪器类：有 equipment_id
        const [equipmentRows] = await connection.query<any>(
          `SELECT ei.*, em.name as equipment_name, em.model_no, em.category 
           FROM equipment_instances ei
           JOIN equipment_models em ON ei.model_id = em.id
           WHERE ei.id = ?`,
          [item.equipment_id]
        );
        const equipment = equipmentRows && equipmentRows.length > 0 ? equipmentRows[0] : null;
        
        if (!equipment) continue;
        
        console.log(`[TransferOrderService] 设置设备为运输中: ${equipment.equipment_name} ${equipment.model_no}, 类别: ${equipment.category}`);
        
        // 直接更新状态为运输中，清空位置信息
        await connection.execute(
          `UPDATE equipment_instances 
           SET location_status = 'transferring', 
               location_id = NULL, 
               updated_at = NOW()
           WHERE id = ?`,
          [item.equipment_id]
        );
        console.log(`[TransferOrderService] 仪器类设备状态已更新为运输中: ${item.equipment_id}`);
      } else {
        // 假负载/线缆类：没有 equipment_id，需要根据设备信息查找
        const transferQuantity = item.quantity || 1;
        
        // 确定调出位置
        let fromLocationId = null;
        let fromLocationType = null;
        if (order.from_location_type === 'warehouse') {
          fromLocationId = order.from_warehouse_id;
          fromLocationType = 'warehouse';
        } else if (order.from_location_type === 'project') {
          fromLocationId = order.from_project_id;
          fromLocationType = 'project';
        }
        
        if (!fromLocationId || !fromLocationType) continue;
        
        // 查找调出位置的设备记录（JOIN equipment_models表获取设备信息）
        let query = `SELECT ei.*, em.name as equipment_name, em.model_no, em.brand, em.category, em.unit 
           FROM equipment_instances ei
           JOIN equipment_models em ON ei.model_id = em.id
           WHERE em.name = ? AND em.model_no = ? AND em.category = ? AND ei.location_id = ?`;
        let queryParams = [item.equipment_name, item.model_no, item.category, fromLocationId];
        
        // 只有当manage_code不为null时才使用这个条件
        if (item.manage_code) {
          query += ` AND ei.manage_code = ?`;
          queryParams.push(item.manage_code);
        }
        
        const [equipmentRows] = await connection.query<any>(query, queryParams);
        const equipment = equipmentRows && equipmentRows.length > 0 ? equipmentRows[0] : null;
        
        if (!equipment) {
          console.log(`[TransferOrderService] 未找到调出位置的设备记录: ${item.equipment_name} ${item.model_no}`);
          continue;
        }
        
        const currentQuantity = equipment.quantity || 1;
        
        if (currentQuantity <= transferQuantity) {
          // 数量不足或刚好，删除记录
          await connection.execute(
            'DELETE FROM equipment_instances WHERE id = ?',
            [equipment.id]
          );
          console.log(`[TransferOrderService] 调出位置设备记录已删除: ${equipment.id} (数量: ${currentQuantity})`);
        } else {
          // 有剩余，减少数量
          await connection.execute(
            `UPDATE equipment_instances 
             SET quantity = quantity - ?, updated_at = NOW()
             WHERE id = ?`,
            [transferQuantity, equipment.id]
          );
          console.log(`[TransferOrderService] 调出位置数量已减少: ${equipment.id} (${currentQuantity} -> ${currentQuantity - transferQuantity})`);
        }
        
        // 创建运输中的设备记录（location_status = 'transferring', location_id = NULL）
        const transferringEquipmentId = uuidv4();
        const transferringManageCode = item.manage_code ? item.manage_code + '-transferring' : `TRANS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.execute(
          `INSERT INTO equipment_instances 
          (id, model_id, quantity, serial_number, manage_code, 
           health_status, usage_status, location_status, location_id, keeper_id, 
           purchase_date, purchase_price, calibration_expiry, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transferringEquipmentId,
            equipment.model_id,
            transferQuantity,
            null,
            transferringManageCode,
            'normal',
            'in_use', // 运输中视为使用中，不可用
            'transferring',
            null, // 运输中位置ID为NULL
            null,
            null,
            null,
            null
          ]
        );
        console.log(`[TransferOrderService] 已创建运输中设备记录: ${transferringEquipmentId} (数量: ${transferQuantity})`);
      }
    }
  }

  // 别名方法，供路由调用
  async shipOrder(id: string, userId: string, userName: string, params: { 
    shipped_at?: string; 
    shipping_no?: string; 
    shipping_attachment?: string;
    item_images?: { item_id: string; images: string[] }[];
    package_images?: string[];
  }): Promise<TransferOrder> {
    console.log(`[TransferOrderService] shipOrder 被调用: id=${id}, userId=${userId}, userName=${userName}, params=`, params);
    const success = await this.confirmShipping(id, params.shipping_no || '', userId, params.shipping_attachment, params.item_images, params.package_images, params.shipped_at);
    console.log(`[TransferOrderService] confirmShipping 执行完成，结果: ${success}`);
    if (!success) {
      throw new Error('发货失败');
    }
    console.log(`[TransferOrderService] confirmShipping 执行完成，开始查询调拨单: ${id}`);
    const order = await this.getById(id);
    if (!order) throw new Error('调拨单不存在');
    console.log(`[TransferOrderService] shipOrder 执行完成: ${id}`);
    return order;
  }

  // 别名方法，供路由调用
  async receiveOrder(id: string, userId: string, userName: string, params: { 
    received_at?: string; 
    receive_status?: string; 
    receive_comment?: string;
    item_images?: { item_id: string; images: string[] }[];
    package_images?: string[];
    received_items?: { item_id: string; received_quantity: number }[];
  }): Promise<TransferOrder> {
    await this.confirmReceiving(id, userId, params.receive_status || 'normal', params.receive_comment, params.item_images, params.package_images, params.received_items);
    const order = await this.getById(id);
    if (!order) throw new Error('调拨单不存在');
    return order;
  }

  // 获取调拨单列表（别名方法）
  async getOrders(params: any = {}): Promise<{ data: TransferOrder[]; total: number }> {
    return this.getAll(params);
  }

  // 审批相关方法
  async approveFromManager(id: string, userId: string, userName: string, comment?: string): Promise<boolean> {
    return this.approveFromLocation(id, userId, comment);
  }

  async approveToManager(id: string, userId: string, userName: string, comment?: string): Promise<boolean> {
    return this.approveToLocation(id, userId, comment);
  }

  async approveOrder(id: string, userId: string, userName: string, comment?: string): Promise<boolean> {
    return this.approveFromLocation(id, userId, comment);
  }

  async cancelOrder(id: string, reason?: string): Promise<TransferOrder> {
    await this.updateOrderStatus(id, 'cancelled' as TransferOrderStatus, reason);
    const order = await this.getById(id);
    if (!order) throw new Error('调拨单不存在');
    return order;
  }

  async submitOrder(id: string): Promise<TransferOrder> {
    await this.updateOrderStatus(id, 'pending_from' as TransferOrderStatus);
    const order = await this.getById(id);
    if (!order) throw new Error('调拨单不存在');
    return order;
  }

  async confirmReceiving(id: string, receivedBy: string, status: string, comment?: string, itemImages?: { item_id: string; images: string[] }[], packageImages?: string[], receivedItems?: { item_id: string; received_quantity: number }[]): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      const [orderRows] = await connection.query<any>(
        `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
      
      if (!order) {
        throw new Error('调拨单不存在');
      }
      
      const [itemRows] = await connection.query<any>(
        `SELECT * FROM equipment_transfer_order_items WHERE order_id = ?`,
        [id]
      );
      const items = itemRows || [];
      
      let isPartialReceive = false;
      let totalRequested = 0;
      let totalReceived = 0;
      
      if (receivedItems && receivedItems.length > 0) {
        for (const item of items) {
          totalRequested += item.quantity || 0;
          const receivedItem = receivedItems.find(ri => ri.item_id === item.id);
          if (receivedItem) {
            totalReceived += receivedItem.received_quantity;
            if (receivedItem.received_quantity < item.quantity) {
              isPartialReceive = true;
            }
            await connection.execute(
              `UPDATE equipment_transfer_order_items 
               SET received_quantity = ?, status = ?, updated_at = NOW()
               WHERE id = ?`,
              [receivedItem.received_quantity, 'transferred', item.id]
            );
          } else {
            totalReceived += 0;
            isPartialReceive = true;
            await connection.execute(
              `UPDATE equipment_transfer_order_items 
               SET received_quantity = 0, status = 'returned', updated_at = NOW()
               WHERE id = ?`,
              [item.id]
            );
          }
        }
      } else {
        totalRequested = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        totalReceived = totalRequested;
      }
      
      if (isPartialReceive) {
        await connection.execute(
          `UPDATE equipment_transfer_orders 
           SET status = 'partial_received', 
               received_at = NOW(), 
               received_by = ?,
               receive_status = ?,
               receive_comment = ?,
               receiving_package_images = ?,
               total_received_quantity = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [receivedBy, 'partial', comment || null, packageImages ? JSON.stringify(packageImages) : null, totalReceived, id]
        );
      } else {
        await connection.execute(
          `UPDATE equipment_transfer_orders 
           SET status = 'completed', 
               received_at = NOW(), 
               received_by = ?,
               receive_status = ?,
               receive_comment = ?,
               receiving_package_images = ?,
               total_received_quantity = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [receivedBy, status || 'normal', comment || null, packageImages ? JSON.stringify(packageImages) : null, totalReceived, id]
        );
      }
      
      if (itemImages && itemImages.length > 0) {
        for (const item of itemImages) {
          if (item.images && item.images.length > 0) {
            await connection.execute(
              `UPDATE equipment_transfer_order_items 
               SET receiving_images = ?, updated_at = NOW()
               WHERE id = ?`,
              [JSON.stringify(item.images), item.item_id]
            );
          }
        }
        console.log(`[TransferOrderService] 已更新 ${itemImages.length} 个明细的收货图片`);
      }
      
      if (isPartialReceive) {
        await this.partialTransferEquipment(connection, id, receivedItems || [], items);
      } else {
        await this.updateEquipmentLocationFromTransferring(connection, id);
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('确认收货失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  private async partialTransferEquipment(connection: any, transferOrderId: string, receivedItems: { item_id: string; received_quantity: number }[], allItems: any[]): Promise<void> {
    try {
      const [orderRows] = await connection.query<any>(
        `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
        [transferOrderId]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
      
      if (!order) {
        return;
      }
      
      let toLocationId = null;
      let toLocationType = null;
      let toKeeperId = null;
      
      if (order.to_location_type === 'warehouse') {
        toLocationId = order.to_warehouse_id;
        toLocationType = 'warehouse';
        const [warehouseRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [toLocationId]
        );
        const warehouse = warehouseRows && warehouseRows.length > 0 ? warehouseRows[0] : null;
        if (warehouse) {
          toKeeperId = warehouse.manager_id;
        }
      } else {
        toLocationId = order.to_project_id;
        toLocationType = 'project';
        const [projectRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM projects WHERE id = ?',
          [toLocationId]
        );
        const project = projectRows && projectRows.length > 0 ? projectRows[0] : null;
        if (project) {
          toKeeperId = project.manager_id;
        }
      }
      
      let fromLocationId = null;
      let fromLocationType = null;
      let fromKeeperId = null;
      
      if (order.from_location_type === 'warehouse') {
        fromLocationId = order.from_warehouse_id;
        fromLocationType = 'warehouse';
        const [warehouseRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [fromLocationId]
        );
        const warehouse = warehouseRows && warehouseRows.length > 0 ? warehouseRows[0] : null;
        if (warehouse) {
          fromKeeperId = warehouse.manager_id;
        }
      } else {
        fromLocationId = order.from_project_id;
        fromLocationType = 'project';
        const [projectRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM projects WHERE id = ?',
          [fromLocationId]
        );
        const project = projectRows && projectRows.length > 0 ? projectRows[0] : null;
        if (project) {
          fromKeeperId = project.manager_id;
        }
      }
      
      for (const item of allItems) {
        const receivedItem = receivedItems.find(ri => ri.item_id === item.id);
        const receivedQty = receivedItem?.received_quantity || 0;
        const returnQty = (item.quantity || 0) - receivedQty;
        
        if (receivedQty > 0) {
          if (item.equipment_id && item.category === 'instrument') {
            await connection.execute(
              `UPDATE equipment_instances 
               SET location_id = ?, 
                   location_status = ?,
                   usage_status = ?,
                   keeper_id = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [toLocationId, toLocationType === 'warehouse' ? 'warehouse' : 'in_project', toLocationType === 'warehouse' ? 'idle' : 'in_use', toKeeperId, item.equipment_id]
            );
            console.log(`[TransferOrderService] 仪器类设备已转移到目标位置: ${item.equipment_id}, 数量: ${receivedQty}`);
          } else {
            const [transferringEquipmentRows] = await connection.query<any>(
              `SELECT ei.*, em.name as equipment_name, em.model_no, em.category 
               FROM equipment_instances ei
               JOIN equipment_models em ON ei.model_id = em.id
               WHERE ei.location_status = 'transferring' 
                 AND em.category = ? 
                 AND em.name = ? 
                 AND em.model_no = ?`,
              [item.category, item.equipment_name, item.model_no]
            );
            const transferringEquipment = transferringEquipmentRows && transferringEquipmentRows.length > 0 ? transferringEquipmentRows[0] : null;
            
            if (transferringEquipment) {
              const [existingEquipmentRows] = await connection.query<{ id: string; quantity: number }>(
                `SELECT ei.id, ei.quantity 
                 FROM equipment_instances ei
                 JOIN equipment_models em ON ei.model_id = em.id
                 WHERE ei.location_id = ? 
                   AND em.category = ? AND em.name = ? AND em.model_no = ?`,
                [toLocationId, transferringEquipment.category, transferringEquipment.equipment_name, transferringEquipment.model_no]
              );
              const existingEquipment = existingEquipmentRows && existingEquipmentRows.length > 0 ? existingEquipmentRows[0] : null;
              
              if (existingEquipment) {
                await connection.execute(
                  `UPDATE equipment_instances 
                   SET quantity = quantity + ?, 
                       usage_status = ?,
                       keeper_id = ?,
                       updated_at = NOW()
                   WHERE id = ?`,
                  [receivedQty, toLocationType === 'warehouse' ? 'idle' : 'in_use', toKeeperId, existingEquipment.id]
                );
                console.log(`[TransferOrderService] 目标位置数量已更新: ${existingEquipment.id} (+${receivedQty})`);
                
                const remainingQty = (transferringEquipment.quantity || 0) - receivedQty;
                if (remainingQty <= 0) {
                  await connection.execute(
                    'DELETE FROM equipment_instances WHERE id = ?',
                    [transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备记录已删除: ${transferringEquipment.id}`);
                } else {
                  await connection.execute(
                    `UPDATE equipment_instances 
                     SET quantity = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [remainingQty, transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备数量已更新: ${transferringEquipment.id} (${transferringEquipment.quantity} -> ${remainingQty})`);
                }
              } else {
                const newEquipmentId = uuidv4();
                await connection.execute(
                  `INSERT INTO equipment_instances 
                  (id, model_id, quantity, serial_number, manage_code, 
                   health_status, usage_status, location_status, location_id, keeper_id, 
                   purchase_date, purchase_price, calibration_expiry, notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    newEquipmentId,
                    transferringEquipment.model_id,
                    receivedQty,
                    null,
                    transferringEquipment.manage_code ? transferringEquipment.manage_code.replace('-transferring', '') + '-' + uuidv4().substring(0, 8) : `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    transferringEquipment.health_status,
                    toLocationType === 'warehouse' ? 'idle' : 'in_use',
                    toLocationType === 'warehouse' ? 'warehouse' : 'in_project',
                    toLocationId,
                    toKeeperId,
                    transferringEquipment.purchase_date,
                    transferringEquipment.purchase_price,
                    transferringEquipment.calibration_expiry,
                    transferringEquipment.notes
                  ]
                );
                console.log(`[TransferOrderService] 目标位置已创建新记录: ${newEquipmentId} (数量: ${receivedQty})`);
                
                const remainingQty = (transferringEquipment.quantity || 0) - receivedQty;
                if (remainingQty <= 0) {
                  await connection.execute(
                    'DELETE FROM equipment_instances WHERE id = ?',
                    [transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备记录已删除: ${transferringEquipment.id}`);
                } else {
                  await connection.execute(
                    `UPDATE equipment_instances 
                     SET quantity = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [remainingQty, transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备数量已更新: ${transferringEquipment.id} (${transferringEquipment.quantity} -> ${remainingQty})`);
                }
              }
            }
          }
        }
        
        if (returnQty > 0) {
          if (item.equipment_id && item.category === 'instrument') {
            await connection.execute(
              `UPDATE equipment_instances 
               SET location_id = ?, 
                   location_status = ?,
                   usage_status = 'idle',
                   keeper_id = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [fromLocationId, fromLocationType === 'warehouse' ? 'warehouse' : 'in_project', fromKeeperId, item.equipment_id]
            );
            console.log(`[TransferOrderService] 仪器类设备已返回原位置: ${item.equipment_id}, 数量: ${returnQty}`);
          } else {
            const [transferringEquipmentRows] = await connection.query<any>(
              `SELECT ei.*, em.name as equipment_name, em.model_no, em.category 
               FROM equipment_instances ei
               JOIN equipment_models em ON ei.model_id = em.id
               WHERE ei.location_status = 'transferring' 
                 AND em.category = ? 
                 AND em.name = ? 
                 AND em.model_no = ?`,
              [item.category, item.equipment_name, item.model_no]
            );
            const transferringEquipment = transferringEquipmentRows && transferringEquipmentRows.length > 0 ? transferringEquipmentRows[0] : null;
            
            if (transferringEquipment) {
              const [existingEquipmentRows] = await connection.query<{ id: string; quantity: number }>(
                `SELECT ei.id, ei.quantity 
                 FROM equipment_instances ei
                 JOIN equipment_models em ON ei.model_id = em.id
                 WHERE ei.location_id = ? 
                   AND em.category = ? AND em.name = ? AND em.model_no = ?`,
                [fromLocationId, transferringEquipment.category, transferringEquipment.equipment_name, transferringEquipment.model_no]
              );
              const existingEquipment = existingEquipmentRows && existingEquipmentRows.length > 0 ? existingEquipmentRows[0] : null;
              
              if (existingEquipment) {
                await connection.execute(
                  `UPDATE equipment_instances 
                   SET quantity = quantity + ?, 
                       usage_status = 'idle',
                       keeper_id = ?,
                       updated_at = NOW()
                   WHERE id = ?`,
                  [returnQty, fromKeeperId, existingEquipment.id]
                );
                console.log(`[TransferOrderService] 原位置数量已更新: ${existingEquipment.id} (+${returnQty})`);
                
                const remainingQty = (transferringEquipment.quantity || 0) - returnQty;
                if (remainingQty <= 0) {
                  await connection.execute(
                    'DELETE FROM equipment_instances WHERE id = ?',
                    [transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备记录已删除: ${transferringEquipment.id}`);
                } else {
                  await connection.execute(
                    `UPDATE equipment_instances 
                     SET quantity = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [remainingQty, transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备数量已更新: ${transferringEquipment.id} (${transferringEquipment.quantity} -> ${remainingQty})`);
                }
              } else {
                const newEquipmentId = uuidv4();
                await connection.execute(
                  `INSERT INTO equipment_instances 
                  (id, model_id, quantity, serial_number, manage_code, 
                   health_status, usage_status, location_status, location_id, keeper_id, 
                   purchase_date, purchase_price, calibration_expiry, notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    newEquipmentId,
                    transferringEquipment.model_id,
                    returnQty,
                    null,
                    transferringEquipment.manage_code ? transferringEquipment.manage_code.replace('-transferring', '') + '-' + uuidv4().substring(0, 8) : `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    transferringEquipment.health_status,
                    'idle',
                    fromLocationType === 'warehouse' ? 'warehouse' : 'in_project',
                    fromLocationId,
                    fromKeeperId,
                    transferringEquipment.purchase_date,
                    transferringEquipment.purchase_price,
                    transferringEquipment.calibration_expiry,
                    transferringEquipment.notes
                  ]
                );
                console.log(`[TransferOrderService] 原位置已创建新记录: ${newEquipmentId} (数量: ${returnQty})`);
                
                const remainingQty = (transferringEquipment.quantity || 0) - returnQty;
                if (remainingQty <= 0) {
                  await connection.execute(
                    'DELETE FROM equipment_instances WHERE id = ?',
                    [transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备记录已删除: ${transferringEquipment.id}`);
                } else {
                  await connection.execute(
                    `UPDATE equipment_instances 
                     SET quantity = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [remainingQty, transferringEquipment.id]
                  );
                  console.log(`[TransferOrderService] 运输中设备数量已更新: ${transferringEquipment.id} (${transferringEquipment.quantity} -> ${remainingQty})`);
                }
              }
            }
          }
        }
        
        if (item.category !== 'instrument' && item.equipment_id) {
          await connection.execute(
            'DELETE FROM equipment_instances WHERE id = ?',
            [item.equipment_id]
          );
          console.log(`[TransferOrderService] 运输中设备记录已删除: ${item.equipment_id}`);
        }
      }
    } catch (error) {
      console.error('部分转移设备失败:', error);
      throw error;
    }
  }

  async confirmPartialReceive(id: string, confirmedBy: string): Promise<boolean> {
    const connection = await db.beginTransaction();
    
    try {
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'completed', 
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
      
      await connection.commit();
      console.log(`[TransferOrderService] 部分收货已确认完成: ${id}`);
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('确认部分收货失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  async returnToShipping(id: string, returnedBy: string, comment?: string): Promise<boolean> {
    const connection = await db.beginTransaction();
    
    try {
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'shipping', 
             return_comment = ?,
             returned_at = NOW(),
             returned_by = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [comment || null, returnedBy, id]
      );
      
      await connection.commit();
      console.log(`[TransferOrderService] 已回退到发货状态: ${id}`);
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('回退到发货状态失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  async rejectOrder(id: string, rejectedBy: string, comment: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      // 获取调拨单信息
      const [orderRows] = await connection.query<any>(
        `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
      
      if (!order) {
        throw new Error('调拨单不存在');
      }
      
      // 如果已经发货，需要将设备从运输中状态返回到调出位置
      if (order.status === 'receiving' || order.status === 'shipping') {
        await this.returnEquipmentFromTransferring(connection, id);
      }
      
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'rejected', 
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
      
      // 添加审批记录
      await connection.execute(
        `INSERT INTO equipment_transfer_approvals 
         (id, order_id, approval_type, approved_by, approval_result, comment, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), id, 'reject', rejectedBy, 'rejected', comment]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('拒绝调拨单失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  /**
   * 回退：将设备从运输中状态返回到调出位置
   */
  async returnOrder(id: string, returnedBy: string, comment: string): Promise<boolean> {
    const connection = await db.beginTransaction();

    try {
      // 获取调拨单信息
      const [orderRows] = await connection.query<any>(
        `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
        [id]
      );
      const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
      
      if (!order) {
        throw new Error('调拨单不存在');
      }
      
      // 如果已经发货，需要将设备从运输中状态返回到调出位置
      if (order.status === 'receiving' || order.status === 'shipping') {
        await this.returnEquipmentFromTransferring(connection, id);
      }
      
      // 更新调拨单状态为等待调出方审批
      await connection.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'pending_from', 
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
      
      // 添加审批记录
      await connection.execute(
        `INSERT INTO equipment_transfer_approvals 
         (id, order_id, approval_type, approved_by, approval_result, comment, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), id, 'return', returnedBy, 'returned', comment]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('回退调拨单失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  /**
   * 将设备从运输中状态返回到调出位置
   */
  private async returnEquipmentFromTransferring(connection: any, transferOrderId: string): Promise<void> {
    try {
        // 获取调拨单信息
        const [orderRows] = await connection.query<any>(
          `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
          [transferOrderId]
        );
        const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
      
      if (!order) {
        return;
      }
      
      // 获取调拨单项目
      const items = await connection.query<any>(
        `SELECT * FROM equipment_transfer_order_items WHERE order_id = ?`,
        [transferOrderId]
      );
      
      if (!items || items.length === 0) {
        return;
      }
      
      // 确定调出位置信息
      let fromLocationId = null;
      let fromLocationType = null;
      let fromKeeperId = null;
      
      if (order.from_location_type === 'warehouse') {
        fromLocationId = order.from_warehouse_id;
        fromLocationType = 'warehouse';
        const [warehouseRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [fromLocationId]
        );
        if (warehouseRows && warehouseRows.length > 0) {
          fromKeeperId = warehouseRows[0].manager_id;
        }
      } else {
        fromLocationId = order.from_project_id;
        fromLocationType = 'project';
        const [projectRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM projects WHERE id = ?',
          [fromLocationId]
        );
        if (projectRows && projectRows.length > 0) {
          fromKeeperId = projectRows[0].manager_id;
        }
      }
      
      // 处理每个设备
      for (const item of items) {
        if (!item.equipment_id) continue;
        
        // 获取设备信息
          const [equipmentRows] = await connection.query<any>(
            `SELECT ei.*, em.name as equipment_name, em.model_no, em.category, em.brand, em.unit 
             FROM equipment_instances ei
             JOIN equipment_models em ON ei.model_id = em.id
             WHERE ei.id = ?`,
            [item.equipment_id]
          );
          const equipment = equipmentRows && equipmentRows.length > 0 ? equipmentRows[0] : null;
        
        if (!equipment) continue;
        
        console.log(`[TransferOrderService] 回退设备: ${equipment.equipment_name} ${equipment.model_no}, 类别: ${equipment.category}`);
        
        // 根据设备类别处理
        if (equipment.category === 'instrument') {
          // 仪器类：直接更新设备位置和状态
          await connection.execute(
            `UPDATE equipment_instances 
             SET location_id = ?, 
                 location_status = ?,
                 usage_status = 'idle',
                 keeper_id = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [fromLocationId, fromLocationType === 'warehouse' ? 'warehouse' : 'in_project', fromKeeperId, item.equipment_id]
          );
          console.log(`[TransferOrderService] 仪器类设备已返回调出位置: ${item.equipment_id}, 保管人: ${fromKeeperId}`);
        } else {
          // 假负载/线缆类：按数量处理
          const transferQuantity = item.quantity || 1;
          
          // 1. 查找运输中的设备记录
          const [transferringEquipmentRows] = await connection.query<{ id: string; quantity: number }>(
            `SELECT ei.id, ei.quantity 
             FROM equipment_instances ei
             JOIN equipment_models em ON ei.model_id = em.id
             WHERE ei.location_status = 'transferring' 
               AND em.category = ? 
               AND em.name = ? 
               AND em.model_no = ?`,
            [equipment.category, equipment.equipment_name, equipment.model_no]
          );
          const transferringEquipment = transferringEquipmentRows && transferringEquipmentRows.length > 0 ? transferringEquipmentRows[0] : null;
          
          if (!transferringEquipment) {
            console.error(`[TransferOrderService] 未找到运输中的设备记录: ${equipment.equipment_name} ${equipment.model_no}`);
            continue;
          }
          
          // 2. 删除运输中的设备记录
          await connection.execute(
            'DELETE FROM equipment_instances WHERE id = ?',
            [transferringEquipment.id]
          );
          console.log(`[TransferOrderService] 运输中设备记录已删除: ${transferringEquipment.id}`);
          
          // 3. 检查调出位置是否已存在相同设备
            const [existingEquipmentRows] = await connection.query<{ id: string; quantity: number }>(
              `SELECT ei.id, ei.quantity 
               FROM equipment_instances ei
               JOIN equipment_models em ON ei.model_id = em.id
               WHERE ei.location_id = ? 
                 AND em.category = ? AND em.name = ? AND em.model_no = ?`,
              [fromLocationId, equipment.category, equipment.equipment_name, equipment.model_no]
            );
            const existingEquipment = existingEquipmentRows && existingEquipmentRows.length > 0 ? existingEquipmentRows[0] : null;
          
          if (existingEquipment) {
            // 4. 存在相同设备，更新数量（合并）
            await connection.execute(
              `UPDATE equipment_instances 
               SET quantity = quantity + ?, 
                   usage_status = 'idle',
                   keeper_id = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [transferQuantity, fromKeeperId, existingEquipment.id]
            );
            console.log(`[TransferOrderService] 调出位置数量已合并: ${existingEquipment.id} (+${transferQuantity}), 保管人: ${fromKeeperId}`);
          } else {
            // 5. 不存在相同设备，创建新记录
            const newEquipmentId = uuidv4();
            await connection.execute(
              `INSERT INTO equipment_instances 
              (id, model_id, quantity, serial_number, manage_code, 
               health_status, usage_status, location_status, location_id, keeper_id, 
               purchase_date, purchase_price, calibration_expiry, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newEquipmentId,
                equipment.model_id,
                transferQuantity,
                null,
                equipment.manage_code,
                equipment.health_status,
                'idle',
                fromLocationType === 'warehouse' ? 'warehouse' : 'in_project',
                fromLocationId,
                fromKeeperId,
                equipment.purchase_date,
                equipment.purchase_price,
                equipment.calibration_expiry,
                equipment.notes
              ]
            );
            console.log(`[TransferOrderService] 调出位置已创建新记录: ${newEquipmentId} (数量: ${transferQuantity}), 保管人: ${fromKeeperId}`);
          }
        }
      }
    } catch (error) {
      console.error('返回设备到调出位置失败:', error);
      throw error;
    }
  }

  async withdrawOrder(id: string, withdrawnBy: string): Promise<boolean> {
    try {
      await db.execute(
        `UPDATE equipment_transfer_orders 
         SET status = 'withdrawn', 
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );
      
      return true;
    } catch (error) {
      console.error('撤回调拨单失败:', error);
      return false;
    }
  }

  async getById(id: string): Promise<TransferOrder | null> {
    try {
      const order = await db.queryOne<any>(
        `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
        [id]
      );
      
      if (!order) {
        return null;
      }
      
      // 获取调拨单项目
      const items = await db.query<any>(
        `SELECT * FROM equipment_transfer_order_items WHERE order_id = ?`,
        [id]
      );
      
      // 为仪器类设备获取配件清单
      for (const item of items) {
        if (item.category === 'instrument' && item.equipment_id) {
          const accessories = await db.query<any>(
            `SELECT 
              ea.id,
              ea.host_equipment_id,
              ea.accessory_id,
              ea.accessory_name,
              ea.accessory_model,
              ea.accessory_category,
              ea.quantity as accessory_quantity,
              ea.is_required,
              ea.notes as accessory_notes,
              eai.serial_number,
              eai.manage_code as accessory_manage_code,
              eai.health_status as accessory_health_status,
              eai.usage_status as accessory_usage_status
            FROM equipment_accessories ea
            LEFT JOIN equipment_accessory_instances eai ON ea.accessory_id = eai.id
            WHERE ea.host_equipment_id = ?`,
            [item.equipment_id]
          );
          item.accessories = accessories || [];
        } else {
          item.accessories = [];
        }
      }
      
      return {
        ...order,
        items: items || []
      };
    } catch (error) {
      console.error('获取调拨单详情失败:', error);
      return null;
    }
  }

  async getAll(options: {
    page?: number;
    pageSize?: number;
    status?: TransferOrderStatus;
    applicantId?: string;
    fromLocationType?: string;
    toLocationType?: string;
    keyword?: string;
  } = {}): Promise<{ data: TransferOrder[]; total: number }> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        applicantId,
        fromLocationType,
        toLocationType,
        keyword
      } = options;
      
      const offset = (page - 1) * pageSize;
      const whereConditions: string[] = [];
      const params: any[] = [];
      
      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }
      
      if (applicantId) {
        whereConditions.push('applicant_id = ?');
        params.push(applicantId);
      }
      
      if (fromLocationType) {
        whereConditions.push('from_location_type = ?');
        params.push(fromLocationType);
      }
      
      if (toLocationType) {
        whereConditions.push('to_location_type = ?');
        params.push(toLocationType);
      }
      
      if (keyword) {
        whereConditions.push('(order_no LIKE ? OR transfer_reason LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 获取总数
      const totalResult = await db.queryOne<any>(
        `SELECT COUNT(*) as total FROM equipment_transfer_orders ${whereClause}`,
        params
      );
      const total = totalResult?.total || 0;
      
      // 获取分页数据
      const orders = await db.query<any>(
        `SELECT * FROM equipment_transfer_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      // 获取每个订单的项目
      for (const order of orders) {
        const items = await db.query<any>(
          `SELECT * FROM equipment_transfer_order_items WHERE order_id = ?`,
          [order.id]
        );
        order.items = items || [];
      }
      
      return {
        data: orders || [],
        total
      };
    } catch (error) {
      console.error('获取调拨单列表失败:', error);
      return {
        data: [],
        total: 0
      };
    }
  }

  private convertDtoToDbFormat(dto: any): any {
    // 获取位置类型
    const fromLocationType = dto.from_location_type || dto.fromLocationType;
    const toLocationType = dto.to_location_type || dto.toLocationType;
    
    // 根据位置类型确定位置ID
    let fromWarehouseId = null;
    let fromProjectId = null;
    let toWarehouseId = null;
    let toProjectId = null;
    
    // 处理调出位置
    if (fromLocationType === 'warehouse') {
      fromWarehouseId = dto.from_warehouse_id || dto.fromWarehouseId || dto.fromLocationId || null;
    } else if (fromLocationType === 'project') {
      fromProjectId = dto.from_project_id || dto.fromProjectId || dto.fromLocationId || null;
    }
    
    // 处理调入位置
    if (toLocationType === 'warehouse') {
      toWarehouseId = dto.to_warehouse_id || dto.toWarehouseId || dto.toLocationId || null;
    } else if (toLocationType === 'project') {
      toProjectId = dto.to_project_id || dto.toProjectId || dto.toLocationId || null;
    }
    
    const converted: any = {
      from_location_type: fromLocationType,
      from_warehouse_id: fromWarehouseId,
      from_project_id: fromProjectId,
      to_location_type: toLocationType,
      to_warehouse_id: toWarehouseId,
      to_project_id: toProjectId,
      transfer_reason: dto.transfer_reason || dto.transferReason || null,
      estimated_arrival_date: dto.estimated_arrival_date || dto.estimatedArrivalDate ?
        new Date(dto.estimated_arrival_date || dto.estimatedArrivalDate).toISOString().slice(0, 10) : null,
      estimated_ship_date: dto.estimated_ship_date || dto.estimatedShipDate ?
        new Date(dto.estimated_ship_date || dto.estimatedShipDate).toISOString().slice(0, 10) : null,
      items: dto.items || []
    };
    
    console.log('[TransferOrderService] convertDtoToDbFormat input:', JSON.stringify(dto));
    console.log('[TransferOrderService] convertDtoToDbFormat output:', JSON.stringify(converted));
    
    return converted;
  }

  private generateOrderNo(): string {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DB${dateStr}${randomStr}`;
  }

  /**
   * 从运输中状态转移到目标位置
   */
  private async updateEquipmentLocationFromTransferring(connection: any, transferOrderId: string): Promise<void> {
    try {
        // 获取调拨单信息
        const [orderRows] = await connection.query<any>(
          `SELECT * FROM equipment_transfer_orders WHERE id = ?`,
          [transferOrderId]
        );
        const order = orderRows && orderRows.length > 0 ? orderRows[0] : null;
      
      if (!order) {
        return;
      }
      
      // 获取调拨单项目
      const [itemRows] = await connection.query<any>(
        `SELECT * FROM equipment_transfer_order_items WHERE order_id = ?`,
        [transferOrderId]
      );
      const items = itemRows || [];
      
      if (items.length === 0) {
        return;
      }
      
      // 确定目标位置信息
      let toLocationId = null;
      let toLocationType = null;
      let toKeeperId = null;
      
      if (order.to_location_type === 'warehouse') {
        toLocationId = order.to_warehouse_id;
        toLocationType = 'warehouse';
        const [warehouseRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [toLocationId]
        );
        if (warehouseRows && warehouseRows.length > 0) {
          toKeeperId = warehouseRows[0].manager_id;
        }
      } else {
        toLocationId = order.to_project_id;
        toLocationType = 'project';
        const [projectRows] = await connection.query<{ manager_id: string }>(
          'SELECT manager_id FROM projects WHERE id = ?',
          [toLocationId]
        );
        if (projectRows && projectRows.length > 0) {
          toKeeperId = projectRows[0].manager_id;
        }
      }
      
      // 更新设备实例的位置
      for (const item of items) {
        console.log(`[TransferOrderService] 处理设备: ${item.equipment_name} ${item.model_no}, 类别: ${item.category}, equipment_id: ${item.equipment_id}`);
        
        if (item.equipment_id) {
          // 仪器类：有 equipment_id
          const [equipmentRows] = await connection.query<any>(
            `SELECT * FROM equipment_instances WHERE id = ?`,
            [item.equipment_id]
          );
          const equipment = equipmentRows && equipmentRows.length > 0 ? equipmentRows[0] : null;
        
          if (!equipment) continue;
        
          console.log(`[TransferOrderService] 处理设备: ${equipment.equipment_name} ${equipment.model_no}, 类别: ${equipment.category}, 数量: ${item.quantity}`);
        
          // 直接更新设备位置和状态
          await connection.execute(
            `UPDATE equipment_instances 
             SET location_id = ?, 
                 location_status = ?,
                 usage_status = ?,
                 keeper_id = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [toLocationId, toLocationType === 'warehouse' ? 'warehouse' : 'in_project', toLocationType === 'warehouse' ? 'idle' : 'in_use', toKeeperId, item.equipment_id]
          );
          console.log(`[TransferOrderService] 仪器类设备位置已更新: ${item.equipment_id} -> ${toLocationType}:${toLocationId}, 保管人: ${toKeeperId}`);
        } else {
          // 假负载/线缆类：按数量管理，需要处理数量合并
          const transferQuantity = item.quantity || 1;
          
          // 1. 查找运输中的设备记录
          const [transferringEquipmentRows] = await connection.query<any>(
            `SELECT ei.* 
             FROM equipment_instances ei
             JOIN equipment_models em ON ei.model_id = em.id
             WHERE ei.location_status = 'transferring' 
               AND em.category = ? 
               AND em.name = ? 
               AND em.model_no = ?`,
            [item.category, item.equipment_name, item.model_no]
          );
          const transferringEquipment = transferringEquipmentRows && transferringEquipmentRows.length > 0 ? transferringEquipmentRows[0] : null;
          
          if (!transferringEquipment) {
            console.error(`[TransferOrderService] 未找到运输中的设备记录: ${item.equipment_name} ${item.model_no}`);
            continue;
          }
          
          // 2. 删除运输中的设备记录
          await connection.execute(
            'DELETE FROM equipment_instances WHERE id = ?',
            [transferringEquipment.id]
          );
          console.log(`[TransferOrderService] 运输中设备记录已删除: ${transferringEquipment.id}`);
          
          // 3. 检查目标位置是否已存在相同设备
             const [existingEquipmentRows] = await connection.query<{ id: string; quantity: number }>(
               `SELECT id, quantity 
                FROM equipment_instances 
                WHERE location_id = ? 
                  AND category = ? AND equipment_name = ? AND model_no = ?`,
               [toLocationId, item.category, item.equipment_name, item.model_no]
             );
             const existingEquipment = existingEquipmentRows && existingEquipmentRows.length > 0 ? existingEquipmentRows[0] : null;
          
          if (existingEquipment) {
            // 4. 存在相同设备，更新数量（合并）
            await connection.execute(
              `UPDATE equipment_instances 
               SET quantity = quantity + ?, 
                   usage_status = ?,
                   keeper_id = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [transferQuantity, toLocationType === 'warehouse' ? 'idle' : 'in_use', toKeeperId, existingEquipment.id]
            );
            console.log(`[TransferOrderService] 目标位置数量已合并: ${existingEquipment.id} (+${transferQuantity}), 保管人: ${toKeeperId}`);
          } else {
            // 5. 不存在相同设备，创建新记录
            const newEquipmentId = uuidv4();
            await connection.execute(
              `INSERT INTO equipment_instances 
              (id, model_id, quantity, serial_number, manage_code, 
               health_status, usage_status, location_status, location_id, keeper_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newEquipmentId,
                transferringEquipment.model_id,
                transferQuantity,
                null,
                transferringEquipment.manage_code ? transferringEquipment.manage_code.replace('-transferring', '') + '-' + uuidv4().substring(0, 8) : `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                transferringEquipment.health_status,
                toLocationType === 'warehouse' ? 'idle' : 'in_use',
                toLocationType === 'warehouse' ? 'warehouse' : 'in_project',
                toLocationId,
                toKeeperId
              ]
            );
            console.log(`[TransferOrderService] 目标位置已创建新记录: ${newEquipmentId} (数量: ${transferQuantity}), 保管人: ${toKeeperId}`);
          }
        }
      }
    } catch (error) {
      console.error('更新设备位置失败:', error);
      throw error;
    }
  }
}