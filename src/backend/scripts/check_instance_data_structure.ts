import { db } from '../database/connection.js';

async function checkWorkflowInstanceData() {
  console.log('开始检查流程实例数据结构...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const instance = await db.queryOne(
      `SELECT id, definition_key, status, variables 
       FROM workflow_instances 
       WHERE definition_key = 'employee-onboard' 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (!instance) {
      console.log('❌ 未找到人员入职流程实例');
      await db.close();
      process.exit(1);
    }

    console.log('📊 流程实例信息:');
    console.log(`   ID: ${instance.id}`);
    console.log(`   流程Key: ${instance.definition_key}`);
    console.log(`   状态: ${instance.status}`);

    const variables = typeof instance.variables === 'string' 
      ? JSON.parse(instance.variables) 
      : instance.variables;
    
    console.log('\n📝 变量数据结构:');
    console.log(JSON.stringify(variables, null, 2));

    console.log('\n🔍 检查数据结构:');
    if (variables.formData) {
      console.log('   ✅ 有 formData 字段');
      console.log(`   📋 formData 字段数: ${Object.keys(variables.formData).length}`);
      console.log(`   📋 formData 字段: ${Object.keys(variables.formData).join(', ')}`);
    } else {
      console.log('   ❌ 没有 formData 字段');
      console.log('   ⚠️  表单数据直接在根级别');
      console.log(`   📋 根级别字段数: ${Object.keys(variables).length}`);
      console.log(`   📋 根级别字段: ${Object.keys(variables).join(', ')}`);
    }
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkWorkflowInstanceData().then(() => process.exit(0));