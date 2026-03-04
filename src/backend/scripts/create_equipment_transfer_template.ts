import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

async function createEquipmentTransferTemplate() {
  console.log('开始创建设备调拨表单模板...');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功');

    // 1. 创建设备调拨表单模板
    const templateId = uuidv4();
    const now = new Date();

    const templateData = {
      id: templateId,
      name: '设备调拨表单',
      version: 1,
      fields: [
        {
          name: 'transfer_no',
          label: '调拨单号',
          type: 'text',
          required: true,
          editable: false,
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: false,
              required: true
            }
          }
        },
        {
          name: 'fromLocationType',
          label: '调出位置类型',
          type: 'select',
          required: true,
          options: [
            { label: '仓库', value: 'warehouse' },
            { label: '项目', value: 'project' }
          ],
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'fromLocationId',
          label: '调出位置',
          type: 'select',
          required: true,
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'toLocationType',
          label: '调入位置类型',
          type: 'select',
          required: true,
          options: [
            { label: '仓库', value: 'warehouse' },
            { label: '项目', value: 'project' }
          ],
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'toLocationId',
          label: '调入位置',
          type: 'select',
          required: true,
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'equipmentIds',
          label: '调拨设备',
          type: 'array',
          required: true,
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'transferReason',
          label: '调拨原因',
          type: 'textarea',
          required: true,
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'expectedDate',
          label: '期望调拨日期',
          type: 'date',
          required: true,
          display: 'both',
          permissions: {
            default: {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'shipping_date',
          label: '发货时间',
          type: 'datetime',
          required: false,
          display: 'approval',
          permissions: {
            default: {
              visible: false,
              editable: false,
              required: false
            },
            'from-location-manager': {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'shipping_no',
          label: '物流单号',
          type: 'text',
          required: false,
          display: 'approval',
          permissions: {
            default: {
              visible: false,
              editable: false,
              required: false
            },
            'from-location-manager': {
              visible: true,
              editable: true,
              required: false
            }
          }
        },
        {
          name: 'shipping_notes',
          label: '发货备注',
          type: 'textarea',
          required: false,
          display: 'approval',
          permissions: {
            default: {
              visible: false,
              editable: false,
              required: false
            },
            'from-location-manager': {
              visible: true,
              editable: true,
              required: false
            }
          }
        },
        {
          name: 'receive_status',
          label: '收货状态',
          type: 'select',
          required: false,
          options: [
            { label: '正常收货', value: 'normal' },
            { label: '异常收货', value: 'abnormal' }
          ],
          display: 'approval',
          permissions: {
            default: {
              visible: false,
              editable: false,
              required: false
            },
            'to-location-manager': {
              visible: true,
              editable: true,
              required: true
            }
          }
        },
        {
          name: 'receive_comment',
          label: '收货备注',
          type: 'textarea',
          required: false,
          display: 'approval',
          permissions: {
            default: {
              visible: false,
              editable: false,
              required: false
            },
            'to-location-manager': {
              visible: true,
              editable: true,
              required: false
            }
          }
        }
      ],
      layout: {
        sections: [
          {
            id: 'basic',
            title: '基本信息',
            fields: ['transfer_no', 'fromLocationType', 'fromLocationId', 'toLocationType', 'toLocationId']
          },
          {
            id: 'equipment',
            title: '设备信息',
            fields: ['equipmentIds', 'transferReason', 'expectedDate']
          },
          {
            id: 'shipping',
            title: '发货信息',
            fields: ['shipping_date', 'shipping_no', 'shipping_notes']
          },
          {
            id: 'receiving',
            title: '收货信息',
            fields: ['receive_status', 'receive_comment']
          }
        ]
      },
      created_at: now,
      updated_at: now
    };

    await db.insert(
      `INSERT INTO form_templates (
        id, name, version, fields, layout, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        templateData.name,
        templateData.version,
        JSON.stringify(templateData.fields),
        JSON.stringify(templateData.layout),
        templateData.created_at,
        templateData.updated_at
      ]
    );

    console.log(`✅ 已创建设备调拨表单模板: ${templateId}`);

    // 2. 关闭并重新连接数据库
    await db.close();
    await db.connect();

    // 3. 绑定到设备调拨流程定义
    await db.update(
      `UPDATE workflow_definitions 
       SET form_template_id = ?, updated_at = NOW() 
       WHERE \`key\` = 'equipment-transfer' AND status = 'active'`
    );

    console.log('✅ 已绑定到设备调拨流程定义');

    // 3. 验证绑定
    const result = await db.queryOne(
      `SELECT id, \`key\`, name, form_template_id 
       FROM workflow_definitions 
       WHERE \`key\` = 'equipment-transfer' AND status = 'active'`
    );

    console.log('\n📊 绑定结果:');
    console.log(`   流程ID: ${result.id}`);
    console.log(`   流程Key: ${result.key}`);
    console.log(`   流程名称: ${result.name}`);
    console.log(`   表单模板ID: ${result.form_template_id}`);

    console.log('\n✅ 设备调拨表单模板创建并绑定完成！');
    
    await db.close();
  } catch (error) {
    console.error('❌ 创建失败:', error);
    process.exit(1);
  }
}

createEquipmentTransferTemplate().then(() => process.exit(0));