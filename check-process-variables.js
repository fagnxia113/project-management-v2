import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkProcessVariables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    // 先查询上海总仓的管理员配置
    console.log('\n查询上海总仓的管理员配置...');
    const [warehouseRows] = await connection.query(`
      SELECT id, name, manager_id 
      FROM warehouses 
      WHERE name LIKE '%上海总仓%'
    `);
    
    if (warehouseRows.length > 0) {
      console.log('上海总仓配置:');
      warehouseRows.forEach(warehouse => {
        console.log('仓库ID:', warehouse.id);
        console.log('仓库名称:', warehouse.name);
        console.log('管理员ID:', warehouse.manager_id);
      });
    } else {
      console.log('未找到上海总仓');
    }
    
    // 查询最新的设备入库流程实例
    console.log('\n查询最新的设备入库流程实例...');
    const [rows] = await connection.query(`
      SELECT id, business_key, variables, created_at 
      FROM workflow_instances 
      WHERE definition_key = 'equipment-inbound' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (rows.length === 0) {
      console.log('未找到设备入库流程实例');
      return;
    }
    
    console.log(`找到 ${rows.length} 个设备入库流程实例`);
    
    for (let i = 0; i < rows.length; i++) {
      const instance = rows[i];
      console.log(`\n实例 ${i + 1}:`);
      console.log('实例ID:', instance.id);
      console.log('业务键:', instance.business_key);
      console.log('创建时间:', instance.created_at);
      console.log('原始variables值:', instance.variables);
      console.log('variables类型:', typeof instance.variables);
      
      try {
        const variables = JSON.parse(instance.variables);
        console.log('流程变量:', JSON.stringify(variables, null, 2));
        
        if (variables.formData) {
          console.log('表单数据:', JSON.stringify(variables.formData, null, 2));
          console.log('warehouse_manager_id:', variables.formData.warehouse_manager_id);
          console.log('warehouse_id:', variables.formData.warehouse_id);
        }
      } catch (error) {
        console.error('解析变量失败:', error);
      }
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkProcessVariables();