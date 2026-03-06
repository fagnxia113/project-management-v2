import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

async function updateWorkflowDefinition() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });

  try {
    console.log('开始更新工作流定义...');

    const [result] = await connection.query(`
      UPDATE workflow_definitions 
      SET form_schema = JSON_SET(
        form_schema,
        '$[1].name',
        'warehouse_manager_id'
      )
      WHERE \`key\` = 'equipment-inbound' AND status = 'active'
    `);

    console.log('更新结果:', result);

    const [checkResult] = await connection.query(`
      SELECT form_schema FROM workflow_definitions 
      WHERE \`key\` = 'equipment-inbound' AND status = 'active'
    `);

    console.log('更新后的form_schema:', JSON.stringify(checkResult[0].form_schema, null, 2));

    console.log('工作流定义更新成功！');
  } catch (error) {
    console.error('更新工作流定义失败:', error);
  } finally {
    await connection.end();
  }
}

updateWorkflowDefinition();