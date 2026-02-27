import { db } from '../database/connection.js';

export class EquipmentCodeService {
  private db: any;

  constructor() {
    this.db = db;
  }

  async generateBatch(equipmentType: 'instrument' | 'fake_load', count: number): Promise<string[]> {
    const prefix = equipmentType === 'instrument' ? 'YQ' : 'FZ';
    const codes: string[] = [];
    
    const connection = await this.db.beginTransaction();
    
    try {
      const [result] = await connection.query(
        `SELECT MAX(CAST(SUBSTRING(manage_code, 4) AS UNSIGNED)) as max_seq 
         FROM equipment_instances 
         WHERE manage_code LIKE ?`,
        [`${prefix}-%`]
      ) as any[];
      
      const maxSeq = result?.max_seq || 0;
      
      for (let i = 0; i < count; i++) {
        const newSeq = maxSeq + 1 + i;
        const code = `${prefix}-${String(newSeq).padStart(6, '0')}`;
        codes.push(code);
      }
      
      await connection.commit();
      
      return codes;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCodePrefix(equipmentType: 'instrument' | 'fake_load'): Promise<string> {
    return equipmentType === 'instrument' ? 'YQ' : 'FZ';
  }

  async updateCodePrefix(equipmentType: 'instrument' | 'fake_load', prefix: string): Promise<void> {
    const connection = await this.db.beginTransaction();
    
    try {
      const [result] = await connection.query(
        'SELECT id FROM equipment_code_configs WHERE equipment_type = ?',
        [equipmentType]
      ) as any[];
      
      if (result) {
        await connection.query(
          'UPDATE equipment_code_configs SET prefix = ? WHERE equipment_type = ?',
          [prefix, equipmentType]
        );
      } else {
        await connection.query(
          'INSERT INTO equipment_code_configs (id, equipment_type, prefix) VALUES (?, ?, ?)',
          [this.generateUUID(), equipmentType, prefix]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCurrentMaxSeq(prefix: string): Promise<number> {
    const result = await this.db.queryOne(
      `SELECT MAX(CAST(SUBSTRING(manage_code, ?) AS UNSIGNED)) as max_seq 
       FROM equipment_instances 
       WHERE manage_code LIKE ?`,
      [prefix.length + 2, `${prefix}-%`]
    );
    
    return result?.max_seq || 0;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default new EquipmentCodeService();
