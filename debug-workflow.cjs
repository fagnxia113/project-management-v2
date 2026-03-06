const db = require('./src/backend/database/connection.js');

async function debugWorkflow() {
  try {
    console.log('========== 查询流程定义 ==========');
    const definitions = await db.query(
      `SELECT id, \`key\`, name, node_config FROM workflow_definitions WHERE \`key\` = 'employee-onboard'`
    );
    
    if (definitions.length > 0) {
      const def = definitions[0];
      console.log('\n流程定义ID:', def.id);
      console.log('流程标识:', def.key);
      console.log('流程名称:', def.name);
      
      const nodeConfig = JSON.parse(def.node_config);
      console.log('\n========== 节点配置 ==========');
      
      for (const node of nodeConfig.nodes) {
        console.log(`\n节点ID: ${node.id}`);
        console.log(`节点名称: ${node.name}`);
        console.log(`节点类型: ${node.type}`);
        
        if (node.config && node.config.approvalConfig) {
          console.log(`审批配置:`);
          console.log(`  审批类型: ${node.config.approvalConfig.approvalType}`);
          console.log(`  审批人来源: ${JSON.stringify(node.config.approvalConfig.approverSource, null, 2)}`);
          console.log(`  跳过条件: ${node.config.approvalConfig.skipCondition || '未设置'}`);
          console.log(`  无审批人跳过: ${node.config.approvalConfig.skipIfNoApprover || false}`);
        }
      }
    }
    
    console.log('\n\n========== 查询用户列表 ==========');
    const users = await db.query(
      `SELECT u.id, u.username, u.role, e.id as employee_id, e.name as employee_name, e.department_id 
       FROM users u 
       LEFT JOIN employees e ON u.id = e.user_id 
       ORDER BY u.id`
    );
    
    for (const user of users) {
      console.log(`\n用户ID: ${user.id}`);
      console.log(`  用户名: ${user.username}`);
      console.log(`  角色: ${user.role}`);
      console.log(`  员工ID: ${user.employee_id || '未关联'}`);
      console.log(`  员工姓名: ${user.employee_name || '未关联'}`);
      console.log(`  部门ID: ${user.department_id || '未设置'}`);
    }
    
    console.log('\n\n========== 查询部门信息 ==========');
    const departments = await db.query(
      `SELECT id, name, manager_id, manager_name FROM departments`
    );
    
    for (const dept of departments) {
      console.log(`\n部门ID: ${dept.id}`);
      console.log(`  部门名称: ${dept.name}`);
      console.log(`  经理ID: ${dept.manager_id || '未设置'}`);
      console.log(`  经理姓名: ${dept.manager_name || '未设置'}`);
    }
    
    console.log('\n\n========== 查询最近的流程实例 ==========');
    const instances = await db.query(
      `SELECT id, definition_key, initiator_id, initiator_name, status, result, start_time 
       FROM workflow_instances 
       WHERE definition_key = 'employee-onboard' 
       ORDER BY start_time DESC 
       LIMIT 3`
    );
    
    for (const instance of instances) {
      console.log(`\n实例ID: ${instance.id}`);
      console.log(`  发起人ID: ${instance.initiator_id}`);
      console.log(`  发起人姓名: ${instance.initiator_name}`);
      console.log(`  状态: ${instance.status}`);
      console.log(`  结果: ${instance.result || '进行中'}`);
      console.log(`  开始时间: ${instance.start_time}`);
      
      const tasks = await db.query(
        `SELECT id, name, assignee_id, assignee_name, status, result 
         FROM workflow_tasks 
         WHERE instance_id = ?`,
        [instance.id]
      );
      
      console.log(`  任务数量: ${tasks.length}`);
      for (const task of tasks) {
        console.log(`    - ${task.name}: ${task.assignee_name || '未分配'} (${task.status}, ${task.result || '待处理'})`);
      }
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    process.exit(0);
  }
}

debugWorkflow();