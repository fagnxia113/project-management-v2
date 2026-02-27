-- ============================================
-- 项目管理系统 v2 - 修改入库单主表结构
-- 文件: 028_alter_inbound_orders_table.sql
-- 说明: 修改入库单主表，移除设备型号相关字段，支持多种设备
-- ============================================

-- 1. 移除设备型号相关字段
ALTER TABLE equipment_inbound_orders 
DROP COLUMN model_id,
DROP COLUMN model_name,
DROP COLUMN model_no,
DROP COLUMN brand,
DROP COLUMN equipment_type,
DROP COLUMN total_quantity,
DROP COLUMN purchase_price;

-- ============================================
-- 完成
-- ============================================
