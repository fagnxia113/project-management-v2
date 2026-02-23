-- ============================================
-- 员工初始化数据
-- 文件: 014_init_employees.sql
-- 说明: 初始化测试员工数据，包括各类角色
-- ============================================

-- 插入员工数据
INSERT INTO employees (
  id, employee_no, name, gender, phone, email,
  department_id, position, status, current_status,
  hire_date, role, daily_cost, skills, avatar_color
) VALUES
-- 管理层
('emp-001', 'YG-00001', '张三', 'male', '13800138001', 'zhangsan@hszh.com',
 'dept-001', '总经理', 'active', 'on_duty',
 '2020-01-01', 'admin', 2000, '["管理", "战略规划"]', '#3B82F6'),

('emp-002', 'YG-00002', '李四', 'female', '13800138002', 'lisi@hszh.com',
 'dept-005', '人事经理', 'active', 'on_duty',
 '2020-03-01', 'hr_manager', 1500, '["人力资源管理", "招聘"]', '#EC4899'),

('emp-003', 'YG-00003', '王五', 'male', '13800138003', 'wangwu@hszh.com',
 'dept-004', '财务经理', 'active', 'on_duty',
 '2020-02-01', 'user', 1500, '["财务管理", "成本控制"]', '#10B981'),

-- 项目经理
('emp-004', 'YG-00004', '赵六', 'male', '13800138004', 'zhaoliu@hszh.com',
 'dept-002', '项目经理', 'active', 'on_duty',
 '2020-06-01', 'project_manager', 1200, '["项目管理", "国内项目"]', '#F59E0B'),

('emp-005', 'YG-00005', '钱七', 'male', '13800138005', 'qianqi@hszh.com',
 'dept-002', '项目经理', 'active', 'on_duty',
 '2020-07-01', 'project_manager', 1200, '["项目管理", "国外项目"]', '#8B5CF6'),

('emp-006', 'YG-00006', '孙八', 'female', '13800138006', 'sunba@hszh.com',
 'dept-002', '项目经理', 'active', 'on_duty',
 '2021-01-01', 'project_manager', 1200, '["项目管理", "研发项目"]', '#EF4444'),

-- 设备管理
('emp-007', 'YG-00007', '周九', 'male', '13800138007', 'zhoujiu@hszh.com',
 'dept-001', '仓库管理员', 'active', 'on_duty',
 '2020-05-01', 'equipment_manager', 1000, '["仓库管理", "设备管理"]', '#06B6D4'),

('emp-008', 'YG-00008', '吴十', 'male', '13800138008', 'wushi@hszh.com',
 'dept-002', '设备管理员', 'active', 'on_duty',
 '2020-08-01', 'equipment_manager', 1000, '["设备维护", "设备调拨"]', '#84CC16'),

-- 技术人员
('emp-009', 'YG-00009', '郑十一', 'male', '13800138009', 'zheng11@hszh.com',
 'dept-002', '高级工程师', 'active', 'on_duty',
 '2020-09-01', 'implementer', 1000, '["技术开发", "系统实施"]', '#F97316'),

('emp-010', 'YG-00010', '王十二', 'male', '13800138010', 'wang12@hszh.com',
 'dept-002', '工程师', 'active', 'on_duty',
 '2021-03-01', 'implementer', 800, '["技术开发"]', '#14B8A6'),

('emp-011', 'YG-00011', '冯十三', 'female', '13800138011', 'feng13@hszh.com',
 'dept-002', '工程师', 'active', 'on_duty',
 '2021-04-01', 'implementer', 800, '["技术开发", "测试"]', '#A855F7'),

-- 市场人员
('emp-012', 'YG-00012', '陈十四', 'male', '13800138012', 'chen14@hszh.com',
 'dept-003', '市场专员', 'active', 'on_duty',
 '2021-02-01', 'user', 800, '["市场推广", "客户关系"]', '#F43F5E'),

-- 普通员工
('emp-013', 'YG-00013', '楚十五', 'male', '13800138013', 'chu15@hszh.com',
 'dept-002', '实施工程师', 'active', 'on_duty',
 '2021-05-01', 'implementer', 700, '["项目实施"]', '#6366F1'),

('emp-014', 'YG-00014', '魏十六', 'male', '13800138014', 'wei16@hszh.com',
 'dept-002', '实施工程师', 'active', 'on_duty',
 '2021-06-01', 'implementer', 700, '["项目实施"]', '#8B5CF6'),

('emp-015', 'YG-00015', '蒋十七', 'female', '13800138015', 'jiang17@hszh.com',
 'dept-005', 'HR专员', 'active', 'on_duty',
 '2021-07-01', 'user', 600, '["人事管理"]', '#EC4899');

-- 更新部门负责人
UPDATE departments SET manager_id = 'emp-001', manager_name = '张三' WHERE id = 'dept-001';
UPDATE departments SET manager_id = 'emp-004', manager_name = '赵六' WHERE id = 'dept-002';
UPDATE departments SET manager_id = 'emp-012', manager_name = '陈十四' WHERE id = 'dept-003';
UPDATE departments SET manager_id = 'emp-003', manager_name = '王五' WHERE id = 'dept-004';
UPDATE departments SET manager_id = 'emp-002', manager_name = '李四' WHERE id = 'dept-005';
UPDATE departments SET manager_id = 'emp-007', manager_name = '周九' WHERE id = 'dept-006';

-- 更新部门员工数量
UPDATE departments d SET employee_count = (
  SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id
);

-- ============================================
-- 完成
-- ============================================
