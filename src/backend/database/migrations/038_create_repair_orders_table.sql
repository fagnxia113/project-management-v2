-- 创建维修单表
CREATE TABLE IF NOT EXISTS equipment_repair_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '维修单号',
  
  -- 申请人信息
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 设备信息
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_name VARCHAR(200) COMMENT '设备名称',
  equipment_category VARCHAR(50) COMMENT '设备类别',
  
  -- 原始位置信息（用于收货时恢复）
  original_location_type ENUM('warehouse', 'project') COMMENT '原始位置类型',
  original_location_id VARCHAR(36) COMMENT '原始位置ID',
  
  -- 维修信息
  fault_description TEXT NOT NULL COMMENT '故障描述',
  repair_service_provider VARCHAR(200) COMMENT '维修服务商',
  
  -- 发货信息
  shipped_at TIMESTAMP NULL COMMENT '发货时间',
  shipped_by VARCHAR(36) COMMENT '发货人ID',
  shipping_no VARCHAR(100) COMMENT '物流单号',
  
  -- 收货信息
  received_at TIMESTAMP NULL COMMENT '收货时间',
  received_by VARCHAR(36) COMMENT '收货人ID',
  
  -- 审批信息
  status ENUM('draft', 'pending', 'shipping', 'repairing', 'receiving', 'completed', 'rejected') DEFAULT 'draft' COMMENT '状态',
  approval_id VARCHAR(36) COMMENT '审批流程ID',
  approved_at TIMESTAMP NULL COMMENT '审批时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  approval_comment TEXT COMMENT '审批意见',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_status (status),
  INDEX idx_applicant_id (applicant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维修单表';
