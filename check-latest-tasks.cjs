const mysql = require('mysql2/promise');

async function checkLatestInstanceTasks() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    const instanceId = 'ec24502e-fe98-4c75-8b93-99aaf01433f8';

    // 查询流程实例的任务
    const [tasks] = await connection.execute(`
      SELECT id, instance_id, node_id, name, assignee_id, assignee_name, status, variables
      FROM workflow_tasks 
      WHERE instance_id = ?
      ORDER BY created_at DESC
    `, [instanceId]);

    console.log('流程实例的任务列表:');
    console.log(JSON.stringify(tasks, null, 2));

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkLatestInstanceTasks();