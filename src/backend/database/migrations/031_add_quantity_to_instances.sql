-- 添加数量字段到设备实例表
-- 用于支持假负载和线缆类的数量管理

ALTER TABLE equipment_instances 
ADD COLUMN quantity INT DEFAULT 1 COMMENT '数量（仪器类始终为1，假负载/线缆类存储总数量）' 
AFTER unit;

-- 为假负载和线缆类添加注释
ALTER TABLE equipment_instances 
MODIFY COLUMN unit VARCHAR(20) DEFAULT '台' COMMENT '单位（仪器类/假负载类：台，线缆类：米）';

-- 更新现有数据：仪器类数量设为1，假负载和线缆类根据实际情况设置
UPDATE equipment_instances 
SET quantity = 1 
WHERE category = 'instrument';

-- 对于假负载和线缆类，如果数量为NULL或0，设置为1
UPDATE equipment_instances 
SET quantity = 1 
WHERE category IN ('fake_load', 'cable') AND (quantity IS NULL OR quantity = 0);
