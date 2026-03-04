import { db } from '../database/connection.js';

async function checkWorkflowInstance() {
  console.log('开始检查流程实例数据...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const instance = await db.queryOne(
      `SELECT id, definition_id, definition_key, title, status, result, 
              initiator_id, initiator_name, start_time, end_time, 
              current_node_id, current_node_name, business_id, variables
       FROM workflow_instances 
       ORDER BY start_time DESC 
       LIMIT 1`
    );

    if (!instance) {
      console.log('❌ 未找到流程实例');
      await db.close();
      process.exit(1);
    }

    console.log('📊 流程实例信息:');
    console.log(`   ID: ${instance.id}`);
    console.log(`   流程Key: ${instance.definition_key}`);
    console.log(`   标题: ${instance.title}`);
    console.log(`   状态: ${instance.status}`);
    console.log(`   结果: ${instance.result || 'N/A'}`);
    console.log(`   发起人: ${instance.initiator_name} (${instance.initiator_id})`);
    console.log(`   当前节点: ${instance.current_node_name || 'N/A'} (${instance.current_node_id || 'N/A'})`);
    console.log(`   业务ID: ${instance.business_id || 'N/A'}`);

    const variables = typeof instance.variables === 'string' 
      ? JSON.parse(instance.variables) 
      : instance.variables;
    
    console.log('\n📝 变量数据:');
    console.log(JSON.stringify(variables, null, 2));

    if (variables.formData) {
      console.log('\n📋 表单数据:');
      console.log(JSON.stringify(variables.formData, null, 2));
    }
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkWorkflowInstance().then(() => process.exit(0));