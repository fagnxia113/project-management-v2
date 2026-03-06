const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkTaskData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查最新的任务数据...');

    const tasks = await connection.query(`
      SELECT t.*, i.title as process_title, i.definition_key, i.initiator_id, i.initiator_name, 
             i.variables as instance_variables, d.node_config as definition_node_config
      FROM workflow_tasks t
      JOIN workflow_instances i ON t.instance_id = i.id
      JOIN workflow_definitions d ON i.definition_id = d.id
      WHERE i.definition_key = 'project-approval'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);

    if (tasks[0].length === 0) {
      console.log('未找到待处理任务');
      return;
    }

    const task = tasks[0][0];
    console.log(`\n任务 ID: ${task.id}`);
    console.log(`流程标题: ${task.process_title}`);
    console.log(`流程类型: ${task.definition_key}`);
    
    if (task.instance_variables) {
      const instanceVars = typeof task.instance_variables === 'string' 
        ? JSON.parse(task.instance_variables) 
        : task.instance_variables;
      
      console.log(`\n流程变量:`);
      console.log(JSON.stringify(instanceVars, null, 2));
    }

    // 检查员工数据
    const employees = await connection.query('SELECT id, name FROM employees LIMIT 5');
    console.log(`\n员工数据 (${employees[0].length} 条):`);
    employees[0].forEach(emp => {
      console.log(`  ${emp.id}: ${emp.name}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkTaskData();