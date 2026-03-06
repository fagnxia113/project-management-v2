const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'project_management_v3',
  waitForConnections: true,
  connectionLimit: 10
});

const { v4: uuidv4 } = require('uuid');

(async () => {
  try {
    console.log('========== 手动创建设备台账 ==========');
    
    // 查询所有已完成但还没有 business_id 的设备入库流程实例
    const [instances] = await db.query(
      `SELECT id, initiator_id, initiator_name, variables 
       FROM workflow_instances 
       WHERE definition_key = 'equipment-inbound' 
       AND status = 'completed' 
       AND result = 'approved'
       AND (business_id IS NULL OR business_id = '')`
    );
    
    console.log(`找到 ${instances.length} 个需要处理的流程实例`);
    
    for (const inst of instances) {
      console.log(`\n处理流程实例: ${inst.id}`);
      
      const formData = inst.variables?.formData || {};
      const initiator = {
        id: inst.initiator_id,
        name: inst.initiator_name
      };
      
      console.log(`formData:`, JSON.stringify(formData, null, 2));
      
      // 创建入库单
      const inboundOrderId = uuidv4();
      const orderNo = `IN-${Date.now()}`;
      
      await db.query(
        `INSERT INTO equipment_inbound_orders 
         (id, order_no, inbound_type, warehouse_id, warehouse_name, applicant_id, applicant, apply_date, status, notes, inbound_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inboundOrderId,
          orderNo,
          formData.inbound_type || 'purchase',
          formData.warehouse_id,
          null,
          initiator.id,
          initiator.name,
          new Date().toISOString().split('T')[0],
          'approved',
          formData.notes || '',
          '设备入库'
        ]
      );
      
      console.log(`入库单创建成功: ${inboundOrderId}`);
      
      // 获取保管人ID
      let keeperId = null;
      if (formData.warehouse_id) {
        const [warehouseResult] = await db.query(
          'SELECT manager_id FROM warehouses WHERE id = ?',
          [formData.warehouse_id]
        );
        if (warehouseResult[0] && warehouseResult[0].manager_id) {
          keeperId = warehouseResult[0].manager_id;
        }
      }
      
      // 直接创建设备台账记录
      if (formData.items && Array.isArray(formData.items)) {
        for (const item of formData.items) {
          // 生成管理编号
          const manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          if (item.category === 'instrument') {
            await db.query(
              `INSERT INTO equipment_instances 
               (id, equipment_name, model_no, brand, manufacturer, technical_params, category, unit, serial_number, manage_code, 
                equipment_type, equipment_source, health_status, usage_status, location_status, location_id, 
                purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, 
                accessory_desc, notes, keeper_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                uuidv4(),
                item.equipment_name,
                item.model_no,
                null,
                item.manufacturer || '',
                item.technical_params ? JSON.stringify(item.technical_params) : null,
                item.category,
                '台',
                item.serial_numbers || '',
                manageCode,
                'instrument',
                'owned',
                'normal',
                'idle',
                'warehouse',
                formData.warehouse_id,
                formData.purchase_date || null,
                item.purchase_price || 0,
                item.certificate_expiry_date || null,
                item.certificate_no || '',
                item.certificate_issuer || '',
                item.accessory_description || item.accessory_desc || '',
                item.item_notes || '',
                keeperId
              ]
            );
          } else {
            await db.query(
              `INSERT INTO equipment_instances 
               (id, equipment_name, model_no, brand, manufacturer, technical_params, category, unit, quantity, serial_number, manage_code, 
                equipment_type, equipment_source, health_status, usage_status, location_status, location_id, 
                purchase_date, purchase_price, calibration_expiry, certificate_no, certificate_issuer, 
                accessory_desc, notes, keeper_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                uuidv4(),
                item.equipment_name,
                item.model_no,
                null,
                item.manufacturer || '',
                item.technical_params ? JSON.stringify(item.technical_params) : null,
                item.category,
                '台',
                item.quantity || 1,
                null,
                manageCode,
                item.category === 'fake_load' ? 'fake_load' : null,
                'owned',
                'normal',
                'idle',
                'warehouse',
                formData.warehouse_id,
                formData.purchase_date || null,
                item.purchase_price || 0,
                null,
                null,
                null,
                item.accessory_description || '',
                item.item_notes || '',
                keeperId
              ]
            );
          }
          
          console.log(`设备台账创建成功: ${item.equipment_name}`);
        }
      }
      
      // 更新流程实例的 businessId
      await db.query(
        'UPDATE workflow_instances SET business_id = ? WHERE id = ?',
        [inboundOrderId, inst.id]
      );
      
      console.log(`流程实例 ${inst.id} 处理完成`);
    }
    
    console.log('\n所有流程实例处理完成');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
