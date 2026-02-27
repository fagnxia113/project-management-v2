-- ============================================
-- 项目管理系统 v2 - 设备调拨单明细表
-- 文件: 036_create_transfer_order_items.sql
-- 说明: 创建调拨单明细表，支持批量调拨
-- ============================================

-- 1. 创建调拨单明细表
CREATE TABLE IF NOT EXISTS equipment_transfer_order_items (
  id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
  order_id VARCHAR(36) NOT NULL COMMENT '调拨单ID',
  
  -- 设备信息
  equipment_id VARCHAR(36) COMMENT '设备实例ID（仪器类必填）',
  equipment_name VARCHAR(200) NOT NULL COMMENT '设备名称',
  model_no VARCHAR(100) COMMENT '型号编号',
  brand VARCHAR(100) COMMENT '品牌',
  category ENUM('instrument', 'fake_load', 'cable') NOT NULL COMMENT '设备类别',
  unit VARCHAR(20) DEFAULT '台' COMMENT '单位',
  
  -- 设备快照（提交时记录）
  manage_code VARCHAR(50) COMMENT '管理编号',
  serial_number VARCHAR(100) COMMENT '序列号（仪器类）',
  
  -- 数量
  quantity INT NOT NULL DEFAULT 1 COMMENT '调拨数量',
  
  -- 状态
  status ENUM('pending', 'transferred', 'returned') DEFAULT 'pending' COMMENT '明细状态',
  
  -- 备注
  notes TEXT COMMENT '备注',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备调拨单明细表';

-- 2. 为调拨主表增加字段
ALTER TABLE equipment_transfer_orders 
ADD COLUMN IF NOT EXISTS transfer_type ENUM('single', 'batch') DEFAULT 'single' COMMENT '调拨类型:单台/批量',
ADD COLUMN IF NOT EXISTS total_items INT DEFAULT 1 COMMENT '调拨设备项数',
ADD COLUMN IF NOT EXISTS total_quantity INT DEFAULT 0 COMMENT '调拨总数量';

-- ============================================
-- 完成
-- ============================================
