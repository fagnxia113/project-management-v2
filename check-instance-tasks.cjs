const mysql = require('mysql2/promise');

async function checkInstanceTasks() {
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

    // 查询流程实例的任务
    const [tasks] = await connection.execute(`
      SELECT id, instance_id, node_id, name, assignee_id, assignee_name, status, variables, created_at, completed_at
      FROM workflow_tasks 
      WHERE instance_id = ?
      ORDER BY created_at ASC
    `, [instanceId]);

    console.log('流程实例的任务列表:');
    tasks.forEach(task => {
      console.log(`\n任务ID: ${task.id}`);
      console.log(`节点: ${task.node_id} - ${task.name}`);
      console.log(`审批人: ${task.assignee_name} (${task.assignee_id})`);
      console.log(`状态: ${task.status}`);
      console.log(`创建时间: ${task.created_at}`);
      console.log(`完成时间: ${task.completed_at || '未完成'}`);
    });

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkInstanceTasks();