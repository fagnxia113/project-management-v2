import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 执行迁移脚本
 */
async function runMigration() {
  const migrationFile = process.argv[2] || '019_fix_customer_type_enum.sql';
  
  console.log(`开始执行迁移: ${migrationFile}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    multipleStatements: true
  });

  try {
    const sqlPath = join(process.cwd(), 'src/backend/database/migrations', migrationFile);
    console.log(`读取SQL文件: ${sqlPath}`);
    const sqlScript = readFileSync(sqlPath, 'utf-8');

    // 预处理：移除注释行
    const cleanedScript = sqlScript.replace(/^--.*$/gm, '').trim();
    
    // 分割并执行每条SQL语句
    const statements = cleanedScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      console.log(`执行: ${statement.substring(0, 60)}...`);
      await connection.query(statement);
    }
    console.log('✅ 迁移执行成功');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => {
    console.log('迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });