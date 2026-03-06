const mysql = require('mysql2/promise');

async function fixWarehouseField() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });
  
  console.log('开始修复设备入库流程的form_schema...');
  
  const [rows] = await connection.query('SELECT id, form_schema FROM workflow_definitions WHERE `key` = ? AND status = ?', ['equipment-inbound', 'active']);
  
  if (rows.length === 0) {
    console.log('未找到设备入库流程定义');
    await connection.end();
    return;
  }
  
  const def = rows[0];
  const formSchema = def.form_schema;
  
  console.log('修复前的form_schema[1]:', JSON.stringify(formSchema[1], null, 2));
  
  // 修复第一个字段（应该是仓库字段）
  formSchema[1].name = 'warehouse_id';
  formSchema[1].type = 'select';
  formSchema[1].label = '仓库';
  formSchema[1].dynamicOptions = 'warehouse';
  formSchema[1].dynamicOptionsConfig = {
    source: '/api/warehouses',
    labelField: 'name',
    valueField: 'id'
  };
  
  console.log('修复后的form_schema[1]:', JSON.stringify(formSchema[1], null, 2));
  
  // 更新数据库
  const [result] = await connection.query(
    'UPDATE workflow_definitions SET form_schema = ? WHERE id = ?',
    [JSON.stringify(formSchema), def.id]
  );
  
  console.log('更新结果:', result.affectedRows > 0 ? '成功' : '失败');
  
  await connection.end();
  console.log('修复完成！');
}

fixWarehouseField();