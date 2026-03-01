-- 创建设备报废/售出审批流程
INSERT INTO workflow_definitions (id, `key`, name, version, category, entity_type, status, node_config, form_schema)
VALUES (
  'wf-equipment-scrap-sale-001',
  'equipment-scrap-sale',
  '设备报废/售出流程',
  1,
  'equipment',
  'EquipmentScrapSale',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交报废/售出申请', 'config', JSON_OBJECT('formKey', 'equipment-scrap-sale-form')),
      JSON_OBJECT('id', 'location-manager', 'type', 'userTask', 'name', '位置管理员审批', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'variable', 'value', 'location_manager_id')))),
      JSON_OBJECT('id', 'process', 'type', 'userTask', 'name', '确认处理', 'config', JSON_OBJECT('approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'equipment_manager')))),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '完成'),
      JSON_OBJECT('id', 'end-rejected', 'type', 'endEvent', 'name', '驳回')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'location-manager', 'type', 'sequenceFlow'),
      JSON_OBJECT('id', 'edge-2', 'source', 'location-manager', 'target', 'process', 'type', 'sequenceFlow', 'condition', JSON_OBJECT('type', 'expression', 'expression', '${action == "approve"}')),
      JSON_OBJECT('id', 'edge-3', 'source', 'location-manager', 'target', 'end-rejected', 'type', 'sequenceFlow', 'condition', JSON_OBJECT('type', 'expression', 'expression', '${action == "reject"}')),
      JSON_OBJECT('id', 'edge-4', 'source', 'process', 'target', 'end-approved', 'type', 'sequenceFlow')
    )
  ),
  JSON_ARRAY(
    JSON_OBJECT('name', 'order_no', 'label', '单号', 'type', 'text', 'required', false, 'placeholder', '系统自动生成', 'disabled', true, 'readonly', true),
    JSON_OBJECT('name', 'type', 'label', '类型', 'type', 'text', 'required', false, 'disabled', true, 'readonly', true),
    JSON_OBJECT('name', 'equipment_name', 'label', '设备名称', 'type', 'text', 'required', false, 'disabled', true, 'readonly', true),
    JSON_OBJECT('name', 'equipment_category', 'label', '设备类别', 'type', 'text', 'required', false, 'disabled', true, 'readonly', true),
    JSON_OBJECT('name', 'scrap_sale_quantity', 'label', '报废/售出数量', 'type', 'number', 'required', false, 'disabled', true, 'readonly', true),
    JSON_OBJECT('name', 'reason', 'label', '报废/售出原因', 'type', 'textarea', 'required', true, 'placeholder', '请输入报废/售出原因', 'rows', 3),
    JSON_OBJECT('name', 'sale_price', 'label', '售出价格', 'type', 'number', 'required', false, 'placeholder', '请输入售出价格（仅售出类型）', 'min', 0),
    JSON_OBJECT('name', 'buyer', 'label', '购买方', 'type', 'text', 'required', false, 'placeholder', '请输入购买方名称（仅售出类型）')
  )
)
ON DUPLICATE KEY UPDATE 
  status = 'active',
  node_config = VALUES(node_config),
  form_schema = VALUES(form_schema);