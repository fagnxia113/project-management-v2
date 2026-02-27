-- 添加附件字段（支持文件上传）

-- 添加附件字段到设备实例表
ALTER TABLE equipment_instances 
ADD COLUMN attachment VARCHAR(500) COMMENT '附件（文件路径）' 
AFTER technical_doc;

-- 添加附件字段到入库单明细表
ALTER TABLE equipment_inbound_items 
ADD COLUMN attachment VARCHAR(500) COMMENT '附件（文件路径）' 
AFTER technical_doc;
