-- ============================================
-- 项目管理系统 v2 - 人员考勤与日报系统
-- 文件: 054_create_attendance_tables.sql
-- ============================================

-- 1. 项目坐标表 (用于地理围栏打卡)
CREATE TABLE IF NOT EXISTS project_locations (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  address VARCHAR(255),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INT DEFAULT 500 COMMENT '打卡有效半径(米)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 考勤记录表
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) COMMENT '打卡时所属项目',
  `date` DATE NOT NULL,
  
  -- 上班打卡
  check_in_time DATETIME,
  check_in_location_name VARCHAR(255),
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_in_photo TEXT COMMENT '上班人脸识别抓拍照',
  check_in_status ENUM('normal', 'late', 'outside') DEFAULT 'normal',
  
  -- 下班打卡
  check_out_time DATETIME,
  check_out_location_name VARCHAR(255),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  check_out_photo TEXT COMMENT '下班人脸识别抓拍照',
  check_out_status ENUM('normal', 'early_leave', 'outside') DEFAULT 'normal',
  
  -- 状态汇总
  work_status ENUM('on_duty', 'off', 'leave', 'business_trip', 'overtime') DEFAULT 'off',
  is_verified BOOLEAN DEFAULT FALSE COMMENT '项目经理是否已审核',
  verified_by VARCHAR(36),
  verified_at DATETIME,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_emp_date (employee_id, date),
  INDEX idx_date (date),
  INDEX idx_project (project_id),
  INDEX idx_status (work_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 考勤周核对记录 (用于PM归档流转)
CREATE TABLE IF NOT EXISTS attendance_weekly_approvals (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  approver_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'approved', 'archived') DEFAULT 'pending',
  summary_json JSON COMMENT '该周考勤异常汇总',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_proj_week (project_id, week_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 扩展日报表 (增加勾选式内容支持)
ALTER TABLE daily_reports 
ADD COLUMN checkload_items JSON COMMENT '勾选式工作内容';

ALTER TABLE daily_reports
ADD COLUMN attendance_id VARCHAR(36) COMMENT '关联的考勤记录';

-- ============================================
-- 完成
-- ============================================
