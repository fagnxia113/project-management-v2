-- 006 添加工作流相关表
-- 执行时间: 2026-02-19

-- =============================================
-- 日报管理表
-- =============================================
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_no VARCHAR(50) UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    reporter_id UUID NOT NULL REFERENCES employees(id),
    task_id UUID REFERENCES tasks(id),
    project_id UUID REFERENCES projects(id),
    work_content TEXT NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    tomorrow_plan TEXT NOT NULL,
    problems TEXT,
    support_needed TEXT,
    work_hours NUMERIC DEFAULT 8,
    overtime_hours NUMERIC DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES employees(id),
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE daily_reports IS '日报管理';
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_reporter ON daily_reports(reporter_id);
CREATE INDEX idx_daily_reports_task ON daily_reports(task_id);
CREATE INDEX idx_daily_reports_status ON daily_reports(status);

-- =============================================
-- 项目人员信息管理表
-- =============================================
CREATE TABLE IF NOT EXISTS project_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'leave', 'transferred')),
    join_date DATE NOT NULL,
    leave_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, employee_id)
);

COMMENT ON TABLE project_employees IS '项目人员信息管理';
CREATE INDEX idx_project_employees_project ON project_employees(project_id);
CREATE INDEX idx_project_employees_employee ON project_employees(employee_id);
CREATE INDEX idx_project_employees_status ON project_employees(status);

-- =============================================
-- 设备维修单
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_repair_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES employees(id),
    apply_date DATE NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    equipment_code VARCHAR(50),
    equipment_name VARCHAR(200),
    fault_description TEXT NOT NULL,
    fault_cause TEXT,
    repair_type VARCHAR(20) NOT NULL CHECK (repair_type IN ('internal', 'external')),
    repair_unit VARCHAR(200),
    estimated_cost NUMERIC DEFAULT 0,
    actual_cost NUMERIC DEFAULT 0,
    repair_result VARCHAR(20) CHECK (repair_result IN ('fixed', 'cannot_fix', 'scrapped')),
    repair_description TEXT,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_id UUID REFERENCES approvals(id),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE equipment_repair_orders IS '设备维修单';
CREATE INDEX idx_equipment_repair_orders_order_no ON equipment_repair_orders(order_no);
CREATE INDEX idx_equipment_repair_orders_equipment ON equipment_repair_orders(equipment_id);
CREATE INDEX idx_equipment_repair_orders_status ON equipment_repair_orders(status);

-- =============================================
-- 设备报废单
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_scrap_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES employees(id),
    apply_date DATE NOT NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id),
    equipment_code VARCHAR(50),
    equipment_name VARCHAR(200),
    purchase_date DATE,
    purchase_price NUMERIC,
    scrap_reason TEXT NOT NULL,
    residual_value NUMERIC DEFAULT 0,
    disposal_method VARCHAR(20) CHECK (disposal_method IN ('destroy', 'sell', 'donate')),
    disposed_at DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_id UUID REFERENCES approvals(id),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE equipment_scrap_orders IS '设备报废单';
CREATE INDEX idx_equipment_scrap_orders_order_no ON equipment_scrap_orders(order_no);
CREATE INDEX idx_equipment_scrap_orders_equipment ON equipment_scrap_orders(equipment_id);
CREATE INDEX idx_equipment_scrap_orders_status ON equipment_scrap_orders(status);

-- =============================================
-- 任务结项申请
-- =============================================
CREATE TABLE IF NOT EXISTS task_completion_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES employees(id),
    apply_date DATE NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks(id),
    project_id UUID REFERENCES projects(id),
    assignee_id UUID REFERENCES employees(id),
    planned_end_date DATE,
    current_progress INTEGER,
    actual_end_date DATE NOT NULL,
    final_progress INTEGER DEFAULT 100,
    task_result TEXT NOT NULL,
    result_attachments JSONB,
    issues TEXT,
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    efficiency_score INTEGER CHECK (efficiency_score >= 1 AND efficiency_score <= 5),
    attitude_score INTEGER CHECK (attitude_score >= 1 AND attitude_score <= 5),
    overall_score NUMERIC,
    quality_level VARCHAR(20) CHECK (quality_level IN ('excellent', 'good', 'qualified', 'unqualified')),
    review_comment TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_id UUID REFERENCES approvals(id),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE task_completion_orders IS '任务结项申请';
CREATE INDEX idx_task_completion_orders_order_no ON task_completion_orders(order_no);
CREATE INDEX idx_task_completion_orders_task ON task_completion_orders(task_id);
CREATE INDEX idx_task_completion_orders_status ON task_completion_orders(status);

-- =============================================
-- 人员入职申请
-- =============================================
CREATE TABLE IF NOT EXISTS employee_onboard_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES employees(id),
    apply_date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(200),
    id_card VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    employee_type VARCHAR(20) DEFAULT 'full_time' CHECK (employee_type IN ('full_time', 'intern', 'outsource')),
    employee_no VARCHAR(50),
    created_employee_id UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_id UUID REFERENCES approvals(id),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employee_onboard_orders IS '人员入职申请';
CREATE INDEX idx_employee_onboard_orders_order_no ON employee_onboard_orders(order_no);
CREATE INDEX idx_employee_onboard_orders_status ON employee_onboard_orders(status);

-- =============================================
-- 人员离职申请
-- =============================================
CREATE TABLE IF NOT EXISTS employee_resign_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES employees(id),
    apply_date DATE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    department VARCHAR(100),
    position VARCHAR(100),
    resign_type VARCHAR(20) NOT NULL CHECK (resign_type IN ('voluntary', 'involuntary', 'contract_end')),
    resign_reason TEXT NOT NULL,
    expected_leave_date DATE NOT NULL,
    handover_person_id UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_id UUID REFERENCES approvals(id),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employee_resign_orders IS '人员离职申请';
CREATE INDEX idx_employee_resign_orders_order_no ON employee_resign_orders(order_no);
CREATE INDEX idx_employee_resign_orders_employee ON employee_resign_orders(employee_id);
CREATE INDEX idx_employee_resign_orders_status ON employee_resign_orders(status);

-- =============================================
-- 人员调动申请
-- =============================================
CREATE TABLE IF NOT EXISTS employee_transfer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID NOT NULL REFERENCES employees(id),
    apply_date DATE NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    from_department VARCHAR(100),
    from_position VARCHAR(100),
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('department', 'branch', 'project')),
    to_department VARCHAR(100) NOT NULL,
    to_position VARCHAR(100) NOT NULL,
    transfer_reason TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    approval_id UUID REFERENCES approvals(id),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employee_transfer_orders IS '人员调动申请';
CREATE INDEX idx_employee_transfer_orders_order_no ON employee_transfer_orders(order_no);
CREATE INDEX idx_employee_transfer_orders_employee ON employee_transfer_orders(employee_id);
CREATE INDEX idx_employee_transfer_orders_status ON employee_transfer_orders(status);

-- =============================================
-- 触发器：自动更新 updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有新表添加触发器
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['daily_reports', 'project_employees', 'equipment_repair_orders', 
                                  'equipment_scrap_orders', 'task_completion_orders', 
                                  'employee_onboard_orders', 'employee_resign_orders', 
                                  'employee_transfer_orders'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;
