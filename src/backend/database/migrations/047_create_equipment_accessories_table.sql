-- ============================================
-- 项目管理系统 v2 - 设备附件管理表
-- 文件: 047_create_equipment_accessories_table.sql
-- 说明: 创建设备附件表和附件实例表，支持仪器类设备的附件管理
-- ============================================

-- 1. 设备附件表（记录仪器与附件的关联关系）
CREATE TABLE IF NOT EXISTS equipment_accessories (
  id VARCHAR(36) PRIMARY KEY COMMENT '附件关联ID',
  host_equipment_id VARCHAR(36) NOT NULL COMMENT '主机设备ID',
  accessory_id VARCHAR(36) NOT NULL COMMENT '附件设备ID',
  
  -- 关联信息
  accessory_name VARCHAR(200) COMMENT '附件名称（冗余）',
  accessory_model VARCHAR(100) COMMENT '附件型号（冗余）',
  accessory_category ENUM('instrument', 'fake_load', 'cable') COMMENT '附件类别（冗余）',
  
  -- 配置信息
  quantity INT DEFAULT 1 COMMENT '该附件数量',
  is_required BOOLEAN DEFAULT FALSE COMMENT '是否必需配件',
  notes TEXT COMMENT '备注说明',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_host_equipment (host_equipment_id),
  INDEX idx_accessory (accessory_id),
  UNIQUE KEY uk_host_accessory (host_equipment_id, accessory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备附件关联表';

-- 2. 附件实例表（附件的独立台账管理）
CREATE TABLE IF NOT EXISTS equipment_accessory_instances (
  id VARCHAR(36) PRIMARY KEY COMMENT '附件实例ID',
  accessory_name VARCHAR(200) NOT NULL COMMENT '附件名称',
  model_no VARCHAR(100) COMMENT '型号编号',
  brand VARCHAR(100) COMMENT '品牌',
  category ENUM('instrument', 'fake_load', 'cable') NOT NULL COMMENT '附件类别',
  unit VARCHAR(20) DEFAULT '个' COMMENT '单位',
  quantity INT DEFAULT 1 COMMENT '数量',
  serial_number VARCHAR(100) COMMENT '序列号（仪器类附件）',
  manage_code VARCHAR(50) UNIQUE COMMENT '管理编号',
  
  -- 状态信息
  health_status ENUM('normal', 'slightly_damaged', 'affected_use', 'repairing', 'scrapped') DEFAULT 'normal' COMMENT '健康状态',
  usage_status ENUM('idle', 'in_use') DEFAULT 'idle' COMMENT '使用状态',
  location_status ENUM('warehouse', 'in_project', 'repairing', 'transferring') DEFAULT 'warehouse' COMMENT '位置状态',
  location_id VARCHAR(36) COMMENT '当前位置ID',
  
  -- 所属主机
  host_equipment_id VARCHAR(36) COMMENT '所属主机设备ID（跟随主机流转）',
  
  -- 其他信息
  keeper_id VARCHAR(36) COMMENT '保管人ID',
  purchase_date DATE COMMENT '购置日期',
  purchase_price DECIMAL(12,2) COMMENT '购置价格',
  notes TEXT COMMENT '备注',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_accessory_name (accessory_name, model_no),
  INDEX idx_host_equipment (host_equipment_id),
  INDEX idx_location (location_status, location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件实例表';

-- 3. 为设备实例表添加附件相关字段
ALTER TABLE equipment_instances 
ADD COLUMN IF NOT EXISTS has_accessories BOOLEAN DEFAULT FALSE COMMENT '是否有附件',
ADD COLUMN IF NOT EXISTS accessory_count INT DEFAULT 0 COMMENT '附件数量';

-- ============================================
-- 完成
-- ============================================
