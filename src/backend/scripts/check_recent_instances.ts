import { db } from '../database/connection.js';

async function checkRecentInstances() {
  console.log('检查最近的流程实例...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const instances = await db.query(
      `SELECT id, definition_key, status, created_at, variables 
       FROM workflow_instances 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    console.log('📊 最近的流程实例:');
    console.log('ID | 流程Key | 状态 | 创建时间 | 变量结构');
    console.log('----|---------|------|----------|----------');
    
    instances.forEach((inst: any) => {
      const variables = typeof inst.variables === 'string' 
        ? JSON.parse(inst.variables) 
        : inst.variables;
      
      const hasFormData = variables.hasOwnProperty('formData');
      const formDataKeys = hasFormData ? Object.keys(variables.formData).length : 0;
      const rootKeys = Object.keys(variables).length;
      
      console.log(`${inst.id.substring(0, 8)}... | ${inst.definition_key.padEnd(15)} | ${inst.status.padEnd(10)} | ${inst.created_at.substring(0, 19)} | ${hasFormData ? `formData(${formDataKeys})` : `root(${rootKeys})`}`);
    });
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkRecentInstances().then(() => process.exit(0));