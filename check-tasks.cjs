const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

async function checkTasks() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 查看表结构
    const [columns] = await connection.execute('SHOW COLUMNS FROM workflow_tasks');
    console.log('workflow_tasks 表结构:');
    console.log(JSON.stringify(columns, null, 2));

    // 查询任务
    const [rows] = await connection.execute(`
      SELECT * FROM workflow_tasks 
      WHERE instance_id = '297222a8-4848-42fd-886c-c3405c288232'
    `);

    console.log('\n任务列表:');
    console.log(JSON.stringify(rows, null, 2));

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkTasks();
