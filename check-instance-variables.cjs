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
    console.log('========== 查询设备入库流程实例的 variables ==========');
    const [instances] = await db.query(
      `SELECT id, variables, initiator_id, initiator_name 
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound' 
       AND status = 'completed' 
       AND result = 'approved'
       ORDER BY created_at DESC 
       LIMIT 2`
    );
    
    console.log(`找到 ${instances.length} 个流程实例:`);
    for (const inst of instances) {
      console.log(`\n${inst.id}`);
      console.log(`发起人: ${inst.initiator_name}`);
      console.log(`variables:`, JSON.stringify(inst.variables, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
