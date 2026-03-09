import { db } from '../database/connection.js';

async function checkEquipmentTableStructure() {
  try {
    await db.connect();
    
    console.log('=== equipment_instances 表结构 ===');
    const columns = await db.query('SHOW COLUMNS FROM equipment_instances');
    console.table(columns);
    
    console.log('\n=== equipment_models 表结构 ===');
    const modelColumns = await db.query('SHOW COLUMNS FROM equipment_models');
    console.table(modelColumns);
    
    console.log('\n=== 测试插入语句 ===');
    try {
      const testInsert = await db.execute(
        `INSERT INTO equipment_instances 
        (id, model_id, quantity, serial_number, manage_code, 
         health_status, usage_status, location_status, location_id, keeper_id, 
         purchase_date, purchase_price, calibration_expiry, notes, 
         manufacturer, technical_parameters, certificate_number, certificate_issuer, 
         certificate_expiry, accessory_description, images, attachments) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'test-id',
          'test-model-id',
          1,
          'test-serial',
          'test-manage-code',
          'normal',
          'idle',
          'warehouse',
          'test-location-id',
          'test-keeper-id',
          new Date(),
          1000,
          new Date(),
          'test-notes',
          'test-manufacturer',
          'test-params',
          'test-cert',
          'test-issuer',
          new Date(),
          'test-accessory',
          JSON.stringify(['test-image']),
          JSON.stringify(['test-attachment'])
        ]
      );
      console.log('测试插入成功');
      
      // 清理测试数据
      await db.execute('DELETE FROM equipment_instances WHERE id = ?', ['test-id']);
    } catch (error) {
      console.error('测试插入失败:', error);
    }
    
    await db.close();
  } catch (error) {
    console.error('Error:', error);
    await db.close();
  }
}

checkEquipmentTableStructure();