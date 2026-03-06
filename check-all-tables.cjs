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
    console.log('========== 查询数据库中的所有表 ==========');
    const [tables] = await db.query(
      'SHOW TABLES'
    );
    
    console.log(`找到 ${tables.length} 张表:`);
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
