const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'project_management_v3.db');
const db = new Database(dbPath);

try {
  const result = db.prepare(`
    SELECT id, \`key\`, name, node_config 
    FROM workflow_definitions 
    WHERE \`key\` = 'employee-onboard' AND status = 'active'
  `).get();

  if (result) {
    console.log('流程定义ID:', result.id);
    console.log('流程定义Key:', result.key);
    console.log('流程定义名称:', result.name);
    console.log('\n节点配置:');
    const nodeConfig = JSON.parse(result.node_config);
    console.log(JSON.stringify(nodeConfig, null, 2));
    
    // 查看第一个审批节点的详细配置
    const approvalNode = nodeConfig.nodes.find(n => n.id === 'hr-manager');
    if (approvalNode) {
      console.log('\nHR经理审批节点配置:');
      console.log(JSON.stringify(approvalNode, null, 2));
    }
  } else {
    console.log('未找到流程定义');
  }
} catch (error) {
  console.error('查询失败:', error);
} finally {
  db.close();
}