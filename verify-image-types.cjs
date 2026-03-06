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
    console.log('========== 查询设备入库流程定义的图片类型 ==========');
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
        const schemaStr = JSON.stringify(formSchema);
        
        // 查找图片类型选项
        const hasOldOptions = schemaStr.includes('inbound_main') || 
                              schemaStr.includes('inbound_with_accessories') || 
                              schemaStr.includes('inbound_model');
        const hasNewOptions = schemaStr.includes('主机照片') || 
                              schemaStr.includes('配件照片');
        
        console.log(`包含旧选项: ${hasOldOptions}`);
        console.log(`包含新选项: ${hasNewOptions}`);
        
        if (hasOldOptions && !hasNewOptions) {
          console.log('需要更新图片类型选项');
        } else if (hasNewOptions) {
          console.log('图片类型选项已是新的');
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
