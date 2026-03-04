import { db } from '../database/connection.js';

async function checkWorkflowDefinitionSchema() {
  console.log('检查流程定义的 form_schema...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const definition = await db.queryOne(
      `SELECT id, \`key\`, name, form_schema, form_template_id 
       FROM workflow_definitions 
       WHERE \`key\` = 'employee-onboard' AND status = 'active'`
    );

    if (!definition) {
      console.log('❌ 未找到人员入职流程定义');
      await db.close();
      process.exit(1);
    }

    console.log('📊 流程定义信息:');
    console.log(`   ID: ${definition.id}`);
    console.log(`   Key: ${definition.key}`);
    console.log(`   名称: ${definition.name}`);
    console.log(`   表单模板ID: ${definition.form_template_id}`);
    console.log(`   form_schema: ${definition.form_schema ? '有' : '无'}`);

    if (definition.form_schema) {
      const formSchema = typeof definition.form_schema === 'string' 
        ? JSON.parse(definition.form_schema) 
        : definition.form_schema;
      
      console.log(`\n📋 form_schema 字段数: ${Array.isArray(formSchema) ? formSchema.length : 0}`);
      if (Array.isArray(formSchema)) {
        console.log('📋 form_schema 字段:', formSchema.map((f: any) => f.name).join(', '));
      }
    }
    
    await db.close();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkWorkflowDefinitionSchema().then(() => process.exit(0));