# 数据库迁移清理指南

## 问题说明

当前数据库迁移文件存在以下问题：

1. **重复的迁移文件编号**：003、008、010、013、015、024、029、048 都有重复
2. **测试数据混在迁移中**：014_init_employees.sql 包含测试数据（张三、李四等）
3. **迁移文件过多**：52个迁移文件，难以维护
4. **在生产环境开发**：每次重启服务器都可能重新插入测试数据

## 解决方案

### 1. 新的数据库结构文件

创建了 `001_complete_database_schema.sql`，包含：
- 完整的数据库表结构
- 所有必要的索引
- 视图定义
- 外键约束

### 2. 迁移清理脚本

创建了 `cleanup_migrations.ts`，功能包括：
- 备份当前数据库数据
- 删除所有表
- 使用新的数据库结构重建表
- 恢复数据

## 使用步骤

### 步骤1：备份数据库（重要！）

```bash
# 使用 mysqldump 备份
mysqldump -u root -p project_management_v2 > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤2：执行清理脚本

```bash
cd /home/devbox/project/project-management-v2
npx tsx src/backend/scripts/cleanup_migrations.ts
```

### 步骤3：验证数据

检查数据是否正确恢复：
- 用户数据
- 员工数据
- 项目数据
- 设备数据
- 工作流数据

### 步骤4：测试应用

测试应用功能是否正常：
- 登录功能
- 员工管理
- 项目管理
- 设备管理
- 审批流程

### 步骤5：删除旧迁移文件（可选）

如果一切正常，可以删除旧的迁移文件：

```bash
cd /home/devbox/project/project-management-v2/src/backend/database/migrations

# 删除重复和旧的迁移文件
rm 003_dynamic_approver_rules.sql
rm 003_simplify_inbound_items.sql
rm 005_supplement_fields_and_workflow_tables.sql
rm 006_add_workflow_tables.sql
rm 007_workflow_engine_tables.sql
rm 008_organization_structure.sql
rm 008_workflow_tables_optimization.sql
rm 009_add_category_to_instances.sql
rm 010_add_execution_logs.sql
rm 010_notification_alert_tables.sql
rm 011_purchase_request_tables.sql
rm 013_add_skipped_to_instance_result.sql
rm 013_equipment_transfer_details.sql
rm 014_init_employees.sql
rm 015_add_user_id_to_employees.sql
rm 015_update_onboard_form_position.sql
rm 016_enhance_project_fields.sql
rm 017_update_project_approval_form_schema.sql
rm 018_update_project_form_schema_v2.sql
rm 019_fix_customer_type_enum.sql
rm 020_fix_customer_address_nullable.sql
rm 021_add_missing_project_fields.sql
rm 024_create_inbound_items_table.sql
rm 025_create_inbound_orders_table.sql
rm 028_alter_inbound_orders_table.sql
rm 029_alter_inbound_items_table.sql
rm 029_recreate_inbound_items_table.sql
rm 030_alter_inbound_orders_type.sql
rm 031_add_quantity_to_instances.sql
rm 032_add_instrument_fields.sql
rm 033_add_instrument_fields_to_inbound_items.sql
rm 034_add_technical_doc_field.sql
rm 035_add_attachment_field.sql
rm 036_create_transfer_order_items.sql
rm 037_add_transfer_order_shipping_fields.sql
rm 038_create_repair_orders_table.sql
rm 039_add_repair_quantity.sql
rm 040_add_equipment_repair_workflow.sql
rm 041_update_repair_workflow_approver.sql
rm 042_create_scrap_sales_table.sql
rm 043_add_equipment_scrap_sale_workflow.sql
rm 044_add_common_fields_to_inbound_items.sql
rm 045_add_manufacturer_and_technical_params_to_instances.sql
rm 046_create_equipment_images_table.sql
rm 047_create_equipment_accessories_table.sql
rm 048_add_node_name_to_execution_logs.sql
rm 048_create_workflow_locks_table.sql
rm 049_create_form_drafts_table.sql
rm 050_create_form_template_versions_table.sql
rm 051_add_performance_indexes.sql
rm 052_add_rejected_status.sql
```

## 注意事项

### 1. 测试数据问题

`014_init_employees.sql` 包含测试数据，已修改为使用 `INSERT IGNORE` 避免重复插入。建议：
- 如果不需要测试数据，删除这个文件
- 如果需要测试数据，保留这个文件但确保使用 `INSERT IGNORE`

### 2. 生产环境开发

在生产环境开发时，建议：
- 不要在迁移文件中包含测试数据
- 使用单独的数据初始化脚本
- 使用环境变量区分开发和生产环境

### 3. 迁移文件管理

建议的迁移文件管理方式：
- 001_complete_database_schema.sql - 完整数据库结构
- 002_add_new_feature.sql - 新功能表结构
- 003_update_table_structure.sql - 表结构更新
- ...

每个迁移文件应该：
- 只包含表结构变更
- 不包含测试数据
- 使用 `IF NOT EXISTS` 或 `INSERT IGNORE`

### 4. 数据库初始化

修改 `server.ts` 中的初始化逻辑：
- 不再执行 `/api/migrate` 自动迁移
- 只在开发环境执行测试数据初始化
- 生产环境不执行任何数据初始化

## 回滚方案

如果清理后出现问题：

```bash
# 恢复数据库备份
mysql -u root -p project_management_v2 < backup_YYYYMMDD_HHMMSS.sql

# 重启应用
npm run dev:backend
```

## 最佳实践

### 1. 迁移文件命名

```
[编号]_[描述].sql
```

例如：
- 001_complete_database_schema.sql
- 002_add_user_profile_table.sql
- 003_update_employee_table.sql

### 2. 迁移文件内容

- 只包含表结构变更
- 不包含测试数据
- 使用 `IF NOT EXISTS` 避免重复创建
- 使用 `INSERT IGNORE` 避免重复插入

### 3. 测试数据管理

创建单独的数据初始化脚本：
- `init_test_data.sql` - 测试数据
- `init_production_data.sql` - 生产数据

在应用启动时根据环境变量选择执行：
```typescript
if (process.env.NODE_ENV === 'development') {
  await initTestData();
}
```

### 4. 版本控制

- 将迁移文件纳入版本控制
- 每次数据库结构变更都创建新的迁移文件
- 记录每个迁移文件的目的和变更内容

## 总结

通过清理迁移文件，可以：
1. 解决重复编号问题
2. 移除测试数据
3. 简化迁移文件管理
4. 避免生产环境数据污染
5. 提高数据库维护效率

建议在生产环境执行清理前，先在测试环境验证。