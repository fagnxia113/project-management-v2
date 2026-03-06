import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updateWorkflowDefinition() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('更新设备入库流程的工作流定义...');
    
    // 更新仓库管理员审批节点的审批人来源
    const [result] = await connection.query(`
      UPDATE workflow_definitions 
      SET node_config = JSON_SET(
        JSON_SET(
          node_config,
          '$.nodes[1].config.approvalConfig.approverSource.type',
          'warehouse_manager'
        ),
        '$.nodes[1].config.approvalConfig.approverSource',
        JSON_OBJECT('type', 'warehouse_manager')
      )
      WHERE \`key\` = 'equipment-inbound' AND status = 'active'
    `);
    
    console.log('更新结果:', result);
    
    // 验证更新
    const [rows] = await connection.query(`
      SELECT id, \`key\`, node_config 
      FROM workflow_definitions 
      WHERE \`key\` = 'equipment-inbound' AND status = 'active'
    `);
    
    if (rows.length > 0) {
      const definition = rows[0];
      console.log('\n更新后的工作流定义:');
      console.log('流程ID:', definition.id);
      console.log('流程Key:', definition.key);
      
      const nodeConfig = JSON.parse(definition.node_config);
      const warehouseManagerNode = nodeConfig.nodes.find(node => node.id === 'warehouse-manager');
      
      if (warehouseManagerNode) {
        console.log('\n仓库管理员审批节点配置:');
        console.log(JSON.stringify(warehouseManagerNode.config.approvalConfig, null, 2));
      }
    }
    
    console.log('\n✅ 工作流定义更新成功');
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await connection.end();
  }
}

updateWorkflowDefinition();