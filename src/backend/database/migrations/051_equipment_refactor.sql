-- 设备管理模块重构与升级迁移
-- 1. 设备实例表添加字段
ALTER TABLE equipment_instances
ADD COLUMN `tracking_type` ENUM('SERIALIZED', 'BATCH') NOT NULL DEFAULT 'SERIALIZED' COMMENT '追踪模式',
ADD COLUMN `attachments` JSON DEFAULT NULL COMMENT '附件URL数组',
ADD COLUMN `version` INT NOT NULL DEFAULT 1 COMMENT '乐观锁版本号';

-- 2. 配件实例表添加字段
ALTER TABLE equipment_accessory_instances
ADD COLUMN `tracking_type` ENUM('SERIALIZED', 'BATCH') NOT NULL DEFAULT 'SERIALIZED' COMMENT '追踪模式',
ADD COLUMN `attachments` JSON DEFAULT NULL COMMENT '附件URL数组',
ADD COLUMN `version` INT NOT NULL DEFAULT 1 COMMENT '乐观锁版本号',
ADD COLUMN `source_type` VARCHAR(50) DEFAULT NULL COMMENT '来源类型';

-- 3. 创建工作流订单主表
CREATE TABLE IF NOT EXISTS workflow_orders (
    id VARCHAR(36) PRIMARY KEY COMMENT '订单ID',
    order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
    type ENUM('transfer', 'repair') NOT NULL COMMENT '订单类型',
    status ENUM('CREATED', 'DISPATCHED', 'RECEIVED', 'COMPLETED', 'EXCEPTION_CONFIRMING', 'CLOSED') NOT NULL DEFAULT 'CREATED' COMMENT '订单状态',
    from_location_id VARCHAR(36) DEFAULT NULL COMMENT '发货位置ID',
    to_location_id VARCHAR(36) DEFAULT NULL COMMENT '收货位置ID',
    dispatcher_id VARCHAR(36) DEFAULT NULL COMMENT '发货人ID',
    receiver_id VARCHAR(36) DEFAULT NULL COMMENT '收货人ID',
    dispatch_overall_image VARCHAR(500) DEFAULT NULL COMMENT '发货整体包裹图URL',
    receive_overall_image VARCHAR(500) DEFAULT NULL COMMENT '收货整体包裹图URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流订单主表';

-- 4. 创建工作流订单明细表
CREATE TABLE IF NOT EXISTS workflow_order_items (
    id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
    order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
    item_type ENUM('equipment', 'accessory') NOT NULL COMMENT '物资类型',
    item_id VARCHAR(36) DEFAULT NULL COMMENT '物资ID',
    model_id VARCHAR(36) DEFAULT NULL COMMENT '型号ID',
    plan_qty INT NOT NULL COMMENT '计划数量',
    actual_qty INT DEFAULT NULL COMMENT '实收数量',
    dispatch_item_image VARCHAR(500) DEFAULT NULL COMMENT '发货明细图URL',
    receive_item_image VARCHAR(500) DEFAULT NULL COMMENT '收货明细图URL',
    status ENUM('PENDING', 'DISPATCHED', 'RECEIVED', 'EXCEPTION') NOT NULL DEFAULT 'PENDING' COMMENT '明细状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (order_id) REFERENCES workflow_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流订单明细表';

-- 5. 创建异常任务表
CREATE TABLE IF NOT EXISTS exception_tasks (
    id VARCHAR(36) PRIMARY KEY COMMENT '任务ID',
    order_id VARCHAR(36) NOT NULL COMMENT '关联订单ID',
    item_id VARCHAR(36) DEFAULT NULL COMMENT '关联明细ID',
    type ENUM('SHORTAGE', 'DAMAGE') NOT NULL COMMENT '异常类型',
    description TEXT NOT NULL COMMENT '异常描述',
    status ENUM('PENDING', 'CONFIRMED', 'RESOLVED') NOT NULL DEFAULT 'PENDING' COMMENT '任务状态',
    responsible_id VARCHAR(36) DEFAULT NULL COMMENT '责任人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (order_id) REFERENCES workflow_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='异常确认任务表';

-- 6. 添加索引
CREATE INDEX idx_equipment_tracking_type ON equipment_instances(tracking_type);
CREATE INDEX idx_accessory_tracking_type ON equipment_accessory_instances(tracking_type);
CREATE INDEX idx_workflow_order_status ON workflow_orders(status);
CREATE INDEX idx_workflow_order_items_order ON workflow_order_items(order_id);
CREATE INDEX idx_exception_task_status ON exception_tasks(status);