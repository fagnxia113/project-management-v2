-- ============================================
-- 项目管理系统 v2 - 补充字段和流程表单数据表
-- 文件: 005_supplement_fields_and_workflow_tables.sql
-- 说明: 
--   1. 补充主表缺失字段
--   2. 创建设备管理流程表（入库/出库/调拨/维修/报废/采购）
--   3. 创建任务管理流程表（分配/结项）
--   4. 创建人事管理流程表（入职/离职/调动/请假）
--   5. 创建项目管理流程表（立项/阶段更新/人员调动/结项）
-- ============================================

-- ============================================
-- 第一部分：补充主表缺失字段
-- ============================================

-- 1.1 项目信息表补充字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS attachments JSON COMMENT '项目附件';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_manager_id VARCHAR(36) COMMENT '技术负责人ID';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_manager VARCHAR(100) COMMENT '技术负责人(冗余)';

-- 1.2 任务管理表补充字段
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT COMMENT '备注';

-- 1.3 设备信息表补充字段
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS accessories_info TEXT COMMENT '配件情况';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS damage_description TEXT COMMENT '损坏说明';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS attachments JSON COMMENT '仪器负载及配件详图';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_record TEXT COMMENT '购买记录';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(200) COMMENT '发证单位';

-- 1.4 员工信息表补充字段
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type ENUM('full_time', 'intern', 'outsource') DEFAULT 'full_time' COMMENT '员工性质';

-- 1.5 日报表补充字段
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS report_no VARCHAR(50) UNIQUE COMMENT '日报编号';
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS support_needed TEXT COMMENT '需要的支持';

-- ============================================
-- 第二部分：设备管理流程表单
-- ============================================

