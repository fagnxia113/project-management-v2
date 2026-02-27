-- 迁移：简化入库单明细表
-- 日期：2026-02-26
-- 说明：移除对设备型号表的依赖，直接存储设备信息

-- 1. 修改 category 字段，添加 cable 选项
ALTER TABLE equipment_inbound_items 
MODIFY COLUMN category ENUM('instrument', 'fake_load', 'cable') NOT NULL COMMENT '设备类别';
