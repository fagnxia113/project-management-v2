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
    console.log('========== 查询设备入库流程定义的表单配置 ==========');
    const [definitions] = await db.query(
      `SELECT id, \`key\`, form_schema 
       FROM workflow_definitions 
       WHERE \`key\` = 'equipment-inbound'`
    );
    
    console.log(`找到 ${definitions.length} 个设备入库流程定义`);
    
    for (const def of definitions) {
      console.log(`\n流程定义: ${def.id} (${def.key})`);
      
      if (def.form_schema) {
        const formSchema = def.form_schema;
        const itemsField = formSchema.find((field) => field.name === 'items');
        
        if (itemsField) {
          console.log('\n设备明细字段配置:');
          console.log(JSON.stringify(itemsField, null, 2));
        } else {
          console.log('\n未找到设备明细字段');
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
