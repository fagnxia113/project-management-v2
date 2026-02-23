-- ============================================
-- 动态审批人规则示例 - 设备调拨场景
-- 文件: 003_dynamic_approver_rules.sql
-- 说明: 添加支持动态审批人的规则示例
-- ============================================

-- 规则5: 设备调拨审批（调出项目经理 + 调入项目经理）
INSERT INTO approval_rules (id, rule_name, entity_type, rule_condition, rule_nodes, priority, enabled, description) VALUES
('rule-equipment-transfer', '设备调拨审批', 'EquipmentTransfer',
  JSON_OBJECT(
    'conditions', JSON_OBJECT(
      'all', JSON_ARRAY()
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'id', 'fromProjectManager',
      'name', '调出项目 经理审核',
      'approverSource', 'project_manager',
      'approverField', 'fromProjectId',
      'order', 1
    ),
    JSON_OBJECT(
      'id', 'toProjectManager',
      'name', '调入项目 经理审核',
      'approverSource', 'project_manager',
      'approverField', 'toProjectId',
      'order', 2
    )
  ),
  100, 1, '设备从A项目调出时，需要A项目经理审核；调入B项目时，需要B项目经理审核')
ON DUPLICATE KEY UPDATE enabled = 1, priority = 100;

-- 规则6: 设备调拨 - 同一项目内调拨（只需项目经理）
INSERT INTO approval_rules (id, rule_name, entity_type, rule_condition, rule_nodes, priority, enabled, description) VALUES
('rule-equipment-transfer-same-project', '设备调拨（同项目）', 'EquipmentTransfer',
  JSON_OBJECT(
    'conditions', JSON_OBJECT(
      'all', JSON_ARRAY(
        JSON_OBJECT('fact', 'formData', 'operator', 'equal', 'path', '$.fromProjectId', 'value', '{toProjectId}')
      )
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'id', 'projectManager',
      'name', '项目经理审核',
      'approverSource', 'project_manager',
      'approverField', 'fromProjectId',
      'order', 1
    )
  ),
  150, 1, '同一项目内的设备调拨，只需要项目经理审核')
ON DUPLICATE KEY UPDATE enabled = 1, priority = 150;

-- 规则7: 项目任务审批（任务负责人）
INSERT INTO approval_rules (id, rule_name, entity_type, rule_condition, rule_nodes, priority, enabled, description) VALUES
('rule-task-create', '任务创建审批', 'Task',
  JSON_OBJECT('conditions', JSON_OBJECT('all', JSON_ARRAY())),
  JSON_ARRAY(
    JSON_OBJECT(
      'id', 'projectLeader',
      'name', '项目负责人审核',
      'approverSource', 'project_manager',
      'approverField', 'projectId',
      'order', 1
    )
  ),
  10, 1, '任务创建需要项目负责人（项目经理）审批')
ON DUPLICATE KEY UPDATE enabled = 1, priority = 10;

-- 查看规则
SELECT id, rule_name, entity_type, priority, enabled, description 
FROM approval_rules 
ORDER BY entity_type, priority DESC;
