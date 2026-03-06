const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 查询流程定义中配置的审批人
    const configuredApproverId = '09694afa-6a5b-4885-8e1a-72588219ad16';
    const [configuredUsers] = await connection.execute(`
      SELECT id, username, name, email, status 
      FROM users 
      WHERE id = ?
    `, [configuredApproverId]);

    console.log('流程定义中配置的审批人:');
    console.log(JSON.stringify(configuredUsers, null, 2));

    // 查询游爽的信息
    const [youshuangUsers] = await connection.execute(`
      SELECT id, username, name, email, status 
      FROM users 
      WHERE name LIKE '%游爽%' OR username LIKE '%游爽%'
    `);

    console.log('\n游爽的信息:');
    console.log(JSON.stringify(youshuangUsers, null, 2));

    // 查询所有用户
    const [allUsers] = await connection.execute(`
      SELECT id, username, name, email, status 
      FROM users 
      WHERE status = 'active'
      LIMIT 10
    `);

    console.log('\n活跃用户列表:');
    console.log(JSON.stringify(allUsers, null, 2));

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkUsers();