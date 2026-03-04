import { db } from '../database/connection.js';

async function checkEmployeeOnboardTemplate() {
  console.log('开始检查人员入职表单模板...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const template = await db.queryOne(
      `SELECT id, name, version, fields, layout 
       FROM form_templates 
       WHERE name LIKE '%人员入职%' LIMIT 1`
    );

    if (!template) {
      console.log('❌ 未找到人员入职表单模板');
      await db.close();
      process.exit(1);
    }

    console.log('📊 表单模板信息:');
    console.log(`   ID: ${template.id}`);
    console.log(`   名称: ${template.name}`);
    console.log(`   版本: ${template.version}`);

    const fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    
    console.log(`\n📋 表单字段列表 (${fields.length} 个):`);
    console.log('字段名 | 标签 | 类型 | 必填');
    console.log('-------|------|------|------');
    fields.forEach((field: any) => {
      console.log(`${field.name.padEnd(20)} | ${field.label.padEnd(12)} | ${field.type.padEnd(8)} | ${field.required ? '是' : '否'}`);
    });

    console.log('\n📝 表单布局:');
    const layout = typeof template.layout === 'string' 
      ? JSON.parse(template.layout) 
      : template.layout;
    
    if (layout.sections) {
      layout.sections.forEach((section: any, index: number) => {
        console.log(`   ${index + 1}. ${section.title}`);
        console.log(`      字段: ${section.fields.join(', ')}`);
      });
    }
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkEmployeeOnboardTemplate().then(() => process.exit(0));