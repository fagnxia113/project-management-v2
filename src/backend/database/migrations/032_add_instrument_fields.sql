-- 添加仪器类设备的额外信息字段

-- 添加仪器出厂编号（如果不存在）
ALTER TABLE equipment_instances 
ADD COLUMN factory_serial_no VARCHAR(100) COMMENT '仪器出厂编号（仅仪器类）' 
AFTER serial_number;

-- 添加证书编号（如果不存在）
ALTER TABLE equipment_instances 
ADD COLUMN certificate_no VARCHAR(100) COMMENT '校准证书编号（仅仪器类）' 
AFTER calibration_expiry;

-- 添加发证单位（如果不存在）
ALTER TABLE equipment_instances 
ADD COLUMN certificate_issuer VARCHAR(200) COMMENT '发证单位（仅仪器类）' 
AFTER certificate_no;
