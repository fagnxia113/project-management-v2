import { db } from '../database/connection.js';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * 设备服务 V3
 * 支持双轨制库存模型：序列化追踪和批次追踪
 */
export class EquipmentServiceV3 {
  /**
   * 获取设备实例列表
   */
  async getInstances(params: {
    page?: number;
    pageSize?: number;
    category?: string;
    status?: string;
    location_id?: string;
    locationId?: string; // 支持兼容性
    trackingType?: 'SERIALIZED' | 'BATCH';
    search?: string;
    location_status?: string;
    health_status?: string;
    usage_status?: string;
    equipment_source?: string;
  } = {}) {
    const {
      page = 1,
      pageSize = 10,
      category,
      status,
      location_id,
      locationId,
      trackingType,
      search,
      location_status,
      health_status,
      usage_status,
      equipment_source
    } = params;
    
    const finalLocationId = location_id || locationId;

    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];

    // 排除报废的设备（使用数据库实际值，通常是小写）
    whereClause += " AND (ei.health_status IS NULL OR ei.health_status != 'scrapped')";
    whereClause += " AND (ei.usage_status IS NULL OR (ei.usage_status != 'scrapped' AND ei.usage_status != 'lost'))";

    if (category) {
      whereClause += ' AND ei.category = ?';
      values.push(category);
    }

    if (status) {
      whereClause += ' AND ei.health_status = ?';
      values.push(status);
    }

    if (finalLocationId) {
      whereClause += ' AND ei.location_id = ?';
      values.push(finalLocationId);
    }

    if (trackingType) {
      whereClause += ' AND ei.tracking_type = ?';
      values.push(trackingType);
    }

    if (search) {
      whereClause += ' AND (ei.equipment_name LIKE ? OR ei.model_no LIKE ? OR ei.manage_code LIKE ?)';
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (location_status) {
      whereClause += ' AND ei.location_status = ?';
      values.push(location_status);
    }

    if (health_status) {
      whereClause += ' AND ei.health_status = ?';
      values.push(health_status);
    }

    if (usage_status) {
      whereClause += ' AND ei.usage_status = ?';
      values.push(usage_status);
    }

    const totalResult = await db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM equipment_instances ei ${whereClause}`,
      values
    );

    const total = totalResult?.total || 0;

    const instances = await db.query<any>(
      `SELECT ei.*, 
        w.name as location_name,
        e.name as keeper_name
       FROM equipment_instances ei
       LEFT JOIN warehouses w ON ei.location_id = w.id
       LEFT JOIN employees e ON ei.keeper_id = e.id
       ${whereClause} 
       ORDER BY ei.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    // 为每个设备获取配件和图片信息
    if (instances && instances.length > 0) {
      const instanceIds = instances.map(i => i.id);
      
      // 批量获取图片
      const imagesResult = await db.query<any>(
        `SELECT equipment_id, image_url FROM equipment_images 
         WHERE equipment_id IN (?) AND image_type = 'main'`,
        [instanceIds]
      );
      
      const imagesMap: Record<string, string> = {};
      if (imagesResult && imagesResult.length > 0) {
        for (const img of imagesResult) {
          imagesMap[img.equipment_id] = img.image_url;
        }
      }

      for (const instance of instances) {
        // 配件
        const accessories = await db.query<any>(
          `SELECT * FROM equipment_accessory_instances 
           WHERE host_equipment_id = ?`,
          [instance.id]
        );
        instance.accessories = accessories;
        // 图片
        instance.main_image = imagesMap[instance.id] || null;
      }
    }

    return {
      total,
      page,
      pageSize,
      data: instances
    };
  }

  /**
   * 获取设备实例详情
   */
  async getInstanceById(id: string) {
    const instance = await db.queryOne<any>(
      'SELECT * FROM equipment_instances WHERE id = ?',
      [id]
    );

    if (!instance) {
      throw new Error('设备不存在');
    }

    // 获取关联的配件
    const accessories = await db.query<any>(
      'SELECT * FROM equipment_accessory_instances WHERE host_equipment_id = ?',
      [id]
    );

    return {
      ...instance,
      accessories
    };
  }

