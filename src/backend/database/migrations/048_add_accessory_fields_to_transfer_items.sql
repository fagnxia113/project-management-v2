-- ============================================ -- 项目管理系统 v2 - 调拨单项目表添加配件字段 -- 文件: 048_add_accessory_fields_to_transfer_items.sql -- 说明: 为调拨单项目表添加配件相关字段，支持显示配件信息 -- ============================================

-- 1. 为调拨单项目表添加配件相关字段 ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS accessory_info JSON COMMENT '配件信息（仪器类）',
ADD COLUMN IF NOT EXISTS accessory_desc TEXT COMMENT '配件说明（假负载/线缆类）';

-- ============================================ -- 完成 -- ============================================