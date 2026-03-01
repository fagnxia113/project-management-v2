-- 创建设备报废/售出单表
CREATE TABLE IF NOT EXISTS equipment_scrap_sales (
  id VARCHAR(36) PRIMARY KEY COMMENT '主键ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '单号：BF-20260228-001（报废）或XS-20260228-001（售出）',
  type ENUM('scrap', 'sale') NOT NULL COMMENT '类型：scrap-报废，sale-售出',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATETIME NOT NULL COMMENT '申请日期',
  
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID（仪器类为具体设备ID，负载/线缆类为设备型号ID）',
  equipment_name VARCHAR(200) NOT NULL COMMENT '设备名称',
  equipment_category ENUM('instrument', 'fake_load', 'cable') NOT NULL COMMENT '设备类别',
  scrap_sale_quantity INT DEFAULT 1 COMMENT '报废/售出数量（负载/线缆类使用）',
  
  original_location_type ENUM('warehouse', 'project') NOT NULL COMMENT '原始位置类型',
  original_location_id VARCHAR(36) NOT NULL COMMENT '原始位置ID',
  
  reason TEXT NOT NULL COMMENT '报废/售出原因',
  
  sale_price DECIMAL(10, 2) COMMENT '售出价格（售出类型使用）',
  buyer VARCHAR(200) COMMENT '购买方（售出类型使用）',
  
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed') DEFAULT 'draft' COMMENT '状态',
  
  approval_id VARCHAR(36) COMMENT '工作流实例ID',
  approved_at DATETIME COMMENT '审批时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  approval_comment TEXT COMMENT '审批意见',
  
  processed_at DATETIME COMMENT '处理时间',
  processed_by VARCHAR(36) COMMENT '处理人ID',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_order_no (order_no),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_applicant_id (applicant_id),
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_apply_date (apply_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备报废/售出单表';