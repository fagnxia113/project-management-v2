const mysql = require('mysql2/promise');

async function testApproverResolution() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    const employeeId = '09694afa-6a5b-4885-8e1a-72588219ad16';
    
    console.log('测试1: 作为员工ID查询');
    const row1 = await connection.execute(`
      SELECT id, name, department_id, position, user_id 
      FROM employees 
      WHERE id = ?
    `, [employeeId]);
    console.log('结果:', row1[0]);

    console.log('\n测试2: 作为用户ID查询');
    const userId = 'eb207764-e0d3-4f84-9463-8a8c065214a9';
    const row2 = await connection.execute(`
      SELECT u.id as user_id, e.id as employee_id, e.name, e.department_id, e.position 
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.id = ?
    `, [userId]);
    console.log('结果:', row2[0]);

    console.log('\n测试3: 查询users表');
    const row3 = await connection.execute(`
      SELECT id, username, name 
      FROM users 
      WHERE id = ?
    `, [userId]);
    console.log('结果:', row3[0]);

    console.log('\n测试4: 查询employees表');
    const row4 = await connection.execute(`
      SELECT id, user_id, employee_no, name 
      FROM employees 
      WHERE user_id = ?
    `, [userId]);
    console.log('结果:', row4[0]);

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

testApproverResolution();