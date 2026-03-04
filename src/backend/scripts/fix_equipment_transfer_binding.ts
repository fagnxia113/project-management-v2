import { db } from '../database/connection.js';

async function fixEquipmentTransferBinding() {
  console.log('开始修复设备调拨流程绑定...');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功');

    // 1. 查找设备调拨表单模板
    const template = await db.queryOne(
      `SELECT id FROM form_templates WHERE name LIKE '%设备调拨%' LIMIT 1`
    );

    if (!template) {
      console.log('⚠️  未找到设备调拨表单模板');
      console.log('   请通过界面创建表单模板');
      await db.close();
      process.exit(0);
    }

    console.log(`✅ 找到表单模板: ${template.id}`);

    // 2. 查找设备调拨流程定义
    const workflow = await db.queryOne(
      `SELECT id, \`key\`, name, form_template_id 
       FROM workflow_definitions 
       WHERE \`key\` = 'equipment-transfer' AND status = 'active'`
    );

    if (!workflow) {
      console.log('⚠️  未找到设备调拨流程定义');
      await db.close();
      process.exit(0);
    }

    console.log(`✅ 找到流程定义: ${workflow.id}`);

    // 3. 直接执行SQL更新
    const sql = `UPDATE workflow_definitions SET form_template_id = '${template.id}', updated_at = NOW() WHERE id = '${workflow.id}'`;
    console.log(`执行SQL: ${sql}`);

    const result = await db.query(sql);
    console.log(`✅ 更新成功，影响行数: ${JSON.stringify(result)}`);

    // 4. 验证
    const updated = await db.queryOne(
      `SELECT id, \`key\`, name, form_template_id 
       FROM workflow_definitions 
       WHERE id = '${workflow.id}'`
    );

    console.log('\n📊 绑定结果:');
    console.log(`   流程ID: ${updated.id}`);
    console.log(`   流程Key: ${updated.key}`);
    console.log(`   流程名称: ${updated.name}`);
    console.log(`   表单模板ID: ${updated.form_template_id}`);

    console.log('\n✅ 修复完成！');
    
    await db.close();
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixEquipmentTransferBinding().then(() => process.exit(0));