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
    console.log('========== 修复设备入库流程定义的表单配置 ==========');
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
        
        // 查找 items 字段
        const itemsField = formSchema.find((field) => field.name === 'items');
        
        if (itemsField) {
          console.log('找到 items 字段');
          
          // 将 itemFields 改为 arrayConfig.fields
          if (itemsField.itemFields && !itemsField.arrayConfig) {
            console.log('将 itemFields 改为 arrayConfig.fields');
            itemsField.arrayConfig = {
              fields: itemsField.itemFields
            };
            delete itemsField.itemFields;
          }
          
          // 更新数据库
          await db.query(
            'UPDATE workflow_definitions SET form_schema = ? WHERE id = ?',
            [JSON.stringify(formSchema), def.id]
          );
          console.log('流程定义更新成功');
        }
      }
    }
    
    console.log('\n更新完成');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
