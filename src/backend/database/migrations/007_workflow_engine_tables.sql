-- ============================================
-- 流程引擎数据库表结构
-- 文件: 007_workflow_engine_tables.sql
-- 说明: 创建流程定义、实例、任务等核心表
-- ============================================

-- 流程定义表
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id VARCHAR(36) PRIMARY KEY COMMENT '定义ID',
  `key` VARCHAR(100) NOT NULL COMMENT '流程标识',
  name VARCHAR(200) NOT NULL COMMENT '流程名称',
  version INT NOT NULL DEFAULT 1 COMMENT '版本号',
  category VARCHAR(50) COMMENT '分类(project/task/equipment/hr)',
  entity_type VARCHAR(50) COMMENT '绑定实体类型',
  bpmn_xml MEDIUMTEXT COMMENT 'BPMN XML定义',
  node_config JSON COMMENT '节点配置(扩展属性)',
  form_schema JSON COMMENT '表单Schema',
  variables JSON COMMENT '流程变量定义',
  status ENUM('draft', 'active', 'suspended', 'archived') DEFAULT 'draft' COMMENT '状态',
  created_by VARCHAR(36) COMMENT '创建人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_key_version (`key`, version),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_entity_type (entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程定义表';

-- 流程实例表
CREATE TABLE IF NOT EXISTS workflow_instances (
  id VARCHAR(36) PRIMARY KEY COMMENT '实例ID',
  definition_id VARCHAR(36) NOT NULL COMMENT '流程定义ID',
  definition_key VARCHAR(100) NOT NULL COMMENT '流程标识',
  definition_version INT NOT NULL COMMENT '流程版本',
  business_key VARCHAR(100) COMMENT '业务关联键',
  business_id VARCHAR(36) COMMENT '业务实体ID',
  title VARCHAR(300) COMMENT '实例标题',
  initiator_id VARCHAR(36) COMMENT '发起人ID',
  initiator_name VARCHAR(100) COMMENT '发起人姓名',
  variables JSON COMMENT '流程变量',
  status ENUM('running', 'suspended', 'completed', 'terminated') DEFAULT 'running' COMMENT '状态',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time TIMESTAMP NULL COMMENT '结束时间',
  duration BIGINT COMMENT '耗时(毫秒)',
  result ENUM('approved', 'rejected', 'withdrawn', 'terminated') COMMENT '流程结果',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_definition (definition_id),
  INDEX idx_definition_key (definition_key),
  INDEX idx_business (business_key, business_id),
  INDEX idx_initiator (initiator_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程实例表';

-- 执行实例表
CREATE TABLE IF NOT EXISTS workflow_executions (
  id VARCHAR(36) PRIMARY KEY COMMENT '执行ID',
  instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
  parent_id VARCHAR(36) COMMENT '父执行ID',
  node_id VARCHAR(100) NOT NULL COMMENT '当前节点ID',
  node_name VARCHAR(200) COMMENT '节点名称',
  node_type VARCHAR(50) COMMENT '节点类型',
  variables JSON COMMENT '局部变量',
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_instance (instance_id),
  INDEX idx_parent (parent_id),
  INDEX idx_node (node_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='执行实例表';

-- 任务实例表
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id VARCHAR(36) PRIMARY KEY COMMENT '任务ID',
  instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
  execution_id VARCHAR(36) COMMENT '执行实例ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点ID',
  task_def_key VARCHAR(100) COMMENT '任务定义键',
  name VARCHAR(200) NOT NULL COMMENT '任务名称',
  description TEXT COMMENT '任务描述',
  assignee_id VARCHAR(36) COMMENT '处理人ID',
  assignee_name VARCHAR(100) COMMENT '处理人姓名',
  candidate_users JSON COMMENT '候选用户列表',
  candidate_groups JSON COMMENT '候选组列表',
  priority INT DEFAULT 50 COMMENT '优先级(0-100)',
  due_date TIMESTAMP NULL COMMENT '到期时间',
  claim_time TIMESTAMP NULL COMMENT '认领时间',
  variables JSON COMMENT '任务变量',
  status ENUM('created', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'created' COMMENT '状态',
  result ENUM('approved', 'rejected', 'withdrawn', 'delegated', 'transferred', 'skipped') COMMENT '处理结果',
  comment TEXT COMMENT '审批意见',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL COMMENT '开始处理时间',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  duration BIGINT COMMENT '耗时(毫秒)',
  INDEX idx_instance (instance_id),
  INDEX idx_execution (execution_id),
  INDEX idx_assignee (assignee_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务实例表';

-- 任务操作历史表
CREATE TABLE IF NOT EXISTS workflow_task_history (
  id VARCHAR(36) PRIMARY KEY COMMENT '历史ID',
  task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
  instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点ID',
  task_name VARCHAR(200) COMMENT '任务名称',
  action ENUM('create', 'assign', 'claim', 'complete', 'delegate', 'transfer', 'withdraw', 'cancel', 'skip') NOT NULL COMMENT '操作类型',
  operator_id VARCHAR(36) COMMENT '操作人ID',
  operator_name VARCHAR(100) COMMENT '操作人姓名',
  target_id VARCHAR(36) COMMENT '目标人ID(转办/委托)',
  target_name VARCHAR(100) COMMENT '目标人姓名',
  comment TEXT COMMENT '操作备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task (task_id),
  INDEX idx_instance (instance_id),
  INDEX idx_operator (operator_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务操作历史表';

-- 流程变量历史表
CREATE TABLE IF NOT EXISTS workflow_variable_history (
  id VARCHAR(36) PRIMARY KEY COMMENT '历史ID',
  instance_id VARCHAR(36) NOT NULL COMMENT '流程实例ID',
  execution_id VARCHAR(36) COMMENT '执行实例ID',
  task_id VARCHAR(36) COMMENT '任务ID',
  variable_name VARCHAR(100) NOT NULL COMMENT '变量名',
  variable_type VARCHAR(50) COMMENT '变量类型',
  old_value TEXT COMMENT '旧值',
  new_value TEXT COMMENT '新值',
  operator_id VARCHAR(36) COMMENT '操作人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_instance (instance_id),
  INDEX idx_variable_name (variable_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程变量历史表';

-- 流程监听器配置表
CREATE TABLE IF NOT EXISTS workflow_listeners (
  id VARCHAR(36) PRIMARY KEY COMMENT '监听器ID',
  definition_id VARCHAR(36) COMMENT '流程定义ID(空则全局)',
  node_id VARCHAR(100) COMMENT '节点ID(空则流程级别)',
  event_type ENUM('start', 'end', 'take', 'create', 'assignment', 'complete') NOT NULL COMMENT '事件类型',
  listener_type ENUM('class', 'expression', 'delegate') NOT NULL COMMENT '监听器类型',
  listener_value VARCHAR(500) NOT NULL COMMENT '监听器值',
  enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_definition (definition_id),
  INDEX idx_node (node_id),
  INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流程监听器配置表';

-- 审批人规则表(增强版)
CREATE TABLE IF NOT EXISTS workflow_approver_rules (
  id VARCHAR(36) PRIMARY KEY COMMENT '规则ID',
  definition_id VARCHAR(36) COMMENT '流程定义ID',
  node_id VARCHAR(100) COMMENT '节点ID',
  rule_name VARCHAR(200) NOT NULL COMMENT '规则名称',
  approver_type ENUM('fixed', 'role', 'department', 'superior', 'form_field', 'expression', 'previous_handler', 'initiator') NOT NULL COMMENT '审批人类型',
  approver_value VARCHAR(500) NOT NULL COMMENT '审批人值',
  fallback_type VARCHAR(50) COMMENT '备选类型',
  fallback_value VARCHAR(500) COMMENT '备选值',
  priority INT DEFAULT 0 COMMENT '优先级',
  condition_expression VARCHAR(500) COMMENT '条件表达式',
  enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_definition (definition_id),
  INDEX idx_node (node_id),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批人规则表';

-- ============================================
-- 插入默认流程定义
-- ============================================

-- 项目立项审批流程
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, status, node_config, form_schema)
VALUES (
  'wf-project-init-001',
  'project_init',
  '项目立项审批',
  1,
  'project',
  'Project',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'name', '开始', 'type', 'startEvent'),
      JSON_OBJECT('id', 'dept_manager', 'name', '部门经理审批', 'type', 'userTask', 
        'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'admin'))),
      JSON_OBJECT('id', 'gateway_1', 'name', '金额判断', 'type', 'exclusiveGateway',
        'gatewayConfig', JSON_OBJECT('conditions', JSON_ARRAY(
          JSON_OBJECT('id', 'c1', 'name', '预算>100万', 'expression', '${formData.budget > 100}', 'targetNode', 'general_manager'),
          JSON_OBJECT('id', 'c2', 'name', '预算<=100万', 'expression', '${formData.budget <= 100}', 'targetNode', 'end')
        ))),
      JSON_OBJECT('id', 'general_manager', 'name', '总经理审批', 'type', 'userTask',
        'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'admin'))),
      JSON_OBJECT('id', 'end', 'name', '结束', 'type', 'endEvent')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'e1', 'source', 'start', 'target', 'dept_manager'),
      JSON_OBJECT('id', 'e2', 'source', 'dept_manager', 'target', 'gateway_1'),
      JSON_OBJECT('id', 'e3', 'source', 'gateway_1', 'target', 'general_manager', 'condition', '${formData.budget > 100}'),
      JSON_OBJECT('id', 'e4', 'source', 'gateway_1', 'target', 'end', 'condition', '${formData.budget <= 100}'),
      JSON_OBJECT('id', 'e5', 'source', 'general_manager', 'target', 'end')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'code', 'label', '项目编号', 'type', 'text', 'required', false, 'disabled', true),
    JSON_OBJECT('name', 'name', 'label', '项目名称', 'type', 'text', 'required', true),
    JSON_OBJECT('name', 'type', 'label', '项目类型', 'type', 'select', 'required', true, 'options', JSON_ARRAY(
      JSON_OBJECT('label', '国内项目', 'value', 'domestic'),
      JSON_OBJECT('label', '海外项目', 'value', 'foreign'),
      JSON_OBJECT('label', '研发项目', 'value', 'rd'),
      JSON_OBJECT('label', '服务项目', 'value', 'service')
    )),
    JSON_OBJECT('name', 'manager_id', 'label', '项目经理', 'type', 'user', 'required', true),
    JSON_OBJECT('name', 'status', 'label', '项目状态', 'type', 'select', 'required', true, 'options', JSON_ARRAY(
      JSON_OBJECT('label', '提案中', 'value', 'proposal'),
      JSON_OBJECT('label', '进行中', 'value', 'in_progress'),
      JSON_OBJECT('label', '已完成', 'value', 'completed'),
      JSON_OBJECT('label', '已暂停', 'value', 'paused'),
      JSON_OBJECT('label', '已延期', 'value', 'delayed')
    )),
    JSON_OBJECT('name', 'start_date', 'label', '开始日期', 'type', 'date', 'required', true),
    JSON_OBJECT('name', 'end_date', 'label', '预计结束日期', 'type', 'date', 'required', false),
    JSON_OBJECT('name', 'budget', 'label', '项目预算(元)', 'type', 'number', 'required', false),
    JSON_OBJECT('name', 'customer_id', 'label', '客户', 'type', 'lookup', 'required', false),
    JSON_OBJECT('name', 'department_id', 'label', '所属部门', 'type', 'lookup', 'required', false),
    JSON_OBJECT('name', 'description', 'label', '项目描述', 'type', 'textarea', 'required', false, 'rows', 4)
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 任务审批流程
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, status, node_config, form_schema)
VALUES (
  'wf-task-approval-001',
  'task-approval',
  '任务审批流程',
  1,
  'task',
  'Task',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交申请', 'config', JSON_OBJECT('formKey', 'task-approval-form')),
      JSON_OBJECT('id', 'project-manager', 'type', 'userTask', 'name', '项目经理审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'expression', '${formData.projectManager}')))),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过'),
      JSON_OBJECT('id', 'end-rejected', 'type', 'endEvent', 'name', '审批驳回')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'project-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-2', 'source', 'project-manager', 'target', 'end-approved', 'type', 'sequenceFlow')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'task_name', 'label', '任务名称', 'type', 'text', 'required', true, 'placeholder', '请输入任务名称'),
    JSON_OBJECT('name', 'project_id', 'label', '所属项目', 'type', 'select', 'required', true, 'placeholder', '请选择所属项目'),
    JSON_OBJECT('name', 'projectManager', 'label', '项目经理', 'type', 'user', 'required', true, 'placeholder', '请选择项目经理'),
    JSON_OBJECT('name', 'assignee', 'label', '任务负责人', 'type', 'user', 'required', true, 'placeholder', '请选择任务负责人'),
    JSON_OBJECT('name', 'deadline', 'label', '截止日期', 'type', 'date', 'required', true),
    JSON_OBJECT('name', 'priority', 'label', '优先级', 'type', 'select', 'required', true, 'options', JSON_ARRAY(JSON_OBJECT('label', '低', 'value', 'low'), JSON_OBJECT('label', '中', 'value', 'medium'), JSON_OBJECT('label', '高', 'value', 'high'))),
    JSON_OBJECT('name', 'description', 'label', '任务描述', 'type', 'textarea', 'required', true, 'placeholder', '请输入任务描述', 'rows', 3)
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 设备调拨审批流程
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, status, node_config, form_schema)
VALUES (
  'wf-equipment-transfer-001',
  'equipment-transfer',
  '设备调拨流程',
  1,
  'equipment',
  'EquipmentTransfer',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交调拨申请', 'config', JSON_OBJECT('formKey', 'equipment-transfer-form')),
      JSON_OBJECT('id', 'current-project-manager', 'type', 'userTask', 'name', '当前项目负责人审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'expression', '${formData.currentProjectManager}')))),
      JSON_OBJECT('id', 'target-project-manager', 'type', 'userTask', 'name', '目标项目负责人审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'expression', '${formData.targetProjectManager}')))),
      JSON_OBJECT('id', 'equipment-manager', 'type', 'userTask', 'name', '设备管理员审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'equipment_manager')))),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过'),
      JSON_OBJECT('id', 'end-rejected', 'type', 'endEvent', 'name', '审批驳回')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'current-project-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-2', 'source', 'current-project-manager', 'target', 'target-project-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-3', 'source', 'target-project-manager', 'target', 'equipment-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-4', 'source', 'equipment-manager', 'target', 'end-approved', 'type', 'sequenceFlow')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'equipment_id', 'label', '设备编号', 'type', 'text', 'required', true, 'placeholder', '请输入设备编号'),
    JSON_OBJECT('name', 'equipment_name', 'label', '设备名称', 'type', 'text', 'required', true, 'placeholder', '请输入设备名称'),
    JSON_OBJECT('name', 'current_project', 'label', '当前项目', 'type', 'select', 'required', true, 'placeholder', '请选择当前项目'),
    JSON_OBJECT('name', 'currentProjectManager', 'label', '当前项目负责人', 'type', 'user', 'required', true, 'placeholder', '请选择当前项目负责人'),
    JSON_OBJECT('name', 'target_project', 'label', '目标项目', 'type', 'select', 'required', true, 'placeholder', '请选择目标项目'),
    JSON_OBJECT('name', 'targetProjectManager', 'label', '目标项目负责人', 'type', 'user', 'required', true, 'placeholder', '请选择目标项目负责人'),
    JSON_OBJECT('name', 'transfer_reason', 'label', '调拨原因', 'type', 'textarea', 'required', true, 'placeholder', '请输入调拨原因', 'rows', 3)
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 人员入职审批流程
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, status, node_config, form_schema)
VALUES (
  'wf-employee-onboard-001',
  'employee-onboard',
  '人员入职流程',
  1,
  'hr',
  'Employee',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交入职申请', 'config', JSON_OBJECT('formKey', 'employee-onboard-form')),
      JSON_OBJECT('id', 'hr-manager', 'type', 'userTask', 'name', 'HR经理审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'hr_manager')))),
      JSON_OBJECT('id', 'department-manager', 'type', 'userTask', 'name', '部门经理审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'expression', '${formData.departmentManager}')))),
      JSON_OBJECT('id', 'gm', 'type', 'userTask', 'name', '总经理审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'general_manager')))),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'hr-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-2', 'source', 'hr-manager', 'target', 'department-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-3', 'source', 'department-manager', 'target', 'gm', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-4', 'source', 'gm', 'target', 'end-approved', 'type', 'sequenceFlow')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'employee_name', 'label', '员工姓名', 'type', 'text', 'required', true, 'placeholder', '请输入员工姓名'),
    JSON_OBJECT('name', 'employee_id', 'label', '员工编号', 'type', 'text', 'required', true, 'placeholder', '请输入员工编号'),
    JSON_OBJECT('name', 'department', 'label', '所属部门', 'type', 'select', 'required', true, 'placeholder', '请选择所属部门'),
    JSON_OBJECT('name', 'departmentManager', 'label', '部门经理', 'type', 'user', 'required', true, 'placeholder', '请选择部门经理'),
    JSON_OBJECT('name', 'position', 'label', '职位', 'type', 'text', 'required', true, 'placeholder', '请输入职位'),
    JSON_OBJECT('name', 'salary', 'label', '薪资(元)', 'type', 'number', 'required', true, 'placeholder', '请输入薪资', 'min', 0),
    JSON_OBJECT('name', 'start_date', 'label', '入职日期', 'type', 'date', 'required', true),
    JSON_OBJECT('name', 'notes', 'label', '备注', 'type', 'textarea', 'required', false, 'placeholder', '请输入备注信息', 'rows', 2)
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 采购审批流程
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, status, node_config, form_schema)
VALUES (
  'wf-purchase-approval-001',
  'purchase-approval',
  '采购审批流程',
  1,
  'purchase',
  'Purchase',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交采购申请', 'config', JSON_OBJECT('formKey', 'purchase-approval-form')),
      JSON_OBJECT('id', 'dept-manager', 'type', 'userTask', 'name', '部门经理审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'department_manager')))),
      JSON_OBJECT('id', 'gateway-1', 'type', 'exclusiveGateway', 'name', '金额判断', 'config', JSON_OBJECT('gatewayConfig', JSON_OBJECT('conditions', JSON_ARRAY(
        JSON_OBJECT('id', 'condition-1', 'name', '金额大于5万', 'expression', '${formData.amount > 50000}', 'target', 'gm'),
        JSON_OBJECT('id', 'condition-2', 'name', '金额小于等于5万', 'expression', '${formData.amount <= 50000}', 'target', 'finance')
      ))))),
      JSON_OBJECT('id', 'gm', 'type', 'userTask', 'name', '总经理审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'general_manager')))),
      JSON_OBJECT('id', 'finance', 'type', 'userTask', 'name', '财务审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'finance_manager')))),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'dept-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-2', 'source', 'dept-manager', 'target', 'gateway-1', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-3', 'source', 'gateway-1', 'target', 'gm', 'type', 'sequenceFlow', 'condition', '${formData.amount > 50000}'),
      JSON_OBJECT('id', 'edge-4', 'source', 'gateway-1', 'target', 'finance', 'type', 'sequenceFlow', 'condition', '${formData.amount <= 50000}'),
      JSON_OBJECT('id', 'edge-5', 'source', 'gm', 'target', 'finance', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-6', 'source', 'finance', 'target', 'end-approved', 'type', 'sequenceFlow')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'purchase_name', 'label', '采购名称', 'type', 'text', 'required', true, 'placeholder', '请输入采购名称'),
    JSON_OBJECT('name', 'amount', 'label', '采购金额(元)', 'type', 'number', 'required', true, 'placeholder', '请输入采购金额', 'min', 0),
    JSON_OBJECT('name', 'purchase_reason', 'label', '采购原因', 'type', 'textarea', 'required', true, 'placeholder', '请输入采购原因', 'rows', 3),
    JSON_OBJECT('name', 'supplier', 'label', '供应商', 'type', 'text', 'required', true, 'placeholder', '请输入供应商名称'),
    JSON_OBJECT('name', 'expected_delivery_date', 'label', '预计交付日期', 'type', 'date', 'required', true)
  )
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 完成
-- ============================================
