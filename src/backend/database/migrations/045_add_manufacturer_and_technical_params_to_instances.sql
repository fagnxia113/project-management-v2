-- 为设备实例表添加生产厂家、技术参数字段

-- 添加生产厂家
ALTER TABLE equipment_instances 
ADD COLUMN manufacturer VARCHAR(200) COMMENT '生产厂家' 
AFTER brand;

-- 添加技术参数
ALTER TABLE equipment_instances 
ADD COLUMN technical_params TEXT COMMENT '技术参数' 
AFTER manufacturer;
