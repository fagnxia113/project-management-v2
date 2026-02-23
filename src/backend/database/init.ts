import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 数据库初始化脚本
 * 创建数据库和表结构
 */
async function initDatabase() {
  console.log('开始初始化数据库...');

  // 创建连接（不含数据库名）
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    const dbName = process.env.DB_DATABASE || 'project_management_v2';

    // 创建数据库
    console.log(`检查数据库 ${dbName} 是否存在...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${dbName} 已就绪`);

    // 切换到目标数据库
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ 已切换到数据库 ${dbName}`);

    // 读取建表SQL
    const sqlPath = join(process.cwd(), 'src/backend/database/migrations/001_create_core_tables.sql');
    console.log(`读取SQL文件: ${sqlPath}`);
    let sqlScript = readFileSync(sqlPath, 'utf-8');

    // 预处理：将注释行替换为空
    sqlScript = sqlScript.replace(/^--.*$/gm, '');

    // 分割SQL语句（按分号分割，保留空语句以便后续处理）
    const statements = sqlScript
      .split(';')
      .map(s => s.trim().replace(/\s+/g, ' '))  // 压缩空格
      .filter(s => s.length > 0);

    // 第一批：执行所有CREATE TABLE语句（跳过VIEW）
    console.log('创建数据表...');
    let createCount = 0;
    for (const statement of statements) {
      const upper = statement.toUpperCase();
      // 只执行 CREATE TABLE，跳过 CREATE VIEW
      if (upper.startsWith('CREATE TABLE')) {
        try {
          await connection.query(statement);
          createCount++;
          // 打印表名
          const tableMatch = statement.match(/CREATE TABLE.*?`?(\w+)`?/i);
          if (tableMatch) {
            console.log(`  ✓ 创建表: ${tableMatch[1]}`);
          }
        } catch (error: any) {
          // 忽略已存在的错误
          if (!error.message.includes('already exists')) {
            console.error('创建表失败:', statement.substring(0, 80) + '...');
            console.error('错误:', error.message);
            throw error;
          }
        }
      }
    }
    console.log(`✅ 共创建了 ${createCount} 个数据表`);

    // 第二批：执行所有CREATE VIEW语句
    console.log('创建视图...');
    for (const statement of statements) {
      if (statement.toUpperCase().includes('CREATE VIEW')) {
        try {
          await connection.query(statement);
          console.log(`  ✓ 创建视图: equipment_stock`);
        } catch (error: any) {
          console.error('创建视图失败:', error.message);
        }
      }
    }

    // 第三批：执行所有ALTER TABLE语句（添加外键）
    console.log('添加外键约束...');
    let alterCount = 0;
    for (const statement of statements) {
      if (statement.toUpperCase().startsWith('ALTER')) {
        try {
          await connection.query(statement);
          alterCount++;
        } catch (error: any) {
          // 忽略外键已存在的错误
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate key name')) {
            console.error('添加外键失败:', statement.substring(0, 50) + '...');
            throw error;
          }
        }
      }
    }
    console.log(`✅ 共添加了 ${alterCount} 个外键约束`);

    console.log('✅ 数据库表结构创建完成');
    console.log(`
=========================================
  数据库初始化成功
=========================================
  数据库名: ${dbName}
  表结构: 已创建
  时间: ${new Date().toLocaleString('zh-CN')}
=========================================
    `);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行初始化
initDatabase()
  .then(() => {
    console.log('初始化完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exit(1);
  });
