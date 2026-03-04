const mysql = require('mysql2/promise');
const fs = require('fs');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'pmuser',
  password: 'pmuser123',
  database: 'project_management_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const sql = fs.readFileSync('./database/migrations/051_add_performance_indexes.sql', 'utf8');

const statements = sql
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0 && !line.startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`找到 ${statements.length} 条SQL语句`);

(async () => {
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      await pool.execute(statement);
      successCount++;
      console.log(`✅ [${i + 1}/${statements.length}] 索引创建成功`);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_KEY_FILE_EXISTS') {
        skipCount++;
        console.log(`⏭️  [${i + 1}/${statements.length}] 索引已存在，跳过`);
      } else {
        errorCount++;
        console.error(`❌ [${i + 1}/${statements.length}] 索引创建失败:`, error.message);
      }
    }
  }
  
  console.log(`
=========================================
  索引优化完成
=========================================
  成功: ${successCount}
  跳过: ${skipCount}
  失败: ${errorCount}
=========================================
  `);
  
  await pool.end();
})();
