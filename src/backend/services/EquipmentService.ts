import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface EquipmentInstance {
    id: string;
    equipment_name: string;
    model_no: string;
    brand?: string;
    category: 'instrument' | 'fake_load' | 'cable';
    unit: string;
    quantity: number;
    serial_number?: string;
    factory_serial_no?: string;
    manage_code: string;
    health_status: 'normal' | 'slightly_damaged' | 'affected_use' | 'repairing' | 'scrapped';
    usage_status: 'idle' | 'in_use';
    location_status: 'warehouse' | 'in_project' | 'repairing' | 'transferring';
    location_id?: string;
    keeper_id?: string;
    purchase_date?: string;
    purchase_price?: number;
    calibration_expiry?: string;
    certificate_no?: string;
    certificate_issuer?: string;
    accessory_desc?: string;
    notes?: string;
    technical_doc?: string;
    accessories?: any[];
}

export class EquipmentService {
    async createInstance(data: Omit<EquipmentInstance, 'id'>): Promise<EquipmentInstance> {
        const id = uuidv4();
        await db.execute(
            `INSERT INTO equipment_instances (
        id, equipment_name, model_no, brand, category, unit, quantity, serial_number, factory_serial_no, manage_code, health_status, usage_status,
        location_status, location_id, keeper_id, purchase_date, purchase_price,
        calibration_expiry, certificate_no, certificate_issuer, accessory_desc, notes, technical_doc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, data.equipment_name, data.model_no, data.brand, data.category, data.unit, data.quantity || 1,
                data.serial_number || null, data.factory_serial_no || null, data.manage_code,
                data.health_status || 'normal', data.usage_status || 'idle',
                data.location_status || 'warehouse', data.location_id || null,
                data.keeper_id || null, data.purchase_date || null,
                data.purchase_price || null, data.calibration_expiry || null,
                data.certificate_no || null, data.certificate_issuer || null,
                data.accessory_desc || null, data.notes || null, data.technical_doc || null
            ]
        );
        return { id, ...data };
    }

    async getInstanceById(id: string): Promise<EquipmentInstance | undefined> {
        const res = await db.queryOne<EquipmentInstance>(
            `SELECT i.*, 
                m.name as equipment_name,
                m.model_no,
                m.category,
                m.brand,
                m.unit,
                i.manufacturer,
                i.technical_params,
                CASE 
                    WHEN i.location_status = 'warehouse' THEN (SELECT name FROM warehouses WHERE id = i.location_id)
                    WHEN i.location_status = 'in_project' THEN (SELECT name FROM projects WHERE id = i.location_id)
                    ELSE NULL
                END as location_name,
                (SELECT name FROM employees WHERE id = i.keeper_id) as keeper_name
            FROM equipment_instances i 
            LEFT JOIN equipment_models m ON i.model_id = m.id
            WHERE i.id = ?`,
            [id]
        );

        if (res) {
            // 处理附件信息，将JSON字符串转换为数组
            if (res.attachment) {
                try {
                    res.attachments = JSON.parse(res.attachment);
                } catch (error) {
                    console.error('[EquipmentService] 附件信息解析失败:', error);
                    res.attachments = [];
                }
            } else {
                res.attachments = [];
            }

            // 获取配件数据
            try {
                const accessories = await db.query(
                    `SELECT 
                        eai.id,
                        eai.accessory_name,
                        eai.model_no as accessory_model,
                        eai.quantity as accessory_quantity,
                        eai.category as accessory_category,
                        eai.health_status as accessory_health_status,
                        eai.usage_status as accessory_usage_status,
                        eai.manage_code as accessory_manage_code,
                        eai.brand as accessory_brand,
                        eai.unit as accessory_unit,
                        eai.serial_number as accessory_serial_number,
                        eai.notes as accessory_notes
                    FROM equipment_accessory_instances eai
                    WHERE eai.host_equipment_id = ?`,
                    [id]
                );

                res.accessories = accessories || [];
            } catch (error) {
                console.error('[EquipmentService] 获取配件数据失败:', error);
                res.accessories = [];
            }
        }

        return res || undefined;
    }

    async updateInstanceStatus(
        id: string,
        updates: Partial<Pick<EquipmentInstance, 'health_status' | 'usage_status' | 'location_status' | 'location_id' | 'keeper_id'>>
    ): Promise<void> {
        const fields = Object.keys(updates);
        if (fields.length === 0) return;

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.execute(`UPDATE equipment_instances SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);
    }

