const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkLatestProjectInstance() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查最新的项目审批流程实例...');

    const instances = await connection.query(`
      SELECT id, title, status, result, initiator_name, created_at, updated_at, business_id
      FROM workflow_instances
      WHERE definition_key = 'project-approval'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (instances[0].length === 0) {
      console.log('未找到项目审批流程实例');
      return;
    }

    const instance = instances[0][0];
    console.log(`\n最新的项目审批流程实例:`);
    console.log(`实例 ID: ${instance.id}`);
    console.log(`标题: ${instance.title}`);
    console.log(`状态: ${instance.status}`);
    console.log(`结果: ${instance.result || '未完成'}`);
    console.log(`发起人: ${instance.initiator_name}`);
    console.log(`创建时间: ${instance.created_at}`);
    console.log(`更新时间: ${instance.updated_at}`);
    console.log(`业务ID: ${instance.business_id || '未关联'}`);

    const tasks = await connection.query(`
      SELECT id, node_id, name, assignee_name, status, result, completed_at
      FROM workflow_tasks
      WHERE instance_id = ?
      ORDER BY created_at
    `, [instance.id]);

    console.log(`\n任务列表 (${tasks[0].length} 个):`);
    for (const task of tasks[0]) {
      console.log(`  - ${task.name}: ${task.status} (${task.result || '未完成'}) - 审批人: ${task.assignee_name || '未分配'} - 完成时间: ${task.completed_at || '未完成'}`);
    }

    const projects = await connection.query(`
      SELECT id, name, code, status, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n\n最近的项目列表 (${projects[0].length} 个):`);
    for (const project of projects[0]) {
      console.log(`  - ${project.name} (${project.code}): ${project.status} - 创建时间: ${project.created_at}`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkLatestProjectInstance();