import { db } from './database/connection.js';

async function checkWorkflowDefinition() {
  try {
    console.log('正在查询设备入库流程定义...');
    
    // 查询设备入库流程定义
    const definition = await db.queryOne(`
      SELECT id, \`key\`, name, node_config 
      FROM workflow_definitions 
      WHERE \`key\` = 'equipment-inbound' AND status = 'active' 
      ORDER BY version DESC LIMIT 1
    `);
    
    if (!definition) {
      console.log('未找到设备入库流程定义');
      return;
    }
    
    console.log('流程定义信息:');
    console.log('ID:', definition.id);
    console.log('Key:', definition.key);
    console.log('Name:', definition.name);
    
    // 解析节点配置
    let nodeConfig = definition.node_config;
    if (typeof nodeConfig === 'string') {
      nodeConfig = JSON.parse(nodeConfig);
    }
    
    console.log('\n节点配置:');
    console.log(JSON.stringify(nodeConfig, null, 2));
    
    // 查找仓库管理员审批节点
    const approvalNodes = nodeConfig.nodes.filter(node => 
      node.type === 'userTask' && node.name.includes('仓库管理员')
    );
    
    if (approvalNodes.length > 0) {
      console.log('\n仓库管理员审批节点:');
      approvalNodes.forEach(node => {
        console.log('Node ID:', node.id);
        console.log('Node Name:', node.name);
        console.log('Approval Config:', JSON.stringify(node.config?.approvalConfig || node.approvalConfig, null, 2));
      });
    } else {
      console.log('\n未找到仓库管理员审批节点');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit();
  }
}

checkWorkflowDefinition();