-- ============================================
-- 项目管理系统 v2 - 调拨单明细表添加设备详细信息字段
-- 文件: 049_add_equipment_detail_fields_to_transfer_items.sql
-- 说明: 为调拨单明细表添加设备详细信息字段，支持显示完整设备台账信息
-- ============================================

-- 1. 为调拨单明细表添加设备详细信息字段
ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(200) COMMENT '生产厂家' AFTER brand;

ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS technical_params TEXT COMMENT '技术参数' AFTER manufacturer;

ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS purchase_date DATE COMMENT '采购日期' AFTER serial_number;

ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2) COMMENT '采购价格' AFTER purchase_date;

ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS calibration_expiry DATE COMMENT '校准到期日期' AFTER purchase_price;

ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS certificate_no VARCHAR(100) COMMENT '证书编号' AFTER calibration_expiry;

ALTER TABLE equipment_transfer_order_items 
ADD COLUMN IF NOT EXISTS certificate_issuer VARCHAR(200) COMMENT '发证单位' AFTER certificate_no;

-- ============================================
-- 完成
-- ============================================
