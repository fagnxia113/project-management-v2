const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkEmployeesTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查 employees 表结构...');

    const [columns] = await connection.query(`
      SHOW COLUMNS FROM employees
    `);

    console.log('字段列表:');
    for (const column of columns) {
      console.log(`  - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `KEY: ${column.Key}` : ''}`);
    }

    console.log('\n检查 employees 表数据...');
    const employees = await connection.query(`
      SELECT e.*, p.name as position_name, d.name as department_name 
      FROM employees e 
      LEFT JOIN positions p ON e.position = p.id 
      LEFT JOIN departments d ON e.department_id = d.id 
      LIMIT 5
    `);

    console.log(`找到 ${employees[0].length} 条员工记录:`);
    for (const employee of employees[0]) {
      console.log(`  - ID: ${employee.id}, 姓名: ${employee.name}, 岗位: ${employee.position_name || employee.position}, 部门: ${employee.department_name}`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkEmployeesTable();