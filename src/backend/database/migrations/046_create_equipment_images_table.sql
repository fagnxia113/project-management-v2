-- ============================================
-- 项目管理系统 v2 - 设备图片管理表
-- 文件: 046_create_equipment_images_table.sql
-- 说明: 创建设备图片表，记录设备在各阶段的图片（入库、调拨、收货等）
-- ============================================

-- 1. 设备图片表
CREATE TABLE IF NOT EXISTS equipment_images (
  id VARCHAR(36) PRIMARY KEY COMMENT '图片ID',
  equipment_id VARCHAR(36) COMMENT '设备实例ID（仪器类必填）',
  equipment_name VARCHAR(200) COMMENT '设备名称（冗余）',
  model_no VARCHAR(100) COMMENT '型号编号（冗余）',
  category ENUM('instrument', 'fake_load', 'cable') COMMENT '设备类别（冗余）',
  
  -- 图片类型
  image_type ENUM(
    'main',              -- 主机照片
    'accessory',         -- 配件照片
    'transfer_shipping',  -- 调拨-发货图片
    'transfer_packed',    -- 调拨-打包图片
    'transfer_receiving'  -- 调拨-收货确认图片
  ) NOT NULL COMMENT '图片类型',
  
  -- 图片信息
  image_url VARCHAR(500) NOT NULL COMMENT '图片URL',
  image_name VARCHAR(200) COMMENT '图片原始名称',
  image_size INT COMMENT '图片大小（字节）',
  image_format VARCHAR(20) COMMENT '图片格式（jpg/png等）',
  
  -- 关联信息
  business_type ENUM('inbound', 'transfer', 'return', 'repair') COMMENT '业务类型',
  business_id VARCHAR(36) COMMENT '业务单据ID（入库单/调拨单/归还单/维修单）',
  
  -- 操作人信息
  uploader_id VARCHAR(36) COMMENT '上传人ID',
  uploader_name VARCHAR(100) COMMENT '上传人姓名',
  
  -- 备注
  notes TEXT COMMENT '备注说明',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_business (business_type, business_id),
  INDEX idx_image_type (image_type),
  INDEX idx_uploader (uploader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备图片表';

-- ============================================
-- 完成
-- ============================================
