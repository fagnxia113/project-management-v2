-- ============================================
-- 项目表增强字段 - 符合设计文档要求
-- 文件: 016_enhance_project_fields.sql
-- ============================================

-- 添加项目表额外字段
ALTER TABLE projects 
  -- 基本信息
  ADD COLUMN manager VARCHAR(100) COMMENT '项目经理姓名',
  ADD COLUMN country VARCHAR(50) DEFAULT '中国' COMMENT '所属国家',
  ADD COLUMN address TEXT COMMENT '项目地址',
  ADD COLUMN attachments TEXT COMMENT '附件',
  
  -- 项目阶段
  ADD COLUMN phase VARCHAR(50) COMMENT '项目阶段',
  ADD COLUMN phase_start_date DATE COMMENT '该阶段预计开始日期',
  ADD COLUMN phase_end_date DATE COMMENT '该阶段预计结束日期',
  ADD COLUMN estimated_days INT DEFAULT 0 COMMENT '预计使用天数',
  ADD COLUMN remaining_days INT DEFAULT 0 COMMENT '剩余天数',
  
  -- 项目相关信息
  ADD COLUMN area DECIMAL(10,2) DEFAULT 0 COMMENT '建筑面积(m²)',
  ADD COLUMN capacity DECIMAL(10,2) DEFAULT 0 COMMENT 'IT容量(MW)',
  ADD COLUMN rack_count INT DEFAULT 0 COMMENT '机柜数量',
  ADD COLUMN rack_power DECIMAL(5,2) DEFAULT 0 COMMENT '单机柜功率(KW)',
  
  -- 技术架构
  ADD COLUMN power_arch TEXT COMMENT '电力架构',
  ADD COLUMN hvac_arch TEXT COMMENT '暖通架构',
  ADD COLUMN fire_arch TEXT COMMENT '消防架构',
  ADD COLUMN weak_arch TEXT COMMENT '弱电架构',
  
  -- 商务信息
  ADD COLUMN customer_name VARCHAR(200) COMMENT '终端客户名称';

-- 更新项目状态枚举以匹配设计文档
-- 注意：MySQL不支持直接修改枚举，需要重建表或使用其他方式
-- 这里我们使用已有的状态，但需要调整含义：
-- proposal -> initiated (立项)
-- in_progress -> 进行中
-- completed -> 已结项
-- paused -> 暂停

-- 添加索引
CREATE INDEX idx_projects_manager ON projects(manager_id);
CREATE INDEX idx_projects_tech_manager ON projects(tech_manager_id);
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_country ON projects(country);

-- 添加外键约束（如果需要）
-- ALTER TABLE projects ADD CONSTRAINT fk_projects_tech_manager 
--   FOREIGN KEY (tech_manager_id) REFERENCES employees(id) ON DELETE SET NULL;