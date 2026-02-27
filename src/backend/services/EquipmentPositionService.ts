import { db } from '../database/connection.js';

export class EquipmentPositionService {
  private db: any;

  constructor() {
    this.db = db;
  }

  async calculatePosition(positionStatus: string, locationId: string): Promise<string> {
    if (positionStatus === 'warehouse') {
      const warehouse = await this.db.queryOne(
        'SELECT name FROM warehouses WHERE id = ?',
        [locationId]
      );
      
      return warehouse?.name || '未知仓库';
    } else if (positionStatus === 'in_project') {
      const project = await this.db.queryOne(
        'SELECT name FROM projects WHERE id = ?',
        [locationId]
      );
      
      return project?.name || '未知项目';
    } else if (positionStatus === 'repairing') {
      return '维修中';
    } else if (positionStatus === 'transferring') {
      return '调拨中';
    }
    
    return '未知位置';
  }

  async batchCalculatePosition(equipmentIds: string[]): Promise<void> {
    if (equipmentIds.length === 0) {
      return;
    }
    
    const placeholders = equipmentIds.map(() => '?').join(',');
    
    const instances = await this.db.query(
      `SELECT id, location_status, location_id FROM equipment_instances 
       WHERE id IN (${placeholders})`,
      equipmentIds
    );
    
    for (const instance of instances) {
      const position = await this.calculatePosition(instance.location_status, instance.location_id);
      
      await this.db.query(
        'UPDATE equipment_instances SET current_position = ? WHERE id = ?',
        [position, instance.id]
      );
    }
  }

  async cascadeUpdatePosition(locationType: 'warehouse' | 'project', locationId: string, newName: string): Promise<void> {
    let query = '';
    let params: any[] = [];
    
    if (locationType === 'warehouse') {
      query = `
        UPDATE equipment_instances 
        SET current_position = ? 
        WHERE location_status = 'warehouse' AND location_id = ?
      `;
      params = [newName, locationId];
    } else if (locationType === 'project') {
      query = `
        UPDATE equipment_instances 
        SET current_position = ? 
        WHERE location_status = 'in_project' AND location_id = ?
      `;
      params = [newName, locationId];
    }
    
    await this.db.query(query, params);
  }
}

export default new EquipmentPositionService();
