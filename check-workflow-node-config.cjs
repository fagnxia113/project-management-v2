const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkWorkflowNodeConfig() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查项目审批流程的节点配置...');

    const definitions = await connection.query(`
      SELECT id, \`key\`, name, node_config
      FROM workflow_definitions
      WHERE \`key\` = 'equipment-inbound'
    `);

    for (const def of definitions[0]) {
      console.log(`\n流程定义: ${def.name} (${def.key})`);
      
      if (def.node_config) {
        const nodeConfig = typeof def.node_config === 'string' ? JSON.parse(def.node_config) : def.node_config;
        
        console.log(`节点数量: ${nodeConfig.nodes ? nodeConfig.nodes.length : 0}`);
        
        if (nodeConfig.nodes) {
          for (const node of nodeConfig.nodes) {
            console.log(`\n节点: ${node.name} (${node.id})`);
            console.log(`类型: ${node.type}`);
            
            if (node.config) {
              console.log(`配置: ${JSON.stringify(node.config, null, 2)}`);
            }
          }
        }
        
        if (nodeConfig.variables) {
          console.log(`\n流程变量: ${JSON.stringify(nodeConfig.variables, null, 2)}`);
        }
      }
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkWorkflowNodeConfig();