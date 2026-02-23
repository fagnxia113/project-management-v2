-- ============================================
-- 项目管理系统 v2 - 采购申请表
-- 文件: 011_purchase_request_tables.sql
-- 说明: 创建采购申请表和系统配置表
-- ============================================

-- 1. 采购申请表
CREATE TABLE IF NOT EXISTS purchase_requests (
  id VARCHAR(36) PRIMARY KEY COMMENT '采购申请ID',
  request_no VARCHAR(50) UNIQUE NOT NULL COMMENT '申请单号',
  equipment_id VARCHAR(36) COMMENT '设备ID(如果是补充现有设备)',
  equipment_name VARCHAR(200) NOT NULL COMMENT '设备名称',
  equipment_spec VARCHAR(500) COMMENT '设备规格型号',
  quantity INT NOT NULL DEFAULT 1 COMMENT '采购数量',
  reason TEXT NOT NULL COMMENT '采购原因',
  urgency ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '紧急程度',
  status ENUM('pending', 'approved', 'purchasing', 'arrived', 'cancelled') DEFAULT 'pending' COMMENT '采购状态',
  requester_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  requester_name VARCHAR(100) COMMENT '申请人姓名(冗余)',
  project_id VARCHAR(36) COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '关联项目名称(冗余)',
  estimated_price DECIMAL(12, 2) COMMENT '预估价格',
  actual_price DECIMAL(12, 2) COMMENT '实际价格',
  supplier VARCHAR(200) COMMENT '供应商',
  expected_date DATE COMMENT '期望到货日期',
  actual_date DATE COMMENT '实际到货日期',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment (equipment_id),
  INDEX idx_project (project_id),
  INDEX idx_requester (requester_id),
  INDEX idx_status (status),
  INDEX idx_urgency (urgency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请表';

-- 2. 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  value TEXT COMMENT '配置值',
  description VARCHAR(500) COMMENT '配置说明',
  category VARCHAR(50) COMMENT '配置分类',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (`key`),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 3. 插入默认配置
INSERT IGNORE INTO system_configs (id, `key`, value, description, category) VALUES
  (UUID(), 'purchase_manager_id', NULL, '采购负责人ID', 'purchase'),
  (UUID(), 'equipment_manager_id', NULL, '设备管理员ID', 'equipment'),
  (UUID(), 'hr_manager_id', NULL, '人事负责人ID', 'hr'),
  (UUID(), 'daily_report_reminder_time', '18:00', '日报提醒时间', 'notification'),
  (UUID(), 'progress_check_interval', '60', '进度检查间隔(分钟)', 'notification'),
  (UUID(), 'deviation_threshold_warning', '5', '进度偏离预警阈值(%)', 'notification'),
  (UUID(), 'deviation_threshold_severe', '15', '进度偏离严重阈值(%)', 'notification');

-- ============================================
-- 完成
-- ============================================
