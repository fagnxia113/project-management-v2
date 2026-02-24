-- ============================================
-- 更新入职申请表单，岗位字段从岗位管理中选择
-- ============================================

-- 更新人员入职流程的表单定义，将 position 字段改为 reference 类型
UPDATE workflow_definitions 
SET form_schema = JSON_ARRAY(
  JSON_OBJECT('name', 'employee_name', 'label', '员工姓名', 'type', 'text', 'required', true, 'placeholder', '请输入员工姓名'),
  JSON_OBJECT('name', 'employee_id', 'label', '员工编号', 'type', 'text', 'required', true, 'placeholder', '系统自动生成', 'disabled', true),
  JSON_OBJECT('name', 'department_id', 'label', '所属部门', 'type', 'reference', 'required', true, 'placeholder', '请选择所属部门', 'refEntity', 'departments', 'refLabel', 'name', 'refValue', 'id'),
  JSON_OBJECT('name', 'position_id', 'label', '岗位', 'type', 'reference', 'required', true, 'placeholder', '请选择岗位', 'refEntity', 'positions', 'refLabel', 'name', 'refValue', 'id', 'cascadeFrom', 'department_id', 'cascadeField', 'department_id'),
  JSON_OBJECT('name', 'phone', 'label', '联系电话', 'type', 'text', 'required', true, 'placeholder', '请输入联系电话'),
  JSON_OBJECT('name', 'email', 'label', '邮箱', 'type', 'email', 'required', false, 'placeholder', '请输入邮箱'),
  JSON_OBJECT('name', 'gender', 'label', '性别', 'type', 'select', 'required', true, 'options', JSON_ARRAY(
    JSON_OBJECT('label', '男', 'value', 'male'),
    JSON_OBJECT('label', '女', 'value', 'female')
  )),
  JSON_OBJECT('name', 'employee_type', 'label', '员工类型', 'type', 'select', 'required', true, 'options', JSON_ARRAY(
    JSON_OBJECT('label', '正式员工', 'value', 'regular'),
    JSON_OBJECT('label', '试用期', 'value', 'probation'),
    JSON_OBJECT('label', '实习生', 'value', 'intern')
  )),
  JSON_OBJECT('name', 'start_date', 'label', '入职日期', 'type', 'date', 'required', true),
  JSON_OBJECT('name', 'salary', 'label', '薪资(元)', 'type', 'number', 'required', false, 'placeholder', '请输入薪资', 'min', 0),
  JSON_OBJECT('name', 'notes', 'label', '备注', 'type', 'textarea', 'required', false, 'placeholder', '请输入备注信息', 'rows', 2)
),
updated_at = CURRENT_TIMESTAMP
WHERE `key` = 'employee-onboard';
