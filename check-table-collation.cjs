const mysql = require('mysql2/promise');

async function checkTableCollation() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    console.log('检查表的字符集配置:\n');

    // 检查users表
    const [users] = await connection.execute(`
      SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'project_management_v3' 
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'id'
    `);
    console.log('users表的id字段字符集:', users[0]);

    // 检查employees表
    const [employees] = await connection.execute(`
      SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'project_management_v3' 
      AND TABLE_NAME = 'employees'
      AND COLUMN_NAME = 'user_id'
    `);
    console.log('employees表的user_id字段字符集:', employees[0]);

    // 检查users表的默认字符集
    const [usersTable] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'project_management_v3' 
      AND TABLE_NAME = 'users'
    `);
    console.log('users表的默认字符集:', usersTable[0]);

    // 检查employees表的默认字符集
    const [employeesTable] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'project_management_v3' 
      AND TABLE_NAME = 'employees'
    `);
    console.log('employees表的默认字符集:', employeesTable[0]);

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkTableCollation();