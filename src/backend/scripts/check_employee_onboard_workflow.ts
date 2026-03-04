import { db } from '../database/connection.js';

async function checkEmployeeOnboardWorkflow() {
  console.log('开始检查人员入职流程定义...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const definition = await db.queryOne(
      `SELECT id, \`key\`, name, version, status, node_config, form_template_id 
       FROM workflow_definitions 
       WHERE \`key\` = 'employee-onboard' AND status = 'active'`
    );

    if (!definition) {
      console.log('❌ 未找到人员入职流程定义');
      await db.close();
      process.exit(1);
    }

    console.log('📊 流程定义信息:');
    console.log(`   ID: ${definition.id}`);
    console.log(`   Key: ${definition.key}`);
    console.log(`   名称: ${definition.name}`);
    console.log(`   版本: ${definition.version}`);
    console.log(`   状态: ${definition.status}`);
    console.log(`   表单模板ID: ${definition.form_template_id}`);

    const nodeConfig = typeof definition.node_config === 'string' 
      ? JSON.parse(definition.node_config) 
      : definition.node_config;
    
    console.log('\n📋 节点列表:');
    console.log('节点ID | 类型 | 名称');
    console.log('-------|------|------');
    nodeConfig.nodes.forEach((node: any) => {
      console.log(`${node.id.padEnd(15)} | ${node.type.padEnd(12)} | ${node.name}`);
    });

    console.log('\n🔗 连接列表:');
    console.log('ID | 源节点 | 目标节点');
    console.log('---|---------|---------');
    nodeConfig.edges.forEach((edge: any) => {
      console.log(`${edge.id.padEnd(15)} | ${edge.source.padEnd(15)} | ${edge.target}`);
    });

    console.log('\n⚠️  问题分析:');
    
    const startNode = nodeConfig.nodes.find((n: any) => n.type === 'start');
    const startEventNode = nodeConfig.nodes.find((n: any) => n.type === 'startEvent');
    const serviceNode = nodeConfig.nodes.find((n: any) => n.id === 'create_employee');
    
    if (startNode) {
      console.log('   ✅ 发现开始节点: start (会映射为 startEvent)');
    }
    if (startEventNode) {
      console.log('   ✅ 发现开始节点: startEvent');
    }
    
    if (serviceNode) {
      console.log(`   ✅ 发现创建员工服务节点: ${serviceNode.type} (会映射为 serviceTask)`);
      if (serviceNode.type !== 'service' && serviceNode.type !== 'serviceTask') {
        console.log(`   ℹ️  节点类型: ${serviceNode.type}`);
      }
    } else {
      console.log('   ❌ 未找到创建员工服务节点');
    }
    
    console.log('\n📝 节点类型映射说明:');
    console.log('   数据库类型 -> 引擎类型');
    console.log('   start -> startEvent');
    console.log('   end -> endEvent');
    console.log('   approval -> userTask');
    console.log('   service -> serviceTask');
    console.log('   exclusive -> exclusiveGateway');
    console.log('   parallel -> parallelGateway');
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkEmployeeOnboardWorkflow().then(() => process.exit(0));