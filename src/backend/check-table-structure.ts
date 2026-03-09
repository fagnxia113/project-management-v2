import { db } from './database/connection.ts';

async function checkTableStructure() {
  try {
    await db.connect();
    
    const columns = await db.query('SHOW COLUMNS FROM equipment_instances');
    console.log('equipment_instances表结构:');
    console.table(columns);
    
    await db.close();
  } catch (error) {
    console.error('查询表结构失败:', error);
  }
}

checkTableStructure();