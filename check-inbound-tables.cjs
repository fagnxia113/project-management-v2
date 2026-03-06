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
    console.log('========== 查询所有包含 inbound 的表 ==========');
    const [rows] = await db.query(
      "SHOW TABLES LIKE '%inbound%'"
    );
    
    console.log(`找到 ${rows.length} 个包含 inbound 的表:`);
    rows.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
