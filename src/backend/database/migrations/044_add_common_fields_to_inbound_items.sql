-- 为设备入库单明细添加通用字段（生产厂家、技术参数、备注）
-- 并为仪器类添加校准证书到期时间

-- 添加生产厂家
ALTER TABLE equipment_inbound_items 
ADD COLUMN manufacturer VARCHAR(200) COMMENT '生产厂家' 
AFTER model_no;

-- 添加技术参数
ALTER TABLE equipment_inbound_items 
ADD COLUMN technical_params TEXT COMMENT '技术参数' 
AFTER manufacturer;

-- 添加备注
ALTER TABLE equipment_inbound_items 
ADD COLUMN item_notes TEXT COMMENT '备注' 
AFTER technical_params;

-- 添加校准证书到期时间（仅仪器类）
ALTER TABLE equipment_inbound_items 
ADD COLUMN certificate_expiry_date DATE COMMENT '校准证书到期时间（仅仪器类）' 
AFTER certificate_issuer;
