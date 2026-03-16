const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./project-management.db');

db.all(`SELECT id, title, variables FROM workflow_instances WHERE definition_key IN ('equipment-transfer', 'preset-equipment-transfer') ORDER BY created_at DESC LIMIT 3`, (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Recent instances:");
  rows.forEach(row => {
    let vars = '{}';
    try { vars = JSON.parse(row.variables || '{}'); } catch(e){}
    console.log(`\nID: ${row.id} - ${row.title}`);
    console.log(`fromManagerName: ${vars.formData?._fromManagerName}`);
    console.log(`toManagerName: ${vars.formData?._toManagerName}`);
    console.log(`items length: ${vars.formData?.items?.length}`);
    console.log(`items:`, JSON.stringify(vars.formData?.items));
  });
});
