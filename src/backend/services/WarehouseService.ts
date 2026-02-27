import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface Warehouse {
    id: string;
    warehouse_no: string;
    name: string;
    type: 'main' | 'branch' | 'project';
    location: string;
    address?: string;
    manager_id?: string;
    manager_name?: string;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface WarehouseWithStats extends Warehouse {
    total_equipment: number;
    available_equipment: number;
    in_use_equipment: number;
}

export class WarehouseService {
    async generateWarehouseNo(): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        const result = await db.queryOne(`
            SELECT COUNT(*) as count 
            FROM warehouses 
            WHERE warehouse_no LIKE ?
        `, [`WH-${dateStr}-%`]);
        
        const count = (result as any)?.count || 0;
        const seq = (count + 1).toString().padStart(3, '0');
        
        return `WH-${dateStr}-${seq}`;
    }

    async getWarehouses(filters: {
        search?: string;
        status?: string;
        type?: string;
        page: number;
        pageSize: number
    }): Promise<{ data: any[]; total: number; totalPages: number }> {
        const { search, status, type, page, pageSize } = filters;
        const offset = (page - 1) * pageSize;
        let whereClause = '1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (w.name LIKE ? OR w.warehouse_no LIKE ? OR w.location LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) { whereClause += ' AND w.status = ?'; params.push(status); }
        if (type) { whereClause += ' AND w.type = ?'; params.push(type); }

        const countRes = await db.queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM warehouses w WHERE ${whereClause}`, params);
        const total = countRes?.total || 0;

        const data = await db.query(
            `SELECT w.*, e.name as manager_name
       FROM warehouses w
       LEFT JOIN employees e ON w.manager_id = e.id
       WHERE ${whereClause}
       ORDER BY w.created_at DESC LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
        );

        return { data, total, totalPages: Math.ceil(total / pageSize) };
    }

    async getWarehouseById(id: string): Promise<WarehouseWithStats | undefined> {
        const warehouse = await db.queryOne<any>(
            `SELECT w.*, e.name as manager_name
       FROM warehouses w
       LEFT JOIN employees e ON w.manager_id = e.id
       WHERE w.id = ?`,
            [id]
        );

        if (!warehouse) return undefined;

        const stats = await db.queryOne<any>(
            `SELECT 
                COUNT(*) as total_equipment,
                SUM(CASE WHEN i.usage_status = 'idle' AND i.health_status = 'normal' THEN 1 ELSE 0 END) as available_equipment,
                SUM(CASE WHEN i.usage_status = 'in_use' THEN 1 ELSE 0 END) as in_use_equipment
         FROM equipment_instances i
         WHERE i.location_id = ? AND i.location_status = 'warehouse'`,
            [id]
        );

        return {
            ...warehouse,
            total_equipment: stats?.total_equipment || 0,
            available_equipment: stats?.available_equipment || 0,
            in_use_equipment: stats?.in_use_equipment || 0
        };
    }

    async createWarehouse(data: Omit<Warehouse, 'id' | 'warehouse_no' | 'created_at' | 'updated_at' | 'manager_name'>): Promise<Warehouse> {
        const id = uuidv4();
        const warehouseNo = await this.generateWarehouseNo();
        await db.execute(
            `INSERT INTO warehouses (id, warehouse_no, name, type, location, address, manager_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, warehouseNo, data.name, data.type, data.location, data.address || null, data.manager_id || null, data.status || 'active']
        );
        return { id, warehouse_no: warehouseNo, ...data } as Warehouse;
    }

    async updateWarehouse(id: string, data: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at' | 'manager_name'>>): Promise<void> {
        const fields = Object.keys(data);
        if (fields.length === 0) return;

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(data), id];

        await db.execute(`UPDATE warehouses SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);
    }

    async deleteWarehouse(id: string): Promise<void> {
        await db.execute('DELETE FROM warehouses WHERE id = ?', [id]);
    }

    async getWarehouseEquipment(warehouseId: string, filters: {
        search?: string;
        page: number;
        pageSize: number
    }): Promise<{ data: any[]; total: number; totalPages: number }> {
        const { search, page, pageSize } = filters;
        const offset = (page - 1) * pageSize;
        let whereClause = 'i.location_id = ? AND i.location_status = \'warehouse\'';
        const params: any[] = [warehouseId];

        if (search) {
            whereClause += ' AND (i.manage_code LIKE ? OR i.serial_number LIKE ? OR i.equipment_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const countRes = await db.queryOne<{ total: number }>(
            `SELECT COUNT(*) as total FROM equipment_instances i WHERE ${whereClause}`,
            params
        );
        const total = countRes?.total || 0;

        const data = await db.query(
            `SELECT i.* 
       FROM equipment_instances i
       WHERE ${whereClause}
       ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
        );

        return { data, total, totalPages: Math.ceil(total / pageSize) };
    }
}

export const warehouseService = new WarehouseService();
