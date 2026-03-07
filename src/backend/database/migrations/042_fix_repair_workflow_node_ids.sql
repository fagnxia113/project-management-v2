-- 更新设备维修审批流程，添加发货和收货节点（节点ID改为前端期望的名称）
UPDATE workflow_definitions
SET node_config = JSON_OBJECT(
  'nodes', JSON_ARRAY(
    JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交维修申请', 'config', JSON_OBJECT('formKey', 'equipment-repair-form')),
    JSON_OBJECT('id', 'manager', 'type', 'userTask', 'name', '设备管理员审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'equipment_manager')))),
    JSON_OBJECT('id', 'shipping', 'type', 'userTask', 'name', '发货维修', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'equipment_manager')))),
    JSON_OBJECT('id', 'receiving', 'type', 'userTask', 'name', '收货确认', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'equipment_manager')))),
    JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过'),
    JSON_OBJECT('id', 'end-rejected', 'type', 'endEvent', 'name', '审批驳回')
  ),
  'edges', JSON_ARRAY(
    JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'manager', 'type', 'sequenceFlow'),
    JSON_OBJECT('id', 'edge-2', 'source', 'manager', 'target', 'shipping', 'type', 'sequenceFlow', 'condition', JSON_OBJECT('type', 'expression', 'expression', '${action == "approve"}')),
    JSON_OBJECT('id', 'edge-3', 'source', 'manager', 'target', 'end-rejected', 'type', 'sequenceFlow', 'condition', JSON_OBJECT('type', 'expression', 'expression', '${action == "reject"}')),
    JSON_OBJECT('id', 'edge-4', 'source', 'shipping', 'target', 'receiving', 'type', 'sequenceFlow'),
    JSON_OBJECT('id', 'edge-5', 'source', 'receiving', 'target', 'end-approved', 'type', 'sequenceFlow')
  )
),
form_schema = JSON_ARRAY(
  JSON_OBJECT('name', 'order_no', 'label', '维修单号', 'type', 'text', 'required', false, 'placeholder', '系统自动生成', 'disabled', true, 'readonly', true),
  JSON_OBJECT('name', 'equipment_name', 'label', '设备名称', 'type', 'text', 'required', false, 'disabled', true, 'readonly', true),
  JSON_OBJECT('name', 'equipment_category', 'label', '设备类别', 'type', 'text', 'required', false, 'disabled', true, 'readonly', true),
  JSON_OBJECT('name', 'repair_quantity', 'label', '维修数量', 'type', 'number', 'required', false, 'disabled', true, 'readonly', true),
  JSON_OBJECT('name', 'fault_description', 'label', '故障描述', 'type', 'textarea', 'required', true, 'placeholder', '请描述设备故障情况', 'rows', 3),
  JSON_OBJECT('name', 'repair_service_provider', 'label', '维修服务商', 'type', 'text', 'required', false, 'placeholder', '请输入维修服务商名称（可选）'),
  JSON_OBJECT('name', 'shipping_no', 'label', '物流单号', 'type', 'text', 'required', false, 'placeholder', '发货时填写物流单号'),
  JSON_OBJECT('name', 'repair_result', 'label', '维修结果', 'type', 'select', 'required', false, 'options', JSON_ARRAY('正常', '部分修复', '无法修复'), 'placeholder', '收货时选择维修结果'),
  JSON_OBJECT('name', 'actual_cost', 'label', '实际费用', 'type', 'number', 'required', false, 'placeholder', '收货时填写实际维修费用')
)
WHERE id = 'wf-equipment-repair-1';
