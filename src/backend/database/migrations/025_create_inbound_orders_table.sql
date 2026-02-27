-- ============================================
-- 项目管理系统 v2 - 入库单主表
-- 文件: 025_create_inbound_orders_table.sql
-- 说明: 创建入库单主表
-- ============================================

-- 1. 入库单主表
CREATE TABLE IF NOT EXISTS equipment_inbound_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '入库单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '入库单号：RK-20240315-001',
  
  -- 入库信息
  inbound_type ENUM('purchase', 'repair_return', 'other') DEFAULT 'purchase' COMMENT '入库类型',
  warehouse_id VARCHAR(36) COMMENT '入库仓库ID',
  warehouse_name VARCHAR(100) COMMENT '仓库名称',
  
  -- 设备型号
  model_id VARCHAR(36) COMMENT '设备型号ID',
  model_name VARCHAR(100) COMMENT '型号名称',
  model_no VARCHAR(100) COMMENT '型号编号',
  brand VARCHAR(100) COMMENT '品牌',
  equipment_type ENUM('instrument', 'fake_load') COMMENT '设备类型',
  
  -- 数量统计
  total_quantity INT DEFAULT 0 COMMENT '总数量',
  
  -- 采购信息
  purchase_date DATE COMMENT '采购日期',
  purchase_price DECIMAL(10,2) COMMENT '采购单价',
  total_price DECIMAL(10,2) COMMENT '总价格',
  supplier VARCHAR(200) COMMENT '供应商',
  
  -- 申请信息
  applicant_id VARCHAR(36) COMMENT '申请人ID',
  applicant_name VARCHAR(50) COMMENT '申请人姓名',
  apply_date DATE COMMENT '申请日期',
  
  -- 审批信息
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  approver_id VARCHAR(36) COMMENT '审批人ID',
  approve_time DATETIME COMMENT '审批时间',
  approve_remark TEXT COMMENT '审批意见',
  
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_order_no (order_no),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_model_id (model_id),
  INDEX idx_status (status),
  INDEX idx_applicant_id (applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单主表';

-- ============================================
-- 完成
-- ============================================
