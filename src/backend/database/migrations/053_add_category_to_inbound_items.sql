-- 添加缺失的category字段到equipment_inbound_items表
ALTER TABLE equipment_inbound_items 
ADD COLUMN category VARCHAR(50) COMMENT '设备类别' AFTER brand;
