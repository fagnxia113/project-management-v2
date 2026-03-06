const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'project_management.db');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);

async function checkWorkflowDefinition() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, \`key\`, name, node_config FROM workflow_definitions WHERE \`key\` = 'employee-onboard' AND status = 'active'`,
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          console.log('未找到活跃的入职流程定义');
          resolve(null);
          return;
        }
        
        console.log('========== 流程定义信息 ==========');
        console.log('ID:', row.id);
        console.log('标识:', row.key);
        console.log('名称:', row.name);
        
        const nodeConfig = JSON.parse(row.node_config);
        console.log('\n========== 节点配置 ==========');
        
        for (const node of nodeConfig.nodes) {
          console.log(`\n节点: ${node.name} (${node.id})`);
          console.log(`类型: ${node.type}`);
          
          if (node.config) {
            console.log(`配置:`);
            console.log(JSON.stringify(node.config, null, 2));
          }
        }
        
        resolve(row);
      }
    );
  });
}

checkWorkflowDefinition()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('错误:', err);
    db.close();
    process.exit(1);
  });