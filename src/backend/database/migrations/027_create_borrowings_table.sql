-- ============================================
-- 项目管理系统 v2 - 设备借用记录表创建
-- 文件: 027_create_borrowings_table.sql
-- 说明: 创建设备借用记录表，用于管理借用设备的全生命周期
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_borrowings (
  id VARCHAR(36) PRIMARY KEY COMMENT '借用记录ID',
  borrowing_no VARCHAR(50) UNIQUE NOT NULL COMMENT '借用单号：JY-20240315-001',
  
  -- 设备信息
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_name VARCHAR(200) COMMENT '设备名称',
  manage_code VARCHAR(50) COMMENT '管理编号',
  
  -- 借用信息
  lender VARCHAR(200) NOT NULL COMMENT '借出方（厂家）',
  borrow_date DATE NOT NULL COMMENT '借用日期',
  return_deadline DATE COMMENT '归还期限',
  contract_no VARCHAR(100) COMMENT '借用合同编号',
  
  -- 使用信息
  project_id VARCHAR(36) COMMENT '使用项目ID',
  project_name VARCHAR(100) COMMENT '使用项目名称',
  
  -- 归还信息
  return_date DATE COMMENT '实际归还日期',
  return_to VARCHAR(50) COMMENT '归还对象：lender-归还厂家，warehouse-归还仓库',
  return_location_id VARCHAR(36) COMMENT '归还位置ID',
  
  -- 状态
  status ENUM('borrowing', 'returned', 'overdue') DEFAULT 'borrowing' COMMENT '借用状态',
  
  -- 其他
  notes TEXT COMMENT '备注',
  applicant_id VARCHAR(36) COMMENT '申请人ID',
  applicant_name VARCHAR(50) COMMENT '申请人姓名',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_borrowing_no (borrowing_no),
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_project_id (project_id),
  INDEX idx_status (status),
  FOREIGN KEY (equipment_id) REFERENCES equipment_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备借用记录表';

-- ============================================
-- 完成
-- ============================================
