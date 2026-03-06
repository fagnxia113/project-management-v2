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
    console.log('========== 删除错误的假负载和线缆记录 ==========');
    
    // 查询假负载和线缆类的设备
    const [fakeLoadInstances] = await db.query(
      `SELECT ei.id, ei.manage_code, em.name as equipment_name, em.model_no, em.category
       FROM equipment_instances ei
       LEFT JOIN equipment_models em ON ei.model_id = em.id
       WHERE em.category IN ('fake_load', 'cable')
       ORDER BY ei.created_at DESC`
    );
    
    console.log(`找到 ${fakeLoadInstances.length} 个假负载/线缆记录`);
    
    // 删除这些记录
    for (const inst of fakeLoadInstances) {
      await db.query(
        'DELETE FROM equipment_instances WHERE id = ?',
        [inst.id]
      );
      console.log(`删除记录: ${inst.manage_code} - ${inst.equipment_name} (${inst.model_no})`);
    }
    
    console.log('\n删除完成');
    
    // 查询剩余的设备统计
    const [stats] = await db.query(
      `SELECT em.name as equipment_name, em.model_no, COUNT(*) as count
       FROM equipment_instances ei
       LEFT JOIN equipment_models em ON ei.model_id = em.id
       GROUP BY em.name, em.model_no
       ORDER BY count DESC`
    );
    
    console.log('\n剩余设备台账统计:');
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
