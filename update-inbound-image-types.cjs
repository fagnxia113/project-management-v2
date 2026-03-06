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
    console.log('========== 更新设备入库流程定义的图片类型 ==========');
    
    // 查询设备入库流程定义
    const [definitions] = await db.query(
      `SELECT id, \`key\`, form_schema 
       FROM workflow_definitions 
       WHERE \`key\` = 'equipment-inbound'`
    );
    
    console.log(`找到 ${definitions.length} 个设备入库流程定义`);
    
    for (const def of definitions) {
      console.log(`\n处理流程定义: ${def.id}`);
      
      if (def.form_schema) {
        let formTemplate = def.form_schema;
        
        // 查找并替换图片类型选项
        const oldOptions = [
          { label: '仪器本体图片', value: 'inbound_main' },
          { label: '带配件图片', value: 'inbound_with_accessories' },
          { label: '型号图片', value: 'inbound_model' }
        ];
        
        const newOptions = [
          { label: '主机照片', value: 'main' },
          { label: '配件照片', value: 'accessory' }
        ];
        
        // 替换图片类型选项
        let updated = false;
        formTemplate = JSON.stringify(formTemplate);
        
        oldOptions.forEach((oldOpt, index) => {
          const oldStr = JSON.stringify(oldOpt);
          const newStr = JSON.stringify(newOptions[index]);
          if (formTemplate.includes(oldStr)) {
            formTemplate = formTemplate.replace(oldStr, newStr);
            updated = true;
            console.log(`替换图片类型选项: ${oldOpt.label} -> ${newOptions[index].label}`);
          }
        });
        
        if (updated) {
          // 更新流程定义
          await db.query(
            'UPDATE workflow_definitions SET form_schema = ? WHERE id = ?',
            [JSON.parse(formTemplate), def.id]
          );
          console.log(`流程定义 ${def.id} 更新成功`);
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
