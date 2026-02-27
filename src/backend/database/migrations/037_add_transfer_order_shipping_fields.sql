-- 添加设备调拨单发货单号和到货状态字段
-- Migration: 037_add_transfer_order_shipping_fields
-- Created: 2026-02-27

ALTER TABLE equipment_transfer_orders 
ADD COLUMN shipping_no VARCHAR(100) COMMENT '发货单号' AFTER shipped_by,
ADD COLUMN receive_status ENUM('normal', 'damaged', 'missing', 'partial') COMMENT '到货状态' AFTER receive_comment,
ADD COLUMN shipping_attachment VARCHAR(500) COMMENT '发货凭证附件' AFTER shipping_no;
