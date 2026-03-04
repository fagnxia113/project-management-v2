import { db } from '../database/connection.js';

async function migrate() {
  try {
    console.log('开始迁移：添加 node_name 字段...');
    
    await db.connect();
    
    await db.execute(`
      ALTER TABLE workflow_execution_logs 
      ADD COLUMN node_name VARCHAR(200) COMMENT '节点名称' AFTER node_id
    `);
    
    console.log('✅ 迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrate();