  /**
   * 创建设备实例
   */
  async createInstance(data: {
    equipment_name: string;
    model_no: string;
    brand?: string;
    manufacturer?: string;
    technical_params?: string;
    category: 'instrument' | 'fake_load' | 'cable';
    tracking_type: 'SERIALIZED' | 'BATCH';
    quantity: number;
    serial_number?: string;
    manage_code?: string;
    unit?: string;
    location_id?: string;
    location_status?: 'warehouse' | 'in_project' | 'repairing' | 'transferring';
    health_status?: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped';
    usage_status?: 'idle' | 'in_use' | 'lost' | 'scrapped';
    keeper_id?: string;
    purchase_date?: string | Date;
    purchase_price?: number | string;
    calibration_expiry?: string | Date;
    certificate_no?: string;
    certificate_issuer?: string;
    attachments?: any[];
  }) {
    const { tracking_type, serial_number, quantity } = data;

    const id = uuidv4();
    // 业务逻辑：假负载不自动生成管理编码，其余类型如果没传则生成
    let manageCode = data.manage_code;
    if (!manageCode && data.category !== 'fake_load') {
      manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 10000)}`;
    }

    // 强化业务规则：假负载强制 BATCH
    const finalTrackingType = data.category === 'fake_load' ? 'BATCH' : tracking_type;

    await db.insert(
      `INSERT INTO equipment_instances 
       (id, equipment_name, model_no, brand, manufacturer, technical_params, category, tracking_type, 
        quantity, serial_number, unit, location_id, location_status, health_status, usage_status, keeper_id, 
        purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, manage_code, 
        attachments, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.equipment_name,
        data.model_no,
        data.brand || null,
        data.manufacturer || null,
        data.technical_params || null,
        data.category,
        finalTrackingType,
        quantity,
        serial_number || null,
        data.unit || '台',
        data.location_id || null,
        data.location_status || 'warehouse',
        data.health_status || 'normal',
        data.usage_status || 'idle',
        data.keeper_id || null,
        data.purchase_date || null,
        data.purchase_price || null,
        data.calibration_expiry || null,
        data.certificate_no || null,
        data.certificate_issuer || null,
        manageCode || null,
        data.attachments ? JSON.stringify(data.attachments) : null,
        1
      ]
    );

    return { id, manage_code: manageCode };
  }

  /**
   * 更新设备实例（乐观锁）
   */
  async updateInstance(id: string, data: any, version: number) {
    const existing = await db.queryOne<any>(
      'SELECT version FROM equipment_instances WHERE id = ?',
      [id]
    );

    if (!existing) {
      throw new Error('设备不存在');
    }

    if (existing.version !== version) {
      throw new Error('数据已被其他用户修改，请刷新后重试');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.equipment_name !== undefined) {
      fields.push('equipment_name = ?');
      values.push(data.equipment_name);
    }

    if (data.model_no !== undefined) {
      fields.push('model_no = ?');
      values.push(data.model_no);
    }

    if (data.brand !== undefined) {
      fields.push('brand = ?');
      values.push(data.brand);
    }

    if (data.manufacturer !== undefined) {
      fields.push('manufacturer = ?');
      values.push(data.manufacturer);
    }

    if (data.technical_params !== undefined) {
      fields.push('technical_params = ?');
      values.push(data.technical_params);
    }

    if (data.serial_number !== undefined) {
      fields.push('serial_number = ?');
      values.push(data.serial_number);
    }

    if (data.unit !== undefined) {
      fields.push('unit = ?');
      values.push(data.unit);
    }

    if (data.keeper_id !== undefined) {
      fields.push('keeper_id = ?');
      values.push(data.keeper_id);
    }

    if (data.purchase_date !== undefined) {
      fields.push('purchase_date = ?');
      values.push(data.purchase_date);
    }

    if (data.purchase_price !== undefined) {
      fields.push('purchase_price = ?');
      values.push(data.purchase_price);
    }

    if (data.calibration_expiry !== undefined) {
      fields.push('calibration_expiry = ?');
      values.push(data.calibration_expiry);
    }

    if (data.certificate_no !== undefined) {
      fields.push('certificate_no = ?');
      values.push(data.certificate_no);
    }

    if (data.certificate_issuer !== undefined) {
      fields.push('certificate_issuer = ?');
      values.push(data.certificate_issuer);
    }

    if (data.attachments !== undefined) {
      fields.push('attachments = ?');
      values.push(data.attachments ? JSON.stringify(data.attachments) : null);
    }

    fields.push('version = version + 1');

    if (fields.length === 1) {
      return existing;
    }

    await db.update(
      `UPDATE equipment_instances SET ${fields.join(', ')} WHERE id = ? AND version = ?`,
      [...values, id, version]
    );

    return await this.getInstanceById(id);
  }

  /**
   * 更新设备状态
   */
   async updateInstanceStatus(id: string, status: {
    health_status?: string;
    usage_status?: string;
    location_status?: string;
    location_id?: string;
    keeper_id?: string;
  }) {
    const fields: string[] = [];
    const values: any[] = [];

    if (status.health_status !== undefined) {
      fields.push('health_status = ?');
      values.push(status.health_status);
    }

    if (status.usage_status !== undefined) {
      fields.push('usage_status = ?');
      values.push(status.usage_status);
    }

    if (status.location_status !== undefined) {
      fields.push('location_status = ?');
      values.push(status.location_status);
    }

    if (status.location_id !== undefined) {
      fields.push('location_id = ?');
      values.push(status.location_id);
    }

    if (status.keeper_id !== undefined) {
      fields.push('keeper_id = ?');
      values.push(status.keeper_id);
    }

    if (fields.length === 0) {
      return await this.getInstanceById(id);
    }

    await db.update(
      `UPDATE equipment_instances SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    return await this.getInstanceById(id);
  }

  /**
   * 批量更新批次库存
   */
  async updateBatchInventory(modelId: string, locationId: string, quantity: number) {
    // 检查是否已存在该型号和位置的批次
    const existing = await db.queryOne<any>(
      `SELECT id, quantity FROM equipment_instances 
       WHERE model_no = ? AND location_id = ? AND tracking_type = 'BATCH'`,
      [modelId, locationId]
    );

    if (existing) {
      // 更新现有批次
      const newQuantity = existing.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error('库存不足');
      }

      await db.update(
        'UPDATE equipment_instances SET quantity = ? WHERE id = ?',
        [newQuantity, existing.id]
      );

      return { id: existing.id, quantity: newQuantity };
    } else if (quantity > 0) {
      // 创建新批次
      const id = uuidv4();
      const manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 10000)}`;

      await db.insert(
        `INSERT INTO equipment_instances 
         (id, equipment_name, model_no, category, tracking_type, 
          quantity, unit, location_id, manage_code, version)
         VALUES (?, ?, ?, 'cable', 'BATCH', ?, '根', ?, ?, ?)`,
        [id, `批次物资 ${modelId}`, modelId, quantity, locationId, manageCode, 1]
      );

      return { id, quantity };
    }

    throw new Error('批次不存在且数量为负数');
  }

  /**
   * 获取批次库存聚合数据
   */
  async getBatchInventory() {
    const inventory = await db.query<any>(
      `SELECT model_no, location_id, SUM(quantity) as total_quantity 
       FROM equipment_instances 
       WHERE tracking_type = 'BATCH' AND usage_status NOT IN ('SCRAPPED', 'LOST') 
       GROUP BY model_no, location_id`
    );

    return inventory;
  }

  /**
   * 获取设备统计数据
   */
  async getStatistics() {
    const [total, serialized, batch, inUse, idle] = await Promise.all([
      db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_instances WHERE usage_status NOT IN ('SCRAPPED', 'LOST')"
      ),
      db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_instances WHERE tracking_type = 'SERIALIZED' AND usage_status NOT IN ('SCRAPPED', 'LOST')"
      ),
      db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_instances WHERE tracking_type = 'BATCH' AND usage_status NOT IN ('SCRAPPED', 'LOST')"
      ),
      db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_instances WHERE usage_status = 'in_use' AND usage_status NOT IN ('SCRAPPED', 'LOST')"
      ),
      db.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_instances WHERE usage_status = 'idle' AND usage_status NOT IN ('SCRAPPED', 'LOST')"
      )
    ]);

    return {
      total: total?.count || 0,
      serialized: serialized?.count || 0,
      batch: batch?.count || 0,
      inUse: inUse?.count || 0,
      idle: idle?.count || 0
    };
  }

  /**
   * 获取设备档案（报废、遗失、维修）
   */
  async getArchives(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    const { status, page = 1, pageSize = 10 } = params;
    let whereClause = "WHERE usage_status IN ('SCRAPPED', 'LOST') OR health_status = 'REPAIRING'";
    const values: any[] = [];

    if (status) {
      if (status === 'REPAIRING') {
        whereClause = "WHERE health_status = 'REPAIRING'";
      } else {
        whereClause = `WHERE usage_status = '${status}'`;
      }
    }

    const offset = (page - 1) * pageSize;

    const totalResult = await db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM equipment_instances ${whereClause}`,
      values
    );

    const total = totalResult?.total || 0;

    const archives = await db.query<any>(
      `SELECT * FROM equipment_instances 
       ${whereClause} 
       ORDER BY updated_at DESC 
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    // 为每个设备获取配件信息
    for (const instance of archives) {
      const accessories = await db.query<any>(
        `SELECT * FROM equipment_accessories 
         WHERE host_equipment_id = ?`,
        [instance.id]
      );
      instance.accessories = accessories;
    }

    return {
      total,
      page,
      pageSize,
      data: archives
    };
  }

  async getAggregatedInstances(filters: {
    location_id?: string;
    status?: string;
    search?: string;
    category?: string;
    health_status?: string;
    usage_status?: string;
    location_status?: string;
    equipment_source?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: any[]; total: number; totalPages: number }> {
    const result = await this.getInstances(filters);
    return {
      ...result,
      totalPages: Math.ceil(result.total / (filters.pageSize || 10))
    } as any;
  }

  async getStockDistribution(equipmentName: string, modelNo: string): Promise<any[]> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];

    if (equipmentName) {
      whereClause += ' AND name = ?';
      values.push(equipmentName);
    }
    if (modelNo) {
      whereClause += ' AND model_no = ?';
      values.push(modelNo);
    }

    const results = await db.query<any>(
      `SELECT * FROM equipment_instances ${whereClause} GROUP BY name, model_no`,
      values
    );
    return results;
  }

  async getEquipmentNames(): Promise<string[]> {
    const results = await db.query<any>(
      'SELECT DISTINCT name FROM equipment_instances WHERE name IS NOT NULL AND name != "" ORDER BY name'
    );
    return results.map((r: any) => r.name);
  }

  async getModelsByName(equipmentName: string): Promise<any[]> {
    const results = await db.query<any>(
      'SELECT * FROM equipment_instances WHERE name = ? GROUP BY model_no',
      [equipmentName]
    );
    return results;
  }

  async getModelsByCategory(category: string): Promise<any[]> {
    const results = await db.query<any>(
      'SELECT * FROM equipment_instances WHERE category = ? GROUP BY model_no',
      [category]
    );
    return results;
  }

  async getAllModels(): Promise<any[]> {
    const results = await db.query<any>(
      'SELECT * FROM equipment_instances GROUP BY model_no ORDER BY name, model_no'
    );
    return results;
  }

  async getImagesByEquipmentId(equipmentId: string): Promise<any[]> {
    const results = await db.query(
      'SELECT * FROM equipment_images WHERE equipment_id = ? ORDER BY created_at DESC',
      [equipmentId]
    );
    return results;
  }
  /**
   * 获取任意位置（仓库或项目）的详情
   */
  async getLocationDetails(locationId: string): Promise<{ manager_id: string | null; type: 'warehouse' | 'in_project' | null }> {
    if (!locationId) return { manager_id: null, type: null };

    // 先查仓库
    const warehouse = await db.queryOne<{ manager_id: string }>(
      'SELECT manager_id FROM warehouses WHERE id = ?',
      [locationId]
    );
    if (warehouse) return { manager_id: warehouse.manager_id, type: 'warehouse' };

    // 再查项目
    const project = await db.queryOne<{ manager_id: string }>(
      'SELECT manager_id FROM projects WHERE id = ?',
      [locationId]
    );
    if (project) return { manager_id: project.manager_id, type: 'in_project' };

    return { manager_id: null, type: null };
  }

  /**
   * 同步特定位置的所有设备保管人
   */
  async syncKeepersByLocation(locationId: string, keeperId: string) {
    if (!locationId || !keeperId) return;

    // 更新设备
    await db.execute(
      'UPDATE equipment_instances SET keeper_id = ? WHERE location_id = ?',
      [keeperId, locationId]
    );

    // 更新配件 (直接在位置上的配件)
    await db.execute(
      'UPDATE equipment_accessory_instances SET keeper_id = ? WHERE location_id = ?',
      [keeperId, locationId]
    );
    
    // 注意：绑定在设备上的配件通常跟随设备的保管人，如果设备保管人更新了，逻辑上应该也一致
  }
}

export const equipmentServiceV3 = new EquipmentServiceV3();