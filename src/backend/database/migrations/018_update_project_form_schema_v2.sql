-- ============================================
-- 更新项目审批流程的表单字段定义 v2
-- 文件: 018_update_project_form_schema_v2.sql
-- 日期: 2026-02-24
-- 说明: 根据设计文档更新项目表单字段
-- ============================================

-- 删除旧的流程定义（如果存在）
DELETE FROM workflow_definitions WHERE `key` = 'project-approval';

-- 插入新的项目审批流程定义
INSERT INTO workflow_definitions (id, `key`, name, category, entity_type, status, node_config, form_schema, variables, created_by, created_at, updated_at)
VALUES (
  'wf-project-approval-v2',
  'project-approval',
  '项目审批流程',
  'project',
  'Project',
  'active',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'startEvent', 'name', '提交申请'),
      JSON_OBJECT('id', 'dept-manager', 'type', 'userTask', 'name', '部门经理审批', 'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'department_manager'))),
      JSON_OBJECT('id', 'gateway-1', 'type', 'exclusiveGateway', 'name', '审批判断', 'gatewayConfig', JSON_OBJECT(
        'conditions', JSON_ARRAY(
          JSON_OBJECT('id', 'c1', 'name', '预算>100万', 'expression', '${formData.budget > 100}', 'targetNode', 'gm')
        ),
        'defaultFlow', 'end-approved'
      )),
      JSON_OBJECT('id', 'gm', 'type', 'userTask', 'name', '总经理审批', 'approvalConfig', JSON_OBJECT('approvalType', 'single', 'approverSource', JSON_OBJECT('type', 'role', 'value', 'general_manager'))),
      JSON_OBJECT('id', 'end-approved', 'type', 'endEvent', 'name', '审批通过')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('id', 'edge-1', 'source', 'start', 'target', 'dept-manager'),
      JSON_OBJECT('id', 'edge-2', 'source', 'dept-manager', 'target', 'gateway-1'),
      JSON_OBJECT('id', 'edge-3', 'source', 'gateway-1', 'target', 'gm', 'condition', '${formData.budget > 100}'),
      JSON_OBJECT('id', 'edge-4', 'source', 'gateway-1', 'target', 'end-approved', 'condition', '${formData.budget <= 100}'),
      JSON_OBJECT('id', 'edge-5', 'source', 'gm', 'target', 'end-approved')
    )
  ),
  JSON_OBJECT(
    'fields', JSON_ARRAY(
      -- ========== 基本信息 ==========
      JSON_OBJECT('name', 'name', 'label', '项目名称', 'type', 'text', 'required', true, 'placeholder', '请输入项目名称', 'group', '基本信息'),
      JSON_OBJECT('name', 'code', 'label', '项目编号', 'type', 'text', 'required', false, 'placeholder', '系统自动生成', 'disabled', true, 'group', '基本信息'),
      JSON_OBJECT('name', 'manager_id', 'label', '项目经理', 'type', 'user', 'required', true, 'placeholder', '请选择项目经理', 'group', '基本信息'),
      JSON_OBJECT('name', 'start_date', 'label', '项目开始日期', 'type', 'date', 'required', true, 'group', '基本信息'),
      JSON_OBJECT('name', 'end_date', 'label', '项目结束日期', 'type', 'date', 'required', false, 'group', '基本信息'),
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
      JSON_OBJECT('name', 'status', 'label', '项目状态', 'type', 'select', 'required', true, 'defaultValue', 'proposal', 'options', JSON_ARRAY(
        JSON_OBJECT('label', '立项', 'value', 'proposal'),
        JSON_OBJECT('label', '进行中', 'value', 'in_progress'),
        JSON_OBJECT('label', '已完成', 'value', 'completed'),
        JSON_OBJECT('label', '暂停', 'value', 'paused')
      ), 'group', '基本信息'),
      
      -- ========== 项目规模 ==========
      JSON_OBJECT('name', 'description', 'label', '项目描述', 'type', 'textarea', 'required', false, 'placeholder', '请输入项目描述信息', 'rows', 3, 'group', '项目规模'),
      JSON_OBJECT('name', 'building_area', 'label', '建筑面积(m²)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目规模'),
      JSON_OBJECT('name', 'it_capacity', 'label', 'IT容量(MW)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目规模'),
      JSON_OBJECT('name', 'cabinet_count', 'label', '机柜数量', 'type', 'number', 'required', false, 'min', 0, 'group', '项目规模'),
      JSON_OBJECT('name', 'cabinet_power', 'label', '单机柜功率(KW)', 'type', 'number', 'required', false, 'min', 0, 'group', '项目规模'),
      
      -- ========== 技术架构 ==========
      JSON_OBJECT('name', 'power_architecture', 'label', '供电架构', 'type', 'textarea', 'required', false, 'placeholder', '供电系统架构描述', 'rows', 2, 'group', '技术架构'),
      JSON_OBJECT('name', 'hvac_architecture', 'label', '暖通架构', 'type', 'textarea', 'required', false, 'placeholder', '暖通系统架构描述', 'rows', 2, 'group', '技术架构'),
      JSON_OBJECT('name', 'fire_architecture', 'label', '消防架构', 'type', 'textarea', 'required', false, 'placeholder', '消防系统架构描述', 'rows', 2, 'group', '技术架构'),
      JSON_OBJECT('name', 'weak_electric_architecture', 'label', '弱电架构', 'type', 'textarea', 'required', false, 'placeholder', '弱电系统架构描述', 'rows', 2, 'group', '技术架构'),
      
      -- ========== 商务信息 ==========
      JSON_OBJECT('name', 'customer_id', 'label', '客户', 'type', 'lookup', 'required', false, 'placeholder', '请选择客户', 'group', '商务信息'),
      JSON_OBJECT('name', 'budget', 'label', '预算金额(万元)', 'type', 'number', 'required', false, 'placeholder', '请输入预算金额', 'min', 0, 'group', '商务信息')
    )
  ),
  JSON_ARRAY(),
  'system',
  NOW(),
  NOW()
);

-- 确保流程定义已激活
UPDATE workflow_definitions SET status = 'active' WHERE `key` = 'project-approval';