const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'project_management_v3',
  waitForConnections: true,
  connectionLimit: 10
});

(async () => {
  try {
    console.log('========== 查询设备入库流程实例 ==========');
    const [instances] = await db.query(
      `SELECT id, definition_id, definition_key, status, current_node_id, current_node_name, business_id, created_at 
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    
    console.log(`找到 ${instances.length} 个设备入库流程实例:`);
    instances.forEach((inst, index) => {
      console.log(`\n${index + 1}. ${inst.id}`);
      console.log(`   状态: ${inst.status}`);
      console.log(`   结果: ${inst.result || '无'}`);
      console.log(`   当前节点: ${inst.current_node_id || '无'} (${inst.current_node_name || '无'})`);
      console.log(`   业务ID: ${inst.business_id || '无'}`);
      console.log(`   创建时间: ${inst.created_at}`);
    });
    
    if (instances.length > 0) {
      const instanceId = instances[0].id;
      console.log(`\n========== 查询流程实例 ${instanceId} 的任务 ==========`);
      const [tasks] = await db.query(
        `SELECT id, node_id, name, status, result, assignee_id, assignee_name, created_at, completed_at 
         FROM workflow_tasks 
         WHERE instance_id = ? 
         ORDER BY created_at`,
        [instanceId]
      );
      
      console.log(`找到 ${tasks.length} 个任务:`);
      tasks.forEach((task, index) => {
        console.log(`\n${index + 1}. ${task.id}`);
        console.log(`   节点: ${task.node_id} (${task.name})`);
        console.log(`   状态: ${task.status}`);
        console.log(`   结果: ${task.result || '无'}`);
        console.log(`   审批人: ${task.assignee_name || '无'}`);
        console.log(`   创建时间: ${task.created_at}`);
        console.log(`   完成时间: ${task.completed_at || '无'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
