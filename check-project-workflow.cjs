const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkWorkflowDefinitions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查项目审批流程定义...');

    const definitions = await connection.query(`
      SELECT id, \`key\`, name, category, status, form_schema
      FROM workflow_definitions
      WHERE \`key\` = 'project-approval' OR category = 'project'
      ORDER BY created_at DESC
    `);

    console.log(`找到 ${definitions[0].length} 个项目相关流程定义:`);

    for (const def of definitions[0]) {
      console.log(`\n流程定义 ID: ${def.id}`);
      console.log(`标识: ${def.key}`);
      console.log(`名称: ${def.name}`);
      console.log(`分类: ${def.category}`);
      console.log(`状态: ${def.status}`);
      
      if (def.form_schema) {
        const formSchema = typeof def.form_schema === 'string' ? JSON.parse(def.form_schema) : def.form_schema;
        console.log(`表单字段数量: ${formSchema.fields ? formSchema.fields.length : 0}`);
        if (formSchema.fields) {
          console.log(`表单字段: ${formSchema.fields.map(f => f.name).join(', ')}`);
        }
      }
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkWorkflowDefinitions();