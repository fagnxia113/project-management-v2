const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function testTaskService() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('测试 TaskService 的用户映射...');

    // 模拟 TaskService.getTasksByAssignee 的逻辑
    const assigneeId = 'eb207764-e0d3-4f84-9463-8a8c065214a9';
    
    // 获取部门和职位名称映射
    const departments = await connection.query('SELECT id, name FROM departments');
    const positions = await connection.query('SELECT id, name FROM positions');
    const employeeList = await connection.query('SELECT id, name FROM employees');
    const deptMap = Object.fromEntries(departments[0].map((d) => [d.id, d.name]));
    const posMap = Object.fromEntries(positions[0].map((p) => [p.id, p.name]));
    const userMap = Object.fromEntries(employeeList[0].map((e) => [e.id, e.name]));

    console.log('\n用户映射:');
    console.log(JSON.stringify(userMap, null, 2));

    // 查询任务
    const rows = await connection.query(`
      SELECT t.*, i.title as process_title, i.definition_key, i.initiator_id, i.initiator_name, 
             i.variables as instance_variables, d.node_config as definition_node_config
      FROM workflow_tasks t
      JOIN workflow_instances i ON t.instance_id = i.id
      JOIN workflow_definitions d ON i.definition_id = d.id
      WHERE i.definition_key = 'project-approval'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);

    if (rows[0].length === 0) {
      console.log('未找到任务');
      return;
    }

    const row = rows[0][0];
    
    // 解析流程变量
    let instanceVars = {};
    if (row.instance_variables) {
      try {
        instanceVars = typeof row.instance_variables === 'string' 
          ? JSON.parse(row.instance_variables) 
          : row.instance_variables;
      } catch {
        instanceVars = {};
      }
    }
    
    // 获取表单数据并转换ID为名称
    const formData = instanceVars.formData || {};
    const enrichedFormData = {
      ...formData,
      _deptMap: deptMap,
      _posMap: posMap,
      _userMap: userMap
    };
    
    console.log('\n原始 formData:');
    console.log(JSON.stringify(formData, null, 2));
    
    console.log('\nenriched formData:');
    console.log(JSON.stringify(enrichedFormData, null, 2));

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await connection.end();
  }
}

testTaskService();