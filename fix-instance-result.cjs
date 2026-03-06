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
    console.log('========== 更新设备入库流程实例的 result 字段 ==========');
    
    // 更新所有状态为 completed 但 result 为 null 的设备入库流程实例
    const [result] = await db.query(
      `UPDATE workflow_instances 
       SET result = 'approved' 
       WHERE definition_key = 'equipment-inbound' 
       AND status = 'completed' 
       AND (result IS NULL OR result = '')`
    );
    
    console.log(`更新了 ${result.affectedRows} 个流程实例`);
    
    // 查询更新后的流程实例
    const [instances] = await db.query(
      `SELECT id, definition_key, status, result, business_id 
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    
    console.log('\n更新后的流程实例:');
    instances.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.id} - 状态: ${inst.status} - 结果: ${inst.result} - 业务ID: ${inst.business_id || '无'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
