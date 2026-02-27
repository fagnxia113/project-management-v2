-- ============================================
-- 项目管理系统 v2 - 修改入库单类型枚举
-- 文件: 030_alter_inbound_orders_type.sql
-- 说明: 移除维修归还类型，维修流程独立处理
-- ============================================

-- 1. 修改入库类型枚举
ALTER TABLE equipment_inbound_orders 
MODIFY COLUMN inbound_type ENUM('purchase', 'other') DEFAULT 'purchase' COMMENT '入库类型';

-- ============================================
-- 完成
-- ============================================
