import { db } from '../database/connection.js';

async function checkFormTemplatePermissions() {
  console.log('开始检查表单模板权限配置...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const template = await db.queryOne(
      `SELECT id, name, fields 
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

    const fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    
    console.log(`\n📋 表单字段权限配置 (${fields.length} 个):`);
    console.log('字段名 | 标签 | 类型 | 必填 | 可见性');
    console.log('-------|------|------|------|--------');
    fields.forEach((field: any) => {
      let visibility = '默认可见';
      if (field.permissions) {
        if (field.permissions.default && field.permissions.default.visible === false) {
          visibility = '默认隐藏';
        } else if (field.permissions.nodePermissions) {
          const nodeIds = Object.keys(field.permissions.nodePermissions);
          const visibleNodes = nodeIds.filter(id => field.permissions.nodePermissions[id].visible);
          visibility = `节点可见: ${visibleNodes.join(', ')}`;
        }
      } else if (field.visibleOn) {
        visibility = `可见节点: ${field.visibleOn.join(', ')}`;
      }
      console.log(`${field.name.padEnd(20)} | ${field.label.padEnd(12)} | ${field.type.padEnd(8)} | ${field.required ? '是' : '否'} | ${visibility}`);
    });
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkFormTemplatePermissions().then(() => process.exit(0));