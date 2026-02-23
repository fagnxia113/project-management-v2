-- ============================================
-- 项目管理系统 v2 - 组织架构模块
-- 文件: 008_organization_structure.sql
-- 说明: 创建部门表、岗位表、第三方平台配置表
-- ============================================

-- 1. 部门表
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY COMMENT '部门ID',
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '部门编号',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  parent_id VARCHAR(36) COMMENT '上级部门ID',
  manager_id VARCHAR(36) COMMENT '部门负责人ID',
  manager_name VARCHAR(100) COMMENT '部门负责人姓名(冗余)',
  level INT DEFAULT 1 COMMENT '部门层级',
  path VARCHAR(500) COMMENT '部门路径(如: /总部/技术部/开发组)',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '部门状态',
  description TEXT COMMENT '部门描述',
  third_party_id VARCHAR(100) COMMENT '第三方平台部门ID(用于同步)',
  third_party_source VARCHAR(50) COMMENT '第三方平台来源(wechat_work/dingtalk/feishu)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent (parent_id),
  INDEX idx_manager (manager_id),
  INDEX idx_status (status),
  INDEX idx_level (level),
  INDEX idx_third_party (third_party_id, third_party_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

-- 2. 岗位表
CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(36) PRIMARY KEY COMMENT '岗位ID',
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '岗位编号',
  name VARCHAR(100) NOT NULL COMMENT '岗位名称',
  department_id VARCHAR(36) COMMENT '所属部门ID',
  department_name VARCHAR(100) COMMENT '所属部门名称(冗余)',
  level INT DEFAULT 1 COMMENT '岗位层级',
  category VARCHAR(50) COMMENT '岗位类别(管理/技术/销售/行政等)',
  description TEXT COMMENT '岗位职责描述',
  requirements TEXT COMMENT '岗位要求',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '岗位状态',
  sort_order INT DEFAULT 0 COMMENT '排序',
  third_party_id VARCHAR(100) COMMENT '第三方平台岗位ID(用于同步)',
  third_party_source VARCHAR(50) COMMENT '第三方平台来源(wechat_work/dingtalk/feishu)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_department (department_id),
  INDEX idx_status (status),
  INDEX idx_level (level),
  INDEX idx_third_party (third_party_id, third_party_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位表';

-- 3. 第三方平台配置表
CREATE TABLE IF NOT EXISTS third_party_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  platform_type ENUM('wechat_work', 'dingtalk', 'feishu') NOT NULL COMMENT '平台类型',
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  corp_id VARCHAR(100) COMMENT '企业ID',
  agent_id VARCHAR(100) COMMENT '应用AgentId',
  app_id VARCHAR(100) COMMENT '应用ID',
  app_secret VARCHAR(500) COMMENT '应用密钥(加密存储)',
  access_token VARCHAR(500) COMMENT '访问令牌(缓存)',
  token_expire_time TIMESTAMP COMMENT '令牌过期时间',
  sync_departments BOOLEAN DEFAULT true COMMENT '是否同步部门',
  sync_employees BOOLEAN DEFAULT true COMMENT '是否同步员工',
  sync_enabled BOOLEAN DEFAULT false COMMENT '是否启用同步',
  sync_interval INT DEFAULT 60 COMMENT '同步间隔(分钟)',
  last_sync_time TIMESTAMP COMMENT '最后同步时间',
  last_sync_status ENUM('success', 'failed', 'partial') COMMENT '最后同步状态',
  config JSON COMMENT '其他配置(JSON格式)',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '配置状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platform (platform_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='第三方平台配置表';

-- 4. 同步日志表
CREATE TABLE IF NOT EXISTS sync_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  config_id VARCHAR(36) NOT NULL COMMENT '配置ID',
  platform_type VARCHAR(50) NOT NULL COMMENT '平台类型',
  sync_type ENUM('department', 'employee', 'full') NOT NULL COMMENT '同步类型',
  sync_mode ENUM('manual', 'auto') DEFAULT 'manual' COMMENT '同步模式',
  status ENUM('success', 'failed', 'partial') NOT NULL COMMENT '同步状态',
  total_count INT DEFAULT 0 COMMENT '总数',
  success_count INT DEFAULT 0 COMMENT '成功数',
  failed_count INT DEFAULT 0 COMMENT '失败数',
  created_count INT DEFAULT 0 COMMENT '新增数',
  updated_count INT DEFAULT 0 COMMENT '更新数',
  deleted_count INT DEFAULT 0 COMMENT '删除数',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time TIMESTAMP COMMENT '结束时间',
  duration INT COMMENT '耗时(秒)',
  error_message TEXT COMMENT '错误信息',
  details JSON COMMENT '详细日志(JSON格式)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_config (config_id),
  INDEX idx_platform (platform_type),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同步日志表';

-- 5. 修改员工表，添加部门ID和岗位ID字段
ALTER TABLE employees 
  ADD COLUMN department_id VARCHAR(36) COMMENT '所属部门ID' AFTER department,
  ADD COLUMN position_id VARCHAR(36) COMMENT '岗位ID' AFTER position,
  ADD COLUMN superior_id VARCHAR(36) COMMENT '直接上级ID' AFTER position_id,
  ADD COLUMN superior_name VARCHAR(100) COMMENT '直接上级姓名(冗余)' AFTER superior_id,
  ADD INDEX idx_department_id (department_id),
  ADD INDEX idx_position_id (position_id),
  ADD INDEX idx_superior (superior_id);

-- 6. 添加外键约束
ALTER TABLE departments 
  ADD CONSTRAINT fk_dept_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE positions 
  ADD CONSTRAINT fk_position_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE employees 
  ADD CONSTRAINT fk_employee_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employee_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_employee_superior FOREIGN KEY (superior_id) REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE sync_logs 
  ADD CONSTRAINT fk_sync_config FOREIGN KEY (config_id) REFERENCES third_party_configs(id) ON DELETE CASCADE;

-- ============================================
-- 插入初始部门数据
-- ============================================

INSERT INTO departments (id, code, name, level, path, sort_order, status, description) VALUES
('dept-001', 'BM-00001', '总部', 1, '/总部', 1, 'active', '公司总部'),
('dept-002', 'BM-00002', '技术部', 2, '/总部/技术部', 1, 'active', '技术研发部门'),
('dept-003', 'BM-00003', '市场部', 2, '/总部/市场部', 2, 'active', '市场营销部门'),
('dept-004', 'BM-00004', '财务部', 2, '/总部/财务部', 3, 'active', '财务管理部门'),
('dept-005', 'BM-00005', '人力资源部', 2, '/总部/人力资源部', 4, 'active', '人力资源管理'),
('dept-006', 'BM-00006', '运营部', 2, '/总部/运营部', 5, 'active', '运营管理部门');

UPDATE departments SET parent_id = 'dept-001' WHERE id IN ('dept-002', 'dept-003', 'dept-004', 'dept-005', 'dept-006');

-- ============================================
-- 插入初始岗位数据
-- ============================================

INSERT INTO positions (id, code, name, department_id, level, category, status, sort_order) VALUES
('pos-001', 'GW-00001', '总经理', 'dept-001', 1, '管理', 'active', 1),
('pos-002', 'GW-00002', '技术总监', 'dept-002', 2, '管理', 'active', 1),
('pos-003', 'GW-00003', '高级工程师', 'dept-002', 3, '技术', 'active', 2),
('pos-004', 'GW-00004', '工程师', 'dept-002', 4, '技术', 'active', 3),
('pos-005', 'GW-00005', '市场总监', 'dept-003', 2, '管理', 'active', 1),
('pos-006', 'GW-00006', '市场经理', 'dept-003', 3, '销售', 'active', 2),
('pos-007', 'GW-00007', '财务总监', 'dept-004', 2, '管理', 'active', 1),
('pos-008', 'GW-00008', '会计', 'dept-004', 4, '财务', 'active', 2),
('pos-009', 'GW-00009', 'HR总监', 'dept-005', 2, '管理', 'active', 1),
('pos-010', 'GW-00010', 'HR专员', 'dept-005', 4, '人事', 'active', 2),
('pos-011', 'GW-00011', '运营总监', 'dept-006', 2, '管理', 'active', 1),
('pos-012', 'GW-00012', '项目经理', 'dept-002', 3, '管理', 'active', 4);

UPDATE positions SET department_name = (SELECT name FROM departments WHERE id = positions.department_id);

-- ============================================
-- 完成
-- ============================================
