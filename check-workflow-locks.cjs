const mysql = require('mysql2/promise');

async function checkWorkflowLocksTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 检查表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'project_management_v3' 
      AND TABLE_NAME = 'workflow_locks'
    `);

    console.log('workflow_locks 表存在:', tables.length > 0);

    if (tables.length === 0) {
      console.log('创建 workflow_locks 表...');
      await connection.execute(`
        CREATE TABLE workflow_locks (
          id VARCHAR(255) PRIMARY KEY,
          lock_key VARCHAR(255) NOT NULL,
          owner VARCHAR(255) NOT NULL,
          acquired_at DATETIME NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_lock_key (lock_key),
          INDEX idx_expires_at (expires_at),
          INDEX idx_owner (owner)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('workflow_locks 表创建成功');
    }

    // 检查表结构
    const [columns] = await connection.execute('SHOW COLUMNS FROM workflow_locks');
    console.log('\nworkflow_locks 表结构:');
    console.log(JSON.stringify(columns, null, 2));

    await connection.end();
  } catch (error) {
    console.error('检查失败:', error);
  }
}

checkWorkflowLocksTable();