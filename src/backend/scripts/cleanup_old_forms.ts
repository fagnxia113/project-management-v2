import { db } from '../database/connection.js';

async function cleanupOldFormSchemas() {
  console.log('开始清理老表单数据...');

  try {
    // 初始化数据库连接
    await db.connect();
    console.log('✅ 数据库连接成功');

    // 1. 清空所有流程定义的 form_schema
    const result1 = await db.update(
      `UPDATE workflow_definitions SET form_schema = NULL WHERE form_schema IS NOT NULL`
    );
    console.log(`✅ 已清空 ${result1.affectedRows || result1} 个流程定义的 form_schema`);

    // 2. 检查没有 form_template_id 的流程定义
    const noTemplateDefs = await db.query(
      `SELECT id, \`key\`, name, version FROM workflow_definitions 
       WHERE form_template_id IS NULL AND status = 'active'`
    );
    
    if (noTemplateDefs.length > 0) {
      console.log('\n⚠️  以下流程定义没有绑定表单模板:');
      noTemplateDefs.forEach((def: any) => {
        console.log(`   - ${def.key} (${def.name}) v${def.version}`);
      });
      console.log('\n这些流程定义需要手动绑定表单模板');
    } else {
      console.log('\n✅ 所有活跃的流程定义都已绑定表单模板');
    }

    // 3. 统计信息
    const stats = await db.queryOne(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN form_schema IS NOT NULL THEN 1 ELSE 0 END) as with_schema,
        SUM(CASE WHEN form_template_id IS NOT NULL THEN 1 ELSE 0 END) as with_template
       FROM workflow_definitions`
    );

    console.log('\n📊 统计信息:');
    console.log(`   总流程定义数: ${stats.total}`);
    console.log(`   有 form_schema: ${stats.with_schema}`);
    console.log(`   有 form_template_id: ${stats.with_template}`);

    console.log('\n✅ 清理完成！');
    
    // 关闭数据库连接
    await db.close();
  } catch (error) {
    console.error('❌ 清理失败:', error);
    process.exit(1);
  }
}

cleanupOldFormSchemas().then(() => process.exit(0));