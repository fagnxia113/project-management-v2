-- ============================================
-- 项目管理系统 v2 - 优化版核心数据库脚本
-- 文件: 001_create_core_tables.sql
-- ============================================

-- 1. 组织架构表
CREATE TABLE IF NOT EXISTS organization (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id VARCHAR(36),
  level INT NOT NULL COMMENT '1:总部, 2:分公司, 3:部门, 4:项目部',
  manager_id VARCHAR(36),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 员工信息表
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(36) PRIMARY KEY,
  employee_no VARCHAR(50) UNIQUE,
  name VARCHAR(100) NOT NULL,
  gender ENUM('male', 'female'),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  department_id VARCHAR(36),
  position VARCHAR(100) NOT NULL,
  status ENUM('active', 'resigned', 'probation') DEFAULT 'active',
  current_status ENUM('on_duty', 'leave', 'business_trip', 'other') DEFAULT 'on_duty',
  hire_date DATE NOT NULL,
  leave_date DATE,
  role ENUM('admin', 'project_manager', 'hr_manager', 'equipment_manager', 'implementer', 'user') DEFAULT 'user',
  daily_cost DECIMAL(10,2) DEFAULT 0,
  skills JSON,
  avatar_color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 客户信息表
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  customer_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('enterprise', 'government', 'research') DEFAULT 'enterprise',
  contact VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 仓库信息表
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(36) PRIMARY KEY,
  warehouse_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('main', 'branch', 'project') DEFAULT 'main',
  location VARCHAR(200) NOT NULL,
  address TEXT,
  manager_id VARCHAR(36),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 项目信息表
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('domestic', 'foreign', 'rd', 'service') DEFAULT 'domestic',
  manager_id VARCHAR(36),
  status ENUM('proposal', 'in_progress', 'completed', 'paused', 'delayed') DEFAULT 'proposal',
  progress INT DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(15,2) DEFAULT 0,
  customer_id VARCHAR(36),
  organization_id VARCHAR(36),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 任务管理表 (WBS 路径枚举)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  parent_id VARCHAR(36),
  wbs_path VARCHAR(255) NOT NULL,
  wbs_code VARCHAR(50) NOT NULL,
  name VARCHAR(300) NOT NULL,
  task_type ENUM('milestone', 'subtask', 'process') DEFAULT 'subtask',
  description TEXT,
  assignee_id VARCHAR(36),
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  progress INT DEFAULT 0,
  status ENUM('unassigned', 'pending_confirm', 'accepted', 'in_progress', 'completed', 'closed') DEFAULT 'unassigned',
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_wbs (wbs_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 项目人员关联表
CREATE TABLE IF NOT EXISTS project_personnel (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(36) NOT NULL,
  role_in_project VARCHAR(50),
  on_duty_status ENUM('on_duty', 'off_duty') DEFAULT 'on_duty',
  transfer_in_date DATE NOT NULL,
  transfer_out_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_proj_emp (project_id, employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. 设备型号字典表
CREATE TABLE IF NOT EXISTS equipment_models (
  id VARCHAR(36) PRIMARY KEY,
  category ENUM('instrument', 'fake_load') NOT NULL,
  name VARCHAR(200) NOT NULL,
  model_no VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  unit VARCHAR(20) DEFAULT '台',
  calibration_cycle INT DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. 设备物理实例表 (一物一码)
CREATE TABLE IF NOT EXISTS equipment_instances (
  id VARCHAR(36) PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,
  serial_number VARCHAR(100),
  manage_code VARCHAR(50) UNIQUE NOT NULL,
  health_status ENUM('normal', 'slightly_damaged', 'affected_use', 'repairing', 'scrapped') DEFAULT 'normal',
  usage_status ENUM('idle', 'in_use') DEFAULT 'idle',
  location_status ENUM('warehouse', 'in_project', 'repairing', 'transferring') DEFAULT 'warehouse',
  location_id VARCHAR(36),
  keeper_id VARCHAR(36),
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  calibration_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_model (model_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. 日报汇报表
CREATE TABLE IF NOT EXISTS daily_reports (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  report_date DATE NOT NULL,
  summary TEXT NOT NULL,
  plan TEXT,
  problems TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewer_id VARCHAR(36),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. 工时明细表
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(36),
  duration DECIMAL(4,1) NOT NULL,
  work_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. 审批单据基础表
CREATE TABLE IF NOT EXISTS approval_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_type ENUM('equip_transfer', 'person_transfer', 'purchase', 'leave') NOT NULL,
  title VARCHAR(200) NOT NULL,
  applicant_id VARCHAR(36) NOT NULL,
  target_id VARCHAR(36),
  from_id VARCHAR(36),
  to_id VARCHAR(36),
  form_data JSON,
  status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
  wecom_sp_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. 通知公告表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100),
  type ENUM('email', 'sms', 'push', 'in_app') DEFAULT 'in_app',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. 进度预警表
CREATE TABLE IF NOT EXISTS progress_alerts (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  project_name VARCHAR(200),
  entity_type ENUM('project', 'phase', 'task') NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  entity_name VARCHAR(200) NOT NULL,
  planned_progress INT NOT NULL,
  actual_progress INT NOT NULL,
  deviation INT NOT NULL,
  deviation_threshold INT NOT NULL,
  alert_level ENUM('warning', 'severe') NOT NULL,
  status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
  manager_id VARCHAR(36),
  manager_name VARCHAR(100),
  resolution_note TEXT,
  acknowledged_at TIMESTAMP NULL,
  acknowledged_by VARCHAR(36),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
