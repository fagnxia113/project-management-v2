-- 添加技术文档字段

-- 添加技术文档（可以是文档链接或文档内容）
ALTER TABLE equipment_instances 
ADD COLUMN technical_doc TEXT COMMENT '技术文档（文档链接或内容）' 
AFTER notes;

-- 添加技术文档到入库单明细表
ALTER TABLE equipment_inbound_items 
ADD COLUMN technical_doc TEXT COMMENT '技术文档（文档链接或内容）' 
AFTER accessory_desc;
