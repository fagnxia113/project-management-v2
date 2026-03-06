const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 读取 .env 文件
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

async function checkWorkflow() {
  try {
    const connection = await mysql.createConnection({
      host: env.DB_HOST || 'localhost',
      port: parseInt(env.DB_PORT || '3306'),
      user: env.DB_USERNAME || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_DATABASE || 'project_management_v3',
      charset: 'utf8mb4'
    });

    const [rows] = await connection.execute(`
      SELECT id, \`key\`, name, node_config 
      FROM workflow_definitions 
      WHERE \`key\` = 'employee-onboard' AND status = 'active'
    `);

    if (rows.length > 0) {
      const result = rows[0];
      console.log('流程定义ID:', result.id);
      console.log('流程定义Key:', result.key);
      console.log('流程定义名称:', result.name);
      console.log('\n节点配置:');
      
      let nodeConfig;
      if (typeof result.node_config === 'string') {
        nodeConfig = JSON.parse(result.node_config);
      } else {
        nodeConfig = result.node_config;
      }
      
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

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkWorkflow();