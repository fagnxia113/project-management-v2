const mysql = require('mysql2/promise');

async function checkInstanceStatus() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    const instanceId = '1f89783a-e4e8-4706-85e9-930d533c169d';

    // 查询流程实例信息
    const [instances] = await connection.execute(`
      SELECT id, definition_id, status, current_node_id, initiator_id, initiator_name, result, created_at, updated_at
      FROM workflow_instances 
      WHERE id = ?
    `, [instanceId]);

    console.log('流程实例信息:');
    console.log(JSON.stringify(instances, null, 2));

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkInstanceStatus();