const mysql = require('mysql2/promise');

async function checkAllWorkflowDefinitions() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 查询所有流程定义
    const [definitions] = await connection.execute(`
      SELECT id, \`key\`, name, version 
      FROM workflow_definitions 
      ORDER BY \`key\`, version DESC
    `);

    console.log('所有流程定义:');
    console.log(JSON.stringify(definitions, null, 2));

    // 查询最新的入职流程定义
    const [onboardDefinitions] = await connection.execute(`
      SELECT id, \`key\`, name, version, node_config 
      FROM workflow_definitions 
      WHERE \`key\` LIKE '%onboard%' OR \`key\` LIKE '%employee%'
      ORDER BY version DESC
    `);

    if (onboardDefinitions.length > 0) {
      console.log('\n入职相关流程定义:');
      onboardDefinitions.forEach(def => {
        console.log(`- ${def.name} (${def.key}) v${def.version}`);
        if (def.node_config) {
          const nodeConfig = JSON.parse(def.node_config);
          console.log('  节点配置:', JSON.stringify(nodeConfig, null, 2));
        }
      });
    }

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkAllWorkflowDefinitions();