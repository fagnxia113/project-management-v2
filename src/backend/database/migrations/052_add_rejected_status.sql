-- 添加 rejected 状态到 workflow_instances 表
ALTER TABLE workflow_instances 
MODIFY COLUMN status ENUM('running', 'suspended', 'completed', 'terminated', 'rejected') DEFAULT 'running' COMMENT '状态';