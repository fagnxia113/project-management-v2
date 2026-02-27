-- ============================================
-- 项目管理系统 v2 - 入库单明细表
-- 文件: 024_create_inbound_items_table.sql
-- 说明: 创建入库单明细表，用于记录每台设备的详细信息
-- ============================================

-- 1. 入库单明细表
CREATE TABLE IF NOT EXISTS equipment_inbound_items (
  id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
  order_id VARCHAR(36) NOT NULL COMMENT '入库单ID',
  equipment_id VARCHAR(36) COMMENT '设备ID（审批通过后生成）',
  
  -- 设备信息快照（提交时记录，避免后续变更影响）
  equipment_name VARCHAR(200) COMMENT '设备名称',
  manage_code VARCHAR(50) COMMENT '管理编号',
  serial_number VARCHAR(100) COMMENT '序列号（仪器类必填）',
  model_name VARCHAR(100) COMMENT '型号名称',
  model_no VARCHAR(100) COMMENT '型号编号',
  brand VARCHAR(100) COMMENT '品牌',
  
  -- 校准信息
  calibration_expiry DATE COMMENT '校准到期日（仪器类）',
  calibration_certificate VARCHAR(100) COMMENT '校准证书编号',
  
  -- 配件信息
  accessory_desc TEXT COMMENT '配件情况',
  damage_desc TEXT COMMENT '损坏说明',
  
  -- 状态
  status ENUM('pending', 'inbound', 'rejected') DEFAULT 'pending' COMMENT '明细状态',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES equipment_inbound_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';

-- ============================================
-- 完成
-- ============================================
