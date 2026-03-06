const mysql = require('mysql2/promise');

async function checkWorkflowInstances() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });
  
  try {
    console.log('========== 检查设备入库流程实例 ==========');
    
    // 查询所有设备入库流程实例
    const [instances] = await connection.query(
      `SELECT id, definition_key, status, result, business_id, initiator_id, initiator_name, start_time, end_time
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound'
       ORDER BY start_time DESC
       LIMIT 10`
    );
    
    console.log(`\n找到 ${instances.length} 个设备入库流程实例:\n`);
    
    instances.forEach((inst, index) => {
      console.log(`${index + 1}. 流程ID: ${inst.id}`);
      console.log(`   状态: ${inst.status}`);
      console.log(`   结果: ${inst.result || '-'}`);
      console.log(`   业务ID: ${inst.business_id || '未关联'}`);
      console.log(`   发起人: ${inst.initiator_name}`);
      console.log(`   开始时间: ${inst.start_time}`);
      console.log(`   结束时间: ${inst.end_time || '-'}`);
      console.log('');
    });
    
    // 查询设备台账记录
    const [equipmentCount] = await connection.query('SELECT COUNT(*) as total FROM equipment_instances');
    console.log(`\n设备台账记录总数: ${equipmentCount[0].total}`);
    
    // 查询入库单记录
    const [orderCount] = await connection.query('SELECT COUNT(*) as total FROM equipment_inbound_orders');
    console.log(`入库单记录总数: ${orderCount[0].total}`);
    
    // 查询已完成的流程但没有业务ID的
    const [pendingInstances] = await connection.query(
      `SELECT id, initiator_name, variables 
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound' 
       AND status = 'completed' 
       AND result = 'approved'
       AND (business_id IS NULL OR business_id = '')`
    );
    
    console.log(`\n需要创建设备台账的流程: ${pendingInstances.length} 个`);
    
    if (pendingInstances.length > 0) {
      console.log('\n这些流程的formData:');
      pendingInstances.forEach((inst, index) => {
        console.log(`\n${index + 1}. ${inst.initiator_name} (${inst.id})`);
        const formData = inst.variables?.formData;
        if (formData) {
          console.log(`   仓库ID: ${formData.warehouse_id}`);
          console.log(`   供应商: ${formData.supplier}`);
          console.log(`   总金额: ${formData.total_price}`);
          console.log(`   设备明细: ${formData.items ? formData.items.length : 0} 项`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkWorkflowInstances();