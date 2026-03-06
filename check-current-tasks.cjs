const mysql = require('mysql2/promise');

async function checkCurrentTasks() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 查询流程实例的任务
    const [tasks] = await connection.execute(`
      SELECT id, instance_id, node_id, name, assignee_id, assignee_name, status, variables
      FROM workflow_tasks 
      WHERE instance_id = '297222a8-4848-42fd-886c-c3405c288232'
      ORDER BY created_at DESC
    `);

    console.log('流程实例的任务列表:');
    console.log(JSON.stringify(tasks, null, 2));

    // 检查任务中的审批人信息
    tasks.forEach(task => {
      if (task.variables) {
        const variables = typeof task.variables === 'string' ? JSON.parse(task.variables) : task.variables;
        console.log(`\n任务 ${task.name} 的审批人信息:`, JSON.stringify(variables.approvers, null, 2));
      }
    });

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkCurrentTasks();