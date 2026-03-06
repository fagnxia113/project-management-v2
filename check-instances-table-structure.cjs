const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'project_management_v3',
  waitForConnections: true,
  connectionLimit: 10
});

(async () => {
  try {
    console.log('========== 查询 equipment_instances 表结构 ==========');
    const [rows] = await db.query(
      'DESCRIBE equipment_instances'
    );
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Field} - ${row.Type} - ${row.Null} - ${row.Key} - ${row.Default}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
