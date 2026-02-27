-- 添加仪器类设备入库单明细的额外字段

-- 添加仪器出厂编号
ALTER TABLE equipment_inbound_items 
ADD COLUMN factory_serial_no VARCHAR(100) COMMENT '仪器出厂编号（仅仪器类）' 
AFTER serial_numbers;

-- 添加证书编号
ALTER TABLE equipment_inbound_items 
ADD COLUMN certificate_no VARCHAR(100) COMMENT '校准证书编号（仅仪器类）' 
AFTER factory_serial_no;

-- 添加发证单位
ALTER TABLE equipment_inbound_items 
ADD COLUMN certificate_issuer VARCHAR(200) COMMENT '发证单位（仅仪器类）' 
AFTER certificate_no;
