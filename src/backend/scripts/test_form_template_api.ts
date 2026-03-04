import { db } from '../database/connection.js';

async function testFormTemplateAPI() {
  console.log('测试表单模板 API...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const workflowDef = await db.queryOne(
      `SELECT id, \`key\`, name, form_template_id 
       FROM workflow_definitions 
       WHERE \`key\` = 'employee-onboard' AND status = 'active'`
    );

    if (!workflowDef) {
      console.log('❌ 未找到人员入职流程定义');
      await db.close();
      process.exit(1);
    }

    console.log('📊 流程定义信息:');
    console.log(`   ID: ${workflowDef.id}`);
    console.log(`   Key: ${workflowDef.key}`);
    console.log(`   名称: ${workflowDef.name}`);
    console.log(`   表单模板ID: ${workflowDef.form_template_id}`);

    if (!workflowDef.form_template_id) {
      console.log('\n❌ 流程定义没有绑定表单模板');
      await db.close();
      process.exit(1);
    }

    const template = await db.queryOne(
      `SELECT id, name, version, fields, layout 
       FROM form_templates 
       WHERE id = ?`,
      [workflowDef.form_template_id]
    );

    if (!template) {
      console.log('\n❌ 表单模板不存在');
      await db.close();
      process.exit(1);
    }

    console.log('\n📋 表单模板信息:');
    console.log(`   ID: ${template.id}`);
    console.log(`   名称: ${template.name}`);
    console.log(`   版本: ${template.version}`);

    const fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    
    console.log(`\n📝 表单字段 (${fields.length} 个):`);
    console.log('字段名 | 标签 | 类型');
    console.log('-------|------|------');
    fields.forEach((field: any) => {
      console.log(`${field.name.padEnd(20)} | ${field.label.padEnd(12)} | ${field.type}`);
    });

    console.log('\n✅ 表单模板 API 测试成功');
    
    await db.close();
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testFormTemplateAPI().then(() => process.exit(0));