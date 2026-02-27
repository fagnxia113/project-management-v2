-- ============================================
-- 项目管理系统 v2 - 修改入库单明细表结构
-- 文件: 029_alter_inbound_items_table.sql
-- 说明: 修改入库单明细表，支持多种设备和批量序列号
-- ============================================

-- 1. 移除旧字段
ALTER TABLE equipment_inbound_items 
DROP COLUMN equipment_id,
DROP COLUMN manage_code,
DROP COLUMN calibration_expiry,
DROP COLUMN calibration_certificate,
DROP COLUMN damage_desc;

-- 2. 添加新字段
ALTER TABLE equipment_inbound_items 
ADD COLUMN model_id VARCHAR(36) COMMENT '设备型号ID' AFTER order_id,
ADD COLUMN equipment_name VARCHAR(200) COMMENT '设备名称' AFTER model_id,
ADD COLUMN model_no VARCHAR(100) COMMENT '型号编号' AFTER equipment_name,
ADD COLUMN brand VARCHAR(100) COMMENT '品牌' AFTER model_no,
ADD COLUMN category ENUM('instrument', 'fake_load') COMMENT '设备类别' AFTER brand,
ADD COLUMN quantity INT DEFAULT 1 COMMENT '数量' AFTER category,
ADD COLUMN purchase_price DECIMAL(10,2) COMMENT '采购单价' AFTER quantity,
ADD COLUMN total_price DECIMAL(10,2) COMMENT '总价' AFTER purchase_price,
ADD COLUMN serial_numbers TEXT COMMENT '序列号列表（逗号分隔）' AFTER total_price,
ADD COLUMN accessory_desc TEXT COMMENT '配件情况' AFTER serial_numbers;

-- 3. 建立索引
ALTER TABLE equipment_inbound_items ADD INDEX idx_model_id (model_id);

-- ============================================
-- 完成
-- ============================================
