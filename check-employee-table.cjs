const mysql = require('mysql2/promise');

async function checkEmployeeTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '12345678',
      database: 'project_management_v3',
      charset: 'utf8mb4'
    });

    // 查询游爽的员工信息
    const [employees] = await connection.execute(`
      SELECT id, user_id, employee_no, name, status 
      FROM employees 
      WHERE name LIKE '%游爽%' OR employee_no LIKE '%游爽%'
    `);

    console.log('游爽的员工信息:');
    console.log(JSON.stringify(employees, null, 2));

    // 查询所有员工，看看ID格式
    const [allEmployees] = await connection.execute(`
      SELECT id, user_id, employee_no, name, status 
      FROM employees 
      LIMIT 5
    `);

    console.log('\n所有员工信息（前5条）:');
    console.log(JSON.stringify(allEmployees, null, 2));

    // 检查流程定义中配置的ID对应的员工
    const configuredId = '09694afa-6a5b-4885-8e1a-72588219ad16';
    const [configuredEmployees] = await connection.execute(`
      SELECT id, user_id, employee_no, name, status 
      FROM employees 
      WHERE id = ? OR user_id = ?
    `, [configuredId, configuredId]);

    console.log('\n流程定义中配置的ID对应的员工:');
    console.log(JSON.stringify(configuredEmployees, null, 2));

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error);
  }
}

checkEmployeeTable();