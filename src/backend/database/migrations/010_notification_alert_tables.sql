-- ============================================
-- 项目管理系统 v2 - 通知和预警表
-- 文件: 010_notification_alert_tables.sql
-- 说明: 创建通知表、进度预警表
-- ============================================

-- 1. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY COMMENT '通知ID',
  user_id VARCHAR(36) NOT NULL COMMENT '接收用户ID',
  user_name VARCHAR(100) COMMENT '接收用户姓名(冗余)',
  type ENUM('email', 'sms', 'push', 'in_app') NOT NULL COMMENT '通知类型',
  title VARCHAR(300) NOT NULL COMMENT '通知标题',
  content TEXT NOT NULL COMMENT '通知内容',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  link VARCHAR(500) COMMENT '相关链接',
  is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  read_at TIMESTAMP COMMENT '阅读时间',
  sent_at TIMESTAMP COMMENT '发送时间',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending' COMMENT '发送状态',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- 2. 进度预警表
CREATE TABLE IF NOT EXISTS progress_alerts (
  id VARCHAR(36) PRIMARY KEY COMMENT '预警ID',
  project_id VARCHAR(36) NOT NULL COMMENT '项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  entity_type ENUM('project', 'phase', 'task') NOT NULL COMMENT '实体类型',
  entity_id VARCHAR(36) NOT NULL COMMENT '实体ID',
  entity_name VARCHAR(300) COMMENT '实体名称(冗余)',
  planned_progress INT COMMENT '计划进度(%)',
  actual_progress INT COMMENT '实际进度(%)',
  deviation INT COMMENT '偏离程度(%)',
  deviation_threshold INT DEFAULT 5 COMMENT '偏离阈值(%)',
  alert_level ENUM('warning', 'severe') NOT NULL COMMENT '预警级别',
  status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active' COMMENT '预警状态',
  manager_id VARCHAR(36) COMMENT '负责人ID',
  manager_name VARCHAR(100) COMMENT '负责人姓名(冗余)',
  acknowledged_at TIMESTAMP COMMENT '确认时间',
  acknowledged_by VARCHAR(36) COMMENT '确认人ID',
  resolved_at TIMESTAMP COMMENT '解决时间',
  resolution_note TEXT COMMENT '解决说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_alert_level (alert_level),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='进度预警表';

-- 3. 日报提醒记录表
CREATE TABLE IF NOT EXISTS daily_report_reminders (
  id VARCHAR(36) PRIMARY KEY COMMENT '提醒ID',
  project_id VARCHAR(36) COMMENT '项目ID(为空表示全部项目)',
  reminder_date DATE NOT NULL COMMENT '提醒日期',
  reminder_time TIME NOT NULL COMMENT '提醒时间',
  total_reminded INT DEFAULT 0 COMMENT '提醒人数',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending' COMMENT '发送状态',
  details JSON COMMENT '详细记录(JSON)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project (project_id),
  INDEX idx_reminder_date (reminder_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日报提醒记录表';

-- ============================================
-- 完成
-- ============================================
