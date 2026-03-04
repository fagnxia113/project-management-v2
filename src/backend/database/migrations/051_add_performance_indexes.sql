-- 工作流任务表索引优化
-- 复合索引：实例ID + 状态（用于查询某个实例的任务）
CREATE INDEX idx_workflow_tasks_instance_status ON workflow_tasks(instance_id, status);

-- 复合索引：分配人ID + 状态（用于查询用户的待办任务）
CREATE INDEX idx_workflow_tasks_assignee_status ON workflow_tasks(assignee_id, status);

-- 复合索引：创建时间（用于按时间排序）
CREATE INDEX idx_workflow_tasks_created_at ON workflow_tasks(created_at DESC);

-- 工作流实例表索引优化
-- 复合索引：发起人ID + 状态（用于查询用户发起的流程）
CREATE INDEX idx_workflow_instances_initiator_status ON workflow_instances(initiator_id, status);

-- 复合索引：定义ID + 状态（用于查询某个流程定义的实例）
CREATE INDEX idx_workflow_instances_definition_status ON workflow_instances(definition_id, status);

-- 复合索引：业务ID（用于根据业务数据查询流程实例）
CREATE INDEX idx_workflow_instances_business_key ON workflow_instances(business_key);

-- 复合索引：分类 + 状态（用于按分类查询流程）
CREATE INDEX idx_workflow_instances_category_status ON workflow_instances(category, status);

-- 复合索引：创建时间（用于按时间排序）
CREATE INDEX idx_workflow_instances_created_at ON workflow_instances(created_at DESC);

-- 工作流定义表索引优化
-- 复合索引：分类 + 版本（用于查询某个分类的最新版本）
CREATE INDEX idx_workflow_definitions_category_version ON workflow_definitions(category, version DESC);

-- 复合索引：状态（用于查询激活的流程定义）
CREATE INDEX idx_workflow_definitions_status ON workflow_definitions(status);

-- 工作流任务历史表索引优化
-- 复合索引：实例ID + 操作人ID（用于查询某个实例的操作历史）
CREATE INDEX idx_workflow_task_history_instance_operator ON workflow_task_history(instance_id, operator_id);

-- 复合索引：任务ID（用于查询某个任务的历史）
CREATE INDEX idx_workflow_task_history_task_id ON workflow_task_history(task_id);

-- 复合索引：创建时间（用于按时间排序）
CREATE INDEX idx_workflow_task_history_created_at ON workflow_task_history(created_at DESC);

-- 工作流审批表索引优化
-- 复合索引：任务ID + 审批人ID（用于查询某个任务的审批记录）
CREATE INDEX idx_workflow_approvals_task_approver ON workflow_approvals(task_id, approver_id);

-- 复合索引：实例ID（用于查询某个实例的所有审批）
CREATE INDEX idx_workflow_approvals_instance_id ON workflow_approvals(instance_id);

-- 复合索引：审批时间（用于按时间排序）
CREATE INDEX idx_workflow_approvals_approval_time ON workflow_approvals(approval_time DESC);

-- 员工表索引优化
-- 复合索引：用户ID（用于关联查询）
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- 复合索引：部门ID + 状态（用于查询部门的员工）
CREATE INDEX idx_employees_department_status ON employees(department_id, status);

-- 复合索引：职位ID + 状态（用于查询职位的员工）
CREATE INDEX idx_employees_position_status ON employees(position_id, status);

-- 设备表索引优化
-- 复合索引：类型 + 状态（用于查询某类状态的设备）
CREATE INDEX idx_equipment_type_status ON equipment(type, status);

-- 复合索引：位置ID + 状态（用于查询某位置的设备）
CREATE INDEX idx_equipment_position_status ON equipment(position_id, status);

-- 复合索引：仓库ID + 状态（用于查询某仓库的设备）
CREATE INDEX idx_equipment_warehouse_status ON equipment(warehouse_id, status);

-- 项目表索引优化
-- 复合索引：项目经理 + 状态（用于查询项目经理的项目）
CREATE INDEX idx_projects_manager_status ON projects(project_manager_id, status);

-- 复合索引：状态 + 开始日期（用于查询进行中的项目）
CREATE INDEX idx_projects_status_start_date ON projects(status, start_date);

-- 设备调拨单表索引优化
-- 复合索引：发起人ID + 状态（用于查询用户的调拨单）
CREATE INDEX idx_equipment_transfers_initiator_status ON equipment_transfers(initiator_id, status);

-- 复合索引：目标仓库ID + 状态（用于查询到某仓库的调拨）
CREATE INDEX idx_equipment_transfers_target_warehouse_status ON equipment_transfers(target_warehouse_id, status);

