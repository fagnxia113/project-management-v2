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
          // 查找或创建设备型号
          let modelId = null;
          const [existingModels] = await db.query(
            'SELECT id FROM equipment_models WHERE category = ? AND name = ? AND model_no = ?',
            [item.category, item.equipment_name, item.model_no]
          );
          
          if (existingModels.length > 0) {
            modelId = existingModels[0].id;
            console.log(`找到现有型号: ${modelId}`);
          } else {
            // 创建新型号
            modelId = uuidv4();
            await db.query(
              `INSERT INTO equipment_models 
               (id, category, name, model_no, brand, unit)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                modelId,
                item.category,
                item.equipment_name,
                item.model_no,
                item.brand || null,
                '台'
              ]
            );
            console.log(`创建新型号: ${modelId}`);
          }
          
          // 生成管理编号
          const manageCode = `EQ${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          // 创建设备实例
          if (item.category === 'instrument') {
            await db.query(
              `INSERT INTO equipment_instances 
               (id, model_id, serial_number, manage_code, health_status, usage_status, location_status, location_id, 
                purchase_date, purchase_price, calibration_expiry, notes, keeper_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                uuidv4(),
                modelId,
                item.serial_numbers || '',
                manageCode,
                'normal',
                'idle',
                'warehouse',
                formData.warehouse_id,
                formData.purchase_date || null,
                item.purchase_price || 0,
                item.certificate_expiry_date || null,
                item.item_notes || '',
                keeperId
              ]
            );
          } else {
            // 假负载和线缆类，可能有多台
            const quantity = item.quantity || 1;
            for (let i = 0; i < quantity; i++) {
              const instanceManageCode = `EQ${Date.now()}${Math.floor(Math.random() * 1000)}`;
              await db.query(
                `INSERT INTO equipment_instances 
                 (id, model_id, serial_number, manage_code, health_status, usage_status, location_status, location_id, 
                  purchase_date, purchase_price, calibration_expiry, notes, keeper_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                  uuidv4(),
                  modelId,
                  null,
                  instanceManageCode,
                  'normal',
                  'idle',
                  'warehouse',
                  formData.warehouse_id,
                  formData.purchase_date || null,
                  item.purchase_price || 0,
                  null,
                  item.item_notes || '',
                  keeperId
                ]
              );
            }
          }
          
          console.log(`设备台账创建成功: ${item.equipment_name} (${item.category === 'instrument' ? 1 : item.quantity} 台)`);
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
