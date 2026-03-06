const mysql = require('mysql2/promise');

async function checkWorkflowTasks() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });

  try {
    const completedInstances = [
      '56087c03-3c86-46cc-9cf6-74d2597fbdcc',
      '591e334e-cfd0-4248-99a5-bfc502766582',
      '6a2dd9d6-0997-4fcc-b533-0fe03225e75e'
    ];

    console.log('========== 检查已完成流程的任务历史 ==========\n');

    for (const instanceId of completedInstances) {
      console.log(`\n流程ID: ${instanceId}`);
      
      const [tasks] = await connection.query(
        `SELECT id, node_id, status, assignee_id, completed_at 
         FROM workflow_tasks 
         WHERE instance_id = ? 
         ORDER BY created_at`,
        [instanceId]
      );

      console.log(`任务总数: ${tasks.length}`);
      tasks.forEach(task => {
        console.log(`  - 节点ID: ${task.node_id}, 状态: ${task.status}, 完成时间: ${task.completed_at}`);
      });
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await connection.end();
  }
}

checkWorkflowTasks();