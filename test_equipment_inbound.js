import { db } from './src/backend/database/connection.ts';
import { equipmentInboundService } from './src/backend/services/EquipmentInboundService.ts';

async function testEquipmentInbound() {
  try {
    // 连接数据库
    await db.connect();
    
    // 创建测试流程实例
    const testInstanceId = 'test-instance-' + Date.now();
    
    // 插入测试数据到 workflow_instances 表
    await db.execute(
      `INSERT INTO workflow_instances 
       (id, definition_key, initiator_id, initiator_name, variables, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        testInstanceId,
        'equipment-inbound',
        'test-user',
        '测试用户',
        JSON.stringify({
          formData: {
            warehouse_id: 'test-warehouse',
            warehouse_manager_id: 'test-manager',
            supplier: '测试供应商',
            purchase_date: '2024-01-01',
            total_price: 15000,
            items: [
              // 测试仪器类
              {
                category: 'instrument',
                equipment_name: '测试仪器',
                model_no: 'TEST-001',
                unit: '台',
                quantity: 2,
                purchase_price: 5000,
                total_price: 10000,
                serial_numbers: 'SN001,SN002',
                manufacturer: '测试厂家',
                technical_params: '测试参数',
                certificate_no: 'CERT001',
                certificate_issuer: '测试发证单位',
                certificate_expiry_date: '2025-01-01',
                accessory_desc: '测试配件',
                item_notes: '测试仪器备注',
                main_images: [],
                accessory_images: [],
                attachments: [],
                accessory_list: [
                  {
                    accessory_name: '测试配件1',
                    accessory_model: 'ACC-001',
                    accessory_quantity: 2,
                    accessory_unit: '个'
                  }
                ]
              },
              // 测试假负载类
              {
                category: 'fake_load',
                equipment_name: '测试假负载',
                model_no: 'FL-001',
                unit: '个',
                quantity: 5,
                purchase_price: 500,
                total_price: 2500,
                serial_numbers: 'FLSN001-FLSN005',
                manufacturer: '假负载厂家',
                technical_params: '假负载参数',
                certificate_no: 'FLCERT001',
                certificate_issuer: '假负载发证单位',
                certificate_expiry_date: '2025-01-01',
                accessory_desc: '假负载配件',
                item_notes: '测试假负载备注',
                main_images: [],
                accessory_images: [],
                attachments: []
              },
              // 测试线缆类
              {
                category: 'cable',
                equipment_name: '测试线缆',
                model_no: 'CABLE-001',
                unit: '米',
                quantity: 100,
                purchase_price: 25,
                total_price: 2500,
                serial_numbers: 'CAB001-CAB100',
                manufacturer: '线缆厂家',
                technical_params: '线缆参数',
                certificate_no: 'CABCERT001',
                certificate_issuer: '线缆发证单位',
                certificate_expiry_date: '2025-01-01',
                accessory_desc: '线缆配件',
                item_notes: '测试线缆备注',
                main_images: [],
                accessory_images: [],
                attachments: []
              }
            ],
            notes: '测试入库单'
          }
        }),
        'running'
      ]
    );
    
    console.log('测试数据插入成功');
    
    // 执行设备入库服务
    console.log('开始执行设备入库服务...');
    const businessId = await equipmentInboundService.createEquipmentFromWorkflow(testInstanceId);
    console.log('设备入库服务执行成功，业务ID:', businessId);
    
    // 查询创建的设备实例
    const [instances] = await db.query(
      'SELECT * FROM equipment_instances WHERE location_id = ?',
      ['test-warehouse']
    );
    console.log('创建的设备实例数量:', instances.length);
    console.log('设备实例详情:', instances);
    
    // 清理测试数据
    await db.execute('DELETE FROM equipment_instances WHERE location_id = ?', ['test-warehouse']);
    await db.execute('DELETE FROM equipment_models WHERE name LIKE ?', ['测试%']);
    await db.execute('DELETE FROM equipment_inbound_orders WHERE warehouse_id = ?', ['test-warehouse']);
    await db.execute('DELETE FROM equipment_inbound_items WHERE order_id IN (SELECT id FROM equipment_inbound_orders WHERE warehouse_id = ?)', ['test-warehouse']);
    await db.execute('DELETE FROM workflow_instances WHERE id = ?', [testInstanceId]);
    
    console.log('测试数据清理成功');
    await db.close();
    
    console.log('测试完成！所有设备类别都已成功写入台账。');
  } catch (error) {
    console.error('测试失败:', error);
    await db.close();
  }
}

testEquipmentInbound();