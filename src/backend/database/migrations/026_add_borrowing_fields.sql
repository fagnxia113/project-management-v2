-- ============================================
-- 项目管理系统 v2 - 设备实例表借用字段新增
-- 文件: 026_add_borrowing_fields.sql
-- 说明: 为设备实例表新增设备来源和借出方字段
-- ============================================

-- 1. 新增设备来源字段
ALTER TABLE equipment_instances 
ADD COLUMN equipment_source ENUM('owned', 'borrowed') DEFAULT 'owned' COMMENT '设备来源：owned-自有，borrowed-借用' AFTER equipment_type;

-- 2. 新增借出方字段
ALTER TABLE equipment_instances 
ADD COLUMN lender VARCHAR(200) COMMENT '借出方（借用设备时填写）' AFTER equipment_source;

-- 3. 建立索引
ALTER TABLE equipment_instances ADD INDEX idx_equipment_source (equipment_source);

-- ============================================
-- 完成
-- ============================================
