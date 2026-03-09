import { db } from './src/backend/database/connection.ts';

async function checkTableStructure() {
  try {
    // 连接数据库
    await db.connect();
    
    // 检查 equipment_instances 表结构
    console.log('检查 equipment_instances 表结构:');
    const columns = await db.query('SHOW COLUMNS FROM equipment_instances');
    console.table(columns);
    
    // 检查 equipment_models 表结构
    console.log('\n检查 equipment_models 表结构:');
    const modelColumns = await db.query('SHOW COLUMNS FROM equipment_models');
    console.table(modelColumns);
    
    // 检查 equipment_inbound_orders 表结构
    console.log('\n检查 equipment_inbound_orders 表结构:');
    const orderColumns = await db.query('SHOW COLUMNS FROM equipment_inbound_orders');
    console.table(orderColumns);
    
    // 检查 equipment_inbound_items 表结构
    console.log('\n检查 equipment_inbound_items 表结构:');
    const itemColumns = await db.query('SHOW COLUMNS FROM equipment_inbound_items');
    console.table(itemColumns);
    
    await db.close();
  } catch (error) {
    console.error('检查表结构失败:', error);
  }
}

checkTableStructure();