-- 复合索引：创建时间（用于按时间排序）
CREATE INDEX idx_equipment_transfers_created_at ON equipment_transfers(created_at DESC);

-- 设备入库单表索引优化
-- 复合索引：发起人ID + 状态（用于查询用户的入库单）
CREATE INDEX idx_equipment_inbounds_initiator_status ON equipment_inbounds(initiator_id, status);

-- 复合索引：仓库ID + 状态（用于查询到某仓库的入库）
CREATE INDEX idx_equipment_inbounds_warehouse_status ON equipment_inbounds(warehouse_id, status);

-- 复合索引：创建时间（用于按时间排序）
CREATE INDEX idx_equipment_inbounds_created_at ON equipment_inbounds(created_at DESC);

-- 用户表索引优化
-- 复合索引：角色 + 状态（用于查询某角色的用户）
CREATE INDEX idx_users_role_status ON users(role, status);

-- 复合索引：邮箱（用于根据邮箱查询）
CREATE INDEX idx_users_email ON users(email);

-- 通知表索引优化
-- 复合索引：接收人ID + 已读状态（用于查询用户的未读通知）
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- 复合索引：创建时间（用于按时间排序）
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 复合索引：类型（用于按类型查询）
CREATE INDEX idx_notifications_type ON notifications(type);

-- 部门表索引优化
-- 复合索引：父部门ID（用于查询子部门）
CREATE INDEX idx_departments_parent_id ON departments(parent_id);

-- 复合索引：状态（用于查询激活的部门）
CREATE INDEX idx_departments_status ON departments(status);

-- 职位表索引优化
-- 复合索引：部门ID + 状态（用于查询部门的职位）
CREATE INDEX idx_positions_department_status ON positions(department_id, status);

-- 复合索引：分类 + 状态（用于查询某类职位）
CREATE INDEX idx_positions_category_status ON positions(category, status);

-- 工作时间表索引优化
-- 复合索引：员工ID + 日期（用于查询员工的工作时间）
CREATE INDEX idx_work_times_employee_date ON work_times(employee_id, work_date);

-- 复合索引：项目ID + 日期（用于查询项目的工作时间）
CREATE INDEX idx_work_times_project_date ON work_times(project_id, work_date);

-- 复合索引：日期（用于按日期查询）
CREATE INDEX idx_work_times_date ON work_times(work_date DESC);

-- 表单草稿表索引优化
-- 复合索引：用户ID + 模板ID（用于查询用户的草稿）
CREATE INDEX idx_form_drafts_user_template ON form_drafts(user_id, template_id);

-- 复合索引：更新时间（用于查询最近的草稿）
CREATE INDEX idx_form_drafts_updated_at ON form_drafts(updated_at DESC);

-- 复合索引：状态（用于查询草稿或自动保存）
CREATE INDEX idx_form_drafts_status ON form_drafts(status);

-- 表单模板版本表索引优化
-- 复合索引：模板ID + 版本（用于查询模板的版本历史）
CREATE INDEX idx_form_template_versions_template_version ON form_template_versions(template_id, version DESC);

-- 复合索引：状态（用于查询激活的版本）
CREATE INDEX idx_form_template_versions_status ON form_template_versions(status);

-- 复合索引：创建人ID（用于查询用户创建的版本）
CREATE INDEX idx_form_template_versions_created_by ON form_template_versions(created_by);

-- 分布式锁表索引优化
-- 复合索引：锁键 + 过期时间（用于查询和清理过期锁）
CREATE INDEX idx_workflow_locks_key_expires ON workflow_locks(lock_key, expires_at);

-- 复合索引：过期时间（用于查询过期锁）
CREATE INDEX idx_workflow_locks_expires_at ON workflow_locks(expires_at);

-- 执行日志表索引优化
-- 复合索引：执行ID + 时间戳（用于查询某个执行的日志）
CREATE INDEX idx_workflow_execution_logs_execution_timestamp ON workflow_execution_logs(execution_id, timestamp);

-- 复合索引：实例ID（用于查询某个实例的日志）
CREATE INDEX idx_workflow_execution_logs_instance_id ON workflow_execution_logs(instance_id);

-- 复合索引：时间戳（用于按时间查询日志）
CREATE INDEX idx_workflow_execution_logs_timestamp ON workflow_execution_logs(timestamp DESC);

-- 复合索引：操作类型（用于按操作类型查询）
CREATE INDEX idx_workflow_execution_logs_action ON workflow_execution_logs(action);
