-- ============================================
-- 项目管理系统 v2 - 设备调拨图片字段
-- 文件: 038_add_transfer_order_images.sql
-- 说明: 为调拨单和明细添加发货/收货图片字段
-- ============================================

-- 1. 创建调拨单明细表（如果不存在）
CREATE TABLE IF NOT EXISTS equipment_transfer_order_items (
  id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
  order_id VARCHAR(36) NOT NULL COMMENT '调拨单ID',
  
  equipment_id VARCHAR(36) COMMENT '设备实例ID（仪器类必填）',
  equipment_name VARCHAR(200) NOT NULL COMMENT '设备名称',
  model_no VARCHAR(100) COMMENT '型号编号',
  brand VARCHAR(100) COMMENT '品牌',
  category ENUM('instrument', 'fake_load', 'cable') NOT NULL COMMENT '设备类别',
  unit VARCHAR(20) DEFAULT '台' COMMENT '单位',
  manage_code VARCHAR(50) COMMENT '管理编号',
  serial_number VARCHAR(100) COMMENT '序列号（仪器类）',
  quantity INT NOT NULL DEFAULT 1 COMMENT '调拨数量',
  status ENUM('pending', 'transferred', 'returned') DEFAULT 'pending' COMMENT '明细状态',
  notes TEXT COMMENT '备注',
  shipping_images JSON COMMENT '发货图片(JSON数组)',
  receiving_images JSON COMMENT '收货图片(JSON数组)',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备调拨单明细表';

-- 2. 为调拨单主表添加图片字段
ALTER TABLE equipment_transfer_orders 
ADD COLUMN shipping_package_images JSON COMMENT '发货打包图片(JSON数组)';

ALTER TABLE equipment_transfer_orders 
ADD COLUMN receiving_package_images JSON COMMENT '收货整体图片(JSON数组)';

-- ============================================
-- 完成
-- ============================================
