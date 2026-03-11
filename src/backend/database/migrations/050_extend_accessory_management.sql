-- ============================================
-- 项目管理系统 v2 - 配件管理功能扩展
-- 文件: 050_extend_accessory_management.sql
-- 说明: 扩展配件表，增加状态、来源、绑定时间等字段
-- ============================================

-- 1. 为配件实例表增加配件状态字段
ALTER TABLE equipment_accessory_instances 
ADD COLUMN IF NOT EXISTS status ENUM('normal', 'lost', 'damaged') DEFAULT 'normal' COMMENT '配件状态：正常/遗失/损坏';

-- 2. 为配件实例表增加来源类型字段
ALTER TABLE equipment_accessory_instances
ADD COLUMN IF NOT EXISTS source_type ENUM('inbound_bundle', 'inbound_separate') DEFAULT 'inbound_separate' COMMENT '入库方式：随仪器入库/单独采购入库';

-- 3. 为配件实例表增加绑定时间字段
ALTER TABLE equipment_accessory_instances
ADD COLUMN IF NOT EXISTS bound_at DATETIME COMMENT '绑定到仪器的时间';

-- ============================================
-- 创建配件遗失记录表
-- ============================================
CREATE TABLE IF NOT EXISTS equipment_accessory_lost_records (
  id VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  accessory_id VARCHAR(36) NOT NULL COMMENT '配件ID',
  equipment_id VARCHAR(36) COMMENT '关联的设备ID',
  transfer_order_id VARCHAR(36) COMMENT '关联的调拨单ID',
  lost_at DATETIME NOT NULL COMMENT '遗失时间',
  lost_by VARCHAR(36) NOT NULL COMMENT '操作人ID',
  lost_by_name VARCHAR(100) COMMENT '操作人姓名',
  lost_reason TEXT COMMENT '遗失原因',
  found_at DATETIME COMMENT '找到时间',
  found_by VARCHAR(36) COMMENT '找到操作人ID',
  found_by_name VARCHAR(100) COMMENT '找到操作人姓名',
  status ENUM('lost', 'found') DEFAULT 'lost' COMMENT '状态：遗失/已找到',
  notes TEXT COMMENT '备注',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_accessory (accessory_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_transfer_order (transfer_order_id),
  INDEX idx_status (status),
  INDEX idx_lost_at (lost_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配件遗失记录表';

-- ============================================
-- 完成
-- ============================================
SELECT '配件管理功能扩展完成' AS result;
