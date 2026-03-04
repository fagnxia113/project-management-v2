import { db } from '../database/connection.js';

async function bindEquipmentTransferTemplate() {
  console.log('开始绑定设备调拨表单模板...');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功');

    // 1. 查找已存在的设备调拨表单模板
    const existingTemplate = await db.queryOne(
      `SELECT id FROM form_templates WHERE name LIKE '%设备调拨%' LIMIT 1`
    );

    let templateId = existingTemplate?.id;

    if (!templateId) {
      console.log('⚠️  未找到设备调拨表单模板，请先通过界面创建');
      console.log('   路径: 表单模板管理 -> 新建模板');
      await db.close();
      process.exit(0);
    }

    console.log(`✅ 找到表单模板: ${templateId}`);

    // 2. 绑定到设备调拨流程定义
    const result = await db.update(
      `UPDATE workflow_definitions 
       SET form_template_id = ?, updated_at = NOW() 
       WHERE \`key\` = 'equipment-transfer' AND status = 'active'`
    );

    console.log(`✅ 已绑定 ${result.affectedRows || result} 个流程定义`);

    // 3. 验证绑定
    const workflowDef = await db.queryOne(
      `SELECT id, \`key\`, name, form_template_id 
       FROM workflow_definitions 
       WHERE \`key\` = 'equipment-transfer' AND status = 'active'`
    );

    console.log('\n📊 绑定结果:');
    console.log(`   流程ID: ${workflowDef.id}`);
    console.log(`   流程Key: ${workflowDef.key}`);
    console.log(`   流程名称: ${workflowDef.name}`);
    console.log(`   表单模板ID: ${workflowDef.form_template_id}`);

    console.log('\n✅ 绑定完成！');
    
    await db.close();
  } catch (error) {
    console.error('❌ 绑定失败:', error);
    process.exit(1);
  }
}

bindEquipmentTransferTemplate().then(() => process.exit(0));