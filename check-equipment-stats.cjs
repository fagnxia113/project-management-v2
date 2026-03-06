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
    console.log('========== 查询设备台账统计 ==========');
    const [stats] = await db.query(
      `SELECT em.name as equipment_name, em.model_no, COUNT(*) as count
       FROM equipment_instances ei
       LEFT JOIN equipment_models em ON ei.model_id = em.id
       GROUP BY em.name, em.model_no
       ORDER BY count DESC`
    );
    
    console.log(`设备台账统计:`);
    stats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.equipment_name} (${stat.model_no}): ${stat.count} 台`);
    });
    
    const [totalCount] = await db.query(
      'SELECT COUNT(*) as total FROM equipment_instances'
    );
    
    console.log(`\n总设备数量: ${totalCount[0].total} 台`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
