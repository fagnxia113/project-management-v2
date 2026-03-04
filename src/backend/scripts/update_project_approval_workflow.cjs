const mysql = require('mysql2/promise');

async function updateProjectApprovalWorkflow() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: 'pmuser',
    password: 'pmuser123',
    database: 'project_management_v2'
  });

  try {
    // 获取当前配置
    const [rows] = await connection.execute(
      'SELECT id, node_config FROM workflow_definitions WHERE `key` = ?',
      ['project-approval']
    );

    if (rows.length === 0) {
      console.log('未找到项目审批流程定义');
      return;
    }

    const config = typeof rows[0].node_config === 'string' 
      ? JSON.parse(rows[0].node_config) 
      : rows[0].node_config;
    console.log('当前配置:', JSON.stringify(config, null, 2));
    
    // 更新部门经理审批节点
    const deptManagerNode = config.nodes.find(n => n.id === 'dept-manager');
    if (deptManagerNode && deptManagerNode.approvalConfig) {
      deptManagerNode.approvalConfig.skipIfNoApprover = true;
      delete deptManagerNode.approvalConfig.skipCondition;
      console.log('✓ 更新部门经理审批节点配置');
    }

    // 更新总经理审批节点
    const gmNode = config.nodes.find(n => n.id === 'gm');
    if (gmNode && gmNode.approvalConfig) {
      gmNode.approvalConfig.skipIfNoApprover = true;
      delete gmNode.approvalConfig.skipCondition;
      console.log('✓ 更新总经理审批节点配置');
    }

    // 保存更新后的配置
    await connection.execute(
      'UPDATE workflow_definitions SET node_config = ? WHERE `key` = ?',
      [JSON.stringify(config), 'project-approval']
    );

    console.log('✓ 项目审批流程配置已更新');
    console.log('\n更新后的节点配置:');
    config.nodes.filter(n => n.type === 'userTask').forEach(node => {
      console.log(`  - ${node.name}:`, node.approvalConfig);
    });

  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await connection.end();
  }
}

updateProjectApprovalWorkflow();
