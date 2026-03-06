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
    console.log('========== 查询设备入库流程实例状态 ==========');
    const [instances] = await db.query(
      `SELECT id, status, result, business_id, created_at 
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound' 
       ORDER BY created_at DESC`
    );
    
    console.log(`找到 ${instances.length} 个设备入库流程实例:`);
    instances.forEach((inst, index) => {
      console.log(`\n${index + 1}. ${inst.id}`);
      console.log(`   状态: ${inst.status}`);
      console.log(`   结果: ${inst.result || '无'}`);
      console.log(`   业务ID: ${inst.business_id || '无'}`);
      console.log(`   创建时间: ${inst.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
