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
    console.log('========== 手动创建设备入库单 ==========');
    
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
         (id, order_no, inbound_type, warehouse_id, purchase_date, total_price, applicant_id, applicant_name, apply_date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inboundOrderId,
          orderNo,
          formData.inbound_type || 'purchase',
          formData.warehouse_id,
          formData.purchase_date || new Date().toISOString().split('T')[0],
          0,
          initiator.id,
          initiator.name,
          new Date().toISOString().split('T')[0],
          'draft',
          formData.notes || ''
        ]
      );
      
      console.log(`入库单创建成功: ${inboundOrderId}`);
      
      // 创建入库单明细
      if (formData.items && Array.isArray(formData.items)) {
        for (const item of formData.items) {
          const itemId = uuidv4();
          
          await db.query(
            `INSERT INTO equipment_inbound_items 
             (id, order_id, equipment_no, name, category, model, manufacturer, serial_no, technical_params, quantity, unit_price, total_price, status, technical_doc, attachment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId,
              inboundOrderId,
              `EQ${Date.now()}${Math.floor(Math.random() * 1000)}`,
              item.equipment_name,
              item.category,
              item.model_no,
              item.manufacturer || '',
              item.serial_numbers || '',
              item.technical_params ? JSON.stringify(item.technical_params) : null,
              item.quantity || 1,
              item.purchase_price || 0,
              item.total_price || 0,
              'pending',
              null,
              null
            ]
          );
          
          console.log(`入库单明细创建成功: ${itemId}`);
          
          // 处理图片（暂时跳过，因为 equipment_images 表不存在）
          // TODO: 等待 equipment_images 表创建后再处理图片
          
          // 处理附件（暂时跳过，因为 equipment_images 表不存在）
          // TODO: 等待 equipment_images 表创建后再处理附件
          
          // 处理配件（暂时跳过，因为 equipment_accessories 表不存在）
          // TODO: 等待 equipment_accessories 表创建后再处理配件
        }
      }
      
      // 完成入库单，创建设备台账
      console.log(`开始完成入库单，创建设备台账`);
      
      const order = await db.query(
        'SELECT * FROM equipment_inbound_orders WHERE id = ?',
        [inboundOrderId]
      );
      
      const items = await db.query(
        'SELECT * FROM equipment_inbound_items WHERE order_id = ?',
        [inboundOrderId]
      );
      
      for (const item of items[0]) {
        // 获取保管人ID
        let keeperId = null;
        if (order[0].warehouse_id) {
          const [warehouseResult] = await db.query(
            'SELECT manager_id FROM warehouses WHERE id = ?',
            [order[0].warehouse_id]
          );
          if (warehouseResult[0] && warehouseResult[0].manager_id) {
            keeperId = warehouseResult[0].manager_id;
          }
        }
        
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
              item.name,
              item.model,
              null,
              item.manufacturer,
              item.technical_params,
              item.category,
              '台',
              item.serial_no,
              manageCode,
              'instrument',
              'owned',
              'normal',
              'idle',
              'warehouse',
              order[0].warehouse_id,
              order[0].purchase_date,
              item.unit_price,
              null,
              null,
              null,
              null,
              null,
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
              item.name,
              item.model,
              null,
              item.manufacturer,
              item.technical_params,
              item.category,
              '台',
              item.quantity,
              null,
              manageCode,
              item.category === 'fake_load' ? 'fake_load' : null,
              'owned',
              'normal',
              'idle',
              'warehouse',
              order[0].warehouse_id,
              order[0].purchase_date,
              item.unit_price,
              null,
              null,
              null,
              null,
              null,
              keeperId
            ]
          );
        }
        
        console.log(`设备台账创建成功: ${item.name}`);
      }
      
      // 更新入库单状态
      await db.query(
        'UPDATE equipment_inbound_orders SET status = "approved" WHERE id = ?',
        [inboundOrderId]
      );
      
      // 更新入库单明细状态
      await db.query(
        'UPDATE equipment_inbound_items SET status = "inbound" WHERE order_id = ?',
        [inboundOrderId]
      );
      
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
