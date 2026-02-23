-- ============================================
-- 项目管理系统 v2 - 设备调拨明细表
-- 文件: 013_equipment_transfer_details.sql
-- 说明: 创建调拨明细表，支持批量调拨设备
-- ============================================

-- 1. 设备调拨明细表
CREATE TABLE IF NOT EXISTS equipment_transfer_details (
  id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
  transfer_id VARCHAR(36) NOT NULL COMMENT '调拨单ID',
  equipment_id VARCHAR(36) COMMENT '设备ID',
  equipment_name VARCHAR(200) COMMENT '仪器负载名称',
  equipment_code VARCHAR(50) COMMENT '管理编号',
  model VARCHAR(100) COMMENT '品牌及型号',
  serial_number VARCHAR(100) COMMENT '仪器出厂编号',
  host_status VARCHAR(50) COMMENT '主机状态',
  accessories_status TEXT COMMENT '配件情况',
  unit VARCHAR(20) COMMENT '单位',
  image_url TEXT COMMENT '设备图片',
  requested_quantity INT DEFAULT 1 COMMENT '申请调拨数量',
  approved_quantity INT DEFAULT 0 COMMENT '审批批准数量',
  actual_quantity INT DEFAULT 0 COMMENT '实际调拨数量',
  reason TEXT COMMENT '调拨原因',
  notes TEXT COMMENT '备注',
  status ENUM('pending', 'approved', 'partial', 'rejected', 'completed') DEFAULT 'pending' COMMENT '明细状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transfer (transfer_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备调拨明细表';

-- 2. 为调拨主表增加字段
ALTER TABLE equipment_transfer_orders 
ADD COLUMN IF NOT EXISTS transfer_type ENUM('single', 'batch') DEFAULT 'single' COMMENT '调拨类型:单台/批量',
ADD COLUMN IF NOT EXISTS total_items INT DEFAULT 1 COMMENT '调拨设备项数',
ADD COLUMN IF NOT EXISTS total_requested_quantity INT DEFAULT 0 COMMENT '申请总数量',
ADD COLUMN IF NOT EXISTS total_approved_quantity INT DEFAULT 0 COMMENT '审批总数量';

-- ============================================
-- 完成
-- ============================================
