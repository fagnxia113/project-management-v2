const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'project_management_v3',
  waitForConnections: true,
  connectionLimit: 10
});

(async () => {
  try {
    console.log('========== 隐藏仓库管理员字段 ==========');
    const [definitions] = await db.query(
      `SELECT id, \`key\`, form_schema 
       FROM workflow_definitions 
       WHERE \`key\` = 'equipment-inbound'`
    );
    
    console.log(`找到 ${definitions.length} 个设备入库流程定义`);
    
    for (const def of definitions) {
      console.log(`\n处理流程定义: ${def.id}`);
      
      if (def.form_schema) {
        let formSchema = JSON.parse(JSON.stringify(def.form_schema));
        
        // 查找 warehouse_manager_id 字段
        const warehouseManagerField = formSchema.find((field) => field.name === 'warehouse_manager_id');
        
        if (warehouseManagerField) {
          console.log('找到 warehouse_manager_id 字段');
          
          // 设置为隐藏字段
          warehouseManagerField.hidden = true;
          warehouseManagerField.visible = false;
          
          console.log('已将 warehouse_manager_id 字段设置为隐藏');
        }
        
        // 更新数据库
        await db.query(
          'UPDATE workflow_definitions SET form_schema = ? WHERE id = ?',
          [JSON.stringify(formSchema), def.id]
        );
        console.log('流程定义更新成功');
      }
    }
    
    console.log('\n更新完成');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