-- 2.1 设备入库单
CREATE TABLE IF NOT EXISTS equipment_inbound_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '入库单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '入库单号 格式：RK-20260219-001',
  inbound_type ENUM('purchase', 'repair_return', 'project_end', 'other') NOT NULL COMMENT '入库类型',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  warehouse_id VARCHAR(36) NOT NULL COMMENT '入库仓库ID',
  warehouse_name VARCHAR(200) COMMENT '仓库名称(冗余)',
  
  -- 其他入库时的设备选择
  equipment_id VARCHAR(36) COMMENT '关联设备ID(非采购入库时)',
  equipment_code VARCHAR(50) COMMENT '管理编号(冗余)',
  equipment_name VARCHAR(200) COMMENT '设备名称(冗余)',
  
  -- 采购入库时的设备信息
  new_equipment_name VARCHAR(200) COMMENT '新设备名称',
  new_equipment_model VARCHAR(100) COMMENT '新设备型号',
  new_equipment_category ENUM('instrument', 'fake_load') COMMENT '新设备类型',
  new_equipment_serial VARCHAR(100) COMMENT '出厂编号',
  new_equipment_manufacturer VARCHAR(200) COMMENT '生产厂商',
  new_equipment_price DECIMAL(12,2) COMMENT '购置价格',
  new_equipment_purchase_date DATE COMMENT '购置日期',
  new_equipment_calibration_cycle INT COMMENT '校准周期(月)',
  
  -- 入库详情
  inbound_reason TEXT NOT NULL COMMENT '入库原因',
  notes TEXT COMMENT '备注',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_warehouse (warehouse_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_status (status),
  INDEX idx_order_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备入库单';

-- 2.2 设备出库单
CREATE TABLE IF NOT EXISTS equipment_outbound_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '出库单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '出库单号 格式：CK-20260219-001',
  outbound_type ENUM('project_use', 'repair', 'scrap') NOT NULL COMMENT '出库类型',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  warehouse_id VARCHAR(36) NOT NULL COMMENT '出库仓库ID',
  warehouse_name VARCHAR(200) COMMENT '仓库名称(冗余)',
  
  -- 设备信息
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_code VARCHAR(50) COMMENT '管理编号(冗余)',
  equipment_name VARCHAR(200) COMMENT '设备名称(冗余)',
  equipment_category VARCHAR(50) COMMENT '设备类型(冗余)',
  
  -- 目标信息
  target_project_id VARCHAR(36) COMMENT '目标项目ID(项目领用时)',
  target_project_name VARCHAR(200) COMMENT '目标项目名称(冗余)',
  repair_unit VARCHAR(200) COMMENT '维修单位(维修出库时)',
  
  -- 出库详情
  outbound_reason TEXT NOT NULL COMMENT '出库原因',
  notes TEXT COMMENT '备注',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_warehouse (warehouse_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_project (target_project_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备出库单';

-- 2.3 设备调拨单
CREATE TABLE IF NOT EXISTS equipment_transfer_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '调拨单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '调拨单号 格式：DB-20260219-001',
  transfer_scene ENUM('A', 'B', 'C') NOT NULL COMMENT '调拨场景 A-国内有库存/B-国内无库存/C-国外项目间',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 设备信息
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_code VARCHAR(50) COMMENT '管理编号(冗余)',
  equipment_name VARCHAR(200) COMMENT '设备名称(冗余)',
  equipment_category VARCHAR(50) COMMENT '设备类型(冗余)',
  
  -- 调出信息
  from_location_type ENUM('warehouse', 'project') NOT NULL COMMENT '调出位置类型',
  from_warehouse_id VARCHAR(36) COMMENT '调出仓库ID',
  from_warehouse_name VARCHAR(200) COMMENT '调出仓库名称(冗余)',
  from_project_id VARCHAR(36) COMMENT '调出项目ID',
  from_project_name VARCHAR(200) COMMENT '调出项目名称(冗余)',
  from_manager_id VARCHAR(36) COMMENT '调出方负责人ID',
  from_manager VARCHAR(100) COMMENT '调出方负责人(冗余)',
  
  -- 调入信息
  to_location_type ENUM('warehouse', 'project') NOT NULL COMMENT '调入位置类型',
  to_warehouse_id VARCHAR(36) COMMENT '调入仓库ID',
  to_warehouse_name VARCHAR(200) COMMENT '调入仓库名称(冗余)',
  to_project_id VARCHAR(36) COMMENT '调入项目ID',
  to_project_name VARCHAR(200) COMMENT '调入项目名称(冗余)',
  to_manager_id VARCHAR(36) COMMENT '调入方负责人ID',
  to_manager VARCHAR(100) COMMENT '调入方负责人(冗余)',
  
  -- 无库存处理(场景B)
  solution ENUM('borrow', 'purchase') COMMENT '处理方案',
  estimated_arrival DATE COMMENT '预计到货时间',
  
  -- 调拨详情
  transfer_reason TEXT NOT NULL COMMENT '调拨原因',
  estimated_ship_date DATE COMMENT '预计发货日期',
  estimated_arrival_date DATE COMMENT '预计到达日期',
  transport_method ENUM('land', 'air', 'express', 'self') COMMENT '运输方式',
  tracking_no VARCHAR(100) COMMENT '物流单号',
  notes TEXT COMMENT '备注',
  
  -- 审批流程
  status ENUM('draft', 'pending_from', 'pending_to', 'shipping', 'receiving', 'completed', 'rejected', 'withdrawn') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  
  -- 调出方审批
  from_approved_at TIMESTAMP COMMENT '调出方审批时间',
  from_approved_by VARCHAR(36) COMMENT '调出方审批人ID',
  from_approval_comment TEXT COMMENT '调出方审批意见',
  
  -- 调入方审批
  to_approved_at TIMESTAMP COMMENT '调入方审批时间',
  to_approved_by VARCHAR(36) COMMENT '调入方审批人ID',
  to_approval_comment TEXT COMMENT '调入方审批意见',
  
  -- 发货确认
  shipped_at TIMESTAMP COMMENT '发货时间',
  shipped_by VARCHAR(36) COMMENT '发货人ID',
  
  -- 收货确认
  received_at TIMESTAMP COMMENT '收货时间',
  received_by VARCHAR(36) COMMENT '收货人ID',
  receive_comment TEXT COMMENT '收货备注',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_from_warehouse (from_warehouse_id),
  INDEX idx_from_project (from_project_id),
  INDEX idx_to_warehouse (to_warehouse_id),
  INDEX idx_to_project (to_project_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备调拨单';

-- 2.4 设备维修单
CREATE TABLE IF NOT EXISTS equipment_repair_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '维修单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '维修单号 格式：WX-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 设备信息
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_code VARCHAR(50) COMMENT '管理编号(冗余)',
  equipment_name VARCHAR(200) COMMENT '设备名称(冗余)',
  equipment_category VARCHAR(50) COMMENT '设备类型(冗余)',
  current_host_status VARCHAR(50) COMMENT '当前主机状态(冗余)',
  
  -- 故障信息
  fault_description TEXT NOT NULL COMMENT '故障现象',
  fault_cause TEXT COMMENT '故障原因',
  
  -- 维修信息
  repair_type ENUM('internal', 'external') NOT NULL COMMENT '维修类型',
  repair_unit VARCHAR(200) COMMENT '维修单位(外部维修时)',
  estimated_cost DECIMAL(12,2) DEFAULT 0 COMMENT '预计维修费用',
  actual_cost DECIMAL(12,2) DEFAULT 0 COMMENT '实际维修费用',
  
  -- 维修结果
  repair_result ENUM('fixed', 'unfixable', 'scrapped') COMMENT '维修结果',
  repair_completed_at TIMESTAMP COMMENT '维修完成时间',
  repair_description TEXT COMMENT '维修说明',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'repairing', 'completed', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维修单';

-- 2.5 设备报废单
CREATE TABLE IF NOT EXISTS equipment_scrap_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '报废单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '报废单号 格式：BF-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 设备信息
  equipment_id VARCHAR(36) NOT NULL COMMENT '设备ID',
  equipment_code VARCHAR(50) COMMENT '管理编号(冗余)',
  equipment_name VARCHAR(200) COMMENT '设备名称(冗余)',
  equipment_category VARCHAR(50) COMMENT '设备类型(冗余)',
  purchase_date DATE COMMENT '购置日期(冗余)',
  purchase_price DECIMAL(12,2) COMMENT '购置价格(冗余)',
  used_years DECIMAL(3,1) COMMENT '使用年限',
  
  -- 报废信息
  scrap_reason TEXT NOT NULL COMMENT '报废原因',
  residual_value DECIMAL(12,2) DEFAULT 0 COMMENT '残值评估',
  
  -- 处理信息
  disposal_method ENUM('destroy', 'sell', 'donate') COMMENT '处理方式',
  disposed_at TIMESTAMP COMMENT '处理时间',
  disposal_notes TEXT COMMENT '处理备注',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected', 'disposed') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备报废单';

-- 2.6 采购申请单
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '采购单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '采购单号 格式：CG-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 关联调拨单(场景B)
  transfer_order_id VARCHAR(36) COMMENT '关联调拨单ID',
  
  -- 采购信息
  equipment_category ENUM('instrument', 'fake_load') NOT NULL COMMENT '设备类型',
  equipment_name VARCHAR(200) NOT NULL COMMENT '设备名称',
  model_spec VARCHAR(200) NOT NULL COMMENT '型号规格',
  quantity INT NOT NULL DEFAULT 1 COMMENT '采购数量',
  estimated_price DECIMAL(12,2) NOT NULL COMMENT '预计价格',
  total_price DECIMAL(12,2) COMMENT '总价',
  
  -- 采购原因
  purchase_reason TEXT NOT NULL COMMENT '采购原因',
  required_date DATE NOT NULL COMMENT '需求日期',
  
  -- 采购状态
  purchase_status ENUM('pending', 'ordering', 'arrived') DEFAULT 'pending' COMMENT '采购状态',
  actual_price DECIMAL(12,2) COMMENT '实际价格',
  arrival_date DATE COMMENT '到货日期',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_transfer (transfer_order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购申请单';

-- ============================================
-- 第三部分：任务管理流程表单
-- ============================================

-- 3.1 任务分配单
CREATE TABLE IF NOT EXISTS task_assignment_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '分配单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '分配单号 格式：FP-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 项目信息
  project_id VARCHAR(36) NOT NULL COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  phase_id VARCHAR(36) COMMENT '关联阶段ID',
  phase_name VARCHAR(100) COMMENT '阶段名称(冗余)',
  
  -- 任务信息
  wbs_code VARCHAR(50) NOT NULL COMMENT 'WBS编号',
  task_type ENUM('milestone', 'subtask', 'process') NOT NULL COMMENT '任务类型',
  task_name VARCHAR(300) NOT NULL COMMENT '任务名称',
  parent_task_id VARCHAR(36) COMMENT '父任务ID',
  task_level ENUM('milestone', 'subtask', 'process') NOT NULL COMMENT '任务层级',
  task_description TEXT COMMENT '任务描述',
  
  -- 分配信息
  assignee_id VARCHAR(36) NOT NULL COMMENT '负责人ID',
  assignee VARCHAR(100) NOT NULL COMMENT '负责人姓名(冗余)',
  planned_start_date DATE NOT NULL COMMENT '计划开始日期',
  planned_end_date DATE NOT NULL COMMENT '计划结束日期',
  task_requirements TEXT NOT NULL COMMENT '任务要求',
  
  -- 接收信息
  receive_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' COMMENT '接收状态',
  received_at TIMESTAMP COMMENT '接收时间',
  reject_reason TEXT COMMENT '拒绝原因',
  
  -- 创建的任务ID(接收后自动创建)
  created_task_id VARCHAR(36) COMMENT '创建的任务ID',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'accepted', 'rejected', 'completed') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_project (project_id),
  INDEX idx_phase (phase_id),
  INDEX idx_assignee (assignee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务分配单';

-- 3.2 任务结项申请
CREATE TABLE IF NOT EXISTS task_completion_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '结项单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '结项单号 格式：JJ-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 任务信息
  task_id VARCHAR(36) NOT NULL COMMENT '关联任务ID',
  task_name VARCHAR(300) COMMENT '任务名称(冗余)',
  project_id VARCHAR(36) COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  phase_id VARCHAR(36) COMMENT '关联阶段ID',
  phase_name VARCHAR(100) COMMENT '阶段名称(冗余)',
  assignee_id VARCHAR(36) COMMENT '任务负责人ID',
  assignee VARCHAR(100) COMMENT '任务负责人(冗余)',
  planned_end_date DATE COMMENT '计划结束时间(冗余)',
  current_progress INT COMMENT '当前任务进度(冗余)',
  
  -- 结项信息
  actual_end_date DATE NOT NULL COMMENT '实际结束时间',
  final_progress INT NOT NULL DEFAULT 100 COMMENT '最终完成进度',
  task_result TEXT NOT NULL COMMENT '任务成果',
  result_attachments JSON COMMENT '成果附件',
  remaining_issues TEXT COMMENT '遗留问题',
  
  -- 评价信息
  quality_score DECIMAL(2,1) COMMENT '工作质量评分(1-5)',
  efficiency_score DECIMAL(2,1) COMMENT '工作效率评分(1-5)',
  attitude_score DECIMAL(2,1) COMMENT '工作态度评分(1-5)',
  overall_score DECIMAL(3,1) COMMENT '综合评分',
  overall_rating ENUM('excellent', 'good', 'qualified', 'unqualified') COMMENT '评价等级',
  evaluation_comment TEXT COMMENT '评价意见',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_task (task_id),
  INDEX idx_project (project_id),
  INDEX idx_assignee (assignee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务结项申请';

-- ============================================
-- 第四部分：人事管理流程表单
-- ============================================

-- 4.1 人员入职申请
CREATE TABLE IF NOT EXISTS employee_onboard_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '入职单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '入职单号 格式：RZ-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 入职人员信息
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  gender ENUM('male', 'female') COMMENT '性别',
  phone VARCHAR(20) NOT NULL COMMENT '手机号',
  email VARCHAR(100) COMMENT '邮箱',
  id_card VARCHAR(18) NOT NULL COMMENT '身份证号',
  
  -- 岗位信息
  department VARCHAR(100) NOT NULL COMMENT '入职部门',
  position VARCHAR(100) NOT NULL COMMENT '入职岗位',
  hire_date DATE NOT NULL COMMENT '入职日期',
  employee_type ENUM('full_time', 'intern', 'outsource') NOT NULL COMMENT '员工性质',
  
  -- 生成的员工编号
  employee_no VARCHAR(50) COMMENT '员工编号(审批通过后生成)',
  created_employee_id VARCHAR(36) COMMENT '创建的员工记录ID',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_department (department),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人员入职申请';

-- 4.2 人员离职申请
CREATE TABLE IF NOT EXISTS employee_offboard_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '离职单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '离职单号 格式：LZ-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 员工信息
  employee_id VARCHAR(36) NOT NULL COMMENT '员工ID',
  employee_name VARCHAR(100) COMMENT '姓名(冗余)',
  department VARCHAR(100) COMMENT '所属部门(冗余)',
  position VARCHAR(100) COMMENT '岗位(冗余)',
  hire_date DATE COMMENT '入职日期(冗余)',
  
  -- 离职信息
  offboard_type ENUM('voluntary', 'involuntary', 'contract_end') NOT NULL COMMENT '离职类型',
  offboard_reason TEXT NOT NULL COMMENT '离职原因',
  expected_offboard_date DATE NOT NULL COMMENT '预计离职日期',
  handover_person_id VARCHAR(36) COMMENT '工作交接人ID',
  handover_person VARCHAR(100) COMMENT '工作交接人(冗余)',
  
  -- 实际离职
  actual_offboard_date DATE COMMENT '实际离职日期',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_employee (employee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人员离职申请';

-- 4.3 人员调动申请
CREATE TABLE IF NOT EXISTS employee_transfer_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '调动单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '调动单号 格式：DD-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 员工信息
  employee_id VARCHAR(36) NOT NULL COMMENT '员工ID',
  employee_name VARCHAR(100) COMMENT '姓名(冗余)',
  from_department VARCHAR(100) COMMENT '原部门(冗余)',
  from_position VARCHAR(100) COMMENT '原岗位(冗余)',
  
  -- 调动信息
  transfer_type ENUM('department', 'branch', 'project') NOT NULL COMMENT '调动类型',
  to_department VARCHAR(100) NOT NULL COMMENT '新部门',
  to_position VARCHAR(100) NOT NULL COMMENT '新岗位',
  transfer_reason TEXT NOT NULL COMMENT '调动原因',
  effective_date DATE NOT NULL COMMENT '生效日期',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_employee (employee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人员调动申请';

-- 4.4 请假申请
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) PRIMARY KEY COMMENT '请假单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '请假单号 格式：QJ-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 项目信息(项目人员请假时)
  project_id VARCHAR(36) COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  
  -- 请假信息
  leave_type ENUM('annual', 'sick', 'personal', 'comp') NOT NULL COMMENT '请假类型',
  start_date DATE NOT NULL COMMENT '请假开始日期',
  end_date DATE NOT NULL COMMENT '请假结束日期',
  leave_days INT NOT NULL COMMENT '请假天数',
  leave_reason TEXT NOT NULL COMMENT '请假原因',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_project (project_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='请假申请';

-- ============================================
-- 第五部分：项目管理流程表单
-- ============================================

-- 5.1 项目立项申请
CREATE TABLE IF NOT EXISTS project_proposal_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '立项单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '立项单号 格式：LX-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 项目基本信息
  project_name VARCHAR(200) NOT NULL COMMENT '项目名称',
  manager_id VARCHAR(36) NOT NULL COMMENT '项目经理ID',
  manager VARCHAR(100) COMMENT '项目经理(冗余)',
  tech_manager_id VARCHAR(36) COMMENT '技术负责人ID',
  tech_manager VARCHAR(100) COMMENT '技术负责人(冗余)',
  start_date DATE NOT NULL COMMENT '项目开始日期',
  end_date DATE COMMENT '项目结束日期',
  country ENUM('China', 'USA', 'Singapore', 'Malaysia', 'Indonesia', 'Other') NOT NULL COMMENT '所属国家',
  address VARCHAR(300) COMMENT '项目地址',
  
  -- 项目描述
  description TEXT COMMENT '项目描述',
  area DECIMAL(10,2) COMMENT '建筑面积(m²)',
  capacity DECIMAL(10,2) COMMENT 'IT容量(MW)',
  rack_count INT COMMENT '机柜数量',
  rack_power DECIMAL(10,2) COMMENT '单机柜功率(KW)',
  
  -- 技术架构
  power_arch TEXT COMMENT '电力架构',
  hvac_arch TEXT COMMENT '暖通架构',
  fire_arch TEXT COMMENT '消防架构',
  weak_arch TEXT COMMENT '弱电架构',
  
  -- 商务信息
  customer_id VARCHAR(36) COMMENT '客户ID',
  customer_name VARCHAR(200) COMMENT '客户名称(冗余)',
  budget DECIMAL(15,2) COMMENT '预算金额(万元)',
  
  -- 附件
  attachments JSON COMMENT '项目文件',
  
  -- 生成的项目ID
  created_project_id VARCHAR(36) COMMENT '创建的项目ID',
  project_no VARCHAR(50) COMMENT '项目编号(审批通过后生成)',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_manager (manager_id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目立项申请';

-- 5.2 项目阶段更新单
CREATE TABLE IF NOT EXISTS project_phase_update_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '阶段更新单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '更新单号 格式：GX-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 阶段信息
  phase_id VARCHAR(36) NOT NULL COMMENT '关联阶段ID',
  project_id VARCHAR(36) COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  phase_name VARCHAR(100) COMMENT '阶段名称(冗余)',
  current_status VARCHAR(50) COMMENT '当前阶段状态(冗余)',
  
  -- 更新内容
  update_type ENUM('start', 'complete', 'pause', 'resume') NOT NULL COMMENT '更新类型',
  new_status ENUM('not_started', 'in_progress', 'completed', 'paused') NOT NULL COMMENT '新状态',
  actual_start_date DATE COMMENT '实际开始日期',
  actual_end_date DATE COMMENT '实际结束日期',
  progress INT COMMENT '完成进度(%)',
  update_reason TEXT NOT NULL COMMENT '更新说明',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_phase (phase_id),
  INDEX idx_project (project_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目阶段更新单';

-- 5.3 项目人员调动单
CREATE TABLE IF NOT EXISTS project_personnel_transfer_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '项目人员调动单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '调动单号 格式：XMDD-20260219-001',
  transfer_type ENUM('in', 'out') NOT NULL COMMENT '调动类型',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 人员信息
  employee_id VARCHAR(36) NOT NULL COMMENT '员工ID',
  employee_name VARCHAR(100) COMMENT '姓名(冗余)',
  department VARCHAR(100) COMMENT '所属部门(冗余)',
  position VARCHAR(100) COMMENT '岗位(冗余)',
  
  -- 项目信息
  project_id VARCHAR(36) NOT NULL COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  project_manager_id VARCHAR(36) COMMENT '项目经理ID(冗余)',
  
  -- 调动信息
  transfer_reason TEXT NOT NULL COMMENT '调动原因',
  effective_date DATE NOT NULL COMMENT '生效日期',
  notes TEXT COMMENT '备注',
  
  -- 更新的人员项目关联ID
  project_personnel_id VARCHAR(36) COMMENT '更新的人员关联ID',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_employee (employee_id),
  INDEX idx_project (project_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目人员调动单';

-- 5.4 项目结项申请
CREATE TABLE IF NOT EXISTS project_completion_orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '结项单ID',
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '结项单号 格式：JX-20260219-001',
  applicant_id VARCHAR(36) NOT NULL COMMENT '申请人ID',
  applicant VARCHAR(100) NOT NULL COMMENT '申请人姓名',
  apply_date DATE NOT NULL COMMENT '申请日期',
  
  -- 项目信息
  project_id VARCHAR(36) NOT NULL COMMENT '关联项目ID',
  project_name VARCHAR(200) COMMENT '项目名称(冗余)',
  project_manager_id VARCHAR(36) COMMENT '项目经理ID(冗余)',
  actual_start_date DATE COMMENT '实际开始日期(冗余)',
  actual_end_date DATE NOT NULL COMMENT '实际结束日期',
  
  -- 项目工期
  total_duration INT COMMENT '项目总工期(天)',
  
  -- 结项信息
  task_completion_status ENUM('all', 'partial') NOT NULL COMMENT '任务完成情况',
  incomplete_task_note TEXT COMMENT '未完成任务说明',
  project_result TEXT NOT NULL COMMENT '项目成果',
  result_report JSON COMMENT '结项报告附件',
  acceptance_report JSON COMMENT '验收报告附件',
  
  -- 费用信息
  project_budget DECIMAL(15,2) COMMENT '项目预算(冗余)',
  actual_cost DECIMAL(15,2) NOT NULL COMMENT '实际总费用(万元)',
  cost_variance_note TEXT COMMENT '费用偏差说明',
  
  -- 审批字段
  status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft' COMMENT '单据状态',
  approval_id VARCHAR(36) COMMENT '关联审批ID',
  approved_at TIMESTAMP COMMENT '审批通过时间',
  approved_by VARCHAR(36) COMMENT '审批人ID',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_applicant (applicant_id),
  INDEX idx_project (project_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目结项申请';

-- ============================================
-- 第六部分：外键约束
-- ============================================

-- 设备入库单外键
ALTER TABLE equipment_inbound_orders 
  ADD CONSTRAINT fk_inbound_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_inbound_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_inbound_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT;

-- 设备出库单外键
ALTER TABLE equipment_outbound_orders 
  ADD CONSTRAINT fk_outbound_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_outbound_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_outbound_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_outbound_project FOREIGN KEY (target_project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- 设备调拨单外键
ALTER TABLE equipment_transfer_orders 
  ADD CONSTRAINT fk_transfer_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transfer_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transfer_from_warehouse FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transfer_from_project FOREIGN KEY (from_project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transfer_to_warehouse FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transfer_to_project FOREIGN KEY (to_project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- 设备维修单外键
ALTER TABLE equipment_repair_orders 
  ADD CONSTRAINT fk_repair_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_repair_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT;

-- 设备报废单外键
ALTER TABLE equipment_scrap_orders 
  ADD CONSTRAINT fk_scrap_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_scrap_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT;

-- 任务分配单外键
ALTER TABLE task_assignment_orders 
  ADD CONSTRAINT fk_task_assign_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_task_assign_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_task_assign_phase FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_task_assign_assignee FOREIGN KEY (assignee_id) REFERENCES employees(id) ON DELETE RESTRICT;

-- 任务结项申请外键
ALTER TABLE task_completion_orders 
  ADD CONSTRAINT fk_task_comp_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_task_comp_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_task_comp_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 人员入职申请外键
ALTER TABLE employee_onboard_orders 
  ADD CONSTRAINT fk_onboard_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT;

-- 人员离职申请外键
ALTER TABLE employee_offboard_orders 
  ADD CONSTRAINT fk_offboard_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_offboard_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;

-- 人员调动申请外键
ALTER TABLE employee_transfer_orders 
  ADD CONSTRAINT fk_transfer_order_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transfer_order_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;

-- 请假申请外键
ALTER TABLE leave_requests 
  ADD CONSTRAINT fk_leave_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_leave_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 项目立项申请外键
ALTER TABLE project_proposal_orders 
  ADD CONSTRAINT fk_proposal_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_proposal_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_proposal_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- 项目阶段更新单外键
ALTER TABLE project_phase_update_orders 
  ADD CONSTRAINT fk_phase_update_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_phase_update_phase FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_phase_update_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 项目人员调动单外键
ALTER TABLE project_personnel_transfer_orders 
  ADD CONSTRAINT fk_pp_transfer_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_pp_transfer_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_pp_transfer_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- 项目结项申请外键
ALTER TABLE project_completion_orders 
  ADD CONSTRAINT fk_project_comp_applicant FOREIGN KEY (applicant_id) REFERENCES employees(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_project_comp_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

-- ============================================
-- 完成
-- ============================================