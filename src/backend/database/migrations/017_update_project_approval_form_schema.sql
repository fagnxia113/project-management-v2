-- ============================================
-- 更新项目审批流程的表单字段定义
-- 文件: 017_update_project_approval_form_schema.sql
-- ============================================

-- 更新项目审批流程定义的 form_schema
UPDATE workflow_definitions 
SET form_schema = JSON_ARRAY(
  -- ========== 基本信息 ==========
  JSON_OBJECT('name', 'name', 'label', '项目名称', 'type', 'text', 'required', true, 'placeholder', '请输入项目名称', 'group', '基本信息'),
  JSON_OBJECT('name', 'code', 'label', '项目编号', 'type', 'text', 'required', false, 'placeholder', '系统自动生成', 'disabled', true, 'group', '基本信息'),
  JSON_OBJECT('name', 'manager_id', 'label', '项目经理', 'type', 'user', 'required', true, 'placeholder', '请选择项目经理', 'group', '基本信息'),
  JSON_OBJECT('name', 'start_date', 'label', '项目开始日期', 'type', 'date', 'required', true, 'group', '基本信息'),
  JSON_OBJECT('name', 'country', 'label', '所属国家', 'type', 'select', 'required', false, 'defaultValue', '中国', 'options', JSON_ARRAY(
    JSON_OBJECT('label', '中国', 'value', '中国'),
    JSON_OBJECT('label', '美国', 'value', '美国'),
    JSON_OBJECT('label', '新加坡', 'value', '新加坡'),
    JSON_OBJECT('label', '马来西亚', 'value', '马来西亚'),
    JSON_OBJECT('label', '印度尼西亚', 'value', '印度尼西亚'),
    JSON_OBJECT('label', '泰国', 'value', '泰国'),
    JSON_OBJECT('label', '越南', 'value', '越南'),
    JSON_OBJECT('label', '菲律宾', 'value', '菲律宾'),
    JSON_OBJECT('label', '日本', 'value', '日本'),
    JSON_OBJECT('label', '韩国', 'value', '韩国'),
    JSON_OBJECT('label', '阿联酋', 'value', '阿联酋'),
    JSON_OBJECT('label', '沙特阿拉伯', 'value', '沙特阿拉伯'),
    JSON_OBJECT('label', '德国', 'value', '德国'),
    JSON_OBJECT('label', '英国', 'value', '英国'),
    JSON_OBJECT('label', '其他', 'value', '其他')
  ), 'group', '基本信息'),
  JSON_OBJECT('name', 'address', 'label', '项目地址', 'type', 'text', 'required', false, 'placeholder', '请输入项目地址', 'group', '基本信息'),
  JSON_OBJECT('name', 'end_date', 'label', '项目结束日期', 'type', 'date', 'required', false, 'group', '基本信息'),
  JSON_OBJECT('name', 'attachments', 'label', '附件', 'type', 'text', 'required', false, 'placeholder', '项目相关文件', 'group', '基本信息'),
  
  -- ========== 项目阶段 ==========
  JSON_OBJECT('name', 'status', 'label', '项目状态', 'type', 'select', 'required', true, 'defaultValue', 'initiated', 'options', JSON_ARRAY(
    JSON_OBJECT('label', '立项', 'value', 'initiated'),
    JSON_OBJECT('label', '进行中', 'value', 'in_progress'),
    JSON_OBJECT('label', '已结项', 'value', 'completed'),
    JSON_OBJECT('label', '暂停', 'value', 'paused')
  ), 'group', '项目阶段'),
  JSON_OBJECT('name', 'phase', 'label', '项目阶段', 'type', 'select', 'required', false, 'options', JSON_ARRAY(
    JSON_OBJECT('label', '投标阶段', 'value', 'bidding'),
    JSON_OBJECT('label', '设计阶段', 'value', 'design'),
    JSON_OBJECT('label', '采购阶段', 'value', 'procurement'),
    JSON_OBJECT('label', '施工阶段', 'value', 'construction'),
    JSON_OBJECT('label', '调试验收阶段', 'value', 'commissioning'),
    JSON_OBJECT('label', '移交阶段', 'value', 'handover'),
    JSON_OBJECT('label', '质保阶段', 'value', 'warranty')
  ), 'group', '项目阶段'),
  JSON_OBJECT('name', 'phase_start_date', 'label', '该阶段预计开始日期', 'type', 'date', 'required', false, 'group', '项目阶段'),
  JSON_OBJECT('name', 'phase_end_date', 'label', '该阶段预计结束日期', 'type', 'date', 'required', false, 'group', '项目阶段'),
  JSON_OBJECT('name', 'estimated_days', 'label', '预计使用天数', 'type', 'number', 'required', false, 'disabled', true, 'group', '项目阶段'),
  JSON_OBJECT('name', 'remaining_days', 'label', '剩余天数', 'type', 'number', 'required', false, 'disabled', true, 'group', '项目阶段'),
  JSON_OBJECT('name', 'progress', 'label', '完成进度(%)', 'type', 'number', 'required', false, 'min', 0, 'max', 100, 'defaultValue', 0, 'group', '项目阶段'),
  
  -- ========== 项目相关信息 ==========
  JSON_OBJECT('name', 'description', 'label', '项目描述', 'type', 'textarea', 'required', false, 'placeholder', '请输入项目描述信息', 'rows', 3, 'group', '项目相关信息'),
  JSON_OBJECT('name', 'area', 'label', '建筑面积(m²)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
  JSON_OBJECT('name', 'capacity', 'label', 'IT容量(MW)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
  JSON_OBJECT('name', 'rack_count', 'label', '机柜数量', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
  JSON_OBJECT('name', 'rack_power', 'label', '单机柜功率(KW)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
  
  -- ========== 技术架构 ==========
  JSON_OBJECT('name', 'power_arch', 'label', '电力架构', 'type', 'textarea', 'required', false, 'placeholder', '电力系统架构描述', 'rows', 2, 'group', '技术架构'),
  JSON_OBJECT('name', 'hvac_arch', 'label', '暖通架构', 'type', 'textarea', 'required', false, 'placeholder', '暖通系统架构描述', 'rows', 2, 'group', '技术架构'),
  JSON_OBJECT('name', 'fire_arch', 'label', '消防架构', 'type', 'textarea', 'required', false, 'placeholder', '消防系统架构描述', 'rows', 2, 'group', '技术架构'),
  JSON_OBJECT('name', 'weak_arch', 'label', '弱电架构', 'type', 'textarea', 'required', false, 'placeholder', '弱电系统架构描述', 'rows', 2, 'group', '技术架构'),
  
  -- ========== 商务信息 ==========
  JSON_OBJECT('name', 'customer_id', 'label', '终端客户', 'type', 'lookup', 'required', false, 'placeholder', '请选择终端客户', 'group', '商务信息'),
  JSON_OBJECT('name', 'budget', 'label', '预算金额(万元)', 'type', 'number', 'required', false, 'placeholder', '请输入预算金额', 'min', 0, 'group', '商务信息')
),
updated_at = NOW()
WHERE id = 'wf-project-approval-1';

-- 如果上面的更新没有影响到任何行，则插入一条新的流程定义
INSERT INTO workflow_definitions (id, `key`, name, category, entity_type, status, node_config, form_schema, variables, created_by, created_at, updated_at)
SELECT 
  'wf-project-approval-1',
  'project-approval',
  '项目审批流程',
  'project',
  'Project',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交申请'),
      JSON_OBJECT('id', 'dept-manager', 'type', 'userTask', 'name', '部门经理审批'),
      JSON_OBJECT('id', 'gateway-1', 'type', 'exclusiveGateway', 'name', '审批判断'),
      JSON_OBJECT('id', 'gm', 'type', 'userTask', 'name', '总经理审批'),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过'),
      JSON_OBJECT('id', 'end-rejected', 'type', 'endEvent', 'name', '审批驳回')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'dept-manager'),
      JSON_OBJECT('id', 'edge-2', 'source', 'dept-manager', 'target', 'gateway-1'),
      JSON_OBJECT('id', 'edge-3', 'source', 'gateway-1', 'target', 'gm'),
      JSON_OBJECT('id', 'edge-4', 'source', 'gateway-1', 'target', 'end-approved'),
      JSON_OBJECT('id', 'edge-5', 'source', 'gm', 'target', 'end-approved')
    )
  ),
  form_schema,
  JSON_ARRAY(),
  'system',
  NOW(),
  NOW()
FROM (
  SELECT JSON_ARRAY(
    -- 基本信息
    JSON_OBJECT('name', 'name', 'label', '项目名称', 'type', 'text', 'required', true, 'placeholder', '请输入项目名称', 'group', '基本信息'),
    JSON_OBJECT('name', 'code', 'label', '项目编号', 'type', 'text', 'required', false, 'placeholder', '系统自动生成', 'disabled', true, 'group', '基本信息'),
    JSON_OBJECT('name', 'manager_id', 'label', '项目经理', 'type', 'user', 'required', true, 'placeholder', '请选择项目经理', 'group', '基本信息'),
    JSON_OBJECT('name', 'start_date', 'label', '项目开始日期', 'type', 'date', 'required', true, 'group', '基本信息'),
    JSON_OBJECT('name', 'country', 'label', '所属国家', 'type', 'select', 'required', false, 'defaultValue', '中国', 'group', '基本信息'),
    JSON_OBJECT('name', 'address', 'label', '项目地址', 'type', 'text', 'required', false, 'placeholder', '请输入项目地址', 'group', '基本信息'),
    JSON_OBJECT('name', 'end_date', 'label', '项目结束日期', 'type', 'date', 'required', false, 'group', '基本信息'),
    JSON_OBJECT('name', 'attachments', 'label', '附件', 'type', 'text', 'required', false, 'placeholder', '项目相关文件', 'group', '基本信息'),
    -- 项目阶段
    JSON_OBJECT('name', 'status', 'label', '项目状态', 'type', 'select', 'required', true, 'defaultValue', 'initiated', 'group', '项目阶段'),
    JSON_OBJECT('name', 'phase', 'label', '项目阶段', 'type', 'select', 'required', false, 'group', '项目阶段'),
    JSON_OBJECT('name', 'phase_start_date', 'label', '该阶段预计开始日期', 'type', 'date', 'required', false, 'group', '项目阶段'),
    JSON_OBJECT('name', 'phase_end_date', 'label', '该阶段预计结束日期', 'type', 'date', 'required', false, 'group', '项目阶段'),
    JSON_OBJECT('name', 'estimated_days', 'label', '预计使用天数', 'type', 'number', 'required', false, 'disabled', true, 'group', '项目阶段'),
    JSON_OBJECT('name', 'remaining_days', 'label', '剩余天数', 'type', 'number', 'required', false, 'disabled', true, 'group', '项目阶段'),
    JSON_OBJECT('name', 'progress', 'label', '完成进度(%)', 'type', 'number', 'required', false, 'min', 0, 'max', 100, 'defaultValue', 0, 'group', '项目阶段'),
    -- 项目相关信息
    JSON_OBJECT('name', 'description', 'label', '项目描述', 'type', 'textarea', 'required', false, 'placeholder', '请输入项目描述信息', 'rows', 3, 'group', '项目相关信息'),
    JSON_OBJECT('name', 'area', 'label', '建筑面积(m²)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
    JSON_OBJECT('name', 'capacity', 'label', 'IT容量(MW)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
    JSON_OBJECT('name', 'rack_count', 'label', '机柜数量', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
    JSON_OBJECT('name', 'rack_power', 'label', '单机柜功率(KW)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目相关信息'),
    -- 技术架构
    JSON_OBJECT('name', 'power_arch', 'label', '电力架构', 'type', 'textarea', 'required', false, 'placeholder', '电力系统架构描述', 'rows', 2, 'group', '技术架构'),
    JSON_OBJECT('name', 'hvac_arch', 'label', '暖通架构', 'type', 'textarea', 'required', false, 'placeholder', '暖通系统架构描述', 'rows', 2, 'group', '技术架构'),
    JSON_OBJECT('name', 'fire_arch', 'label', '消防架构', 'type', 'textarea', 'required', false, 'placeholder', '消防系统架构描述', 'rows', 2, 'group', '技术架构'),
    JSON_OBJECT('name', 'weak_arch', 'label', '弱电架构', 'type', 'textarea', 'required', false, 'placeholder', '弱电系统架构描述', 'rows', 2, 'group', '技术架构'),
    -- 商务信息
    JSON_OBJECT('name', 'customer_id', 'label', '终端客户', 'type', 'lookup', 'required', false, 'placeholder', '请选择终端客户', 'group', '商务信息'),
    JSON_OBJECT('name', 'budget', 'label', '预算金额(万元)', 'type', 'number', 'required', false, 'placeholder', '请输入预算金额', 'min', 0, 'group', '商务信息')
  ) as form_schema
) AS temp
WHERE NOT EXISTS (SELECT 1 FROM workflow_definitions WHERE id = 'wf-project-approval-1');