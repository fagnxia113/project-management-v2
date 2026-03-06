import { db } from './database/connection.ts';

async function checkProcessInstanceVariables() {
  try {
    // 初始化数据库连接
    await db.connect();
    console.log('数据库连接初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
  try {
    console.log('正在查询最新的设备入库流程实例...');
    
    // 查询最新的设备入库流程实例
    const instances = await db.query(`
      SELECT id, variables 
      FROM workflow_instances 
      WHERE business_key LIKE 'equipment-inbound-%' 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (instances.length === 0) {
      console.log('未找到设备入库流程实例');
      return;
    }
    
    console.log(`找到 ${instances.length} 个设备入库流程实例`);
    
    instances.forEach((instance, index) => {
      console.log(`\n实例 ${index + 1}:`);
      console.log('实例ID:', instance.id);
      
      try {
        const variables = typeof instance.variables === 'string' ? JSON.parse(instance.variables) : instance.variables;
        console.log('流程变量:', JSON.stringify(variables, null, 2));
        
        if (variables.formData) {
          console.log('表单数据:', JSON.stringify(variables.formData, null, 2));
          console.log('warehouse_manager_id:', variables.formData.warehouse_manager_id);
        }
      } catch (error) {
        console.error('解析变量失败:', error);
      }
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit();
  }
}

checkProcessInstanceVariables();