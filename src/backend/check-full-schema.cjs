const mysql = require('mysql2/promise');

async function checkFullSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });
  
  const [rows] = await connection.query('SELECT id, form_schema FROM workflow_definitions WHERE `key` = ? AND status = ?', ['equipment-inbound', 'active']);
  
  if (rows.length > 0) {
    const formSchema = rows[0].form_schema;
    console.log('Form schema fields:');
    formSchema.forEach((field, index) => {
      console.log(`\nField ${index}:`);
      console.log(`  name: ${field.name}`);
      console.log(`  type: ${field.type}`);
      console.log(`  label: ${field.label}`);
      if (field.display) {
        console.log(`  display: ${JSON.stringify(field.display)}`);
      }
    });
  }
  
  await connection.end();
}

checkFullSchema();