import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkProcessInstanceVariables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('正在查询最新的设备入库流程实例...');
    
    // 查询最新的设备入库流程实例
    const [instances] = await connection.query(`
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
    
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      console.log(`\n实例 ${i + 1}:`);
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
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
    process.exit();
  }
}

checkProcessInstanceVariables();