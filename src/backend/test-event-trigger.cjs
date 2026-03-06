const mysql = require('mysql2/promise');

async function testEventTrigger() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'project_management_v3'
  });

  try {
    console.log('========== 测试手动触发设备入库流程处理 ==========\n');

    const instanceId = '56087c03-3c86-46cc-9cf6-74d2597fbdcc';

    const [instances] = await connection.query(
      `SELECT id, initiator_id, initiator_name, variables, business_id, definition_key
       FROM workflow_instances 
       WHERE id = ?`,
      [instanceId]
    );

    if (!instances || instances.length === 0) {
      console.log('流程实例不存在');
      return;
    }

    const instance = instances[0];
    console.log('流程实例信息:');
    console.log(`  ID: ${instance.id}`);
    console.log(`  发起人: ${instance.initiator_name} (${instance.initiator_id})`);
    console.log(`  业务ID: ${instance.business_id || '未关联'}`);
    console.log(`  流程类型: ${instance.definition_key}`);
    console.log(`  变量:`, JSON.stringify(instance.variables, null, 2));

    const formData = instance.variables?.formData || {};
    console.log('\n表单数据:');
    console.log(`  仓库ID: ${formData.warehouse_id}`);
    console.log(`  供应商: ${formData.supplier}`);
    console.log(`  总金额: ${formData.total_price}`);
    console.log(`  设备明细数量: ${formData.items ? formData.items.length : 0}`);

    if (formData.items && formData.items.length > 0) {
      console.log('\n设备明细:');
      formData.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.equipment_name} (${item.model_no}) - 数量: ${item.quantity}`);
      });
    }

    // 检查是否已经有设备台账记录
    const [equipmentRecords] = await connection.query(
      `SELECT COUNT(*) as count FROM equipment_instances WHERE source_inbound_id = ?`,
      [instanceId]
    );

    console.log(`\n已关联的设备台账记录数: ${equipmentRecords[0].count}`);

    // 检查是否已经有入库单记录
    const [inboundRecords] = await connection.query(
      `SELECT COUNT(*) as count FROM equipment_inbound_orders WHERE workflow_instance_id = ?`,
      [instanceId]
    );

    console.log(`已关联的入库单记录数: ${inboundRecords[0].count}`);

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await connection.end();
  }
}

testEventTrigger();