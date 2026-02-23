-- ============================================
-- 流程引擎表结构优化
-- 文件: 008_workflow_tables_optimization.sql
-- 说明: 根据统一流程引擎架构设计优化表结构
-- 版本: v1.1
-- 日期: 2026-02-23
-- ============================================

-- ============================================
-- 1. 扩展 workflow_definitions 表
-- ============================================

ALTER TABLE workflow_definitions
ADD COLUMN form_id VARCHAR(36) COMMENT '关联的表单ID' AFTER entity_type,
ADD COLUMN description TEXT COMMENT '流程描述' AFTER form_id,
ADD INDEX idx_form_id (form_id);

-- ============================================
-- 2. 扩展 workflow_tasks 表
-- ============================================

ALTER TABLE workflow_tasks
ADD COLUMN approval_mode ENUM('or_sign', 'and_sign', 'sequential', 'vote') DEFAULT 'or_sign' COMMENT '审批模式：or_sign/and_sign/sequential/vote' AFTER status,
ADD COLUMN vote_threshold INT DEFAULT 1 COMMENT '票决阈值' AFTER approval_mode,
ADD INDEX idx_approval_mode (approval_mode);

-- ============================================
-- 3. 新增 workflow_approvals 表
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_approvals (
  id VARCHAR(36) PRIMARY KEY COMMENT '主键',
  task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
  instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点ID',
  approver_id VARCHAR(36) NOT NULL COMMENT '审批人ID',
  approver_name VARCHAR(100) COMMENT '审批人姓名',
  action ENUM('approve', 'reject', 'delegate', 'transfer') NOT NULL COMMENT '操作：approve/reject/delegate/transfer',
  comment TEXT COMMENT '审批意见',
  approval_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '审批时间',
  attachments JSON COMMENT '附件列表',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task (task_id),
  INDEX idx_instance (instance_id),
  INDEX idx_approver (approver_id),
  INDEX idx_action (action),
  INDEX idx_approval_time (approval_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批记录表';

-- ============================================
-- 4. 更新现有流程定义的 category 字段
-- ============================================

-- 将人事相关流程的 category 更新为 'hr'
UPDATE workflow_definitions 
SET category = 'hr' 
WHERE `key` IN ('employee-onboard', 'employee-offboard', 'employee-transfer', 'employee-regular', 'employee-leave', 'employee-trip');

-- 将设备相关流程的 category 更新为 'equipment'
UPDATE workflow_definitions 
SET category = 'equipment' 
WHERE `key` IN ('equipment-inbound', 'equipment-outbound', 'equipment-transfer', 'equipment-repair', 'equipment-scrap');

-- 将项目相关流程的 category 更新为 'project'
UPDATE workflow_definitions 
SET category = 'project' 
WHERE `key` IN ('project-init', 'project-completion', 'project-personnel-transfer');

-- ============================================
-- 5. 插入数字化工厂生产流程定义
-- ============================================

-- 生产流程审批
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, description, status, node_config, form_schema)
VALUES (
  'wf-production-process-001',
  'production-process',
  '生产流程审批',
  1,
  'production',
  'Production',
  '数字化工厂生产流程，包含生产计划、质量控制、设备调度等环节',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '开始'),
      JSON_OBJECT('id', 'production-planning', 'type', 'userTask', 'name', '生产计划审批', 
        'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'production_manager'))),
      JSON_OBJECT('id', 'equipment-check', 'type', 'userTask', 'name', '设备检查', 
        'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'equipment_manager'))),
      JSON_OBJECT('id', 'quality-control', 'type', 'userTask', 'name', '质量控制', 
        'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'quality_manager'))),
      JSON_OBJECT('id', 'end', 'type', 'endEvent', 'name', '结束')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'e1', 'source', 'start', 'target', 'production-planning'),
      JSON_OBJECT('id', 'e2', 'source', 'production-planning', 'target', 'equipment-check'),
      JSON_OBJECT('id', 'e3', 'source', 'equipment-check', 'target', 'quality-control'),
      JSON_OBJECT('id', 'e4', 'source', 'quality-control', 'target', 'end')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'production_order_no', 'label', '生产订单号', 'type', 'text', 'required', true),
    JSON_OBJECT('name', 'product_name', 'label', '产品名称', 'type', 'text', 'required', true),
    JSON_OBJECT('name', 'quantity', 'label', '生产数量', 'type', 'number', 'required', true),
    JSON_OBJECT('name', 'planned_start_date', 'label', '计划开始日期', 'type', 'date', 'required', true),
    JSON_OBJECT('name', 'planned_end_date', 'label', '计划结束日期', 'type', 'date', 'required', true),
    JSON_OBJECT('name', 'production_line', 'label', '生产线', 'type', 'select', 'required', true, 'options', JSON_ARRAY(
      JSON_OBJECT('label', '生产线A', 'value', 'line_a'),
      JSON_OBJECT('label', '生产线B', 'value', 'line_b'),
      JSON_OBJECT('label', '生产线C', 'value', 'line_c')
    )),
    JSON_OBJECT('name', 'description', 'label', '生产说明', 'type', 'textarea', 'required', false, 'rows', 3)
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 6. 创建流程监控统计视图
-- ============================================

-- 流程统计视图
CREATE OR REPLACE VIEW v_workflow_statistics AS
SELECT 
  category,
  COUNT(*) as total_instances,
  SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_instances,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_instances,
  SUM(CASE WHEN status = 'completed' THEN duration ELSE 0 END) as total_duration,
  AVG(CASE WHEN status = 'completed' THEN duration ELSE NULL END) as avg_duration
FROM workflow_instances
GROUP BY category;

-- 任务统计视图
CREATE OR REPLACE VIEW v_task_statistics AS
SELECT 
  t.assignee_id,
  t.assignee_name,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
  SUM(CASE WHEN t.status = 'assigned' OR t.status = 'in_progress' THEN 1 ELSE 0 END) as pending_tasks,
  AVG(CASE WHEN t.status = 'completed' THEN t.duration ELSE NULL END) as avg_duration
FROM workflow_tasks t
WHERE t.status != 'cancelled'
GROUP BY t.assignee_id, t.assignee_name;

-- ============================================
-- 7. 添加流程监控相关索引
-- ============================================

-- 为流程实例表添加监控相关索引
ALTER TABLE workflow_instances
ADD INDEX idx_category_status (category, status),
ADD INDEX idx_start_time_status (start_time, status),
ADD INDEX idx_end_time (end_time);

-- 为任务表添加监控相关索引
ALTER TABLE workflow_tasks
ADD INDEX idx_assignee_status (assignee_id, status),
ADD INDEX idx_created_status (created_at, status),
ADD INDEX idx_completed_status (completed_at, status);

-- ============================================
-- 迁移完成说明
-- ============================================

-- 说明：
-- 1. 已扩展 workflow_definitions 表，添加 form_id 和 description 字段
-- 2. 已扩展 workflow_tasks 表，添加 approval_mode 和 vote_threshold 字段
-- 3. 已新增 workflow_approvals 表，用于记录审批历史
-- 4. 已更新现有流程定义的 category 字段，统一分类体系
-- 5. 已插入数字化工厂生产流程定义
-- 6. 已创建流程统计视图，支持监控大屏数据查询
-- 7. 已添加监控相关索引，优化查询性能
