-- 添加维修数量字段
ALTER TABLE equipment_repair_orders 
ADD COLUMN repair_quantity INT DEFAULT 1 COMMENT '维修数量' 
AFTER equipment_category;
