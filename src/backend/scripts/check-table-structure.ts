import { db } from '../database/connection.js';

async function checkTableStructure() {
  try {
    await db.connect();
    
    console.log('=== equipment_instances 表结构 ===');
    const columns = await db.query('SHOW COLUMNS FROM equipment_instances');
    console.table(columns);
    
    console.log('\n=== equipment_models 表结构 ===');
    const modelColumns = await db.query('SHOW COLUMNS FROM equipment_models');
    console.table(modelColumns);
    
    await db.close();
  } catch (error) {
    console.error('Error:', error);
    await db.close();
  }
}

checkTableStructure();