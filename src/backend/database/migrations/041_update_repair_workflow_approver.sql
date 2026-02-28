UPDATE workflow_definitions 
SET node_config = JSON_OBJECT(
  'edges', JSON_ARRAY(
    JSON_OBJECT('id', 'edge-1', 'type', 'sequenceFlow', 'source', 'start', 'target', 'manager'),
    JSON_OBJECT('id', 'edge-2', 'type', 'sequenceFlow', 'source', 'manager', 'target', 'end-approved', 'condition', JSON_OBJECT('type', 'expression', 'expression', '${action == "approve"}')),
    JSON_OBJECT('id', 'edge-3', 'type', 'sequenceFlow', 'source', 'manager', 'target', 'end-rejected', 'condition', JSON_OBJECT('type', 'expression', 'expression', '${action == "reject"}'))
  ),
  'nodes', JSON_ARRAY(
    JSON_OBJECT('id', 'start', 'name', '提交维修申请', 'type', 'startEvent', 'config', JSON_OBJECT('formKey', 'equipment-repair-form')),
    JSON_OBJECT('id', 'manager', 'name', '设备管理员审批', 'type', 'userTask', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'admin')))),
    JSON_OBJECT('id', 'end-approved', 'name', '审批通过', 'type', 'endEvent'),
    JSON_OBJECT('id', 'end-rejected', 'name', '审批驳回', 'type', 'endEvent')
  )
)
WHERE `key` = 'equipment-repair';
