const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkWarehouses() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'project_management_v2',
    charset: 'utf8mb4'
  });

  try {
    console.log('检查仓库数据...\n');

    const warehouses = await connection.query('SELECT * FROM warehouses');
    
    console.log(`找到 ${warehouses[0].length} 个仓库:`);
    warehouses[0].forEach((warehouse, index) => {
      console.log(`\n${index + 1}. ID: ${warehouse.id}`);
      console.log(`   名称: ${warehouse.name}`);
      console.log(`   类型: ${warehouse.type}`);
      console.log(`   状态: ${warehouse.status}`);
      console.log(`   地址: ${warehouse.address || '无'}`);
    });

    if (warehouses[0].length === 0) {
      console.log('\n数据库中没有仓库数据！');
      console.log('请先在仓库管理中创建仓库。');
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkWarehouses();