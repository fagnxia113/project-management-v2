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
    console.log('========== 清理所有设备台账和入库单记录 ==========');
    
    // 清理流程实例的 business_id
    const [updateResult] = await db.query(
      `UPDATE workflow_instances 
       SET business_id = NULL 
       WHERE definition_key = 'equipment-inbound'`
    );
    console.log(`清理流程实例 business_id: ${updateResult.affectedRows} 条`);
    
    // 删除所有设备台账记录
    const [deleteInstancesResult] = await db.query(
      'DELETE FROM equipment_instances'
    );
    console.log(`删除设备台账记录: ${deleteInstancesResult.affectedRows} 条`);
    
    // 删除所有设备型号记录
    const [deleteModelsResult] = await db.query(
      'DELETE FROM equipment_models'
    );
    console.log(`删除设备型号记录: ${deleteModelsResult.affectedRows} 条`);
    
    // 删除所有入库单记录
    const [deleteOrdersResult] = await db.query(
      'DELETE FROM equipment_inbound_orders'
    );
    console.log(`删除入库单记录: ${deleteOrdersResult.affectedRows} 条`);
    
    console.log('\n清理完成');
    
    // 验证清理结果
    const [instanceCount] = await db.query('SELECT COUNT(*) as total FROM equipment_instances');
    const [modelCount] = await db.query('SELECT COUNT(*) as total FROM equipment_models');
    const [orderCount] = await db.query('SELECT COUNT(*) as total FROM equipment_inbound_orders');
    
    console.log('\n验证结果:');
    console.log(`设备台账记录: ${instanceCount[0].total} 条`);
    console.log(`设备型号记录: ${modelCount[0].total} 条`);
    console.log(`入库单记录: ${orderCount[0].total} 条`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
