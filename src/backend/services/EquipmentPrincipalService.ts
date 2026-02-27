import { db } from '../database/connection.js';

export class EquipmentPrincipalService {
  private db: any;

  constructor() {
    this.db = db;
  }

  async matchPrincipal(positionStatus: string, locationId: string): Promise<string | null> {
    if (positionStatus === 'warehouse') {
      const warehouse = await this.db.queryOne(
        'SELECT manager_id FROM warehouses WHERE id = ?',
        [locationId]
      );
      
      return warehouse?.manager_id || null;
    } else if (positionStatus === 'in_project') {
      const project = await this.db.queryOne(
        'SELECT manager_id FROM projects WHERE id = ?',
        [locationId]
      );
      
      return project?.manager_id || null;
    }
    
    return null;
  }

  async batchMatchPrincipal(equipmentIds: string[], positionStatus: string, locationId: string): Promise<void> {
    if (equipmentIds.length === 0) {
      return;
    }
    
    const principalId = await this.matchPrincipal(positionStatus, locationId);
    
    if (!principalId) {
      return;
    }
    
    const placeholders = equipmentIds.map(() => '?').join(',');
    
    await this.db.query(
      `UPDATE equipment_instances 
       SET principal_id = ? 
       WHERE id IN (${placeholders})`,
      [principalId, ...equipmentIds]
    );
  }

  async cascadeUpdatePrincipal(locationType: 'warehouse' | 'project', locationId: string, newManagerId: string): Promise<void> {
    let query = '';
    let params: any[] = [];
    
    if (locationType === 'warehouse') {
      query = `
        UPDATE equipment_instances 
        SET principal_id = ? 
        WHERE location_status = 'warehouse' AND location_id = ?
      `;
      params = [newManagerId, locationId];
    } else if (locationType === 'project') {
      query = `
        UPDATE equipment_instances 
        SET principal_id = ? 
        WHERE location_status = 'in_project' AND location_id = ?
      `;
      params = [newManagerId, locationId];
    }
    
    await this.db.query(query, params);
  }
}

export default new EquipmentPrincipalService();
