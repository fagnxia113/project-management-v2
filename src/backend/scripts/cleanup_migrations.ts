import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 迁移清理脚本
 * 
 * 功能：
 * 1. 备份当前数据库
 * 2. 删除所有表（保留数据）
 * 3. 使用新的完整数据库结构重建表
 * 4. 恢复数据
 * 
 * 注意：这是一个危险操作，请先备份数据库！
 */

async function cleanupMigrations() {
  console.log('========================================');
  console.log('  数据库迁移清理工具');
  console.log('========================================\n');

  try {
    // 初始化数据库连接
    console.log('步骤 0: 初始化数据库连接...');
    await db.connect();
    console.log('数据库连接成功\n');

    // 1. 获取所有表名
    console.log('步骤 1: 获取数据库表列表...');
    const tables = await db.query(`
      SELECT table_name as tableName
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`找到 ${tables.length} 个表`);
    tables.forEach((t: any) => console.log(`  - ${t.tableName}`));
    console.log('');

    // 2. 导出数据
    console.log('步骤 2: 导出数据...');
    const backupData: any = {};
    
    for (const table of tables) {
      const tableName = table.tableName;
      console.log(`  导出表: ${tableName}`);
      
      const rows = await db.query(`SELECT * FROM ${tableName}`);
      backupData[tableName] = rows;
      
      console.log(`    导出 ${rows.length} 条记录`);
    }
    console.log('');

    // 3. 删除所有表
    console.log('步骤 3: 删除所有表...');
    
    // 先禁用外键约束
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('已禁用外键约束');
    
    for (const table of tables) {
      const tableName = table.tableName;
      console.log(`  删除表: ${tableName}`);
      await db.execute(`DROP TABLE IF EXISTS ${tableName}`);
    }
    
    // 重新启用外键约束
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('已重新启用外键约束');
    console.log('');

    // 4. 执行新的数据库结构
    console.log('步骤 4: 创建新的数据库结构...');
    const schemaPath = path.join(__dirname, '..', 'database', 'migrations', '001_complete_database_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // 移除注释
    const cleanedSql = schemaSql.replace(/^--.*$/gm, '').trim();
    
    // 分割SQL语句
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    let executedCount = 0;
    for (const statement of statements) {
      try {
        await db.execute(statement);
        executedCount++;
      } catch (error: any) {
        if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_FIELDNAME') {
          console.error(`执行失败: ${statement.substring(0, 50)}...`);
          console.error(`错误: ${error.message}`);
        }
      }
    }
    console.log(`执行了 ${executedCount} 条SQL语句`);
    console.log('');

    // 5. 恢复数据
    console.log('步骤 5: 恢复数据...');
    for (const table of tables) {
      const tableName = table.tableName;
      const rows = backupData[tableName];
      if (!rows || rows.length === 0) {
        console.log(`  跳过空表: ${tableName}`);
        continue;
      }
      
      console.log(`  恢复表: ${tableName} (${rows.length} 条记录)`);
      
      for (const row of rows) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map(() => '?').join(', ');
          
          await db.execute(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        } catch (error: any) {
          if (error.code === 'ER_DUP_ENTRY') {
            // 忽略重复键错误
          } else {
            console.error(`    恢复失败: ${error.message}`);
          }
        }
      }
    }
    console.log('');

    console.log('========================================');
    console.log('  迁移清理完成！');
    console.log('========================================');
    console.log('');
    console.log('下一步操作：');
    console.log('1. 检查数据是否正确恢复');
    console.log('2. 测试应用功能是否正常');
    console.log('3. 如果一切正常，可以删除旧的迁移文件');
    console.log('');
    console.log('保留的迁移文件：');
    console.log('  - 001_complete_database_schema.sql (新的完整数据库结构)');
    console.log('');
    console.log('可以删除的迁移文件：');
    console.log('  - 003_dynamic_approver_rules.sql');
    console.log('  - 003_simplify_inbound_items.sql');
    console.log('  - 005_supplement_fields_and_workflow_tables.sql');
    console.log('  - 006_add_workflow_tables.sql');
    console.log('  - 007_workflow_engine_tables.sql');
    console.log('  - 008_organization_structure.sql');
    console.log('  - 008_workflow_tables_optimization.sql');
    console.log('  - 009_add_category_to_instances.sql');
    console.log('  - 010_add_execution_logs.sql');
    console.log('  - 010_notification_alert_tables.sql');
    console.log('  - 011_purchase_request_tables.sql');
    console.log('  - 013_add_skipped_to_instance_result.sql');
    console.log('  - 013_equipment_transfer_details.sql');
    console.log('  - 014_init_employees.sql (包含测试数据，建议删除)');
    console.log('  - 015_add_user_id_to_employees.sql');
    console.log('  - 015_update_onboard_form_position.sql');
    console.log('  - 016_enhance_project_fields.sql');
    console.log('  - 017_update_project_approval_form_schema.sql');
    console.log('  - 018_update_project_form_schema_v2.sql');
    console.log('  - 019_fix_customer_type_enum.sql');
    console.log('  - 020_fix_customer_address_nullable.sql');
    console.log('  - 021_add_missing_project_fields.sql');
    console.log('  - 024_create_inbound_items_table.sql');
    console.log('  - 025_create_inbound_orders_table.sql');
    console.log('  - 028_alter_inbound_orders_table.sql');
    console.log('  - 029_alter_inbound_items_table.sql');
    console.log('  - 029_recreate_inbound_items_table.sql');
    console.log('  - 030_alter_inbound_orders_type.sql');
    console.log('  - 031_add_quantity_to_instances.sql');
    console.log('  - 032_add_instrument_fields.sql');
    console.log('  - 033_add_instrument_fields_to_inbound_items.sql');
    console.log('  - 034_add_technical_doc_field.sql');
    console.log('  - 035_add_attachment_field.sql');
    console.log('  - 036_create_transfer_order_items.sql');
    console.log('  - 037_add_transfer_order_shipping_fields.sql');
    console.log('  - 038_create_repair_orders_table.sql');
    console.log('  - 039_add_repair_quantity.sql');
    console.log('  - 040_add_equipment_repair_workflow.sql');
    console.log('  - 041_update_repair_workflow_approver.sql');
    console.log('  - 042_create_scrap_sales_table.sql');
    console.log('  - 043_add_equipment_scrap_sale_workflow.sql');
    console.log('  - 044_add_common_fields_to_inbound_items.sql');
    console.log('  - 045_add_manufacturer_and_technical_params_to_instances.sql');
    console.log('  - 046_create_equipment_images_table.sql');
    console.log('  - 047_create_equipment_accessories_table.sql');
    console.log('  - 048_add_node_name_to_execution_logs.sql');
    console.log('  - 048_create_workflow_locks_table.sql');
    console.log('  - 049_create_form_drafts_table.sql');
    console.log('  - 050_create_form_template_versions_table.sql');
    console.log('  - 051_add_performance_indexes.sql');
    console.log('  - 052_add_rejected_status.sql');
    console.log('');

  } catch (error) {
    console.error('迁移清理失败:', error);
    process.exit(1);
  }
}

// 执行清理
cleanupMigrations()
  .then(() => {
    console.log('清理完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('清理失败:', error);
    process.exit(1);
  });