-- ============================================
-- 项目管理系统 v2 - 完整数据库结构
-- 文件: 001_complete_database_schema.sql
-- 说明: 合并所有迁移文件，创建完整的数据库结构
-- 日期: 2026-03-02
-- ============================================

-- ============================================
-- 1. 核心用户和员工表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin', 'project_manager', 'hr_manager', 'equipment_manager', 'implementer', 'user') DEFAULT 'user',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE COMMENT '关联用户ID',
  employee_no VARCHAR(50) UNIQUE NOT NULL COMMENT '员工编号',
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  gender ENUM('male', 'female') DEFAULT 'male' COMMENT '性别',
  phone VARCHAR(20) COMMENT '手机号',
  email VARCHAR(100) COMMENT '邮箱',
  department_id VARCHAR(36) COMMENT '部门ID',
  position VARCHAR(100) COMMENT '岗位名称',
  status ENUM('active', 'resigned', 'probation') DEFAULT 'active' COMMENT '状态',
  current_status ENUM('on_duty', 'leave', 'business_trip', 'other') DEFAULT 'on_duty' COMMENT '当前状态',
  hire_date DATE COMMENT '入职日期',
  role VARCHAR(50) COMMENT '角色',
  daily_cost DECIMAL(10,2) COMMENT '日成本',
  skills JSON COMMENT '技能',
  avatar_color VARCHAR(20) COMMENT '头像颜色',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_no (employee_no),
  INDEX idx_department (department_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工表';

-- ============================================
-- 2. 组织架构表
-- ============================================

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_id VARCHAR(36),
  manager_id VARCHAR(36),
  manager_name VARCHAR(100),
  level INT DEFAULT 1,
  path VARCHAR(500),
  sort_order INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  description TEXT,
  third_party_id VARCHAR(100),
  employee_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_parent (parent_id),
  INDEX idx_status (status),
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

-- 岗位表
CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department_id VARCHAR(36),
  category VARCHAR(50),
  level INT DEFAULT 1,
  status ENUM('active', 'inactive') DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_department (department_id),
  INDEX idx_status (status),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位表';

-- ============================================
-- 3. 工作流引擎表
-- ============================================

-- 流程定义表
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id VARCHAR(36) PRIMARY KEY,
  key VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  entity_type VARCHAR(50),
  version INT NOT NULL,
  definition JSON NOT NULL,
  form_schema JSON,
  status ENUM('draft', 'active', 'suspended', 'archived') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (key),
  INDEX idx_category (category),
  INDEX idx_status (status),
  UNIQUE KEY uk_key_version (key, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程定义表';

-- 流程实例表
CREATE TABLE IF NOT EXISTS workflow_instances (
  id VARCHAR(36) PRIMARY KEY,
  definition_id VARCHAR(36) NOT NULL,
  definition_key VARCHAR(100) NOT NULL,
  definition_version INT NOT NULL,
  business_key VARCHAR(100),
  business_id VARCHAR(36),
  title VARCHAR(300),
  initiator_id VARCHAR(36),
  initiator_name VARCHAR(100),
  variables JSON,
  status ENUM('running', 'suspended', 'completed', 'terminated', 'rejected') DEFAULT 'running',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  duration BIGINT,
  result ENUM('approved', 'rejected', 'withdrawn', 'terminated', 'skipped'),
  current_node_id VARCHAR(100),
  current_node_name VARCHAR(200),
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_definition (definition_id),
  INDEX idx_definition_key (definition_key),
  INDEX idx_business (business_key, business_id),
  INDEX idx_initiator (initiator_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  INDEX idx_definition_status (definition_id, status),
  INDEX idx_category_status (category, status),
  INDEX idx_initiator_status (initiator_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程实例表';

-- 执行实例表
CREATE TABLE IF NOT EXISTS workflow_executions (
  id VARCHAR(36) PRIMARY KEY,
  instance_id VARCHAR(36) NOT NULL,
  parent_id VARCHAR(36),
  node_id VARCHAR(100) NOT NULL,
  node_name VARCHAR(200),
  node_type VARCHAR(50),
  variables JSON,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_instance (instance_id),
  INDEX idx_parent (parent_id),
  INDEX idx_node (node_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='执行实例表';

-- 任务实例表
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id VARCHAR(36) PRIMARY KEY,
  instance_id VARCHAR(36) NOT NULL,
  execution_id VARCHAR(36),
  node_id VARCHAR(100) NOT NULL,
  task_def_key VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  assignee_id VARCHAR(36),
  assignee_name VARCHAR(100),
  status ENUM('created', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'created',
  result ENUM('approved', 'rejected'),
  priority INT DEFAULT 50,
  due_date TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  variables JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_instance (instance_id),
  INDEX idx_assignee (assignee_id),
  INDEX idx_status (status),
  INDEX idx_node (node_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务实例表';

-- 任务历史表
CREATE TABLE IF NOT EXISTS workflow_task_history (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  instance_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  operator_id VARCHAR(36),
  operator_name VARCHAR(100),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task (task_id),
  INDEX idx_instance (instance_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务历史表';

-- 执行日志表
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id VARCHAR(36) PRIMARY KEY,
  execution_id VARCHAR(36) NOT NULL,
  instance_id VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_execution (execution_id),
  INDEX idx_instance_id (instance_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='执行日志表';

-- 流程锁表
CREATE TABLE IF NOT EXISTS workflow_locks (
  id VARCHAR(36) PRIMARY KEY,
  lock_key VARCHAR(200) NOT NULL,
  lock_value VARCHAR(200) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_key_expires (lock_key, expires_at),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程锁表';

-- ============================================
-- 4. 表单相关表
-- ============================================

-- 表单草稿表
CREATE TABLE IF NOT EXISTS form_drafts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  form_template_id VARCHAR(36),
  form_key VARCHAR(100),
  form_data JSON,
  status ENUM('draft', 'auto_saved') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_template (user_id, form_template_id),
  INDEX idx_updated_at (updated_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单草稿表';

-- 表单模板版本表
CREATE TABLE IF NOT EXISTS form_template_versions (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  template_version VARCHAR(20) NOT NULL,
  schema JSON NOT NULL,
  status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_template_version (template_id, template_version),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表单模板版本表';

-- ============================================
-- 5. 通知和预警表
-- ============================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  recipient_id VARCHAR(36),
  status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient_read (recipient_id, status),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- 预警表
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  level ENUM('info', 'warning', 'error', 'critical') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预警表';

-- 通知发送记录表
CREATE TABLE IF NOT EXISTS notification_send_logs (
  id VARCHAR(36) PRIMARY KEY,
  notification_id VARCHAR(36) NOT NULL,
  recipient_id VARCHAR(36) NOT NULL,
  recipient_name VARCHAR(100),
  send_method VARCHAR(50),
  send_status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  send_time TIMESTAMP NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification (notification_id),
  INDEX idx_recipient (recipient_id),
  INDEX idx_status (send_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知发送记录表';

-- ============================================
-- 6. 项目管理表
-- ============================================

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY,
  project_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_manager_id VARCHAR(36),
  start_date DATE,
  end_date DATE,
  status ENUM('proposal', 'in_progress', 'completed', 'paused', 'delayed') DEFAULT 'proposal',
  budget DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  progress DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_no (project_no),
  INDEX idx_manager (project_manager_id),
  INDEX idx_status (status),
  INDEX idx_status_start_date (status, start_date),
  FOREIGN KEY (project_manager_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  assignee_id VARCHAR(36),
  status ENUM('unassigned', 'pending_confirm', 'accepted', 'in_progress', 'completed', 'closed') DEFAULT 'unassigned',
  priority INT DEFAULT 50,
  start_date DATE,
  end_date DATE,
  on_duty_status ENUM('on_duty', 'off_duty') DEFAULT 'on_duty',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_assignee (assignee_id),
  INDEX idx_status (status),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';

-- ============================================
-- 7. 设备相关表
-- ============================================

-- 设备表
CREATE TABLE IF NOT EXISTS equipment (
  id VARCHAR(36) PRIMARY KEY,
  equipment_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category ENUM('instrument', 'fake_load', 'cable') NOT NULL,
  model VARCHAR(100),
  manufacturer VARCHAR(100),
  serial_no VARCHAR(100),
  technical_params JSON,
  purchase_date DATE,
  purchase_price DECIMAL(15,2),
  status ENUM('normal', 'slightly_damaged', 'affected_use', 'repairing', 'scrapped') DEFAULT 'normal',
  usage_status ENUM('idle', 'in_use') DEFAULT 'idle',
  location_status ENUM('warehouse', 'in_project', 'repairing', 'transferring') DEFAULT 'warehouse',
  project_id VARCHAR(36),
  warehouse_id VARCHAR(36),
  health_status ENUM('normal', 'slightly_damaged', 'affected_use', 'repairing', 'scrapped') DEFAULT 'normal',
  technical_doc TEXT,
  attachment VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment_no (equipment_no),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_project (project_id),
  INDEX idx_warehouse (warehouse_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- 设备附件表
CREATE TABLE IF NOT EXISTS equipment_images (
  id VARCHAR(36) PRIMARY KEY,
  equipment_id VARCHAR(36) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_equipment (equipment_id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备附件表';

-- 设备配件表
CREATE TABLE IF NOT EXISTS equipment_accessories (
  id VARCHAR(36) PRIMARY KEY,
  equipment_id VARCHAR(36) NOT NULL,
  accessory_name VARCHAR(200) NOT NULL,
  accessory_no VARCHAR(100),
  quantity INT DEFAULT 1,
  unit VARCHAR(20),
  status ENUM('normal', 'slightly_damaged', 'affected_use', 'repairing', 'scrapped') DEFAULT 'normal',
  usage_status ENUM('idle', 'in_use') DEFAULT 'idle',
  location_status ENUM('warehouse', 'in_project', 'repairing', 'transferring') DEFAULT 'warehouse',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment (equipment_id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备配件表';

-- 入库单表
CREATE TABLE IF NOT EXISTS equipment_inbound_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('purchase', 'return', 'transfer') NOT NULL,
  supplier_id VARCHAR(36),
  initiator_id VARCHAR(36),
  initiator_name VARCHAR(100),
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  total_quantity INT DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_no (order_no),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_initiator (initiator_id),
  FOREIGN KEY (initiator_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单表';

-- 入库单明细表
CREATE TABLE IF NOT EXISTS equipment_inbound_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  equipment_no VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  category ENUM('instrument', 'fake_load', 'cable') NOT NULL,
  model VARCHAR(100),
  manufacturer VARCHAR(100),
  serial_no VARCHAR(100),
  technical_params JSON,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),
  status ENUM('pending', 'inbound', 'rejected') DEFAULT 'pending',
  receive_status ENUM('normal', 'damaged', 'missing', 'partial') DEFAULT 'normal',
  receive_comment TEXT,
  technical_doc TEXT,
  attachment VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_equipment_no (equipment_no),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES equipment_inbound_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';

-- 调拨单表
CREATE TABLE IF NOT EXISTS equipment_transfer_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  from_project_id VARCHAR(36),
  to_project_id VARCHAR(36),
  from_warehouse_id VARCHAR(36),
  to_warehouse_id VARCHAR(36),
  initiator_id VARCHAR(36),
  initiator_name VARCHAR(100),
  status ENUM('draft', 'pending_from', 'pending_to', 'shipping', 'receiving', 'completed', 'rejected', 'cancelled', 'withdrawn') DEFAULT 'draft',
  total_quantity INT DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_no (order_no),
  INDEX idx_from_project (from_project_id),
  INDEX idx_to_project (to_project_id),
  INDEX idx_status (status),
  FOREIGN KEY (from_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (to_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调拨单表';

-- 调拨单明细表
CREATE TABLE IF NOT EXISTS equipment_transfer_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  equipment_id VARCHAR(36) NOT NULL,
  equipment_no VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  quantity INT DEFAULT 1,
  status ENUM('pending', 'transferred', 'returned') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES equipment_transfer_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调拨单明细表';

-- 维修单表
CREATE TABLE IF NOT EXISTS equipment_repair_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  equipment_id VARCHAR(36),
  project_id VARCHAR(36),
  fault_description TEXT,
  status ENUM('draft', 'pending', 'shipping', 'repairing', 'receiving', 'completed', 'rejected') DEFAULT 'draft',
  repair_quantity INT DEFAULT 1,
  initiator_id VARCHAR(36),
  initiator_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_no (order_no),
  INDEX idx_equipment (equipment_id),
  INDEX idx_project (project_id),
  INDEX idx_status (status),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维修单表';

-- 报废/销售单表
CREATE TABLE IF NOT EXISTS equipment_scrap_sales (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('scrap', 'sale') NOT NULL,
  equipment_id VARCHAR(36),
  project_id VARCHAR(36),
  reason TEXT,
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed') DEFAULT 'draft',
  quantity INT DEFAULT 1,
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),
  initiator_id VARCHAR(36),
  initiator_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_no (order_no),
  INDEX idx_type (type),
  INDEX idx_equipment (equipment_id),
  INDEX idx_project (project_id),
  INDEX idx_status (status),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报废/销售单表';

-- ============================================
-- 8. 仓库表
-- ============================================

-- 仓库表
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(36) PRIMARY KEY,
  warehouse_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(200),
  manager_id VARCHAR(36),
  manager_name VARCHAR(100),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_warehouse_no (warehouse_no),
  INDEX idx_manager (manager_id),
  INDEX idx_status (status),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库表';

-- ============================================
-- 9. 客户表
-- ============================================

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  customer_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  address TEXT,
  type ENUM('individual', 'company') DEFAULT 'company',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_no (customer_no),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户表';

-- ============================================
-- 10. 采购请求表
-- ============================================

-- 采购请求表
CREATE TABLE IF NOT EXISTS purchase_requests (
  id VARCHAR(36) PRIMARY KEY,
  request_no VARCHAR(50) UNIQUE NOT NULL,
  project_id VARCHAR(36),
  requester_id VARCHAR(36),
  requester_name VARCHAR(100),
  status ENUM('pending', 'approved', 'purchasing', 'arrived', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(15,2),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_request_no (request_no),
  INDEX idx_project (project_id),
  INDEX idx_requester (requester_id),
  INDEX idx_status (status),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (requester_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购请求表';

-- ============================================
-- 11. 性能优化索引
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 部门表索引
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

-- 岗位表索引
CREATE INDEX IF NOT EXISTS idx_positions_department_status ON positions(department_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_category_status ON positions(category, status);

-- 员工表索引
CREATE INDEX IF NOT EXISTS idx_employees_department_status ON employees(department_id, status);

-- 项目表索引
CREATE INDEX IF NOT EXISTS idx_projects_status_start_date ON projects(status, start_date);

-- 设备表索引
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);

-- 入库单索引
CREATE INDEX IF NOT EXISTS idx_equipment_inbounds_initiator_status ON equipment_inbound_orders(initiator_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_inbounds_warehouse_status ON equipment_inbound_orders(warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_inbounds_created_at ON equipment_inbound_orders(created_at);

-- 入库单明细索引
CREATE INDEX IF NOT EXISTS idx_equipment_inbound_items_status ON equipment_inbound_items(status);

-- 调拨单索引
CREATE INDEX IF NOT EXISTS idx_equipment_transfers_initiator_status ON equipment_transfer_orders(initiator_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_transfers_target_warehouse_status ON equipment_transfer_orders(to_warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_equipment_transfers_created_at ON equipment_transfer_orders(created_at);

-- 通知表索引
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 预警表索引
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);

-- 表单草稿索引
CREATE INDEX IF NOT EXISTS idx_form_drafts_user_template ON form_drafts(user_id, form_template_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_updated_at ON form_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_form_drafts_status ON form_drafts(status);

-- 表单模板版本索引
CREATE INDEX IF NOT EXISTS idx_form_template_versions_template_version ON form_template_versions(template_id, template_version);
CREATE INDEX IF NOT EXISTS idx_form_template_versions_status ON form_template_versions(status);
CREATE INDEX IF NOT EXISTS idx_form_template_versions_created_by ON form_template_versions(created_by);

-- 流程锁索引
CREATE INDEX IF NOT EXISTS idx_workflow_locks_key_expires ON workflow_locks(lock_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_workflow_locks_expires_at ON workflow_locks(expires_at);

-- 执行日志索引
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_instance_id ON workflow_execution_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_action ON workflow_execution_logs(action);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_timestamp ON workflow_execution_logs(created_at);

-- ============================================
-- 12. 视图
-- ============================================

-- 设备库存视图
CREATE OR REPLACE VIEW equipment_stock AS
SELECT 
  e.id,
  e.equipment_no,
  e.name,
  e.category,
  e.model,
  e.manufacturer,
  e.serial_no,
  e.status,
  e.usage_status,
  e.location_status,
  e.project_id,
  p.name AS project_name,
  e.warehouse_id,
  w.name AS warehouse_name,
  e.purchase_date,
  e.purchase_price
FROM equipment e
LEFT JOIN projects p ON e.project_id = p.id
LEFT JOIN warehouses w ON e.warehouse_id = w.id;

-- ============================================
-- 完成
-- ============================================