const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkExecutionsTableStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查 workflow_executions 表结构...');

    const [columns] = await connection.query(`
      SHOW COLUMNS FROM workflow_executions
    `);

    console.log('字段列表:');
    for (const column of columns) {
      console.log(`  - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `KEY: ${column.Key}` : ''}`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkExecutionsTableStructure();