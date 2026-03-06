const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });
  
  const [rows] = await connection.query('SELECT id, `key`, name FROM workflow_definitions WHERE `key` = ? AND status = ?', ['equipment-inbound', 'active']);
  console.log('Workflow definitions:', JSON.stringify(rows, null, 2));
  
  if (rows.length > 0) {
    const def = rows[0];
    const [schemaRows] = await connection.query('SELECT form_schema FROM workflow_definitions WHERE id = ?', [def.id]);
    console.log('\nForm schema second field (should be warehouse):', JSON.stringify(schemaRows[0].form_schema[1], null, 2));
  }
  
  await connection.end();
}

checkSchema();