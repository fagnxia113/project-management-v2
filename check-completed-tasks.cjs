const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkCompletedTasks() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查已完成的任务...');

    const userId = 'eb207764-e0d3-4f84-9463-8a8c065214a9';
    
    // 查询用户关联的员工ID
    const employees = await connection.query(
      'SELECT id FROM employees WHERE user_id = ?',
      [userId]
    );
    const employeeIds = employees[0].map((e) => e.id);
    console.log(`\n用户ID: ${userId}`);
    console.log(`关联的员工ID: ${employeeIds.join(', ')}`);

    // 查询所有任务
    const tasks = await connection.query(`
      SELECT t.*, i.title as process_title, i.definition_key, i.initiator_id, i.initiator_name, 
             i.variables as instance_variables
      FROM workflow_tasks t
      JOIN workflow_instances i ON t.instance_id = i.id
      WHERE (t.assignee_id = ? ${employeeIds.length > 0 ? `OR t.assignee_id IN (${employeeIds.map(() => '?').join(', ')})` : ''})
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [userId, ...employeeIds]);

    console.log(`\n找到 ${tasks[0].length} 个任务:`);
    tasks[0].forEach((task, index) => {
      console.log(`\n${index + 1}. 任务 ID: ${task.id}`);
      console.log(`   流程标题: ${task.process_title}`);
      console.log(`   流程类型: ${task.definition_key}`);
      console.log(`   任务名称: ${task.name}`);
      console.log(`   任务状态: ${task.status}`);
      console.log(`   审批人ID: ${task.assignee_id}`);
    });

    // 查询已完成的任务
    const completedTasks = tasks[0].filter(task => 
      task.status === 'completed' || task.status === 'approved' || task.status === 'rejected'
    );

    console.log(`\n其中已完成的任务: ${completedTasks.length} 个`);

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkCompletedTasks();