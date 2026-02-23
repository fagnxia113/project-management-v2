-- 添加 user_id 字段到 employees 表，用于关联用户账号
ALTER TABLE employees ADD COLUMN user_id VARCHAR(36) COMMENT '关联的用户账号ID';

-- 添加索引以提高查询性能
CREATE INDEX idx_employees_user_id ON employees(user_id);