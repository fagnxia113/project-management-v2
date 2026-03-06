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
    console.log('========== 更新 images 字段配置 ==========');
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
        
        if (itemsField && itemsField.arrayConfig && itemsField.arrayConfig.fields) {
          // 查找 images 字段
          const imagesField = itemsField.arrayConfig.fields.find((field) => field.name === 'images');
          
          if (imagesField && imagesField.arrayConfig && imagesField.arrayConfig.fields) {
            console.log('找到 images 字段');
            
            // 更新 images 字段的配置
            imagesField.arrayConfig.fields = [
              {
                name: 'image_url',
                type: 'text',
                label: '图片URL',
                required: true,
                placeholder: '请上传图片'
              },
              {
                name: 'image_type',
                type: 'select',
                label: '图片类型',
                required: true,
                placeholder: '请选择图片类型',
                options: [
                  { label: '主机照片', value: 'main' },
                  { label: '配件照片', value: 'accessory' }
                ]
              }
            ];
            
            console.log('更新 images 字段配置');
          }
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
