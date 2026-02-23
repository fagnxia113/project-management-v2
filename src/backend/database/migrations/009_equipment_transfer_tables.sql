-- ============================================
-- 项目管理系统 v2 - 设备调拨表
-- 文件: 009_equipment_transfer_tables.sql
-- 说明: 创建设备调拨表和审批表
-- ============================================

-- 1. 设备调拨表
CREATE TABLE IF NOT EXISTS equipment_transfers (
  id VARCHAR(36) PRIMARY KEY COMMENT '调拨ID',
  transfer_no VARCHAR(50) UNIQUE NOT NULL COMMENT '调拨单号',
  scenario ENUM('A', 'B', 'C') NOT NULL COMMENT '调拨场景(A:国内仓库/B:采购/C:项目间)',
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_name VARCHAR(200) COMMENT '设备名称(冗余)',
  equipment_code VARCHAR(50) COMMENT '设备编号(冗余)',
  from_warehouse_id VARCHAR(36) COMMENT '调出仓库ID',
  from_warehouse_name VARCHAR(200) COMMENT '调出仓库名称(冗余)',
  from_project_id VARCHAR(36) COMMENT '调出项目ID',
  from_project_name VARCHAR(200) COMMENT '调出项目名称(冗余)',
  to_project_id VARCHAR(36) NOT NULL COMMENT '调入项目ID',
  to_project_name VARCHAR(200) COMMENT '调入项目名称(冗余)',
  requester_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  requester_name VARCHAR(100) COMMENT '申请人姓名(冗余)',
  reason TEXT NOT NULL COMMENT '调拨原因',
  status ENUM('pending', 'approved', 'rejected', 'in_transit', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '调拨状态',
  expected_date DATE COMMENT '期望到货日期',
  actual_date DATE COMMENT '实际到货日期',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment (equipment_id),
  INDEX idx_from_warehouse (from_warehouse_id),
  INDEX idx_from_project (from_project_id),
  INDEX idx_to_project (to_project_id),
  INDEX idx_requester (requester_id),
  INDEX idx_status (status),
  INDEX idx_scenario (scenario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备调拨表';

-- 2. 调拨审批表
CREATE TABLE IF NOT EXISTS transfer_approvals (
  id VARCHAR(36) PRIMARY KEY COMMENT '审批ID',
  transfer_id VARCHAR(36) NOT NULL COMMENT '调拨ID',
  approver_type ENUM('warehouse_manager', 'from_pm', 'to_pm', 'purchase_manager') NOT NULL COMMENT '审批人类型',
  approver_id VARCHAR(36) NOT NULL COMMENT '审批人ID',
  approver_name VARCHAR(100) COMMENT '审批人姓名(冗余)',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
  comment TEXT COMMENT '审批意见',
  approved_at TIMESTAMP COMMENT '审批时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transfer_id) REFERENCES equipment_transfers(id) ON DELETE CASCADE,
  INDEX idx_transfer (transfer_id),
  INDEX idx_approver (approver_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调拨审批表';

-- ============================================
-- 完成
-- ============================================
