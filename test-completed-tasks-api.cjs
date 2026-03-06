const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function testMyCompletedTasksAPI() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('测试 /api/workflow/my-completed-tasks API...');

    const authenticatedUserId = 'eb207764-e0d3-4f84-9463-8a8c065214a9';
    
    // 模拟 TaskService.getTasksByAssignee 的逻辑
    const employees = await connection.query(
      'SELECT id FROM employees WHERE user_id = ?',
      [authenticatedUserId]
    );
    const employeeIds = employees[0].map((e) => e.id);
    
    console.log(`\n用户ID: ${authenticatedUserId}`);
    console.log(`关联的员工ID: ${employeeIds.join(', ')}`);

    // 构建查询条件
    let whereClause = '(t.assignee_id = ?';
    const params = [authenticatedUserId];
    
    if (employeeIds.length > 0) {
      whereClause += ` OR t.assignee_id IN (${employeeIds.map(() => '?').join(', ')})`;
      params.push(...employeeIds);
    }
    whereClause += ')';

    // 不添加状态过滤，返回所有状态的任务
    const rows = await connection.query(`
      SELECT t.*, i.title as process_title, i.definition_key, i.initiator_id, i.initiator_name, 
             i.variables as instance_variables, d.node_config as definition_node_config
      FROM workflow_tasks t
      JOIN workflow_instances i ON t.instance_id = i.id
      JOIN workflow_definitions d ON i.definition_id = d.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT 10
    `, params);

    console.log(`\n找到 ${rows[0].length} 个任务:`);
    
    const completedTasks = rows[0].filter(task => 
      task.status === 'completed' || task.status === 'approved' || task.status === 'rejected'
    );

    console.log(`其中已完成的任务: ${completedTasks.length} 个`);

    const completedTasksWithDetails = await Promise.all(
      completedTasks.map(async (task) => {
        const instanceRows = await connection.query(
          `SELECT title, definition_key, initiator_name, variables 
           FROM workflow_instances 
           WHERE id = ?`,
          [task.instance_id]
        );
        const instance = instanceRows[0][0];
        
        const taskHistoryRows = await connection.query(
          `SELECT action, comment, created_at 
           FROM workflow_task_history 
           WHERE task_id = ? AND action IN ('approve', 'reject') 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [task.id]
        );
        const taskHistory = taskHistoryRows[0][0];
        
        let instanceVars = {};
        if (instance?.variables) {
          try {
            instanceVars = typeof instance.variables === 'string' 
              ? JSON.parse(instance.variables) 
              : instance.variables;
          } catch {
            instanceVars = {};
          }
        }
        
        return {
          task_id: task.id,
          process_id: task.instance_id,
          process_title: instance?.title || '',
          process_type: instance?.definition_key || '',
          node_name: task.name,
          initiator_name: instance?.initiator_name || '',
          action: taskHistory?.action || 'approved',
          comment: taskHistory?.comment || '',
          completed_at: task.completed_at || task.updated_at,
          form_data: instanceVars?.formData || {}
        };
      })
    );

    console.log(`\n返回的数据 (${completedTasksWithDetails.length} 条):`);
    completedTasksWithDetails.forEach((task, index) => {
      console.log(`\n${index + 1}. ${task.process_title}`);
      console.log(`   任务: ${task.node_name}`);
      console.log(`   操作: ${task.action}`);
      console.log(`   完成时间: ${task.completed_at}`);
    });

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await connection.end();
  }
}

testMyCompletedTasksAPI();