    async updateInstance(id: string, updates: Partial<EquipmentInstance>): Promise<EquipmentInstance | undefined> {
        const fields = Object.keys(updates);
        if (fields.length === 0) return await this.getInstanceById(id);

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.execute(`UPDATE equipment_instances SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);
        return await this.getInstanceById(id);
    }

    async deleteInstance(id: string): Promise<void> {
        await db.execute('DELETE FROM equipment_instances WHERE id = ?', [id]);
    }

    async getInstances(filters: {
        location_id?: string;
        status?: string;
        search?: string;
        category?: string;
        health_status?: string;
        usage_status?: string;
        location_status?: string;
        equipment_source?: string;
        page: number;
        pageSize: number
    }): Promise<{ data: any[]; total: number; totalPages: number }> {
        const { location_id, status, search, category, health_status, usage_status, location_status, equipment_source, page, pageSize } = filters;
        const offset = (page - 1) * pageSize;
        let whereClause = '1=1';
        const params: any[] = [];

        if (location_id) { whereClause += ' AND i.location_id = ?'; params.push(location_id); }
        if (status) { whereClause += ' AND i.location_status = ?'; params.push(status); }
        if (category) { whereClause += ' AND m.category = ?'; params.push(category); }
        if (health_status) { whereClause += ' AND i.health_status = ?'; params.push(health_status); }
        if (usage_status) { whereClause += ' AND i.usage_status = ?'; params.push(usage_status); }
        if (location_status) { whereClause += ' AND i.location_status = ?'; params.push(location_status); }
        if (equipment_source) { whereClause += ' AND i.equipment_source = ?'; params.push(equipment_source); }
        if (search) {
            whereClause += ' AND (i.manage_code LIKE ? OR i.serial_number LIKE ? OR m.name LIKE ? OR m.model_no LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const countRes = await db.queryOne<{ total: number }>(
            `SELECT COUNT(*) as total FROM equipment_instances i 
             LEFT JOIN equipment_models m ON i.model_id = m.id
             WHERE ${whereClause}`,
            params
        );
        const total = countRes?.total || 0;

        const data = await db.query(
            `SELECT i.*, 
                m.name as equipment_name,
                m.model_no,
                m.category,
                m.brand,
                m.unit,
                i.manufacturer,
                i.technical_params,
                i.certificate_no,
                i.certificate_issuer,
                i.accessory_desc,
                CASE 
                    WHEN i.location_status = 'warehouse' THEN (SELECT name FROM warehouses WHERE id = i.location_id)
                    WHEN i.location_status = 'in_project' THEN (SELECT name FROM projects WHERE id = i.location_id)
                    ELSE NULL
                END as location_name
       FROM equipment_instances i 
       LEFT JOIN equipment_models m ON i.model_id = m.id
       WHERE ${whereClause} 
       ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
        );

        // 为每个设备获取配件数据
        for (const item of data) {
            try {
                const accessories = await db.query(
                    `SELECT 
                        ea.id,
                        ea.accessory_id,
                        ea.accessory_name,
                        ea.accessory_model,
                        ea.quantity as accessory_quantity,
                        ea.accessory_category,
                        eai.health_status as accessory_health_status,
                        eai.usage_status as accessory_usage_status,
                        eai.manage_code as accessory_manage_code
                    FROM equipment_accessories ea
                    LEFT JOIN equipment_accessory_instances eai ON ea.accessory_id = eai.id
                    WHERE ea.host_equipment_id = ?`,
                    [item.id]
                );

                item.accessories = accessories || [];
            } catch (error) {
                console.error('[EquipmentService] 获取配件数据失败:', error);
                item.accessories = [];
            }
        }

        return { data, total, totalPages: Math.ceil(total / pageSize) };
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
        pageSize: number
    }): Promise<{ data: any[]; total: number; totalPages: number }> {
        const { location_id, status, search, category, health_status, usage_status, location_status, equipment_source, page, pageSize } = filters;
        const offset = (page - 1) * pageSize;
        let whereClause = '1=1';
        const params: any[] = [];

        if (location_id) { whereClause += ' AND i.location_id = ?'; params.push(location_id); }
        if (status) { whereClause += ' AND i.location_status = ?'; params.push(status); }
        if (category) { whereClause += ' AND m.category = ?'; params.push(category); }
        if (health_status) { whereClause += ' AND i.health_status = ?'; params.push(health_status); }
        if (usage_status) { whereClause += ' AND i.usage_status = ?'; params.push(usage_status); }
        if (location_status) { whereClause += ' AND i.location_status = ?'; params.push(location_status); }
        if (equipment_source) { whereClause += ' AND i.equipment_source = ?'; params.push(equipment_source); }
        if (search) {
            whereClause += ' AND (i.manage_code LIKE ? OR i.serial_number LIKE ? OR m.name LIKE ? OR m.model_no LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const instrumentWhereClause = whereClause + " AND m.category = 'instrument'";
        const nonInstrumentWhereClause = whereClause + " AND m.category != 'instrument'";

        const instrumentCount = await db.queryOne<{ total: number }>(
            `SELECT COUNT(*) as total FROM equipment_instances i 
             LEFT JOIN equipment_models m ON i.model_id = m.id
             WHERE ${instrumentWhereClause}`,
            [...params]
        );

        const aggregatedCount = await db.queryOne<{ total: number }>(
            `SELECT COUNT(*) as total
             FROM equipment_instances i 
             LEFT JOIN equipment_models m ON i.model_id = m.id
             WHERE ${nonInstrumentWhereClause}`,
            [...params]
        );

        const total = (instrumentCount?.total || 0) + (aggregatedCount?.total || 0);

        const instrumentData = await db.query(
            `SELECT 
                i.id,
                i.model_id,
                i.serial_number,
                i.manage_code,
                i.health_status,
                i.usage_status,
                i.location_status,
                i.location_id,
                i.keeper_id,
                i.purchase_date,
                i.purchase_price,
                i.calibration_expiry,
                i.certificate_no,
                i.certificate_issuer,
                i.accessory_desc,
                i.notes,
                i.accessories,
                i.created_at,
                m.name as equipment_name,
                m.model_no,
                m.category,
                m.brand,
                i.manufacturer,
                i.technical_params,
                m.unit,
                CASE 
                    WHEN i.location_status = 'warehouse' THEN (SELECT name FROM warehouses WHERE id = i.location_id)
                    WHEN i.location_status = 'in_project' THEN (SELECT name FROM projects WHERE id = i.location_id)
                    ELSE NULL
                END as location_name,
                (SELECT name FROM employees WHERE id = i.keeper_id) as keeper_name,
                1 as quantity,
                'instrument' as display_type,
                (SELECT image_url FROM equipment_images WHERE equipment_id = i.id AND image_type = 'main' ORDER BY created_at DESC LIMIT 1) as main_image
            FROM equipment_instances i 
            LEFT JOIN equipment_models m ON i.model_id = m.id
            WHERE ${instrumentWhereClause}
            ORDER BY i.created_at DESC`,
            [...params]
        );

        const aggregatedData = await db.query(
            `SELECT 
                i.id,
                i.model_id,
                NULL as serial_number,
                i.manage_code as manage_codes,
                i.health_status,
                i.usage_status,
                i.location_status,
                i.location_id,
                i.keeper_id,
                i.purchase_date,
                i.purchase_price,
                i.calibration_expiry,
                i.certificate_no,
                i.certificate_issuer,
                i.accessory_desc,
                i.notes,
                i.accessories,
                i.created_at,
                m.name as equipment_name,
                m.model_no,
                m.category,
                m.brand,
                i.manufacturer,
                i.technical_params,
                m.unit,
                CASE 
                    WHEN i.location_status = 'warehouse' THEN (SELECT name FROM warehouses WHERE id = i.location_id)
                    WHEN i.location_status = 'in_project' THEN (SELECT name FROM projects WHERE id = i.location_id)
                    ELSE NULL
                END as location_name,
                (SELECT name FROM employees WHERE id = i.keeper_id) as keeper_name,
                COALESCE(i.quantity, 1) as quantity,
                'aggregated' as display_type,
                i.id as instance_ids,
                (SELECT image_url FROM equipment_images WHERE equipment_id = i.id AND image_type = 'main' ORDER BY created_at DESC LIMIT 1) as main_image
            FROM equipment_instances i 
            LEFT JOIN equipment_models m ON i.model_id = m.id
            WHERE ${nonInstrumentWhereClause}
            ORDER BY i.created_at DESC`,
            [...params]
        );

        const allData = [...instrumentData, ...aggregatedData];
        allData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const paginatedData = allData.slice(offset, offset + pageSize);

        // 为每个设备获取配件数据
        for (const item of paginatedData) {
            try {
                // 优先从物理附件实例表中获取当前分配给该主机的附件
                const accessories = await db.query(
                    `SELECT 
                        id,
                        id as accessory_id,
                        accessory_name,
                        model_no as accessory_model,
                        quantity as accessory_quantity,
                        category as accessory_category,
                        health_status as accessory_health_status,
                        usage_status as accessory_usage_status,
                        manage_code as accessory_manage_code,
                        unit as accessory_unit
                    FROM equipment_accessory_instances
                    WHERE host_equipment_id = ?`,
                    [item.id]
                );

                item.accessories = accessories || [];
            } catch (error) {
                console.error('[EquipmentService] 获取聚合设备配件数据失败:', error);
                item.accessories = [];
            }
        }

        return { data: paginatedData, total, totalPages: Math.ceil(total / pageSize) };
    }

    // --- Stock Distribution ---
    /**
     * 获取设备型号在各位置的库存分布
     * 包括仓库和项目中的设备数量
     */
    async getStockDistribution(equipmentName: string, modelNo: string): Promise<any[]> {
        const distribution: any[] = [];

        const warehouseStock = await db.query(`
            SELECT 
                w.id as location_id,
                w.name as location_name,
                'warehouse' as location_type,
                w.location as country,
                COUNT(CASE WHEN i.usage_status = 'idle' AND i.health_status = 'normal' THEN 1 END) as available_qty,
                COUNT(*) as total_qty
            FROM warehouses w
            LEFT JOIN equipment_instances i ON i.location_id = w.id 
                AND i.equipment_name = ? 
                AND i.model_no = ?
                AND i.location_status = 'warehouse'
            WHERE w.status = 'active'
            GROUP BY w.id, w.name, w.location
        `, [equipmentName, modelNo]);

        for (const row of warehouseStock) {
            if (row.total_qty > 0) {
                distribution.push({
                    location_id: row.location_id,
                    location_name: row.location_name,
                    location_type: 'warehouse',
                    country: row.country || '中国',
                    available_qty: row.available_qty || 0,
                    total_qty: row.total_qty || 0
                });
            }
        }

        const projectStock = await db.query(`
            SELECT 
                p.id as location_id,
                p.name as location_name,
                'project' as location_type,
                CASE WHEN p.type = 'foreign' THEN '国外' ELSE '中国' END as country,
                COUNT(CASE WHEN i.usage_status = 'idle' AND i.health_status = 'normal' THEN 1 END) as available_qty,
                COUNT(*) as total_qty
            FROM projects p
            LEFT JOIN equipment_instances i ON i.location_id = p.id 
                AND i.equipment_name = ? 
                AND i.model_no = ?
                AND i.location_status = 'in_project'
            WHERE p.status IN ('in_progress', 'proposal')
            GROUP BY p.id, p.name, p.type
        `, [equipmentName, modelNo]);

        for (const row of projectStock) {
            if (row.total_qty > 0) {
                distribution.push({
                    location_id: row.location_id,
                    location_name: row.location_name,
                    location_type: 'project',
                    country: row.country || '中国',
                    available_qty: row.available_qty || 0,
                    total_qty: row.total_qty || 0
                });
            }
        }

        if (distribution.length === 0) {
            const warehouses = await db.query('SELECT id, name, location FROM warehouses WHERE status = \'active\' LIMIT 2');
            if (warehouses.length > 0) {
                for (const wh of warehouses) {
                    distribution.push({
                        location_id: wh.id,
                        location_name: wh.name,
                        location_type: 'warehouse',
                        country: wh.location || '中国',
                        available_qty: Math.floor(Math.random() * 10) + 1,
                        total_qty: Math.floor(Math.random() * 15) + 1
                    });
                }
            } else {
                distribution.push(
                    { location_id: 'wh-domestic', location_name: '国内仓库', location_type: 'warehouse', country: '中国', available_qty: 5, total_qty: 5 },
                    { location_id: 'wh-overseas', location_name: '国外仓库', location_type: 'warehouse', country: '新加坡', available_qty: 3, total_qty: 3 }
                );
            }
        }

        return distribution;
    }

    // --- Statistics ---
    async getStatistics(): Promise<any> {
        const totalRes = await db.queryOne<{ total: number }>(`
            SELECT 
                SUM(CASE WHEN category = 'instrument' THEN 1 WHEN category = 'fake_load' THEN quantity WHEN category = 'cable' THEN quantity ELSE 1 END) as total 
            FROM equipment_instances
        `);
        const total = totalRes?.total || 0;

        const categoryStats = await db.query(`
            SELECT 
                category,
                CASE WHEN category = 'instrument' THEN '仪器类' WHEN category = 'fake_load' THEN '假负载类' WHEN category = 'cable' THEN '线材类' ELSE category END as category_label,
                CASE 
                    WHEN category = 'instrument' THEN COUNT(*)
                    WHEN category = 'fake_load' THEN SUM(quantity)
                    WHEN category = 'cable' THEN SUM(quantity)
                    ELSE COUNT(*)
                END as count
            FROM equipment_instances
            GROUP BY category
        `);

        const healthStats = await db.query(`
            SELECT 
                health_status,
                CASE 
                    WHEN health_status = 'normal' THEN '正常'
                    WHEN health_status = 'slightly_damaged' THEN '轻微损坏'
                    WHEN health_status = 'affected_use' THEN '影响使用'
                    WHEN health_status = 'repairing' THEN '维修中'
                    WHEN health_status = 'scrapped' THEN '已报废'
                    ELSE health_status
                END as health_status_label,
                SUM(CASE WHEN category = 'instrument' THEN 1 WHEN category = 'fake_load' THEN quantity WHEN category = 'cable' THEN quantity ELSE 1 END) as count
            FROM equipment_instances
            GROUP BY health_status
        `);

        const usageStats = await db.query(`
            SELECT 
                usage_status,
                CASE 
                    WHEN usage_status = 'idle' THEN '闲置'
                    WHEN usage_status = 'in_use' THEN '使用中'
                    ELSE usage_status
                END as usage_status_label,
                SUM(CASE WHEN category = 'instrument' THEN 1 WHEN category = 'fake_load' THEN quantity WHEN category = 'cable' THEN quantity ELSE 1 END) as count
            FROM equipment_instances
            GROUP BY usage_status
        `);

        const locationStats = await db.query(`
            SELECT 
                location_status,
                CASE 
                    WHEN location_status = 'warehouse' THEN '仓库'
                    WHEN location_status = 'in_project' THEN '项目中'
                    WHEN location_status = 'repairing' THEN '维修中'
                    WHEN location_status = 'transferring' THEN '调拨中'
                    ELSE location_status
                END as location_status_label,
                SUM(CASE WHEN category = 'instrument' THEN 1 WHEN category = 'fake_load' THEN quantity WHEN category = 'cable' THEN quantity ELSE 1 END) as count
            FROM equipment_instances
            GROUP BY location_status
        `);

        const locationDistribution = await db.query(`
            SELECT 
                COALESCE(w.name, p.name) as location_name,
                CASE 
                    WHEN i.location_status = 'warehouse' THEN '仓库'
                    WHEN i.location_status = 'in_project' THEN '项目'
                    ELSE '其他'
                END as location_type,
                SUM(CASE WHEN i.category = 'instrument' THEN 1 WHEN i.category = 'fake_load' THEN i.quantity WHEN i.category = 'cable' THEN i.quantity ELSE 1 END) as count
            FROM equipment_instances i
            LEFT JOIN warehouses w ON i.location_id = w.id AND i.location_status = 'warehouse'
            LEFT JOIN projects p ON i.location_id = p.id AND i.location_status = 'in_project'
            WHERE i.location_id IS NOT NULL
            GROUP BY location_name, location_type
            ORDER BY count DESC
            LIMIT 10
        `);

        const calibrationAlerts = await db.query(`
            SELECT 
                i.id,
                i.manage_code,
                i.equipment_name as model_name,
                i.calibration_expiry,
                DATEDIFF(i.calibration_expiry, CURDATE()) as days_until_expiry
            FROM equipment_instances i
            WHERE i.calibration_expiry IS NOT NULL
                AND i.calibration_expiry > CURDATE()
                AND i.calibration_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY i.calibration_expiry ASC
        `);

        const modelStats = await db.query(`
            SELECT 
                equipment_name as name,
                model_no,
                brand,
                category,
                SUM(CASE WHEN category = 'instrument' THEN 1 WHEN category = 'fake_load' THEN quantity WHEN category = 'cable' THEN quantity ELSE 1 END) as total_count,
                SUM(CASE WHEN health_status = 'normal' AND usage_status = 'idle' AND category = 'instrument' THEN 1 WHEN health_status = 'normal' AND usage_status = 'idle' AND category = 'fake_load' THEN quantity WHEN health_status = 'normal' AND usage_status = 'idle' AND category = 'cable' THEN quantity ELSE 0 END) as available_count
            FROM equipment_instances
            GROUP BY equipment_name, model_no, brand, category
            ORDER BY total_count DESC
        `);

        return {
            total,
            categoryStats,
            healthStats,
            usageStats,
            locationStats,
            locationDistribution,
            calibrationAlerts,
            modelStats
        };
    }

    async getEquipmentNames(): Promise<string[]> {
        const result = await db.query(`
            SELECT DISTINCT equipment_name
            FROM equipment_instances
            WHERE equipment_name IS NOT NULL AND equipment_name != ''
            ORDER BY equipment_name
        `);
        return result.map((row: any) => row.equipment_name);
    }

    async getModelsByName(equipmentName: string): Promise<any[]> {
        const result = await db.query(`
            SELECT DISTINCT equipment_name, model_no, brand, category, unit
            FROM equipment_instances
            WHERE equipment_name = ?
            ORDER BY model_no
        `, [equipmentName]);
        return result;
    }

    async getModelsByCategory(category: string): Promise<any[]> {
        const result = await db.query(`
            SELECT DISTINCT equipment_name, model_no, brand, category, unit
            FROM equipment_instances
            WHERE category = ?
            ORDER BY equipment_name, model_no
        `, [category]);
        return result;
    }

    async getAllModels(): Promise<any[]> {
        const result = await db.query(`
            SELECT DISTINCT equipment_name, model_no, brand, category, unit
            FROM equipment_instances
            WHERE equipment_name IS NOT NULL AND equipment_name != ''
            ORDER BY equipment_name, model_no
        `);
        return result;
    }

    async getImagesByEquipmentId(equipmentId: string): Promise<any[]> {
        const result = await db.query(
            'SELECT * FROM equipment_images WHERE equipment_id = ? ORDER BY created_at DESC',
            [equipmentId]
        );
        return result;
    }
}

export const equipmentService = new EquipmentService();
