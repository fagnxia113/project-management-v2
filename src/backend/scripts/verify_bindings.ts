import { db } from '../database/connection.js';

async function verifyAllBindings() {
  console.log('开始验证所有流程定义的表单模板绑定...\n');

  try {
    await db.connect();
    console.log('✅ 数据库连接成功\n');

    const definitions = await db.query(
      `SELECT id, \`key\`, name, version, status, form_template_id 
       FROM workflow_definitions 
       WHERE status = 'active'
       ORDER BY \`key\`, version DESC`
    );

    console.log('📊 活跃流程定义列表:\n');
    console.log('序号 | 流程Key | 流程名称 | 版本 | 表单模板ID | 状态');
    console.log('-----|---------|---------|------|-----------|-----');

    let allBound = true;
    definitions.forEach((def: any, index: number) => {
      const status = def.form_template_id ? '✅ 已绑定' : '❌ 未绑定';
      if (!def.form_template_id) allBound = false;
      console.log(`${(index + 1).toString().padStart(4)} | ${def.key.padEnd(15)} | ${def.name.padEnd(12)} | v${def.version} | ${def.form_template_id || 'N/A'.padEnd(36)} | ${status}`);
    });

    console.log('\n' + '='.repeat(80));
    
    const stats = await db.queryOne(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN form_template_id IS NOT NULL THEN 1 ELSE 0 END) as bound,
        SUM(CASE WHEN form_template_id IS NULL THEN 1 ELSE 0 END) as unbound
       FROM workflow_definitions 
       WHERE status = 'active'`
    );

    console.log(`\n📈 统计信息:`);
    console.log(`   总流程定义数: ${stats.total}`);
    console.log(`   已绑定表单模板: ${stats.bound}`);
    console.log(`   未绑定表单模板: ${stats.unbound}`);

    if (allBound) {
      console.log('\n✅ 所有流程定义都已正确绑定表单模板！');
    } else {
      console.log('\n⚠️  部分流程定义未绑定表单模板，请手动处理');
    }
    
    await db.close();
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyAllBindings().then(() => process.exit(0));