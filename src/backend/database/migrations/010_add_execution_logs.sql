-- 添加执行日志表
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
    execution_id VARCHAR(36) NOT NULL COMMENT '执行ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型：process_start/task_complete/node_execute等',
    process_key VARCHAR(100) COMMENT '流程标识',
    instance_id VARCHAR(36) COMMENT '流程实例ID',
    task_id VARCHAR(36) COMMENT '任务ID',
    node_id VARCHAR(36) COMMENT '节点ID',
    node_type VARCHAR(50) COMMENT '节点类型',
    business_key VARCHAR(200) COMMENT '业务标识',
    initiator JSON COMMENT '发起人信息',
    operator JSON COMMENT '操作人信息',
    result VARCHAR(50) COMMENT '操作结果',
    error TEXT COMMENT '错误信息',
    reason TEXT COMMENT '原因说明',
    metadata JSON COMMENT '元数据',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_execution_id (execution_id),
    INDEX idx_instance_id (instance_id),
    INDEX idx_task_id (task_id),
    INDEX idx_action (action),
    INDEX idx_process_key (process_key),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程执行日志表';

-- 添加流程实例状态历史表
CREATE TABLE IF NOT EXISTS workflow_instance_history (
    id VARCHAR(36) PRIMARY KEY COMMENT '历史记录ID',
    instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
    from_status VARCHAR(50) COMMENT '原状态',
    to_status VARCHAR(50) NOT NULL COMMENT '新状态',
    operator_id VARCHAR(36) COMMENT '操作人ID',
    operator_name VARCHAR(100) COMMENT '操作人姓名',
    reason TEXT COMMENT '变更原因',
    metadata JSON COMMENT '元数据',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_instance_id (instance_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程实例状态历史表';

-- 添加任务历史记录表
CREATE TABLE IF NOT EXISTS workflow_task_history (
    id VARCHAR(36) PRIMARY KEY COMMENT '历史记录ID',
    task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
    instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型：create/claim/complete/delegate/transfer',
    from_status VARCHAR(50) COMMENT '原状态',
    to_status VARCHAR(50) COMMENT '新状态',
    operator_id VARCHAR(36) COMMENT '操作人ID',
    operator_name VARCHAR(100) COMMENT '操作人姓名',
    assignee_id VARCHAR(36) COMMENT '被指派人ID',
    assignee_name VARCHAR(100) COMMENT '被指派人姓名',
    result VARCHAR(50) COMMENT '处理结果',
    comment TEXT COMMENT '处理意见',
    form_data JSON COMMENT '表单数据',
    metadata JSON COMMENT '元数据',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_task_id (task_id),
    INDEX idx_instance_id (instance_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务历史记录表';

-- 添加流程性能指标表
CREATE TABLE IF NOT EXISTS workflow_performance_metrics (
    id VARCHAR(36) PRIMARY KEY COMMENT '指标ID',
    process_key VARCHAR(100) COMMENT '流程标识',
    instance_id VARCHAR(36) COMMENT '流程实例ID',
    operation VARCHAR(100) NOT NULL COMMENT '操作类型',
    duration_ms INT NOT NULL COMMENT '执行时长（毫秒）',
    success BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否成功',
    metadata JSON COMMENT '元数据',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_process_key (process_key),
    INDEX idx_operation (operation),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程性能指标表';
