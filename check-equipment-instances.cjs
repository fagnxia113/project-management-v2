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
    console.log('========== 查询设备台账 ==========');
    const [instances] = await db.query(
      `SELECT ei.id, ei.manage_code, em.name as equipment_name, em.model_no, ei.serial_number, 
              ei.health_status, ei.usage_status, ei.location_status, ei.purchase_date, 
              ei.purchase_price, ei.calibration_expiry, ei.notes, ei.created_at
       FROM equipment_instances ei
       LEFT JOIN equipment_models em ON ei.model_id = em.id
       ORDER BY ei.created_at DESC
       LIMIT 10`
    );
    
    console.log(`找到 ${instances.length} 个设备台账记录:`);
    instances.forEach((inst, index) => {
      console.log(`\n${index + 1}. ${inst.manage_code}`);
      console.log(`   设备名称: ${inst.equipment_name}`);
      console.log(`   型号: ${inst.model_no}`);
      console.log(`   序列号: ${inst.serial_number || '无'}`);
      console.log(`   健康状态: ${inst.health_status}`);
      console.log(`   使用状态: ${inst.usage_status}`);
      console.log(`   位置状态: ${inst.location_status}`);
      console.log(`   采购日期: ${inst.purchase_date || '无'}`);
      console.log(`   采购价格: ${inst.purchase_price || 0}`);
      console.log(`   校准到期: ${inst.calibration_expiry || '无'}`);
      console.log(`   创建时间: ${inst.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
