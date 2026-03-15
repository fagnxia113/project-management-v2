import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection.js';

export interface AccessoryInstance {
  id: string;
  accessory_name: string;
  model_no?: string;
  brand?: string;
  category: 'instrument' | 'fake_load' | 'cable';
  unit: string;
  quantity: number;
  serial_number?: string;
  manage_code?: string;
  status: 'normal' | 'lost' | 'damaged';
  health_status: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped';
  usage_status: 'idle' | 'in_use';
  location_status: 'warehouse' | 'in_project' | 'repairing' | 'transferring';
  location_id?: string;
  host_equipment_id?: string;
  keeper_id?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  source_type?: string;
  bound_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AccessoryRelation {
  id: string;
  host_equipment_id: string;
  accessory_id: string;
  accessory_name?: string;
  accessory_model?: string;
  accessory_category?: 'instrument' | 'fake_load' | 'cable';
  quantity: number;
  is_required: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccessoryDto {
  accessory_name: string;
  model_no?: string;
  brand?: string;
  category: 'instrument' | 'fake_load' | 'cable';
  unit?: string;
  quantity?: number;
  serial_number?: string;
  manage_code?: string;
  host_equipment_id?: string;
  keeper_id?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  source_type?: 'inbound_bundle' | 'inbound_separate';
  status?: 'normal' | 'lost' | 'damaged';
  health_status?: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped';
  usage_status?: 'idle' | 'in_use';
  location_status?: 'warehouse' | 'in_project' | 'repairing' | 'transferring';
  location_id?: string;
}

export interface CreateAccessoryRelationDto {
  host_equipment_id: string;
  accessory_id: string;
  quantity?: number;
  is_required?: boolean;
  notes?: string;
}

export class EquipmentAccessoryService {

  async createAccessoryInstance(dto: CreateAccessoryDto): Promise<AccessoryInstance> {
    const id = uuidv4();
    
    // 如果是序列化追踪但没有提供管理编码，自动生成一个
    const manageCode = dto.manage_code || `ACC${Date.now()}${Math.floor(Math.random() * 10000)}`;
    
    await db.execute(
      `INSERT INTO equipment_accessory_instances (
        id, accessory_name, model_no, brand, category, unit, quantity,
        serial_number, manage_code, health_status, usage_status, location_status,
        location_id, host_equipment_id, keeper_id, purchase_date, purchase_price, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.accessory_name,
        dto.model_no || null,
        dto.brand || null,
        dto.category,
        dto.unit || '个',
        dto.quantity || 1,
        dto.serial_number || null,
        manageCode,
        dto.health_status || 'normal',
        dto.usage_status || 'idle',
        dto.location_status || 'warehouse',
        dto.location_id || null,
        dto.host_equipment_id || null,
        dto.keeper_id || null,
        dto.purchase_date || null,
        dto.purchase_price || null,
        dto.notes || null
      ]
    );

    if (dto.host_equipment_id) {
      await this.updateHostEquipmentAccessoryCount(dto.host_equipment_id);
    }

    return this.getAccessoryById(id) as Promise<AccessoryInstance>;
  }

  async createAccessoryRelation(dto: CreateAccessoryRelationDto): Promise<AccessoryRelation> {
    const id = uuidv4();
    const accessory = await this.getAccessoryById(dto.accessory_id);
    
    if (!accessory) {
      throw new Error('附件不存在');
    }

    await db.execute(
      `INSERT INTO equipment_accessories (
        id, host_equipment_id, accessory_id, accessory_name, accessory_model, accessory_category,
        quantity, is_required, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.host_equipment_id,
        dto.accessory_id,
        accessory.accessory_name,
        accessory.model_no,
        accessory.category,
        dto.quantity || 1,
        dto.is_required || false,
        dto.notes || null
      ]
    );

    await this.updateHostEquipmentAccessoryCount(dto.host_equipment_id);

    return this.getRelationById(id) as Promise<AccessoryRelation>;
  }

  async getAccessoryById(id: string): Promise<AccessoryInstance | null> {
    const rows = await db.query(
      `SELECT ai.*, 
        w.name as location_name,
        e.name as keeper_name,
        eq.equipment_name as host_equipment_name
       FROM equipment_accessory_instances ai
       LEFT JOIN warehouses w ON ai.location_id = w.id
       LEFT JOIN employees e ON ai.keeper_id = e.id
       LEFT JOIN equipment_instances eq ON ai.host_equipment_id = eq.id
       WHERE ai.id = ?`,
      [id]
    );
    
    if (!rows || rows.length === 0) {
      return null;
    }
    
    const accessory = rows[0];
    
    // 查询关联的图片
    const images = await db.query(
      `SELECT image_url FROM equipment_images 
       WHERE equipment_id = ? AND image_type = 'accessory'
       ORDER BY created_at ASC`,
      [id]
    );
    
    if (images && images.length > 0) {
      accessory.accessory_images = images.map((img: any) => img.image_url);
      accessory.images = images.map((img: any) => img.image_url);
    }
    
    return accessory;
  }

  async getRelationById(id: string): Promise<AccessoryRelation | null> {
    const rows = await db.query(
      'SELECT * FROM equipment_accessories WHERE id = ?',
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async getAccessoriesByHost(hostEquipmentId: string): Promise<AccessoryInstance[]> {
    const rows = await db.query(
      `SELECT ai.* FROM equipment_accessory_instances ai
       INNER JOIN equipment_accessories ea ON ai.id = ea.accessory_id
       WHERE ea.host_equipment_id = ?
       ORDER BY ai.created_at DESC`,
      [hostEquipmentId]
    );
    return rows;
  }

  async getRelationsByHost(hostEquipmentId: string): Promise<AccessoryRelation[]> {
    const rows = await db.query(
      'SELECT * FROM equipment_accessories WHERE host_equipment_id = ? ORDER BY created_at DESC',
      [hostEquipmentId]
    );
    return rows;
  }

  async getAccessoriesWithDetails(hostEquipmentId: string): Promise<any[]> {
    const rows = await db.query(
      `SELECT 
        ai.id,
        ai.accessory_name,
        ai.model_no as accessory_model,
        ai.category as accessory_category,
        ai.serial_number,
        ai.manage_code as accessory_manage_code,
        ai.health_status as accessory_health_status,
        ai.usage_status as accessory_usage_status,
        ea.quantity as accessory_quantity,
        ea.is_required,
        ea.notes as accessory_notes
       FROM equipment_accessory_instances ai
       INNER JOIN equipment_accessories ea ON ai.id = ea.accessory_id
       WHERE ea.host_equipment_id = ?
       ORDER BY ai.created_at DESC`,
      [hostEquipmentId]
    );
    return rows;
  }

  async updateAccessoryInstance(id: string, updates: Partial<CreateAccessoryDto>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.accessory_name !== undefined) {
      fields.push('accessory_name = ?');
      values.push(updates.accessory_name);
    }
    if (updates.model_no !== undefined) {
      fields.push('model_no = ?');
      values.push(updates.model_no);
    }
    if (updates.brand !== undefined) {
      fields.push('brand = ?');
      values.push(updates.brand);
    }
    if (updates.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.serial_number !== undefined) {
      fields.push('serial_number = ?');
      values.push(updates.serial_number);
    }
    if (updates.manage_code !== undefined) {
      fields.push('manage_code = ?');
      values.push(updates.manage_code);
    }
    if (updates.health_status !== undefined) {
      fields.push('health_status = ?');
      values.push(updates.health_status);
    }
    if (updates.usage_status !== undefined) {
      fields.push('usage_status = ?');
      values.push(updates.usage_status);
    }
    if (updates.location_status !== undefined) {
      fields.push('location_status = ?');
      values.push(updates.location_status);
    }
    if (updates.location_id !== undefined) {
      fields.push('location_id = ?');
      values.push(updates.location_id);
    }
    if (updates.host_equipment_id !== undefined) {
      fields.push('host_equipment_id = ?');
      values.push(updates.host_equipment_id);
    }
    if (updates.keeper_id !== undefined) {
      fields.push('keeper_id = ?');
      values.push(updates.keeper_id);
    }
    if (updates.purchase_date !== undefined) {
      fields.push('purchase_date = ?');
      values.push(updates.purchase_date);
    }
    if (updates.purchase_price !== undefined) {
      fields.push('purchase_price = ?');
      values.push(updates.purchase_price);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await db.execute(
      `UPDATE equipment_accessory_instances SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return true;
  }

  async updateAccessoryRelation(id: string, updates: Partial<CreateAccessoryRelationDto>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.is_required !== undefined) {
      fields.push('is_required = ?');
      values.push(updates.is_required);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await db.execute(
      `UPDATE equipment_accessories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return true;
  }

  async deleteAccessoryInstance(id: string): Promise<boolean> {
    const accessory = await this.getAccessoryById(id);
    if (!accessory) {
      return false;
    }

    const hostId = accessory.host_equipment_id;

    await db.execute('DELETE FROM equipment_accessories WHERE accessory_id = ?', [id]);
    await db.execute('DELETE FROM equipment_accessory_instances WHERE id = ?', [id]);

    if (hostId) {
      await this.updateHostEquipmentAccessoryCount(hostId);
    }

    return true;
  }

  async deleteAccessoryRelation(id: string): Promise<boolean> {
    const relation = await this.getRelationById(id);
    if (!relation) {
      return false;
    }

    await db.execute('DELETE FROM equipment_accessories WHERE id = ?', [id]);
    await this.updateHostEquipmentAccessoryCount(relation.host_equipment_id);

    return true;
  }

  async deleteAllAccessoriesByHost(hostEquipmentId: string): Promise<boolean> {
    await db.execute('DELETE FROM equipment_accessories WHERE host_equipment_id = ?', [hostEquipmentId]);
    await this.updateHostEquipmentAccessoryCount(hostEquipmentId);
    return true;
  }

  async updateHostEquipmentAccessoryCount(hostEquipmentId: string): Promise<void> {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM equipment_accessories WHERE host_equipment_id = ?',
      [hostEquipmentId]
    );
    const count = rows && rows.length > 0 ? rows[0].count : 0;

    await db.execute(
      `UPDATE equipment_instances 
       SET has_accessories = ?, accessory_count = ? 
       WHERE id = ?`,
      [count > 0, count, hostEquipmentId]
    );
  }

  async syncAccessoryLocationWithHost(hostEquipmentId: string, locationStatus: string, locationId?: string): Promise<void> {
    const accessories = await this.getAccessoriesByHost(hostEquipmentId);
    
    for (const accessory of accessories) {
      await this.updateAccessoryInstance(accessory.id, {
        location_status: locationStatus as any,
        location_id: locationId
      });
    }
  }

  async getAccessoryStatistics(hostEquipmentId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byHealthStatus: Record<string, number>;
  }> {
    const accessories = await this.getAccessoriesWithDetails(hostEquipmentId);
    
    const stats = {
      total: accessories.length,
      byCategory: {} as Record<string, number>,
      byHealthStatus: {} as Record<string, number>
    };

    for (const accessory of accessories) {
      stats.byCategory[accessory.category] = (stats.byCategory[accessory.category] || 0) + 1;
      stats.byHealthStatus[accessory.health_status] = (stats.byHealthStatus[accessory.health_status] || 0) + 1;
    }

    return stats;
  }

  async bindAccessoryToEquipment(
    accessoryId: string, 
    hostEquipmentId: string, 
    quantity: number = 1
  ): Promise<boolean> {
    const accessory = await this.getAccessoryById(accessoryId);
    if (!accessory) {
      throw new Error('配件不存在');
    }

    const existingRelation = await db.query(
      'SELECT * FROM equipment_accessories WHERE host_equipment_id = ? AND accessory_id = ?',
      [hostEquipmentId, accessoryId]
    );

    if (existingRelation && existingRelation.length > 0) {
      await db.execute(
        'UPDATE equipment_accessories SET quantity = quantity + ? WHERE host_equipment_id = ? AND accessory_id = ?',
        [quantity, hostEquipmentId, accessoryId]
      );
    } else {
      const relationId = uuidv4();
      await db.execute(
        `INSERT INTO equipment_accessories (
          id, host_equipment_id, accessory_id, accessory_name, accessory_model, accessory_category,
          quantity, is_required, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          relationId,
          hostEquipmentId,
          accessoryId,
          accessory.accessory_name,
          accessory.model_no,
          accessory.category,
          quantity,
          false,
          null
        ]
      );
    }

    await db.execute(
      `UPDATE equipment_accessory_instances 
       SET host_equipment_id = ?, usage_status = 'in_use'
       WHERE id = ?`,
      [hostEquipmentId, accessoryId]
    );

    await this.updateHostEquipmentAccessoryCount(hostEquipmentId);
    return true;
  }

  async unbindAccessoryFromEquipment(
    accessoryId: string, 
    hostEquipmentId: string,
    unbindQuantity: number = 1
  ): Promise<boolean> {
    const relation = await db.query(
      'SELECT * FROM equipment_accessories WHERE host_equipment_id = ? AND accessory_id = ?',
      [hostEquipmentId, accessoryId]
    );

    if (!relation || relation.length === 0) {
      throw new Error('配件关联关系不存在');
    }

    const currentQty = relation[0].quantity;
    if (currentQty > unbindQuantity) {
      await db.execute(
        'UPDATE equipment_accessories SET quantity = quantity - ? WHERE host_equipment_id = ? AND accessory_id = ?',
        [unbindQuantity, hostEquipmentId, accessoryId]
      );
    } else {
      await db.execute(
        'DELETE FROM equipment_accessories WHERE host_equipment_id = ? AND accessory_id = ?',
        [hostEquipmentId, accessoryId]
      );
    }

    const remainingRelations = await db.query(
      'SELECT COUNT(*) as count FROM equipment_accessories WHERE accessory_id = ?',
      [accessoryId]
    );

    if (remainingRelations[0].count === 0) {
      await db.execute(
        `UPDATE equipment_accessory_instances 
         SET host_equipment_id = NULL, usage_status = 'idle'
         WHERE id = ?`,
        [accessoryId]
      );
    }

    await this.updateHostEquipmentAccessoryCount(hostEquipmentId);
    return true;
  }

  async markAccessoryLost(
    accessoryId: string,
    operatorId: string,
    operatorName: string,
    reason?: string,
    equipmentId?: string,
    transferOrderId?: string
  ): Promise<boolean> {
    const accessory = await this.getAccessoryById(accessoryId);
    if (!accessory) {
      throw new Error('配件不存在');
    }

    await db.execute(
      `UPDATE equipment_accessory_instances SET usage_status = 'idle', health_status = 'scrapped' WHERE id = ?`,
      [accessoryId]
    );

    const recordId = uuidv4();
    await db.execute(
      `INSERT INTO equipment_accessory_lost_records (
        id, accessory_id, equipment_id, transfer_order_id, lost_at, lost_by, lost_by_name, lost_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'lost')`,
      [
        recordId,
        accessoryId,
        equipmentId || null,
        transferOrderId || null,
        new Date(),
        operatorId,
        operatorName,
        reason || null
      ]
    );

    return true;
  }

  async recoverAccessory(
    accessoryId: string,
    operatorId: string,
    operatorName: string,
    notes?: string
  ): Promise<boolean> {
    const accessory = await this.getAccessoryById(accessoryId);
    if (!accessory) {
      throw new Error('配件不存在');
    }

    await db.execute(
      `UPDATE equipment_accessory_instances SET health_status = 'normal' WHERE id = ?`,
      [accessoryId]
    );

    await db.execute(
      `UPDATE equipment_accessory_lost_records 
       SET status = 'found', found_at = NOW(), found_by = ?, found_by_name = ?, notes = ?
       WHERE accessory_id = ? AND status = 'lost'`,
      [operatorId, operatorName, notes || null, accessoryId]
    );

    return true;
  }

  async getUnboundAccessories(options?: {
    category?: string;
    status?: string;
    keyword?: string;
  }): Promise<AccessoryInstance[]> {
    let sql = 'SELECT * FROM equipment_accessory_instances WHERE host_equipment_id IS NULL';
    const params: any[] = [];

    if (options?.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.keyword) {
      sql += ' AND (accessory_name LIKE ? OR model_no LIKE ? OR manage_code LIKE ?)';
      const kw = `%${options.keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await db.query(sql, params);
    return rows;
  }

  async getAllAccessories(options?: {
    category?: string;
    status?: string;
    location_status?: string;
    bound?: boolean;
    keyword?: string;
    location_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: AccessoryInstance[]; total: number }> {
    let whereClause = '1=1';
    const params: any[] = [];

    if (options?.category) {
      whereClause += ' AND category = ?';
      params.push(options.category);
    }

    if (options?.status) {
      whereClause += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.location_status) {
      whereClause += ' AND location_status = ?';
      params.push(options.location_status);
    }

    if (options?.location_id) {
      whereClause += ' AND location_id = ?';
      params.push(options.location_id);
    }

    if (options?.bound !== undefined) {
      if (options.bound) {
        whereClause += ' AND host_equipment_id IS NOT NULL';
      } else {
        whereClause += ' AND host_equipment_id IS NULL';
      }
    }

    if (options?.keyword) {
      whereClause += ' AND (accessory_name LIKE ? OR model_no LIKE ? OR manage_code LIKE ?)';
      const kw = `%${options.keyword}%`;
      params.push(kw, kw, kw);
    }

    const countSql = `SELECT COUNT(*) as total FROM equipment_accessory_instances WHERE ${whereClause}`;
    const countResult = await db.query<any>(countSql, params);
    const total = countResult[0]?.total || 0;

    let querySql = `SELECT ai.*, 
      w.name as location_name,
      e.name as keeper_name,
      eq.equipment_name as host_equipment_name
     FROM equipment_accessory_instances ai
     LEFT JOIN warehouses w ON ai.location_id = w.id
     LEFT JOIN employees e ON ai.keeper_id = e.id
     LEFT JOIN equipment_instances eq ON ai.host_equipment_id = eq.id
     WHERE ${whereClause}`;
    
    querySql += ' ORDER BY ai.created_at DESC';
    
    if (options?.page && options?.pageSize) {
      querySql += ` LIMIT ${(options.page - 1) * options.pageSize}, ${options.pageSize}`;
    }

    const rows = await db.query(querySql, params);
    
    // 批量查询所有配件的图片
    if (rows && rows.length > 0) {
      const accessoryIds = rows.map((r: any) => r.id);
      const imagesResult = await db.query(
        `SELECT equipment_id, image_url FROM equipment_images 
         WHERE equipment_id IN (?) AND image_type = 'accessory'
         ORDER BY created_at ASC`,
        [accessoryIds]
      );
      
      // 按配件ID分组图片
      const imagesMap: Record<string, string[]> = {};
      if (imagesResult && imagesResult.length > 0) {
        for (const img of imagesResult) {
          if (!imagesMap[img.equipment_id]) {
            imagesMap[img.equipment_id] = [];
          }
          imagesMap[img.equipment_id].push(img.image_url);
        }
      }
      
      // 合并图片到配件数据
      for (const row of rows) {
        row.accessory_images = imagesMap[row.id] || [];
        row.images = imagesMap[row.id] || [];
      }
    }

    return { list: rows, total };
  }

  async getLostRecords(accessoryId?: string): Promise<any[]> {
    let sql = 'SELECT * FROM equipment_accessory_lost_records';
    const params: any[] = [];

    if (accessoryId) {
      sql += ' WHERE accessory_id = ?';
      params.push(accessoryId);
    }

    sql += ' ORDER BY lost_at DESC';

    const rows = await db.query(sql, params);
    return rows;
  }
}

export const equipmentAccessoryService = new EquipmentAccessoryService();
