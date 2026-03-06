const mysql = require('mysql2/promise');

async function clearWorkflowCache() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 清除所有流程定义的缓存
    const [result] = await connection.execute(`
      UPDATE workflow_definitions 
      SET updated_at = NOW()
      WHERE \`key\` = 'employee-onboard'
    `);

    console.log('已清除流程定义缓存:', result.affectedRows);

    await connection.end();
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
}

clearWorkflowCache();