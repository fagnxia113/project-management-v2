import mysql from 'mysql2/promise';

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });

  // 检查流程实例的执行日志
  const instanceId = '84ae5eda-6b39-4ebd-9cb0-a8f44a6fda53';
  const [logs] = await conn.query(
    'SELECT * FROM workflow_execution_logs WHERE instance_id = ? ORDER BY created_at',
    [instanceId]
  );
  console.log('执行日志:');
  logs.forEach(log => {
    console.log(`[${log.timestamp}] ${log.action} - node: ${log.node_id}, status: ${log.status}`);
  });
  
  // 检查任务状态
  const [tasks] = await conn.query(
    'SELECT * FROM workflow_tasks WHERE instance_id = ?',
    [instanceId]
  );
  console.log('\n任务状态:');
  tasks.forEach(t => {
    console.log(`- ${t.name} (${t.status}) assignee: ${t.assignee_id}`);
  });
  
  await conn.end();
})();
