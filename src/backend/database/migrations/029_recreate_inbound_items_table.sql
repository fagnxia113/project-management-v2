-- ============================================
-- 项目管理系统 v2 - 重新创建入库单明细表
-- 文件: 029_recreate_inbound_items_table.sql
-- 说明: 删除旧表，重新创建入库单明细表，支持多种设备和批量序列号
-- ============================================

-- 1. 删除旧表
DROP TABLE IF EXISTS equipment_inbound_items;

-- 2. 创建新表
CREATE TABLE IF NOT EXISTS equipment_inbound_items (
  id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
  order_id VARCHAR(36) NOT NULL COMMENT '入库单ID',
  model_id VARCHAR(36) COMMENT '设备型号ID',
  equipment_name VARCHAR(200) COMMENT '设备名称',
  model_no VARCHAR(100) COMMENT '型号编号',
  brand VARCHAR(100) COMMENT '品牌',
  category ENUM('instrument', 'fake_load') COMMENT '设备类别',
  quantity INT DEFAULT 1 COMMENT '数量',
  purchase_price DECIMAL(10,2) COMMENT '采购单价',
  total_price DECIMAL(10,2) COMMENT '总价',
  serial_numbers TEXT COMMENT '序列号列表（逗号分隔）',
  accessory_desc TEXT COMMENT '配件情况',
  status ENUM('pending', 'inbound', 'rejected') DEFAULT 'pending' COMMENT '明细状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_model_id (model_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES equipment_inbound_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细表';

-- ============================================
-- 完成
-- ============================================
