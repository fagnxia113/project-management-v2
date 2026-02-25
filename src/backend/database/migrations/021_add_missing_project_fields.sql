-- 添加项目表缺失的字段
-- 执行时间: 2026-02-25

-- 添加基本信息字段
ALTER TABLE projects 
ADD COLUMN country VARCHAR(50) DEFAULT '中国' COMMENT '所属国家',
ADD COLUMN address TEXT COMMENT '项目地址',
ADD COLUMN attachments TEXT COMMENT '附件';

-- 添加项目规模字段
ALTER TABLE projects
ADD COLUMN building_area DECIMAL(10,2) COMMENT '建筑面积(m²)',
ADD COLUMN it_capacity DECIMAL(10,2) COMMENT 'IT容量(MW)',
ADD COLUMN cabinet_count INT COMMENT '机柜数量',
ADD COLUMN cabinet_power DECIMAL(10,2) COMMENT '单机柜功率(KW)';

-- 添加技术架构字段
ALTER TABLE projects
ADD COLUMN power_architecture TEXT COMMENT '供电架构',
ADD COLUMN hvac_architecture TEXT COMMENT '暖通架构',
ADD COLUMN fire_architecture TEXT COMMENT '消防架构',
ADD COLUMN weak_electric_architecture TEXT COMMENT '弱电架构';

-- 添加索引
CREATE INDEX idx_projects_country ON projects(country);
