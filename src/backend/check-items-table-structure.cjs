const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
  try {
    console.log('检查 equipment_inbound_items 表结构...');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '12345678',
      database: process.env.DB_DATABASE || 'project_management_v3',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+08:00',
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 60000,
      charset: 'utf8mb4'
    });

    const result = await pool.query('DESCRIBE equipment_inbound_items');
    console.log('表结构:');
    result[0].forEach(row => {
      console.log(`  ${row.Field} - ${row.Type} - ${row.Null} - ${row.Key} - ${row.Default}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('检查表结构失败:', error);
  } finally {
    process.exit(0);
  }
}

checkTableStructure();